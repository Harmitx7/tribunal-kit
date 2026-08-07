"use strict";

const {
  cmdMinContext,
  cmdDagSchedule,
  cmdContextCompress,
  cmdOptimizeStep,
  cmdImpactTier,
} = require("../../dist/commands/native");

describe("native commands JS fallbacks", () => {
  test("cmdDagSchedule computes concurrent execution waves using topological sort", () => {
    const tasksJson = JSON.stringify([
      { id: "task-1", dependencies: [] },
      { id: "task-2", dependencies: ["task-1"] },
      { id: "task-3", dependencies: ["task-1"] },
      { id: "task-4", dependencies: ["task-2", "task-3"] },
    ]);
    const processArgs = ["node", "tk", "dag-schedule", "--tasks", tasksJson];
    const success = cmdDagSchedule(processArgs, true);
    expect(success).toBe(true);
  });

  test("cmdImpactTier correctly classifies impact tier 0 for trivial changes", () => {
    const processArgs = ["node", "tk", "impact-tier", "--files", "", "--lines", "2"];
    const success = cmdImpactTier(processArgs, true);
    expect(success).toBe(true);
  });

  test("cmdImpactTier elevates to tier 3 for security or auth files", () => {
    const processArgs = ["node", "tk", "impact-tier", "--files", "src/auth.ts", "--lines", "10", "--task", "update JWT"];
    const success = cmdImpactTier(processArgs, true);
    expect(success).toBe(true);
  });
});
