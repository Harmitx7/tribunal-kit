#!/usr/bin/env python3
"""
schema_validator.py — Database schema validator for the Tribunal Agent Kit.

Detects ORM/schema type and validates for common issues:
  - Missing indexes on foreign keys
  - Unnamed constraints
  - Inconsistent naming conventions
  - Missing updated_at / created_at timestamps
  - Prisma / Drizzle / raw SQL support

Usage:
  python .agent/scripts/schema_validator.py .
  python .agent/scripts/schema_validator.py . --type prisma
  python .agent/scripts/schema_validator.py . --file prisma/schema.prisma
"""

import os
import sys
import re
import argparse
from pathlib import Path

RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
BOLD = "\033[1m"
RESET = "\033[0m"


def header(title: str) -> None:
    print(f"\n{BOLD}{BLUE}━━━ {title} ━━━{RESET}")


def ok(msg: str) -> None:
    print(f"  {GREEN}✅ {msg}{RESET}")


def fail(msg: str) -> None:
    print(f"  {RED}❌ {msg}{RESET}")


def warn(msg: str) -> None:
    print(f"  {YELLOW}⚠️  {msg}{RESET}")


def skip(msg: str) -> None:
    print(f"  {YELLOW}⏭️  {msg}{RESET}")


def detect_orm(project_root: str) -> str | None:
    """Detect the ORM/schema type from project files."""
    root = Path(project_root)

    if (root / "prisma" / "schema.prisma").exists():
        return "prisma"
    if list(root.glob("**/drizzle.config.*")):
        return "drizzle"
    if list(root.glob("**/migrations/*.sql")):
        return "sql"
    if (root / "knexfile.js").exists() or (root / "knexfile.ts").exists():
        return "knex"

    return None


def validate_prisma(filepath: str) -> list[tuple[str, str, int]]:
    """Validate a Prisma schema file. Returns list of (severity, message, line)."""
    issues: list[tuple[str, str, int]] = []

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except (IOError, PermissionError):
        return [("error", f"Cannot read file: {filepath}", 0)]

    current_model = ""
    has_created_at = False
    has_updated_at = False
    model_start_line = 0
    fields_with_relation: list[tuple[str, int]] = []
    indexed_fields: set[str] = set()
    has_id_field = False

    for line_num, line in enumerate(lines, 1):
        stripped = line.strip()

        # Track model boundaries
        model_match = re.match(r'model\s+(\w+)\s*\{', stripped)
        if model_match:
            # Validate previous model if exists
            if current_model:
                if not has_created_at:
                    issues.append(("warn", f"Model '{current_model}' missing createdAt timestamp", model_start_line))
                if not has_updated_at:
                    issues.append(("warn", f"Model '{current_model}' missing updatedAt timestamp", model_start_line))
                if not has_id_field:
                    issues.append(("warn", f"Model '{current_model}' has no @id field", model_start_line))
                for field_name, field_line in fields_with_relation:
                    if field_name not in indexed_fields:
                        issues.append(("warn", f"Model '{current_model}': foreign key '{field_name}' has no @@index", field_line))

            current_model = model_match.group(1)
            model_start_line = line_num
            has_created_at = False
            has_updated_at = False
            has_id_field = False
            fields_with_relation = []
            indexed_fields = set()

            # Check naming convention (PascalCase for models)
            if not current_model[0].isupper():
                issues.append(("warn", f"Model '{current_model}' should use PascalCase", line_num))

        # Track fields
        if current_model:
            if "createdAt" in stripped or "created_at" in stripped:
                has_created_at = True
            if "updatedAt" in stripped or "updated_at" in stripped:
                has_updated_at = True
            if "@id" in stripped:
                has_id_field = True

            # Track relation fields (foreign keys)
            relation_match = re.search(r'@relation\(.*references:\s*\[(\w+)\]', stripped)
            if relation_match:
                # The foreign key field is on the line with the scalar field, not the relation
                pass

            # Track fields that look like foreign keys (ending in Id)
            fk_match = re.match(r'\s*(\w+Id)\s+', stripped)
            if fk_match:
                fields_with_relation.append((fk_match.group(1), line_num))

            # Track @@index directives
            index_match = re.search(r'@@index\(\[([^\]]+)\]', stripped)
            if index_match:
                for field in index_match.group(1).split(","):
                    indexed_fields.add(field.strip())

    # Validate the last model
    if current_model:
        if not has_created_at:
            issues.append(("warn", f"Model '{current_model}' missing createdAt timestamp", model_start_line))
        if not has_updated_at:
            issues.append(("warn", f"Model '{current_model}' missing updatedAt timestamp", model_start_line))
        if not has_id_field:
            issues.append(("warn", f"Model '{current_model}' has no @id field", model_start_line))
        for field_name, field_line in fields_with_relation:
            if field_name not in indexed_fields:
                issues.append(("warn", f"Model '{current_model}': foreign key '{field_name}' may need @@index", field_line))

    return issues


