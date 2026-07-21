"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  _generateManifest,
  parseFrontmatter,
  crawlAgents,
  crawlSkills,
  crawlScripts,
  crawlWorkflows,
  extractCrossReferences,
  extractNumericClaims,
} = require("../../../.agent/scripts/integrity_manifest");

function makeTempDir(prefix = "tk-manifest-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe("parseFrontmatter", () => {
  test("parses valid frontmatter correctly", () => {
    const input = "---\nname: test-skill\ndescription: A test skill\nversion: 1.0.0\n---\nBody content here";
    const result = parseFrontmatter(input);
    expect(result.name).toBe("test-skill");
    expect(result.description).toBe("A test skill");
    expect(result.version).toBe("1.0.0");
  });

  test("returns empty object if no frontmatter found", () => {
    const input = "Body content without frontmatter";
    expect(parseFrontmatter(input)).toEqual({});
  });
});

describe("integrity manifest crawlers", () => {
  let tmpProject;
  let agentDir;

  beforeEach(() => {
    tmpProject = makeTempDir();
    agentDir = path.join(tmpProject, ".agent");
    fs.mkdirSync(agentDir);
  });

  afterEach(() => {
    fs.rmSync(tmpProject, { recursive: true, force: true });
  });

  test("crawlAgents extracts and classifies reviewers and specialists", () => {
    const agentsDir = path.join(agentDir, "agents");
    fs.mkdirSync(agentsDir);
    
    // Write a reviewer agent
    fs.writeFileSync(
      path.join(agentsDir, "logic-reviewer.md"),
      "---\nrole: reviewer\n---\nReviewer content"
    );
    // Write a specialist agent
    fs.writeFileSync(
      path.join(agentsDir, "backend-specialist.md"),
      "---\nrole: specialist\n---\nSpecialist content"
    );

    const result = crawlAgents(agentDir);
    expect(result.total).toBe(2);
    expect(result.reviewers).toContain("logic-reviewer");
    expect(result.specialists).toContain("backend-specialist");
    expect(result.reviewer_count).toBe(1);
  });

  test("crawlSkills extracts skill names from frontmatter name field", () => {
    const skillsDir = path.join(agentDir, "skills");
    fs.mkdirSync(skillsDir);
    const testSkillDir = path.join(skillsDir, "test-skill-folder");
    fs.mkdirSync(testSkillDir);
    
    fs.writeFileSync(
      path.join(testSkillDir, "SKILL.md"),
      "---\nname: canonical-skill-name\n---\nContent"
    );

    const result = crawlSkills(agentDir);
    expect(result.total).toBe(1);
    expect(result.names).toContain("canonical-skill-name");
  });

  test("crawlScripts extracts script files", () => {
    const scriptsDir = path.join(agentDir, "scripts");
    fs.mkdirSync(scriptsDir);
    
    fs.writeFileSync(path.join(scriptsDir, "test_script.js"), "console.log('test')");
    fs.writeFileSync(path.join(scriptsDir, "python_script.py"), "print('test')");

    const result = crawlScripts(agentDir);
    expect(result.total).toBe(2);
    expect(result.files["test_script.js"]).toBe(".agent/scripts/test_script.js");
    expect(result.files["python_script.py"]).toBe(".agent/scripts/python_script.py");
  });

  test("crawlWorkflows extracts workflow names", () => {
    const workflowsDir = path.join(agentDir, "workflows");
    fs.mkdirSync(workflowsDir);
    
    fs.writeFileSync(path.join(workflowsDir, "generate.md"), "Generate content");

    const result = crawlWorkflows(agentDir);
    expect(result.total).toBe(1);
    expect(result.names).toContain("generate");
  });
});

describe("cross-references and claims extraction", () => {
  test("extractCrossReferences finds agent and script references", () => {
    const content = `
      Please refer to agents/logic-reviewer.md and scripts/verify_all.js.
      Also check workflows/generate.md.
    `;
    const refs = extractCrossReferences("test.md", content, "/fake/agent/dir");
    expect(refs.length).toBe(3);
    expect(refs.map(r => r.ref)).toContain("agents/logic-reviewer.md");
    expect(refs.map(r => r.ref)).toContain("scripts/verify_all.js");
    expect(refs.map(r => r.ref)).toContain("workflows/generate.md");
  });

  test("extractNumericClaims finds and validates claims in text", () => {
    const content = `
      We run 20 parallel reviewers.
      There are 43 specialist agents in total.
    `;
    const actualCounts = {
      reviewers: 20,
      agents: 44,
    };
    const claims = extractNumericClaims("test.md", content, "/fake/agent/dir", actualCounts);
    expect(claims.length).toBe(2);
    expect(claims.find(c => c.claim.includes("reviewers")).valid).toBe(true);
    expect(claims.find(c => c.claim.includes("agents")).valid).toBe(false);
  });
});
