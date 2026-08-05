const {
  DECISION_HIERARCHY,
  COMPLEXITY_FLAG_TYPES,
  STRICTNESS_CONFIGS,
  calculateChangeBudget,
  calculateMinimalityScore,
  detectComplexityFlags,
  classifyProposal,
  evaluateMinimalChange,
} = require("../../.agent/scripts/minimal_change_engine");

describe("minimal_change_engine.js", () => {
  describe("Decision Hierarchy Order", () => {
    it("should define exact 7-level evaluation order", () => {
      expect(DECISION_HIERARCHY).toEqual([
        "NO_CHANGE",
        "REUSE",
        "CONFIGURE",
        "DELETE",
        "MODIFY",
        "EXTEND",
        "CREATE",
      ]);
    });
  });

  describe("Complexity Flag Definitions", () => {
    it("should define all 14 standardized complexity flag types", () => {
      expect(COMPLEXITY_FLAG_TYPES).toHaveLength(14);
      expect(COMPLEXITY_FLAG_TYPES).toContain("UNNECESSARY_ABSTRACTION");
      expect(COMPLEXITY_FLAG_TYPES).toContain("DUPLICATE_FUNCTIONALITY");
      expect(COMPLEXITY_FLAG_TYPES).toContain("DEPENDENCY_BLOAT");
      expect(COMPLEXITY_FLAG_TYPES).toContain("FILE_PROLIFERATION");
    });
  });

  describe("Change Budget Calculation", () => {
    it("should default footprint values gracefully", () => {
      const budget = calculateChangeBudget();
      expect(budget.files_added).toBe(0);
      expect(budget.files_modified).toBe(0);
      expect(budget.dependencies_added).toBe(0);
    });

    it("should aggregate explicit proposal metrics accurately", () => {
      const budget = calculateChangeBudget({
        files_added: 2,
        files_modified: 3,
        dependencies_added: 1,
        new_abstractions: 1,
        estimated_lines_added: 45,
      });
      expect(budget.files_added).toBe(2);
      expect(budget.files_modified).toBe(3);
      expect(budget.dependencies_added).toBe(1);
      expect(budget.new_abstractions).toBe(1);
    });
  });

  describe("Minimality Scoring (0-100)", () => {
    it("should award high score for small modification and code reuse", () => {
      const budget = calculateChangeBudget({ files_modified: 1, estimated_lines_added: 10 });
      const score = calculateMinimalityScore(budget, "MODIFY", []);
      expect(score).toBeGreaterThanOrEqual(90);
    });

    it("should penalize file proliferation and unnecessary dependencies", () => {
      const budget = calculateChangeBudget({ files_added: 5, dependencies_added: 2, new_abstractions: 3 });
      const score = calculateMinimalityScore(budget, "CREATE", [
        { severity: "high" },
        { severity: "high" },
      ]);
      expect(score).toBeLessThan(60);
    });
  });

  describe("Classification Engine", () => {
    it("should classify no-op change as NO_CHANGE", () => {
      const classification = classifyProposal("task", { files_added: 0, files_modified: 0, files_deleted: 0 }, []);
      expect(classification).toBe("NO_CHANGE");
    });

    it("should classify existing match as REUSE", () => {
      const classification = classifyProposal("task", { files_added: 0, files_modified: 0 }, [{ name: "existingUtil" }]);
      expect(classification).toBe("REUSE");
    });

    it("should classify single file tweak as MODIFY", () => {
      const classification = classifyProposal("task", { files_added: 0, files_modified: 1 }, []);
      expect(classification).toBe("MODIFY");
    });
  });

  describe("Full Evaluation Pipeline", () => {
    it("should evaluate minimal change proposal and return structured audit", () => {
      const result = evaluateMinimalChange("add request retry", { files_modified: 1, estimated_lines_added: 15 }, { mode: "balanced" });
      expect(result).toHaveProperty("minimality_classification");
      expect(result).toHaveProperty("minimality_score");
      expect(result).toHaveProperty("change_budget");
      expect(result).toHaveProperty("complexity_flags");
      expect(result.passed).toBe(true);
    });
  });
});
