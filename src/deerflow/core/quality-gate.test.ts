import { describe, it, expect } from "vitest";
import {
  executeQualityGate,
  analyzeFileQuality,
  assessProjectQuality,
  validateBuildOutput,
} from "./quality-gate";
import type { QualityGate } from "./agentic-workflow";

// ---------------------------------------------------------------------------
// Helper: build a QualityGate
// ---------------------------------------------------------------------------
function makeGate(operator: string, value: unknown, id = "test-gate"): QualityGate {
  return {
    id,
    name: "Test Gate",
    description: "A test gate",
    severity: "HIGH",
    command: "echo test",
    successCriteria: { property: "x", operator: operator as QualityGate["successCriteria"]["operator"], value },
    onFailure: "REJECT",
  };
}

// ===========================================================================
// executeQualityGate
// ===========================================================================
describe("executeQualityGate", () => {
  it("returns passed=true for EQ criteria with matching value", () => {
    const gate = makeGate("EQ", 0);
    const result = executeQualityGate(gate, 0, "ok", 10);
    expect(result.passed).toBe(true);
  });

  it("returns passed=false for EQ criteria with different value", () => {
    const gate = makeGate("EQ", 0);
    const result = executeQualityGate(gate, 5, "5 errors", 10);
    expect(result.passed).toBe(false);
    expect(result.actual).toBe(5);
    expect(result.expected).toBe(0);
  });

  it("handles GT criteria correctly — 200 > 100 passes", () => {
    const gate = makeGate("GT", 100);
    const result = executeQualityGate(gate, 200, "big", 5);
    expect(result.passed).toBe(true);
  });

  it("handles GT criteria correctly — 50 > 100 fails", () => {
    const gate = makeGate("GT", 100);
    const result = executeQualityGate(gate, 50, "small", 5);
    expect(result.passed).toBe(false);
  });

  it("handles GTE criteria correctly — 80 >= 80 passes", () => {
    const gate = makeGate("GTE", 80);
    const result = executeQualityGate(gate, 80, "exactly", 5);
    expect(result.passed).toBe(true);
  });

  it("handles GTE criteria correctly — 79 >= 80 fails", () => {
    const gate = makeGate("GTE", 80);
    const result = executeQualityGate(gate, 79, "just under", 5);
    expect(result.passed).toBe(false);
  });

  it("handles CONTAINS criteria correctly", () => {
    const gate = makeGate("CONTAINS", "success");
    const result = executeQualityGate(gate, "build success", "ok", 5);
    expect(result.passed).toBe(true);
  });

  it("handles CONTAINS criteria with non-match", () => {
    const gate = makeGate("CONTAINS", "success");
    const result = executeQualityGate(gate, "build failed", "fail", 5);
    expect(result.passed).toBe(false);
  });

  it("handles NEQ criteria correctly", () => {
    const gate = makeGate("NEQ", 0);
    const result = executeQualityGate(gate, 5, "not zero", 5);
    expect(result.passed).toBe(true);
  });

  it("returns correct gateId and output", () => {
    const gate = makeGate("EQ", true, "build-check");
    const result = executeQualityGate(gate, true, "Build passed", 42);
    expect(result.gateId).toBe("build-check");
    expect(result.output).toBe("Build passed");
    expect(result.duration).toBe(42);
  });
});

