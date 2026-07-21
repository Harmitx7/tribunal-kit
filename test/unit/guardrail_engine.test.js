"use strict";

const {
  validate,
  _ruleFileExists,
  ruleScriptExtension,
  ruleReviewerCount,
  _ruleSkillExists,
  _ruleAgentExists,
  ruleUnresolvedVerify,
  ruleNumericConsistency,
  _ruleImportPhantom,
} = require("../../../.agent/scripts/guardrail_engine");

describe("ruleScriptExtension", () => {
  const manifest = {
    scripts: {
      files: {
        "verify_all.js": ".agent/scripts/verify_all.js",
        "checklist.js": ".agent/scripts/checklist.js",
      },
    },
  };

  test("passes on correct .js extension", () => {
    const content = "We run scripts/verify_all.js to verify.";
    const violations = ruleScriptExtension(content, manifest);
    expect(violations.length).toBe(0);
  });

  test("warns and suggests fix on incorrect .py extension", () => {
    const content = "We run scripts/verify_all.py to verify.";
    const violations = ruleScriptExtension(content, manifest);
    expect(violations.length).toBe(1);
    expect(violations[0].severity).toBe("warning");
    expect(violations[0].autoFixable).toBe(true);
    expect(violations[0].fix.replace).toBe("scripts/verify_all.js");
  });
});

describe("ruleReviewerCount", () => {
  const manifest = {
    agents: {
      reviewer_count: 20,
    },
  };

  test("passes on matching reviewer count", () => {
    const content = "We support 20 reviewers in the pipeline.";
    const violations = ruleReviewerCount(content, manifest);
    expect(violations.length).toBe(0);
  });

  test("warns and suggests fix on mismatched reviewer count", () => {
    const content = "We support 19 reviewers in the pipeline.";
    const violations = ruleReviewerCount(content, manifest);
    expect(violations.length).toBe(1);
    expect(violations[0].severity).toBe("warning");
    expect(violations[0].fix.replace).toContain("20 reviewers");
  });
});

describe("ruleUnresolvedVerify", () => {
  test("passes if no VERIFY tags exist", () => {
    const content = "const x = 42; // some comment";
    const violations = ruleUnresolvedVerify(content);
    expect(violations.length).toBe(0);
  });

  test("fails critical if VERIFY tags are present", () => {
    const content = "const x = 42; // VERIFY: this logic is correct";
    const violations = ruleUnresolvedVerify(content);
    expect(violations.length).toBe(1);
    expect(violations[0].severity).toBe("critical");
    expect(violations[0].message).toContain("this logic is correct");
  });
});

describe("ruleNumericConsistency", () => {
  test("passes if claims match manifest", () => {
    const manifest = {
      numeric_claims: [
        { source: "file.md:L1", claim: "20 reviewers", actual: 20, valid: true }
      ]
    };
    const violations = ruleNumericConsistency("", manifest);
    expect(violations.length).toBe(0);
  });

  test("warns on mismatched claims", () => {
    const manifest = {
      numeric_claims: [
        { source: "file.md:L1", claim: "19 reviewers", actual: 20, valid: false }
      ]
    };
    const violations = ruleNumericConsistency("", manifest);
    expect(violations.length).toBe(1);
    expect(violations[0].severity).toBe("warning");
    expect(violations[0].fix.replace).toBe("20 reviewers");
  });
});

describe("validate main wrapper", () => {
  const manifest = {
    agents: { reviewer_count: 20 },
    scripts: { files: { "verify_all.js": ".agent/scripts/verify_all.js" } }
  };

  test("aggregates pass result", () => {
    const content = "Clean text. 20 reviewers. scripts/verify_all.js";
    const result = validate(content, manifest, { rules: ["reviewer-count", "script-extension"] });
    expect(result.passed).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  test("reports critical errors", () => {
    const content = "Code with // VERIFY: error";
    const result = validate(content, manifest, { rules: ["unresolved-verify"] });
    expect(result.passed).toBe(false);
    expect(result.violations.some(v => v.severity === "critical")).toBe(true);
  });

  test("applies auto-fixes when requested", () => {
    const content = "We have 19 reviewers and run scripts/verify_all.py";
    const result = validate(content, manifest, {
      rules: ["reviewer-count", "script-extension"],
      autoFix: true
    });
    expect(result.autoFixedContent).toBe("We have 20 reviewers and run scripts/verify_all.js");
  });
});
