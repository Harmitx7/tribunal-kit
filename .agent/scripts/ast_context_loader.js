const fs = require('fs');
const path = require('path');

/**
 * Normalizes a file path to consistently use forward slashes for cross-platform compatibility.
 */
function normalizePath(p) {
  return path.normalize(p).replace(/\\/g, '/');
}

/**
 * Loads the dependency graph from .tribunal/graph.json.
 * @param {string} projectRoot - The root directory of the project
 * @returns {Object|null} The semantic graph object or null if not found
 */
function loadGraph(projectRoot) {
  const graphPath = path.join(projectRoot, '.tribunal', 'graph.json');
  if (!fs.existsSync(graphPath)) {
    return null;
  }
  try {
    const data = fs.readFileSync(graphPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('[AST Context] Failed to parse graph.json:', err.message);
    return null;
  }
}

/**
 * Gets the direct dependencies (files imported by) and dependents (files that import) a target file.
 * Includes transitive dependencies up to 2 levels deep.
 * @param {string} projectRoot - The root directory of the project
 * @param {string} targetFile - The relative or absolute path of the target file
 * @returns {Object} An object containing { dependencies, dependents } as arrays of file paths
 */
function getContext(projectRoot, targetFile) {
  const graph = loadGraph(projectRoot);
  if (!graph || !graph.nodes) {
    return { error: 'Graph not found or invalid. Run `tribunal-core graph-ast .` first.' };
  }

  // Convert target to a consistent format (usually absolute, normalized)
  const normalizedTarget = normalizePath(path.resolve(projectRoot, targetFile));

  const dependencies = new Set();
  const dependents = new Set();

  // Helper to resolve imports and find matching files
  function resolveImports(filePath, imports) {
    const resolved = new Set();
    const fileDir = path.dirname(filePath);

    for (const imp of imports || []) {
      if (imp.startsWith('.')) {
        const resolvedImport = normalizePath(path.resolve(fileDir, imp));
        // Find actual file matching this import
        const matchingNodes = graph.nodes.filter(n => {
          const nAbs = normalizePath(path.resolve(projectRoot, n.file_path));
          return nAbs === resolvedImport;
        });
        matchingNodes.forEach(m =>
          resolved.add(normalizePath(path.resolve(projectRoot, m.file_path))),
        );
      }
    }
    return resolved;
  }

  // First pass: find direct dependencies and dependents
  graph.nodes.forEach(node => {
    const nodeAbsPath = normalizePath(path.resolve(projectRoot, node.file_path));
    const nodeDir = path.dirname(nodeAbsPath);

    // Does this node import our target?
    for (const imp of node.imports || []) {
      if (imp.startsWith('.')) {
        const resolvedImport = normalizePath(path.resolve(nodeDir, imp));
        // Check if resolved import matches our target exactly
        if (normalizedTarget === resolvedImport) {
          dependents.add(nodeAbsPath);
        }
      }
    }

    // Is this node our target? If so, what does it import?
    if (nodeAbsPath === normalizedTarget) {
      const directDeps = resolveImports(nodeAbsPath, node.imports || []);
      directDeps.forEach(dep => dependencies.add(dep));
    }
  });

  // Second pass: find transitive dependencies (dependencies of dependencies)
  const directDependencies = Array.from(dependencies);
  directDependencies.forEach(dep => {
    // Find the node for this dependency
    const depNode = graph.nodes.find(
      n => normalizePath(path.resolve(projectRoot, n.file_path)) === dep,
    );

    if (depNode) {
      const transitiveDeps = resolveImports(dep, depNode.imports || []);
      transitiveDeps.forEach(tdep => {
        // Don't add the target itself or create cycles
        if (tdep !== normalizedTarget && !dependencies.has(tdep)) {
          dependencies.add(tdep);
        }
      });
    }
  });

  return {
    target: normalizedTarget,
    dependencies: Array.from(dependencies),
    dependents: Array.from(dependents),
  };
}

module.exports = {
  loadGraph,
  getContext,
};

// If run directly from CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node ast_context_loader.js <target_file>');
    process.exit(1);
  }

  const target = args[0];
  const projectRoot = process.cwd();
  const result = getContext(projectRoot, target);

  console.log(JSON.stringify(result, null, 2));
}
