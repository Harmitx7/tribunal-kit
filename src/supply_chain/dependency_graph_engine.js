'use strict';

/**
 * dependency_graph_engine.js — Dependency Tree, DAG & Transitive Exposure Engine
 * ==============================================================================
 * Domain: Supply Chain Intelligence (supply-chain-intelligence)
 *
 * Responsibilities:
 * 1. Parse manifests (package.json, Cargo.toml) and lockfiles (package-lock.json, Cargo.lock).
 * 2. Construct directed dependency graph with nodes and directed edges.
 * 3. Classify components as Direct (depth 0) or Transitive (depth >= 1).
 * 4. Detect dependency cycles with cycle trace paths.
 * 5. Compute transitive blast radius and fan-in / fan-out metrics.
 * 6. Generate deterministic dependency chains from root to any transitive leaf.
 */

const { ComponentSchema } = require('./component_inventory_schemas');

/**
 * Helper to construct a canonical Package URL (PURL).
 */
function buildPurl(ecosystem, name, version) {
  const cleanEco = (ecosystem || 'npm').toLowerCase();
  const cleanName = encodeURIComponent(name).replace(/%40/g, '@').replace(/%2F/g, '/');
  return `pkg:${cleanEco}/${cleanName}@${encodeURIComponent(version)}`;
}

class DependencyGraph {
  constructor() {
    this.nodes = new Map(); // name@version -> ComponentSchema object
    this.edges = new Map(); // name@version -> Set of child name@version
    this.reverseEdges = new Map(); // name@version -> Set of parent name@version
    this.directRootDeps = new Set();
  }

  /**
   * Add a component to the graph.
   */
  addComponent(componentData) {
    const validated = ComponentSchema.parse(componentData);
    const key = `${validated.name}@${validated.version}`;
    this.nodes.set(key, validated);
    if (!this.edges.has(key)) {
      this.edges.set(key, new Set());
    }
    if (!this.reverseEdges.has(key)) {
      this.reverseEdges.set(key, new Set());
    }
    if (validated.direct) {
      this.directRootDeps.add(key);
    }
    return validated;
  }

  /**
   * Add a directed dependency edge: parent depends on child.
   */
  addDependencyEdge(parentKey, childKey) {
    if (!this.edges.has(parentKey)) {
      this.edges.set(parentKey, new Set());
    }
    if (!this.reverseEdges.has(childKey)) {
      this.reverseEdges.set(childKey, new Set());
    }
    this.edges.get(parentKey).add(childKey);
    this.reverseEdges.get(childKey).add(parentKey);
  }

  /**
   * Detect circular dependencies using DFS with recursion stack tracking.
   */
  detectCycles() {
    const visited = new Set();
    const recStack = new Set();
    const cycles = [];
    const path = [];

    const dfs = (node) => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = this.edges.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recStack.has(neighbor)) {
          // Cycle found
          const cycleStartIdx = path.indexOf(neighbor);
          if (cycleStartIdx !== -1) {
            const cyclePath = path.slice(cycleStartIdx).concat(neighbor);
            cycles.push(cyclePath);
          }
        }
      }

      recStack.delete(node);
      path.pop();
    };

    for (const node of this.nodes.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return {
      hasCycles: cycles.length > 0,
      cyclesCount: cycles.length,
      cycles,
    };
  }

  /**
   * Compute dependency depths from roots.
   */
  computeDepths() {
    const depths = new Map();
    const queue = [];

    for (const rootKey of this.directRootDeps) {
      depths.set(rootKey, 0);
      queue.push(rootKey);
    }

    while (queue.length > 0) {
      const current = queue.shift();
      const currentDepth = depths.get(current);
      const children = this.edges.get(current) || new Set();

      for (const child of children) {
        if (!depths.has(child) || depths.get(child) > currentDepth + 1) {
          depths.set(child, currentDepth + 1);
          queue.push(child);
        }
      }
    }

    // Update node objects with depth
    let maxDepth = 0;
    for (const [key, depth] of depths.entries()) {
      const node = this.nodes.get(key);
      if (node) {
        node.depth = depth;
        if (depth > maxDepth) maxDepth = depth;
      }
    }

    return { maxDepth, depths };
  }

  /**
   * Calculate transitive closure & blast radius for a given direct dependency.
   */
  getTransitiveClosure(rootKey) {
    const reachable = new Set();
    const queue = [rootKey];
    const visited = new Set([rootKey]);

    while (queue.length > 0) {
      const current = queue.shift();
      const children = this.edges.get(current) || new Set();
      for (const child of children) {
        if (!visited.has(child)) {
          visited.add(child);
          reachable.add(child);
          queue.push(child);
        }
      }
    }

    return {
      rootKey,
      transitiveCount: reachable.size,
      transitiveComponents: Array.from(reachable),
    };
  }

  /**
   * Find a path from root to target component.
   */
  findDependencyChain(targetKey) {
    for (const rootKey of this.directRootDeps) {
      if (rootKey === targetKey) return [rootKey];

      const queue = [[rootKey]];
      const visited = new Set([rootKey]);

      while (queue.length > 0) {
        const path = queue.shift();
        const current = path[path.length - 1];

        if (current === targetKey) {
          return path;
        }

        const children = this.edges.get(current) || new Set();
        for (const child of children) {
          if (!visited.has(child)) {
            visited.add(child);
            queue.push([...path, child]);
          }
        }
      }
    }
    return [];
  }

  /**
   * Summary metrics for the complete graph.
   */
  getMetrics() {
    const { maxDepth } = this.computeDepths();
    const cycleInfo = this.detectCycles();
    const directCount = this.directRootDeps.size;
    const totalCount = this.nodes.size;
    const transitiveCount = Math.max(0, totalCount - directCount);

    return {
      totalComponents: totalCount,
      directComponents: directCount,
      transitiveComponents: transitiveCount,
      maxDepth,
      hasCycles: cycleInfo.hasCycles,
      cyclesCount: cycleInfo.cyclesCount,
    };
  }
}

