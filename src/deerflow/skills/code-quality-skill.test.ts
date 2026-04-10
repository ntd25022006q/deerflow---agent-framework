import { describe, it, expect } from "vitest";
import { CodeQualitySkill } from "./code-quality-skill";
import type { QualityResult } from "./code-quality-skill";

describe("CodeQualitySkill", () => {
  // ── enforceTypeScriptStrict ─────────────────────────────────────────────

  describe("enforceTypeScriptStrict", () => {
    it("returns a QualityResult with the correct shape", () => {
      const result = CodeQualitySkill.enforceTypeScriptStrict();
      expect(result).toHaveProperty("passed");
      expect(result).toHaveProperty("violations");
      expect(result).toHaveProperty("suggestions");
      expect(Array.isArray(result.violations)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it("does not pass because it requires agent verification of tsconfig", () => {
      const result = CodeQualitySkill.enforceTypeScriptStrict();
      expect(result.passed).toBe(false);
    });

    it("includes a violation about verifying tsconfig.json", () => {
      const result = CodeQualitySkill.enforceTypeScriptStrict();
      expect(result.violations[0]).toContain("tsconfig.json");
    });

    it("provides suggestions for each required strict compiler option", () => {
      const result = CodeQualitySkill.enforceTypeScriptStrict();
      const strictOptions = [
        "strict: true",
        "noImplicitAny: true",
        "strictNullChecks: true",
      ];
      for (const opt of strictOptions) {
        expect(result.suggestions.some((s) => s.includes(opt))).toBe(true);
      }
    });

    it("suggests noUncheckedIndexedAccess as an extra", () => {
      const result = CodeQualitySkill.enforceTypeScriptStrict();
      expect(
        result.suggestions.some((s) => s.includes("noUncheckedIndexedAccess")),
      ).toBe(true);
    });
  });

  // ── noAnyPolicy ─────────────────────────────────────────────────────────

  describe("noAnyPolicy", () => {
    const cleanCode = `function add(a: number, b: number): number { return a + b; }`;

    it("passes when source has no 'any' type", () => {
      const result = CodeQualitySkill.noAnyPolicy(cleanCode);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("fails when source contains 'any' type annotation", () => {
      const code = `function foo(data: any): any { return data as any; }`;
      const result = CodeQualitySkill.noAnyPolicy(code);
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it("reports the correct number of 'any' occurrences", () => {
      const code = `function identity(x: any): any { return x; }`;
      const result = CodeQualitySkill.noAnyPolicy(code);
      expect(result.violations[0]).toContain("2 occurrence");
    });

    it("suggests replacing 'any' with 'unknown'", () => {
      const code = `const x: any = 42;`;
      const result = CodeQualitySkill.noAnyPolicy(code);
      expect(result.suggestions.some((s) => s.includes("unknown"))).toBe(true);
    });

    it("passes for empty string input", () => {
      const result = CodeQualitySkill.noAnyPolicy("");
      expect(result.passed).toBe(true);
    });
  });

  // ── namingConventionCheck ───────────────────────────────────────────────

  describe("namingConventionCheck", () => {
    it("passes for valid camelCase variable name", () => {
      const result = CodeQualitySkill.namingConventionCheck("userName", "variable");
      expect(result.passed).toBe(true);
    });

    it("passes for valid PascalCase class name", () => {
      const result = CodeQualitySkill.namingConventionCheck("UserService", "class");
      expect(result.passed).toBe(true);
    });

    it("passes for valid UPPER_SNAKE_CASE constant", () => {
      const result = CodeQualitySkill.namingConventionCheck("MAX_RETRY_COUNT", "constant");
      expect(result.passed).toBe(true);
    });

    it("fails for PascalCase used as variable name", () => {
      const result = CodeQualitySkill.namingConventionCheck("UserName", "variable");
      expect(result.passed).toBe(false);
      expect(result.violations[0]).toContain("camelCase");
    });

    it("fails for snake_case used as function name", () => {
      const result = CodeQualitySkill.namingConventionCheck("get_user", "function");
      expect(result.passed).toBe(false);
      expect(result.violations[0]).toContain("camelCase");
    });

    it("fails for single-char class name", () => {
      const result = CodeQualitySkill.namingConventionCheck("X", "class");
      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.includes("too short"))).toBe(true);
    });

    it("allows single-char variable names (loop counters)", () => {
      const result = CodeQualitySkill.namingConventionCheck("i", "variable");
      expect(result.passed).toBe(true);
    });

    it("passes for valid camelCase function name", () => {
      const result = CodeQualitySkill.namingConventionCheck("calculateTotal", "function");
      expect(result.passed).toBe(true);
    });

    it("passes for valid PascalCase interface name", () => {
      const result = CodeQualitySkill.namingConventionCheck("IUserRepository", "interface");
      expect(result.passed).toBe(true);
    });
  });

  // ── maxFunctionLength ───────────────────────────────────────────────────

  describe("maxFunctionLength", () => {
    it("passes when function body is within limit", () => {
      const code = `function short() {\n  return 1;\n}`;
      const result = CodeQualitySkill.maxFunctionLength(code, 10);
      expect(result.passed).toBe(true);
    });

    it("fails when function body exceeds limit", () => {
      const bodyLines = Array(25).fill("  const x = 1;");
      const code = `function longFn() {\n${bodyLines.join("\n")}\n}`;
      const result = CodeQualitySkill.maxFunctionLength(code, 10);
      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.includes("longFn"))).toBe(true);
    });

    it("reports the actual line count in the violation message", () => {
      const bodyLines = Array(15).fill("  line;");
      const code = `function bigFn() {\n${bodyLines.join("\n")}\n}`;
      const result = CodeQualitySkill.maxFunctionLength(code, 5);
      expect(result.violations[0]).toMatch(/\d+ lines long/);
    });

    it("suggests extracting helper functions", () => {
      const bodyLines = Array(20).fill("  step();");
      const code = `function giant() {\n${bodyLines.join("\n")}\n}`;
      const result = CodeQualitySkill.maxFunctionLength(code, 5);
      expect(result.suggestions.some((s) => s.includes("Extract helper"))).toBe(true);
    });
  });

  // ── maxFileLength ───────────────────────────────────────────────────────

  describe("maxFileLength", () => {
    it("passes for short files", () => {
      const code = "line 1\nline 2\nline 3";
      const result = CodeQualitySkill.maxFileLength(code, 100);
      expect(result.passed).toBe(true);
    });

    it("fails for files exceeding the line limit", () => {
      const code = Array(201).fill("// line").join("\n");
      const result = CodeQualitySkill.maxFileLength(code, 200);
      expect(result.passed).toBe(false);
      expect(result.violations[0]).toContain("201 lines long");
    });

    it("suggests splitting into smaller modules", () => {
      const code = Array(500).fill("// code").join("\n");
      const result = CodeQualitySkill.maxFileLength(code, 200);
      expect(
        result.suggestions.some((s) => s.includes("smaller")),
      ).toBe(true);
    });
  });

  // ── maxNestingDepth ─────────────────────────────────────────────────────

  describe("maxNestingDepth", () => {
    it("passes for flat code with high depth limit", () => {
      const code = `function hello() {\n  return 'world';\n}`;
      const result = CodeQualitySkill.maxNestingDepth(code, 4);
      expect(result.passed).toBe(true);
    });

    it("fails with depth=0 when any line is indented", () => {
      const code = `function foo() {\n  const x = 1;\n}`;
      const result = CodeQualitySkill.maxNestingDepth(code, 0);
      expect(result.passed).toBe(false);
    });

    it("suggests guard clauses for deeply nested code", () => {
      const code = `function foo() {\n  const x = 1;\n}`;
      const result = CodeQualitySkill.maxNestingDepth(code, 0);
      expect(
        result.suggestions.some((s) => s.includes("early return")),
      ).toBe(true);
    });
  });

  // ── deadCodeDetection ───────────────────────────────────────────────────

  describe("deadCodeDetection", () => {
    it("passes for clean code", () => {
      const code = `function add(a: number, b: number) { return a + b; }`;
      const result = CodeQualitySkill.deadCodeDetection(code);
      expect(result.passed).toBe(true);
    });

    it("detects unreachable code after return statement", () => {
      const code = `function foo() {\n  return 1;\n  const dead = 2;\n}`;
      const result = CodeQualitySkill.deadCodeDetection(code);
      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.includes("Unreachable code"))).toBe(true);
    });

    it("detects large commented-out code blocks (non-JSDoc)", () => {
      const code = `// old implementation\n// const x = 1;\n// const y = 2;\nfunction foo() {}`;
      const result = CodeQualitySkill.deadCodeDetection(code);
      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.includes("commented-out code"))).toBe(true);
    });

    it("does not flag JSDoc comment blocks", () => {
      const code = `/**\n * This is a JSDoc block.\n * @param x The input.\n */\nfunction foo(x: number) { return x; }`;
      const result = CodeQualitySkill.deadCodeDetection(code);
      expect(result.violations.some((v) => v.includes("commented-out"))).toBe(false);
    });

    it("suggests using version control instead of commenting out", () => {
      const code = `// unused code block\n// const a = 1;\n// const b = 2;\nfunction real() {}`;
      const result = CodeQualitySkill.deadCodeDetection(code);
      expect(
        result.suggestions.some((s) => s.includes("version control")),
      ).toBe(true);
    });
  });

  // ── importOrganization ──────────────────────────────────────────────────

  describe("importOrganization", () => {
    it("passes for correctly ordered imports", () => {
      const code = `import { readFile } from 'node:fs';\nimport express from 'express';\nimport { User } from '../models/user';`;
      const result = CodeQualitySkill.importOrganization(code);
      expect(result.passed).toBe(true);
    });

    it("fails when relative import precedes external import", () => {
      const code = `import { User } from '../models/user';\nimport express from 'express';`;
      const result = CodeQualitySkill.importOrganization(code);
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it("fails when external import precedes node built-in", () => {
      const code = `import express from 'express';\nimport { readFile } from 'node:fs';`;
      const result = CodeQualitySkill.importOrganization(code);
      expect(result.passed).toBe(false);
    });

    it("passes for code with no imports", () => {
      const code = `const x = 42;`;
      const result = CodeQualitySkill.importOrganization(code);
      expect(result.passed).toBe(true);
    });

    it("suggests the canonical import order", () => {
      const code = `import { User } from '../models/user';\nimport express from 'express';`;
      const result = CodeQualitySkill.importOrganization(code);
      expect(
        result.suggestions.some((s) => s.includes("node built-ins")),
      ).toBe(true);
    });
  });
});
