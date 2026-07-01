/**
 * inner_loop_validator.test.js — Unit tests for the Inner-Loop Validator
 * Tests: scanCode, computeVerdict, buildSelfHealingInstructions, validate
 */

const {
  scanCode,
  computeVerdict,
  buildSelfHealingInstructions,
  validate,
} = require("../../.agent/scripts/inner_loop_validator");

describe("inner_loop_validator.js", () => {
  // ── scanCode ──────────────────────────────────────────────────────────

  describe("scanCode()", () => {
    it("should return empty array for clean code", () => {
      const findings = scanCode("const x = 1;\nconst y = x + 2;\n");
      expect(findings).toEqual([]);
    });

    it("should detect eval() as high severity", () => {
      const findings = scanCode("const result = eval(userInput);");
      const evalFinding = findings.find((f) => f.category === "Code Injection");
      expect(evalFinding).toBeDefined();
      expect(evalFinding.severity).toBe("high");
      expect(evalFinding.line).toBe(1);
      expect(evalFinding.source).toBe("security_scan");
    });

    it("should detect innerHTML as high severity XSS", () => {
      const findings = scanCode("el.innerHTML = userInput;");
      const xssFinding = findings.find((f) => f.category === "XSS");
      expect(xssFinding).toBeDefined();
      expect(xssFinding.severity).toBe("high");
    });

    it("should detect hardcoded passwords as critical", () => {
      const findings = scanCode('const password = "supersecret123";');
      const secretFinding = findings.find(
        (f) => f.category === "Hardcoded Secret",
      );
      expect(secretFinding).toBeDefined();
      expect(secretFinding.severity).toBe("critical");
    });

    it("should detect empty catch blocks as medium severity", () => {
      const findings = scanCode("try { foo(); } catch (e) {}");
      const catchFinding = findings.find(
        (f) => f.category === "Error Handling",
      );
      expect(catchFinding).toBeDefined();
      expect(catchFinding.severity).toBe("medium");
    });

    it("should detect throw string as low severity", () => {
      const findings = scanCode('throw "something went wrong";');
      const throwFinding = findings.find((f) => f.category === "Error Quality");
      expect(throwFinding).toBeDefined();
      expect(throwFinding.severity).toBe("low");
    });

    it("should skip lines that are pure comments", () => {
      const code = "// eval(dangerousInput);\nconst safe = 1;";
      const findings = scanCode(code);
      // eval is in a comment, should not be flagged
      const evalFinding = findings.find((f) => f.category === "Code Injection");
      expect(evalFinding).toBeUndefined();
    });

    it("should report correct line numbers", () => {
      const code = 'const a = 1;\nconst b = 2;\nconst r = eval("bad");';
      const findings = scanCode(code);
      const evalFinding = findings.find((f) => f.category === "Code Injection");
      expect(evalFinding).toBeDefined();
      expect(evalFinding.line).toBe(3);
    });

    it("should detect VERIFY flags as low/informational", () => {
      const findings = scanCode(
        "const x = someApi(); // VERIFY: does this exist?",
      );
      const verifyFinding = findings.find(
        (f) => f.category === "Verification Flag",
      );
      expect(verifyFinding).toBeDefined();
      expect(verifyFinding.severity).toBe("low");
    });

    it("should detect browser globals in Node context", () => {
      const findings = scanCode("const w = window.innerWidth;");
      const browserFinding = findings.find(
        (f) => f.category === "Environment Check",
      );
      expect(browserFinding).toBeDefined();
    });
  });

  // ── computeVerdict ────────────────────────────────────────────────────

  describe("computeVerdict()", () => {
    it("should return APPROVED for no findings", () => {
      const result = computeVerdict([]);
      expect(result.verdict).toBe("APPROVED");
      expect(result.passed).toBe(true);
    });

    it("should return APPROVED for low-only findings", () => {
      const findings = [
        {
          severity: "low",
          category: "Error Quality",
          line: 1,
          message: "test",
        },
      ];
      const result = computeVerdict(findings);
      expect(result.verdict).toBe("APPROVED");
      expect(result.passed).toBe(true);
    });

    it("should return WARNING for medium findings", () => {
      const findings = [
        {
          severity: "medium",
          category: "Error Handling",
          line: 1,
          message: "test",
        },
      ];
      const result = computeVerdict(findings);
      expect(result.verdict).toBe("WARNING");
      expect(result.passed).toBe(true);
    });

    it("should return REJECTED for high findings", () => {
      const findings = [
        {
          severity: "high",
          category: "Code Injection",
          line: 1,
          message: "test",
        },
      ];
      const result = computeVerdict(findings);
      expect(result.verdict).toBe("REJECTED");
      expect(result.passed).toBe(false);
    });

    it("should return REJECTED for critical findings", () => {
      const findings = [
        {
          severity: "critical",
          category: "Hardcoded Secret",
          line: 1,
          message: "test",
        },
      ];
      const result = computeVerdict(findings);
      expect(result.verdict).toBe("REJECTED");
      expect(result.passed).toBe(false);
    });

    it("should use worst severity when mixed findings exist", () => {
      const findings = [
        { severity: "low", category: "Info", line: 1, message: "ok" },
        { severity: "critical", category: "Secret", line: 2, message: "bad" },
      ];
      const result = computeVerdict(findings);
      expect(result.verdict).toBe("REJECTED");
      expect(result.passed).toBe(false);
    });

    it("should not let Verification Flags block approval", () => {
      const findings = [
        {
          severity: "low",
          category: "Verification Flag",
          line: 1,
          message: "verify",
        },
      ];
      const result = computeVerdict(findings);
      expect(result.verdict).toBe("APPROVED");
      expect(result.passed).toBe(true);
    });
  });

  // ── buildSelfHealingInstructions ───────────────────────────────────────

  describe("buildSelfHealingInstructions()", () => {
    it("should return null when no blocking findings", () => {
      const result = buildSelfHealingInstructions([
        {
          severity: "low",
          category: "Info",
          line: 1,
          message: "test",
          fix: "do nothing",
        },
      ]);
      expect(result).toBeNull();
    });

    it("should return null for empty array", () => {
      expect(buildSelfHealingInstructions([])).toBeNull();
    });

    it("should generate instructions for critical findings", () => {
      const result = buildSelfHealingInstructions([
        {
          severity: "critical",
          category: "Hardcoded Secret",
          line: 5,
          message: "password hardcoded",
          fix: "Use env vars",
        },
      ]);
      expect(result).toContain("CRITICAL");
      expect(result).toContain("Line 5");
      expect(result).toContain("Hardcoded Secret");
      expect(result).toContain("Use env vars");
    });

    it("should generate instructions for high findings", () => {
      const result = buildSelfHealingInstructions([
        {
          severity: "high",
          category: "Code Injection",
          line: 3,
          message: "eval used",
          fix: "Remove eval",
        },
      ]);
      expect(result).toContain("HIGH");
      expect(result).toContain("Line 3");
    });

    it("should skip medium findings in instructions", () => {
      const result = buildSelfHealingInstructions([
        {
          severity: "medium",
          category: "Error Handling",
          line: 1,
          message: "empty catch",
          fix: "Add handler",
        },
      ]);
      expect(result).toBeNull();
    });
  });

  // ── validate (integration of scan + verdict + healing) ────────────────

  describe("validate()", () => {
    it("should return APPROVED for clean code", () => {
      const result = validate("const x = 1;\nconst y = x + 2;");
      expect(result.verdict).toBe("APPROVED");
      expect(result.passed).toBe(true);
      expect(result.issues).toEqual([]);
      expect(result.self_healing_instructions).toBeNull();
    });

    it("should return REJECTED for code with eval", () => {
      const result = validate("const x = eval(input);");
      expect(result.verdict).toBe("REJECTED");
      expect(result.passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.self_healing_instructions).not.toBeNull();
    });

    it("should handle empty/null input gracefully", () => {
      const result = validate("");
      expect(result.verdict).toBe("APPROVED");
      expect(result.passed).toBe(true);
      expect(result.summary).toContain("No code provided");
    });

    it("should handle null input", () => {
      const result = validate(null);
      expect(result.verdict).toBe("APPROVED");
      expect(result.passed).toBe(true);
    });

    it("should include meta with line count and timestamp", () => {
      const result = validate("const a = 1;\nconst b = 2;\nconst c = 3;");
      expect(result.meta).toBeDefined();
      expect(result.meta.lines_scanned).toBe(3);
      expect(result.meta.lang).toBe("js");
      expect(result.meta.timestamp).toBeDefined();
    });

    it("should sort issues by severity (critical first)", () => {
      const code = [
        'throw "bad";', // low: Error Quality
        'const password = "secret123";', // critical: Hardcoded Secret
        "const x = eval(input);", // high: Code Injection
      ].join("\n");
      const result = validate(code);
      const severities = result.issues.map((i) => i.severity);
      const rankOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      for (let i = 1; i < severities.length; i++) {
        expect(rankOrder[severities[i]]).toBeGreaterThanOrEqual(
          rankOrder[severities[i - 1]],
        );
      }
    });

    it("should generate summary with issue counts", () => {
      const result = validate('const password = "secret";');
      expect(result.summary).toBeTruthy();
      expect(result.summary).toContain("critical");
    });
  });
});