// ===========================================================================
// analyzeFileQuality
// ===========================================================================
describe("analyzeFileQuality", () => {
  it("detects `any` type usage", () => {
    const code = `function processData(data: any): any {
  return data;
}`;
    const issues = analyzeFileQuality("test.ts", code);
    const anyIssues = issues.filter((i) => i.ruleId === "deerflow/no-any");
    expect(anyIssues.length).toBeGreaterThanOrEqual(1);
  });

  it("detects @ts-ignore", () => {
    const code = `// @ts-ignore
const x = badVar;`;
    const issues = analyzeFileQuality("test.ts", code);
    expect(issues.some((i) => i.ruleId === "deerflow/no-ts-ignore")).toBe(true);
  });

  it("detects @ts-expect-error", () => {
    const code = `// @ts-expect-error
const x = badVar;`;
    const issues = analyzeFileQuality("test.ts", code);
    expect(issues.some((i) => i.ruleId === "deerflow/no-ts-ignore")).toBe(true);
  });

  it("detects console.log", () => {
    const code = `console.log("debugging");`;
    const issues = analyzeFileQuality("test.ts", code);
    expect(issues.some((i) => i.ruleId === "deerflow/no-console")).toBe(true);
  });

  it("detects console.warn", () => {
    const code = `console.warn("deprecated");`;
    const issues = analyzeFileQuality("test.ts", code);
    expect(issues.some((i) => i.ruleId === "deerflow/no-console")).toBe(true);
  });

  it("detects empty catch blocks", () => {
    const code = `try { doWork(); } catch(e) {}`;
    const issues = analyzeFileQuality("test.ts", code);
    expect(issues.some((i) => i.ruleId === "deerflow/no-empty-catch")).toBe(true);
  });

  it("detects hardcoded secrets", () => {
    const code = `const api_key = "sk_live_abcdef123456";`;
    const issues = analyzeFileQuality("test.ts", code);
    expect(issues.some((i) => i.ruleId === "deerflow/no-hardcoded-secrets")).toBe(true);
  });

  it("detects hardcoded password", () => {
    const code = `const password = "supersecret1234";`;
    const issues = analyzeFileQuality("test.ts", code);
    expect(issues.some((i) => i.ruleId === "deerflow/no-hardcoded-secrets")).toBe(true);
  });

  it("detects dangerouslySetInnerHTML", () => {
    const code = `<div dangerouslySetInnerHTML={{ __html: rawHtml }} />`;
    const issues = analyzeFileQuality("test.tsx", code);
    expect(issues.some((i) => i.ruleId === "deerflow/no-dangerous-html")).toBe(true);
  });

  it("detects eval usage", () => {
    const code = `eval("alert('xss')");`;
    const issues = analyzeFileQuality("test.ts", code);
    expect(issues.some((i) => i.ruleId === "deerflow/no-eval")).toBe(true);
  });

  it("detects while(true) without safety", () => {
    const code = `while (true) { process(); }`;
    const issues = analyzeFileQuality("test.ts", code);
    expect(issues.some((i) => i.ruleId === "deerflow/no-infinite-while")).toBe(true);
  });

  it("does not flag comments containing console.log", () => {
    const code = `// console.log("this is a comment, not actual code");
const x = 1;`;
    const issues = analyzeFileQuality("test.ts", code);
    expect(issues.some((i) => i.ruleId === "deerflow/no-console")).toBe(false);
  });

  it("warns on files over 300 lines", () => {
    const lines = Array.from({ length: 301 }, (_, i) => `const line${i} = ${i};`);
    const code = lines.join("\n");
    const issues = analyzeFileQuality("big.ts", code);
    expect(issues.some((i) => i.ruleId === "deerflow/max-file-length")).toBe(true);
  });

  it("does not warn on files with exactly 300 lines", () => {
    const lines = Array.from({ length: 300 }, (_, i) => `const line${i} = ${i};`);
    const code = lines.join("\n");
    const issues = analyzeFileQuality("ok.ts", code);
    expect(issues.some((i) => i.ruleId === "deerflow/max-file-length")).toBe(false);
  });

  it("warns on deep nesting > 4 levels", () => {
    const code = `
function a() {
  if (true) {
    for (const x of arr) {
      while (cond) {
        if (x) {
          deepNesting();
        }
      }
    }
  }
}`;
    const issues = analyzeFileQuality("nested.ts", code);
    expect(issues.some((i) => i.ruleId === "deerflow/max-nesting")).toBe(true);
  });

  it("does not warn on shallow nesting", () => {
    const code = `
function a() {
  if (true) {
    doThing();
  }
}`;
    const issues = analyzeFileQuality("flat.ts", code);
    expect(issues.some((i) => i.ruleId === "deerflow/max-nesting")).toBe(false);
  });

  it("returns empty array for clean code", () => {
    const code = `
function add(a: number, b: number): number {
  return a + b;
}`;
    const issues = analyzeFileQuality("clean.ts", code);
    expect(issues).toHaveLength(0);
  });
});

