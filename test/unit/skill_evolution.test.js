const { detectSignals } = require("../../.agent/scripts/signal_detector");
const {
  semanticDelta,
  architecturalWeight,
} = require("../../.agent/scripts/skill_evolution");

describe("signal_detector.js", () => {
  it("should extract signals from JS stack trace", () => {
    const log = `TypeError: Cannot read property 'split' of undefined\n    at processFile (src/utils.js:45:20)\n    at Object.run (src/main.js:10:5)`;
    const signals = detectSignals(log);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0].type).toBe("log_error");
    expect(signals[0].file).toBe("src/utils.js");
    expect(signals[0].line).toBe(45);
  });

  it("should extract signals from Python traceback", () => {
    const log = `Traceback (most recent call last):\n  File "src/main.py", line 12, in <module>\n    foo()\nZeroDivisionError: division by zero`;
    const signals = detectSignals(log);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0].type).toBe("log_error");
    expect(signals[0].file).toBe("src/main.py");
    expect(signals[0].line).toBe(12);
  });

  it("should extract signals from Rust compiler error", () => {
    const log = `error[E0308]: mismatched types\n  --> src/main.rs:12:34\n   |\n12 |     let x: u32 = "hello";\n   |                  ^^^^^^^ expected \`u32\`, found \`&str\``;
    const signals = detectSignals(log);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0].type).toBe("log_error");
    expect(signals[0].file).toBe("src/main.rs");
    expect(signals[0].line).toBe(12);
  });

  it("should extract signals from ESLint inline line", () => {
    const log = `src/index.js: line 5, col 10, Error - 'x' is defined but never used (no-unused-vars)`;
    const signals = detectSignals(log);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0].type).toBe("log_error");
    expect(signals[0].file).toBe("src/index.js");
    expect(signals[0].line).toBe(5);
    expect(signals[0].message).toContain("no-unused-vars");
  });

  it("should extract signals from performance bottleneck", () => {
    const log = `Slow query detected - execution time: 1200ms\nSELECT * FROM users;`;
    const signals = detectSignals(log);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0].type).toBe("perf_bottleneck");
  });
});
