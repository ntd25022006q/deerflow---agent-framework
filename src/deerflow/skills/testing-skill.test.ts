import { describe, it, expect } from "vitest";
import { TestingSkill } from "./testing-skill";
import type { GeneratedTestSuite, CoverageReport, EdgeCase, TestCheckResult } from "./testing-skill";

describe("TestingSkill", () => {
  // ── generateUnitTest ────────────────────────────────────────────────────

  describe("generateUnitTest", () => {
    it("returns a GeneratedTestSuite with framework vitest", () => {
      const code = `export function add(a: number, b: number) { return a + b; }`;
      const result = TestingSkill.generateUnitTest(code);
      expect(result.framework).toBe("vitest");
    });

    it("returns type 'unit'", () => {
      const code = `export function add(a: number, b: number) { return a + b; }`;
      const result = TestingSkill.generateUnitTest(code);
      expect(result.type).toBe("unit");
    });

    it("includes the module name inferred from class declaration", () => {
      const code = `export class Calculator { add(a: number, b: number) { return a + b; } }`;
      const result = TestingSkill.generateUnitTest(code);
      expect(result.code).toContain("Calculator");
    });

    it("includes the module name inferred from exported function", () => {
      const code = `export function computeTotal(items: number[]): number { return items.reduce((a, b) => a + b, 0); }`;
      const result = TestingSkill.generateUnitTest(code);
      expect(result.code).toContain("computeTotal");
    });

    it("generates test scaffolding for each exported symbol", () => {
      const code = `export const foo = 1;\nexport const bar = 2;`;
      const result = TestingSkill.generateUnitTest(code);
      expect(result.code).toContain("foo");
      expect(result.code).toContain("bar");
    });

    it("returns a filePath under src/__tests__/", () => {
      const code = `export function greet(name: string) { return \`Hello \${name}\`; }`;
      const result = TestingSkill.generateUnitTest(code);
      expect(result.filePath).toMatch(/^src\/__tests__\/.*\.test\.ts$/);
    });

    it("returns a description mentioning the module name", () => {
      const code = `export function processOrder() {}`;
      const result = TestingSkill.generateUnitTest(code);
      expect(result.description).toContain("processOrder");
    });

    it("imports vitest describe, it, expect in generated code", () => {
      const code = `export function run() {}`;
      const result = TestingSkill.generateUnitTest(code);
      expect(result.code).toContain('from "vitest"');
      expect(result.code).toContain("describe");
      expect(result.code).toContain("it(");
    });
  });

  // ── generateIntegrationTest ─────────────────────────────────────────────

  describe("generateIntegrationTest", () => {
    it("returns a GeneratedTestSuite with type 'integration'", () => {
      const result = TestingSkill.generateIntegrationTest("/api/v1/users");
      expect(result.type).toBe("integration");
    });

    it("infers GET method for standard endpoint", () => {
      const result = TestingSkill.generateIntegrationTest("/api/v1/users/:id");
      expect(result.code).toContain("GET");
    });

    it("infers POST method for /create endpoint", () => {
      const result = TestingSkill.generateIntegrationTest("/api/v1/users/create");
      expect(result.code).toContain("POST");
    });

    it("infers DELETE method for /delete endpoint", () => {
      const result = TestingSkill.generateIntegrationTest("/api/v1/users/delete");
      expect(result.code).toContain("DELETE");
    });

    it("infers PUT method for /update endpoint", () => {
      const result = TestingSkill.generateIntegrationTest("/api/v1/users/update");
      expect(result.code).toContain("PUT");
    });

    it("includes 401, 400, and 404 test stubs", () => {
      const result = TestingSkill.generateIntegrationTest("/api/v1/users");
      expect(result.code).toContain("401");
      expect(result.code).toContain("400");
      expect(result.code).toContain("404");
    });

    it("uses vitest framework", () => {
      const result = TestingSkill.generateIntegrationTest("/api/v1/items");
      expect(result.framework).toBe("vitest");
    });
  });

  // ── generateE2ETest ─────────────────────────────────────────────────────

  describe("generateE2ETest", () => {
    it("returns a GeneratedTestSuite with type 'e2e'", () => {
      const result = TestingSkill.generateE2ETest("User login flow");
      expect(result.type).toBe("e2e");
    });

    it("includes the flow description in generated code", () => {
      const result = TestingSkill.generateE2ETest("Checkout and payment");
      expect(result.code).toContain("Checkout and payment");
    });

    it("generates a slug-based file path under src/__tests__/e2e/", () => {
      const result = TestingSkill.generateE2ETest("User Registration and Login");
      expect(result.filePath).toMatch(/^src\/__tests__\/e2e\/.*\.test\.ts$/);
    });

    it("uses vitest framework", () => {
      const result = TestingSkill.generateE2ETest("dashboard navigation");
      expect(result.framework).toBe("vitest");
    });

    it("returns a description mentioning the flow", () => {
      const result = TestingSkill.generateE2ETest("Search products");
      expect(result.description).toContain("Search products");
    });
  });

  // ── coverageAnalysis ────────────────────────────────────────────────────

  describe("coverageAnalysis", () => {
    it("returns a CoverageReport with overall 0 (placeholder)", () => {
      const result = TestingSkill.coverageAnalysis();
      expect(result.overall).toBe(0);
    });

    it("returns empty perFile array", () => {
      const result = TestingSkill.coverageAnalysis();
      expect(result.perFile).toHaveLength(0);
    });

    it("includes gaps about running vitest --coverage", () => {
      const result = TestingSkill.coverageAnalysis();
      expect(result.gaps.some((g) => g.includes("vitest --coverage"))).toBe(true);
    });

    it("suggests targeting 80% line coverage", () => {
      const result = TestingSkill.coverageAnalysis();
      expect(result.suggestions.some((s) => s.includes("80"))).toBe(true);
    });
  });

  // ── edgeCaseGenerator ───────────────────────────────────────────────────

  describe("edgeCaseGenerator", () => {
    it("generates cases for number parameters", () => {
      const sig = "function divide(numerator: number, denominator: number): number";
      const cases = TestingSkill.edgeCaseGenerator(sig);
      expect(cases.length).toBeGreaterThan(0);
    });

    it("generates zero, negative, and MAX_SAFE_INTEGER cases for number params", () => {
      const sig = "function process(value: number): void";
      const cases = TestingSkill.edgeCaseGenerator(sig);
      const descriptions = cases.map((c) => c.description);
      expect(descriptions.some((d) => d.includes("= 0"))).toBe(true);
      expect(descriptions.some((d) => d.includes("= -1"))).toBe(true);
      expect(descriptions.some((d) => d.includes("MAX_SAFE_INTEGER"))).toBe(true);
    });

    it("generates empty-string and long-string cases for string params", () => {
      const sig = "function greet(name: string): string";
      const cases = TestingSkill.edgeCaseGenerator(sig);
      const descriptions = cases.map((c) => c.description);
      expect(descriptions.some((d) => d.includes('= ""'))).toBe(true);
      expect(descriptions.some((d) => d.includes("very long string"))).toBe(true);
    });

    it("generates empty array case for Array params", () => {
      const sig = "function sum(items: number[]): number";
      const cases = TestingSkill.edgeCaseGenerator(sig);
      const descriptions = cases.map((c) => c.description);
      expect(descriptions.some((d) => d.includes('= []'))).toBe(true);
    });

    it("generates null and undefined cases for nullable params", () => {
      const sig = "function find(id: string | null | undefined): User | null";
      const cases = TestingSkill.edgeCaseGenerator(sig);
      const descriptions = cases.map((c) => c.description);
      expect(descriptions.some((d) => d.includes("= null"))).toBe(true);
      expect(descriptions.some((d) => d.includes("= undefined"))).toBe(true);
    });

    it("returns empty array for invalid signature with no parentheses", () => {
      const cases = TestingSkill.edgeCaseGenerator("invalid signature");
      expect(cases).toHaveLength(0);
    });

    it("each edge case includes generatedTestLine with it()", () => {
      const sig = "function process(value: number): void";
      const cases = TestingSkill.edgeCaseGenerator(sig);
      for (const c of cases) {
        expect(c.generatedTestLine).toContain("it(");
      }
    });
  });

  // ── testNamingConvention ────────────────────────────────────────────────

  describe("testNamingConvention", () => {
    it("passes for test names starting with 'should' and sufficiently long", () => {
      const testCode = `it("should return the correct sum when both inputs are positive", () => {
        expect(add(2, 3)).toBe(5);
      });`;
      const result = TestingSkill.testNamingConvention(testCode);
      expect(result.passed).toBe(true);
    });

    it("fails for test names that are too short", () => {
      const testCode = `it("should work", () => {
        expect(true).toBe(true);
      });`;
      const result = TestingSkill.testNamingConvention(testCode);
      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.includes("too short"))).toBe(true);
    });

    it("fails for test names not starting with 'should' or 'must'", () => {
      const testCode = `it("returns correct value when input is valid and formatted properly", () => {});`;
      const result = TestingSkill.testNamingConvention(testCode);
      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.includes("does not start with"))).toBe(true);
    });

    it("passes for test names starting with 'must'", () => {
      const testCode = `it("must throw an error when the input is a negative number", () => {});`;
      const result = TestingSkill.testNamingConvention(testCode);
      expect(result.passed).toBe(true);
    });

    it("suggests the 'should … when …' pattern on failure", () => {
      const testCode = `it("works fine", () => {});`;
      const result = TestingSkill.testNamingConvention(testCode);
      expect(
        result.suggestions.some((s) => s.includes("should")),
      ).toBe(true);
    });

    it("handles multiple test cases", () => {
      const testCode = `it("should pass when valid", () => {});\nit("short", () => {});`;
      const result = TestingSkill.testNamingConvention(testCode);
      // "short" is < 15 chars and doesn't start with "should"
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  // ── assertionQualityCheck ───────────────────────────────────────────────

  describe("assertionQualityCheck", () => {
    it("passes for meaningful test assertions", () => {
      const testCode = `it("should add two numbers", () => {
        expect(add(2, 3)).toBe(5);
      });`;
      const result = TestingSkill.assertionQualityCheck(testCode);
      expect(result.passed).toBe(true);
    });

    it("detects trivially true assertions like expect(true)", () => {
      const testCode = `it("always passes", () => {
        expect(true).toBeTruthy();
      });`;
      const result = TestingSkill.assertionQualityCheck(testCode);
      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.includes("trivially true"))).toBe(true);
    });

    it("detects expect(1) as trivial", () => {
      const testCode = `it("bad test", () => { expect(1).toBe(1); });`;
      const result = TestingSkill.assertionQualityCheck(testCode);
      expect(result.passed).toBe(false);
    });

    it("detects TODO comments in test code", () => {
      const testCode = `it("should test something", () => {
        // TODO: implement this test
      });`;
      const result = TestingSkill.assertionQualityCheck(testCode);
      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.includes("TODO"))).toBe(true);
    });

    it("detects FIXME comments in test code", () => {
      const testCode = `// FIXME: this test needs real data\nit("should work", () => {});`;
      const result = TestingSkill.assertionQualityCheck(testCode);
      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.includes("TODO") || v.includes("FIXME") || v.includes("skip"))).toBe(true);
    });

    it("detects excessive mocking (more than 5 mock references per describe block)", () => {
      const mockBlock = Array(7).fill("const mock").join("\n");
      const testCode = `describe("something", () => {\n${mockBlock}\n  it("should work", () => {});\n});`;
      const result = TestingSkill.assertionQualityCheck(testCode);
      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.includes("excessive mocking"))).toBe(true);
    });

    it("passes for test code with no anti-patterns", () => {
      const testCode = `describe("Calculator", () => {
        it("should return 5 when adding 2 and 3", () => {
          expect(add(2, 3)).toBe(5);
        });
        it("should return -1 when subtracting 3 from 2", () => {
          expect(subtract(2, 3)).toBe(-1);
        });
      });`;
      const result = TestingSkill.assertionQualityCheck(testCode);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });
});
