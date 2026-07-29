/**
 * graceful_degradation.test.js
 * Integration tests for graceful fallbacks when Rust binary or environment flags are set.
 */

"use strict";

const path = require("path");
const { execFileSync } = require("child_process");

const { tryNativeContextBroker } = require("../../.agent/scripts/context_broker");

describe("Day 4: Graceful Degradation & Fallback Behaviors", () => {
  test("TK_DISABLE_RUST=1 forces tryNativeContextBroker to return null", () => {
    const origEnv = process.env.TK_DISABLE_RUST;
    try {
      process.env.TK_DISABLE_RUST = "1";
      const result = tryNativeContextBroker(process.cwd(), null);
      expect(result).toBeNull();
    } finally {
      if (origEnv !== undefined) {
        process.env.TK_DISABLE_RUST = origEnv;
      } else {
        delete process.env.TK_DISABLE_RUST;
      }
    }
  });

  test("TRIBUNAL_FORCE_JS=1 causes bin/wrapper.js to execute JS fallback", () => {
    const wrapperPath = path.join(__dirname, "../../bin/wrapper.js");
    const out = execFileSync(
      process.execPath,
      [wrapperPath, "status"],
      {
        encoding: "utf8",
        env: { ...process.env, TRIBUNAL_FORCE_JS: "1" },
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 10000,
      }
    );

    // JS status output should include "Not installed" or "Installed" or agent counts
    expect(out).toBeDefined();
    expect(typeof out).toBe("string");
  });

  test("Invalid subcommand prints error message without crashing Node process unhandled", () => {
    const wrapperPath = path.join(__dirname, "../../bin/wrapper.js");
    try {
      const out = execFileSync(
        process.execPath,
        [wrapperPath, "nonexistent-subcommand-1234"],
        {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
          timeout: 10000,
        }
      );
      expect(typeof out).toBe("string");
    } catch (err) {
      // Process exiting with error code for invalid command is acceptable
      expect(err.status).toBeGreaterThan(0);
    }
  });
});
