"use strict";

const { alignText, validateCodeContent } = require("../../dist/commands/align");

describe("alignText", () => {
  test("strips standard conversational intro slop", () => {
    const input = "Certainly! I'd be happy to help with that. Here is the code:\n\nconst x = 42;\n";
    expect(alignText(input)).toBe("const x = 42;");
  });

  test("strips other common greetings and intros", () => {
    const input = "Sure, let's implement this feature. Here are the details:\n\nHello world";
    expect(alignText(input)).toBe("Hello world");
  });

  test("strips standard conversational outro slop", () => {
    const input = "const x = 42;\n\nI hope this helps! Let me know if you need anything else.";
    expect(alignText(input)).toBe("const x = 42;");
  });

  test("collapses single-item bullet lists to clean prose", () => {
    const input = "We need to do the following:\n- run npm install\n";
    // - run npm install should collapse to "Run npm install."
    expect(alignText(input)).toBe("We need to do the following:\nRun npm install.");
  });

  test("collapses double-item bullet lists to clean prose", () => {
    const input = "Next steps:\n- do first step\n- do second step";
    // Should collapse to "Do first step. Do second step."
    expect(alignText(input)).toBe("Next steps:\nDo first step. Do second step.");
  });

  test("leaves lists with 3 or more items intact", () => {
    const input = "Steps:\n- item one\n- item two\n- item three";
    expect(alignText(input)).toBe("Steps:\n- item one\n- item two\n- item three");
  });
});

describe("validateCodeContent", () => {
  test("detects unawaited Next.js 15 cookies()/headers()/params() calls", () => {
    const code = "const token = cookies().get('session');";
    const warnings = validateCodeContent(code);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain("Next.js 15: Found unawaited call to cookies()");
  });

  test("does not warn on awaited Next.js 15 calls", () => {
    const code = "const token = await cookies().get('session');";
    const warnings = validateCodeContent(code);
    expect(warnings.length).toBe(0);
  });

  test("detects React 19 useFormState calls", () => {
    const code = "const [state, dispatch] = useFormState(action, initialState);";
    const warnings = validateCodeContent(code);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain("React 19: Found useFormState");
  });

  test("detects Drizzle .filter() calls", () => {
    const code = "const users = db.select().from(usersTable).filter(eq(usersTable.id, 1));";
    const warnings = validateCodeContent(code);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain("Drizzle ORM: Found .from().filter()");
  });

  test("detects non-existent LLM models", () => {
    const code = "const model = 'gpt-5';";
    const warnings = validateCodeContent(code);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain("LLM Models: Found references to non-existent models");
  });
});
