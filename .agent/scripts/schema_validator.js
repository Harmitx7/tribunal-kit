#!/usr/bin/env node
/**
 * schema_validator.js — Database schema validator for the Tribunal Agent Kit.
 *
 * Usage:
 *   node .agent/scripts/schema_validator.js .
 *   node .agent/scripts/schema_validator.js . --type prisma
 *   node .agent/scripts/schema_validator.js . --file prisma/schema.prisma
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { RED, GREEN, YELLOW, BLUE, BOLD, RESET } = require('./colors.js');

function header(title) {
    console.log(`\n${BOLD}${BLUE}━━━ ${title} ━━━${RESET}`);
}

function ok(msg) {
    console.log(`  ${GREEN}✅ ${msg}${RESET}`);
}

function fail(msg) {
    console.log(`  ${RED}❌ ${msg}${RESET}`);
}

function warn(msg) {
    console.log(`  ${YELLOW}⚠️  ${msg}${RESET}`);
}

function skip(msg) {
    console.log(`  ${YELLOW}⏭️  ${msg}${RESET}`);
}

function detectOrm(projectRoot) {
    if (fs.existsSync(path.join(projectRoot, "prisma", "schema.prisma"))) {
        return "prisma";
    }

    function searchFor(dir, patterns) {
        let items;
        try {
            items = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return false;
        }

        for (const item of items) {
            if (item.isDirectory() && !["node_modules", ".git"].includes(item.name)) {
                if (searchFor(path.join(dir, item.name), patterns)) return true;
                if (item.name === "migrations") {
                    try {
                        const mFiles = fs.readdirSync(path.join(dir, item.name));
                        if (mFiles.some(f => f.endsWith(".sql"))) return "sql";
                    } catch {}
                }
            } else {
                for (const p of patterns) {
                    if (p.test(item.name)) return p.type;
                }
            }
        }
        return null;
    }

    const type = searchFor(projectRoot, [{ test: name => name.startsWith("drizzle.config."), type: "drizzle" }]);
    if (type) return type;

    if (fs.existsSync(path.join(projectRoot, "knexfile.js")) || fs.existsSync(path.join(projectRoot, "knexfile.ts"))) {
        return "knex";
    }

    return null;
}

function validatePrisma(filepath) {
    const issues = [];
    let lines;
    try {
        lines = fs.readFileSync(filepath, 'utf8').split('\n');
    } catch {
        return [["error", `Cannot read file: ${filepath}`, 0]];
    }

    let currentModel = "";
    let hasCreatedAt = false;
    let hasUpdatedAt = false;
    let modelStartLine = 0;
    let fieldsWithRelation = [];
    let indexedFields = new Set();
    let hasIdField = false;

    for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1;
        const line = lines[i];
        const stripped = line.trim();

        const modelMatch = stripped.match(/^model\s+(\w+)\s*\{/);
        if (modelMatch) {
            if (currentModel) {
                if (!hasCreatedAt) issues.push(["warn", `Model '${currentModel}' missing createdAt timestamp`, modelStartLine]);
                if (!hasUpdatedAt) issues.push(["warn", `Model '${currentModel}' missing updatedAt timestamp`, modelStartLine]);
                if (!hasIdField) issues.push(["warn", `Model '${currentModel}' has no @id field`, modelStartLine]);
                for (const [fieldName, fieldLine] of fieldsWithRelation) {
                    if (!indexedFields.has(fieldName)) {
                        issues.push(["warn", `Model '${currentModel}': foreign key '${fieldName}' has no @@index`, fieldLine]);
                    }
                }
            }

            currentModel = modelMatch[1];
            modelStartLine = lineNum;
            hasCreatedAt = false;
            hasUpdatedAt = false;
            hasIdField = false;
            fieldsWithRelation = [];
            indexedFields.clear();

            if (currentModel[0] !== currentModel[0].toUpperCase()) {
                issues.push(["warn", `Model '${currentModel}' should use PascalCase`, lineNum]);
            }
        }

        if (currentModel) {
            if (stripped.includes("createdAt") || stripped.includes("created_at")) hasCreatedAt = true;
            if (stripped.includes("updatedAt") || stripped.includes("updated_at")) hasUpdatedAt = true;
            if (stripped.includes("@id")) hasIdField = true;

            const fkMatch = stripped.match(/^\s*(\w+Id)\s+(Int|String|BigInt)/);
            if (fkMatch && !stripped.includes("@relation")) {
                fieldsWithRelation.push([fkMatch[1], lineNum]);
            }

            const indexMatch = stripped.match(/@@index\(\[([^\]]+)\]/);
            if (indexMatch) {
                for (const field of indexMatch[1].split(",")) {
                    indexedFields.add(field.trim());
                }
            }
        }
    }

    if (currentModel) {
        if (!hasCreatedAt) issues.push(["warn", `Model '${currentModel}' missing createdAt timestamp`, modelStartLine]);
        if (!hasUpdatedAt) issues.push(["warn", `Model '${currentModel}' missing updatedAt timestamp`, modelStartLine]);
        if (!hasIdField) issues.push(["warn", `Model '${currentModel}' has no @id field`, modelStartLine]);
        for (const [fieldName, fieldLine] of fieldsWithRelation) {
            if (!indexedFields.has(fieldName)) {
                issues.push(["warn", `Model '${currentModel}': foreign key '${fieldName}' may need @@index`, fieldLine]);
            }
        }
    }

    return issues;
}

function validateSqlMigration(filepath) {
    const issues = [];
    let lines;
    try {
        lines = fs.readFileSync(filepath, 'utf8').split('\n');
    } catch {
        return [["error", `Cannot read file: ${filepath}`, 0]];
    }

    for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1;
        const stripped = lines[i].trim().toUpperCase();

        if (stripped.includes("DROP TABLE") && !stripped.includes("IF EXISTS")) {
            issues.push(["warn", "DROP TABLE without IF EXISTS — may fail on clean databases", lineNum]);
        }
        if (stripped.includes("REFERENCES") && !stripped.includes("NOT NULL") && !stripped.includes("NULL")) {
            issues.push(["warn", "Foreign key without explicit NULL/NOT NULL constraint", lineNum]);
        }
        if (stripped.includes("CREATE TABLE")) {
            issues.push(["info", "Verify this table includes created_at / updated_at columns", lineNum]);
        }
    }

    return issues;
}

function main() {
    const args = process.argv.slice(2);
    let targetPath = null;
    let typeArg = "auto";
    let fileArg = null;

    let i = 0;
    while (i < args.length) {
        if (args[i] === '--type' && i + 1 < args.length) typeArg = args[++i];
        else if (args[i] === '--file' && i + 1 < args.length) fileArg = args[++i];
        else if (!targetPath && !args[i].startsWith('-')) targetPath = args[i];
        i++;
    }

    if (!targetPath) {
        console.log("Usage: node schema_validator.js <path> [--type <prisma|drizzle|sql>] [--file <filepath>]");
        process.exit(1);
    }

    const projectRoot = path.resolve(targetPath);
    if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
        fail(`Directory not found: ${projectRoot}`);
        process.exit(1);
    }

    console.log(`${BOLD}Tribunal — schema_validator.js${RESET}`);
    console.log(`Project: ${projectRoot}`);

    const ormType = typeArg !== "auto" ? typeArg : detectOrm(projectRoot);
    if (!ormType && !fileArg) {
        skip("No schema files detected — skipping validation");
        process.exit(0);
    }

    let issuesCount = 0;

    if (fileArg) {
        header(`Validating: ${fileArg}`);
        const filepath = path.isAbsolute(fileArg) ? fileArg : path.join(projectRoot, fileArg);
        let issues = [];
        if (filepath.endsWith(".prisma")) issues = validatePrisma(filepath);
        else if (filepath.endsWith(".sql")) issues = validateSqlMigration(filepath);
        else {
            skip(`Unknown schema file type: ${fileArg}`);
            process.exit(0);
        }

        for (const [severity, message, line] of issues) {
            if (severity === "error") { fail(`L${line}: ${message}`); issuesCount++; }
            else if (severity === "warn") { warn(`L${line}: ${message}`); issuesCount++; }
            else console.log(`  ${BLUE}ℹ️  L${line}: ${message}${RESET}`);
        }
    } else if (ormType === "prisma") {
        const schemaPath = path.join(projectRoot, "prisma", "schema.prisma");
        if (fs.existsSync(schemaPath)) {
            header("Prisma Schema Validation");
            const issues = validatePrisma(schemaPath);
            for (const [severity, message, line] of issues) {
                if (severity === "error") { fail(`L${line}: ${message}`); issuesCount++; }
                else if (severity === "warn") { warn(`L${line}: ${message}`); issuesCount++; }
                else console.log(`  ${BLUE}ℹ️  L${line}: ${message}${RESET}`);
            }
        } else {
            skip(`Prisma schema not found at ${schemaPath}`);
        }
    } else if (ormType === "sql") {
        header("SQL Migration Validation");
        // Very basic recursion for migrations dir
        function findMigrations(dir) {
            let res = [];
            try {
                const items = fs.readdirSync(dir, { withFileTypes: true });
                for (const item of items) {
                    if (item.isDirectory() && !["node_modules", ".git"].includes(item.name)) {
                        if (item.name === "migrations") {
                            const sqls = fs.readdirSync(path.join(dir, item.name)).filter(f => f.endsWith(".sql")).map(f => path.join(dir, item.name, f));
                            res.push(...sqls);
                        } else {
                            res.push(...findMigrations(path.join(dir, item.name)));
                        }
                    }
                }
            } catch {}
            return res;
        }

        const mFiles = findMigrations(projectRoot).sort();
        for (const sqlFile of mFiles) {
            console.log(`\n  📄 ${path.basename(sqlFile)}`);
            const issues = validateSqlMigration(sqlFile);
            for (const [severity, message, line] of issues) {
                if (severity === "error") { fail(`  L${line}: ${message}`); issuesCount++; }
                else if (severity === "warn") { warn(`  L${line}: ${message}`); issuesCount++; }
                else console.log(`    ${BLUE}ℹ️  L${line}: ${message}${RESET}`);
            }
        }
    } else if (ormType === "drizzle") {
        header("Drizzle Schema");
        skip("Drizzle validation not yet implemented — validate manually");
    }

    console.log(`\n${BOLD}━━━ Schema Validation Summary ━━━${RESET}`);
    if (issuesCount === 0) ok("No schema issues found");
    else warn(`${issuesCount} issue(s) found — review above`);

    process.exit(0);
}

if (require.main === module) {
    main();
}