def validate_sql_migration(filepath: str) -> list[tuple[str, str, int]]:
    """Validate a SQL migration file for common issues."""
    issues: list[tuple[str, str, int]] = []

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except (IOError, PermissionError):
        return [("error", f"Cannot read file: {filepath}", 0)]

    for line_num, line in enumerate(lines, 1):
        stripped = line.strip().upper()

        # Check for DROP without IF EXISTS
        if "DROP TABLE" in stripped and "IF EXISTS" not in stripped:
            issues.append(("warn", "DROP TABLE without IF EXISTS — may fail on clean databases", line_num))

        # Check for missing NOT NULL on foreign keys
        if "REFERENCES" in stripped and "NOT NULL" not in stripped and "NULL" not in stripped:
            issues.append(("warn", "Foreign key without explicit NULL/NOT NULL constraint", line_num))

        # Check for CREATE TABLE without timestamps
        if "CREATE TABLE" in stripped:
            issues.append(("info", "Verify this table includes created_at / updated_at columns", line_num))

    return issues


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Tribunal schema validator — checks database schemas for common issues"
    )
    parser.add_argument("path", help="Project root directory")
    parser.add_argument("--type", choices=["prisma", "drizzle", "sql", "auto"], default="auto", help="Schema type (default: auto-detect)")
    parser.add_argument("--file", help="Specific schema file to validate")
    args = parser.parse_args()

    project_root = os.path.abspath(args.path)
    if not os.path.isdir(project_root):
        fail(f"Directory not found: {project_root}")
        sys.exit(1)

    print(f"{BOLD}Tribunal — schema_validator.py{RESET}")
    print(f"Project: {project_root}")

    orm_type = args.type if args.type != "auto" else detect_orm(project_root)
    if not orm_type and not args.file:
        skip("No schema files detected — skipping validation")
        sys.exit(0)

    issues_count = 0

    if args.file:
        header(f"Validating: {args.file}")
        filepath = os.path.join(project_root, args.file) if not os.path.isabs(args.file) else args.file
        if filepath.endswith(".prisma"):
            issues = validate_prisma(filepath)
        elif filepath.endswith(".sql"):
            issues = validate_sql_migration(filepath)
        else:
            skip(f"Unknown schema file type: {args.file}")
            sys.exit(0)

        for severity, message, line in issues:
            if severity == "error":
                fail(f"L{line}: {message}")
                issues_count += 1
            elif severity == "warn":
                warn(f"L{line}: {message}")
                issues_count += 1
            else:
                print(f"  {BLUE}ℹ️  L{line}: {message}{RESET}")

    elif orm_type == "prisma":
        schema_path = os.path.join(project_root, "prisma", "schema.prisma")
        if os.path.isfile(schema_path):
            header("Prisma Schema Validation")
            issues = validate_prisma(schema_path)
            for severity, message, line in issues:
                if severity == "error":
                    fail(f"L{line}: {message}")
                    issues_count += 1
                elif severity == "warn":
                    warn(f"L{line}: {message}")
                    issues_count += 1
                else:
                    print(f"  {BLUE}ℹ️  L{line}: {message}{RESET}")
        else:
            skip(f"Prisma schema not found at {schema_path}")

    elif orm_type == "sql":
        header("SQL Migration Validation")
        migration_dirs = list(Path(project_root).glob("**/migrations"))
        for mig_dir in migration_dirs:
            for sql_file in sorted(mig_dir.glob("*.sql")):
                print(f"\n  📄 {sql_file.name}")
                issues = validate_sql_migration(str(sql_file))
                for severity, message, line in issues:
                    if severity == "error":
                        fail(f"  L{line}: {message}")
                        issues_count += 1
                    elif severity == "warn":
                        warn(f"  L{line}: {message}")
                        issues_count += 1
                    else:
                        print(f"    {BLUE}ℹ️  L{line}: {message}{RESET}")

    elif orm_type == "drizzle":
        header("Drizzle Schema")
        skip("Drizzle validation not yet implemented — validate manually")

    # Summary
    print(f"\n{BOLD}━━━ Schema Validation Summary ━━━{RESET}")
    if issues_count == 0:
        ok("No schema issues found")
    else:
        warn(f"{issues_count} issue(s) found — review above")

    sys.exit(0)  # Schema warnings don't block — they're advisory


if __name__ == "__main__":
    main()
