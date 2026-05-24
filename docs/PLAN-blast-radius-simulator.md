# Implementation Plan: Pre-Crime Blast Radius Simulator

## 1. Objective Context
Add a "Pre-Crime" Blast Radius Simulator feature to Tribunal-Kit that intercepts file modifications (or can be called manually via CLI) to query the Knowledge Graph and warn the user of downstream impacts before any AI generation takes place. This doubles down on the framework's anti-hallucination ethos.

## 2. Architectural Handoff
- **Core Engine:** Leverage the existing `.agent/scripts/graph_builder.js` output (which already calculates `blastRadius`, `riskScore`, and `dependents` for each file) stored in `.agent/history/graph-cache.json`.
- **New Simulator Script:** Build a standalone zero-dependency Node.js script (`.agent/scripts/blast_radius_simulator.js`) to parse the target file, perform a recursive downstream traversal from the cached graph data, and generate a beautifully formatted ANSI terminal warning outlining impacted dependencies and total risk score.
- **CLI Integration:** Integrate the simulator into `bin/tribunal-kit.js` under a new command (e.g., `tribunal-kit simulate <filepath>`).

## 3. Dependency Tree Execution Order
### Wave 1: Simulator Script (The Core)
1. Build `.agent/scripts/blast_radius_simulator.js`.
2. Implement logic to load `.agent/history/graph-cache.json`, accept a target file path, and resolve its downstream dependents.
3. Add ANSI-styled formatting to present the findings (using `_colors.js`).

### Wave 2: CLI Integration (The Bridge)
1. Update `bin/tribunal-kit.js` to parse the new `simulate` command.
2. Ensure the command passes the target file to the simulator script gracefully.
3. Update `cmdHelp()` to include the new command.

### Wave 3: Verification & Polish
1. Create a unit test `test/unit/blast_radius_simulator.test.js`.
2. Ensure the script fails gracefully if the graph cache is missing or out of date.

## 4. File Blueprint
- `[NEW]` `.agent/scripts/blast_radius_simulator.js`
- `[MODIFY]` `bin/tribunal-kit.js`
- `[NEW]` `test/unit/blast_radius_simulator.test.js`

## 5. Verification Protocol
1. **CLI Execution Test:** Run `node bin/tribunal-kit.js simulate auth.js` and verify it correctly parses the graph cache, identifying dependents and displaying a color-coded risk warning.
2. **Missing Cache Test:** Run the script against an empty or missing cache and verify it fails gracefully with an instruction to run the graph builder first.
3. **Automated Unit Tests:** Verify `npm run test:unit` executes the simulator tests successfully with >90% coverage for the new module.