// ===========================================================================
// assessProjectQuality
// ===========================================================================
describe("assessProjectQuality", () => {
  it("returns grade A for a clean project", () => {
    const files = new Map<string, string>();
    files.set("src/math.ts", `function add(a: number, b: number): number {\n  return a + b;\n}`);
    files.set("src/str.ts", `function upper(s: string): string {\n  return s.toUpperCase();\n}`);
    const assessment = assessProjectQuality(files);
    expect(assessment.grade).toBe("A");
    expect(assessment.overallScore).toBe(100);
  });

  it("returns a lower grade for a project with issues", () => {
    const files = new Map<string, string>();
    files.set("src/bad.ts", `function processData(data: any): any {\n  eval("doStuff");\n  return data;\n}`);
    const assessment = assessProjectQuality(files);
    expect(assessment.overallScore).toBeLessThan(100);
    // deerflow/no-any (WARNING -10) + deerflow/no-eval (ERROR -20) = score 70 for that category
    expect(assessment.grade).not.toBe("A");
  });

  it("reports critical issues separately", () => {
    const files = new Map<string, string>();
    files.set("src/x.ts", `const x: any = eval("bad");`);
    const assessment = assessProjectQuality(files);
    expect(assessment.criticalIssues.length).toBeGreaterThanOrEqual(1);
  });

  it("includes a summary string", () => {
    const files = new Map<string, string>();
    files.set("src/a.ts", `const a = 1;`);
    const assessment = assessProjectQuality(files);
    expect(typeof assessment.summary).toBe("string");
    expect(assessment.summary.length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// validateBuildOutput
// ===========================================================================
describe("validateBuildOutput", () => {
  it("fails for tiny builds (< 100KB)", () => {
    const fileList = ["index.js", "styles.css"];
    const fileSizes = new Map<string, number>([
      ["index.js", 30_000],
      ["styles.css", 10_000],
    ]);
    const result = validateBuildOutput("dist/", fileList, fileSizes);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("fails when file count is below minimum of 10", () => {
    const fileList = Array.from({ length: 5 }, (_, i) => `file${i}.js`);
    const fileSizes = new Map<string, number>();
    for (const f of fileList) fileSizes.set(f, 50_000); // 250KB total
    const result = validateBuildOutput("dist/", fileList, fileSizes);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes("files"))).toBe(true);
  });

  it("passes for a reasonable build with enough files and size", () => {
    const fileList = Array.from({ length: 15 }, (_, i) => `chunk${i}.js`);
    fileList.push("styles.css", "index.html", "app.js", "vendor.js", "runtime.js");
    const fileSizes = new Map<string, number>();
    for (const f of fileList) fileSizes.set(f, 30_000); // ~600KB total
    const result = validateBuildOutput("dist/", fileList, fileSizes);
    expect(result.valid).toBe(true);
    expect(result.sizeInfo.hasSource).toBe(true);
  });

  it("detects missing source files in build", () => {
    const fileList = Array.from({ length: 15 }, (_, i) => `image${i}.png`);
    const fileSizes = new Map<string, number>();
    for (const f of fileList) fileSizes.set(f, 20_000);
    const result = validateBuildOutput("dist/", fileList, fileSizes);
    expect(result.sizeInfo.hasSource).toBe(false);
    expect(result.issues.some((i) => i.includes("source"))).toBe(true);
  });

  it("flags skeleton builds (≤3 files AND <50KB)", () => {
    const fileList = ["index.html", "main.js"];
    const fileSizes = new Map<string, number>([
      ["index.html", 5_000],
      ["main.js", 10_000],
    ]);
    const result = validateBuildOutput("dist/", fileList, fileSizes);
    expect(result.issues.some((i) => i.includes("CRITICAL"))).toBe(true);
  });

  it("includes recommendations for improvements", () => {
    const fileList = ["index.js"];
    const fileSizes = new Map<string, number>([["index.js", 5_000]]);
    const result = validateBuildOutput("dist/", fileList, fileSizes);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});