/**
 * Builds a DependencyGraph from npm package.json and package-lock.json objects.
 */
function buildNpmDependencyGraph(packageJson, lockfileJson) {
  const graph = new DependencyGraph();
  const directDepNames = new Set([
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.devDependencies || {}),
    ...Object.keys(packageJson.optionalDependencies || {}),
  ]);

  // Handle npm lockfile v2/v3 (packages property)
  if (lockfileJson && lockfileJson.packages) {
    const packages = lockfileJson.packages;
    const keyToPurlMap = new Map();

    for (const [pkgPath, meta] of Object.entries(packages)) {
      if (!pkgPath || pkgPath === '') continue; // skip root entry
      // pkgPath format: "node_modules/lodash" or "node_modules/a/node_modules/b"
      const name = meta.name || pkgPath.split('node_modules/').pop();
      const version = meta.version || '0.0.0';
      const isDirect = directDepNames.has(name) && !pkgPath.includes('/node_modules/', 13);
      const purl = buildPurl('npm', name, version);
      const key = `${name}@${version}`;

      keyToPurlMap.set(pkgPath, key);

      const hashes = {};
      if (meta.integrity) {
        if (meta.integrity.startsWith('sha512-')) hashes.sha512 = meta.integrity;
        else if (meta.integrity.startsWith('sha256-')) hashes.sha256 = meta.integrity;
        else hashes.unknown = meta.integrity;
      }

      graph.addComponent({
        id: `npm-${name.replace(/[^a-zA-Z0-9_-]/g, '_')}-${version}`,
        name,
        version,
        purl,
        ecosystem: 'npm',
        direct: isDirect,
        depth: isDirect ? 0 : 1,
        dependencies: Object.keys(meta.dependencies || {}),
        hashes,
        license: meta.license || 'UNKNOWN',
        resolved: meta.resolved || undefined,
        lifecycleScripts: meta.scripts || {},
        isDeprecated: meta.deprecated ? true : false,
      });
    }

    // Connect edges
    for (const [pkgPath, meta] of Object.entries(packages)) {
      if (!pkgPath || pkgPath === '') continue;
      const parentKey = keyToPurlMap.get(pkgPath);
      if (!parentKey) continue;

      const declaredDeps = meta.dependencies || {};
      for (const [depName] of Object.entries(declaredDeps)) {
        // Find matching child in packages
        for (const [candidatePath, candidateKey] of keyToPurlMap.entries()) {
          const candidateName = candidateKey.split('@')[0];
          if (candidateName === depName) {
            graph.addDependencyEdge(parentKey, candidateKey);
            break;
          }
        }
      }
    }
  } else if (lockfileJson && lockfileJson.dependencies) {
    // Handle npm lockfile v1 (nested dependencies tree)
    const traverseV1 = (deps, parentKey = null, currentDepth = 0) => {
      for (const [name, meta] of Object.entries(deps)) {
        const version = meta.version || '0.0.0';
        const isDirect = currentDepth === 0 && directDepNames.has(name);
        const purl = buildPurl('npm', name, version);
        const key = `${name}@${version}`;

        const hashes = {};
        if (meta.integrity) {
          if (meta.integrity.startsWith('sha512-')) hashes.sha512 = meta.integrity;
          else if (meta.integrity.startsWith('sha256-')) hashes.sha256 = meta.integrity;
        }

        graph.addComponent({
          id: `npm-${name.replace(/[^a-zA-Z0-9_-]/g, '_')}-${version}`,
          name,
          version,
          purl,
          ecosystem: 'npm',
          direct: isDirect,
          depth: currentDepth,
          dependencies: Object.keys(meta.requires || meta.dependencies || {}),
          hashes,
          license: 'UNKNOWN',
          resolved: meta.resolved,
        });

        if (parentKey) {
          graph.addDependencyEdge(parentKey, key);
        }

        if (meta.dependencies) {
          traverseV1(meta.dependencies, key, currentDepth + 1);
        }
      }
    };
    traverseV1(lockfileJson.dependencies);
  } else {
    // Fallback: direct dependencies from package.json only
    for (const [name, semverConstraint] of Object.entries(packageJson.dependencies || {})) {
      const cleanVer = semverConstraint.replace(/[\^~>=<]/g, '') || '1.0.0';
      const purl = buildPurl('npm', name, cleanVer);
      graph.addComponent({
        id: `npm-${name.replace(/[^a-zA-Z0-9_-]/g, '_')}-${cleanVer}`,
        name,
        version: cleanVer,
        purl,
        ecosystem: 'npm',
        direct: true,
        depth: 0,
        dependencies: [],
        hashes: {},
        license: 'UNKNOWN',
      });
    }
  }

  graph.computeDepths();
  return graph;
}

module.exports = {
  DependencyGraph,
  buildNpmDependencyGraph,
  buildPurl,
};

