import { describe, it, expect } from "vitest";
import {
  DeerflowAlgorithmSuite,
  ResearchDepth,
  type IterationResult,
  type CodeState,
} from "./index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCodeState(overrides: Partial<CodeState> = {}): CodeState {
  return {
    id: "state-1",
    files: new Map([["src/index.ts", "export const x = 1;"]]),
    passingTests: [],
    failingTests: [],
    typeErrors: [],
    lintIssues: [],
    capturedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeIterationResult(
  overrides: Partial<IterationResult> = {},
): IterationResult {
  return {
    iteration: 1,
    previousState: makeCodeState(),
    currentState: makeCodeState(),
    passed: false,
    diff: "",
    remainingIssues: ["some issue"],
    changesMade: [],
    durationMs: 100,
    regressionDetected: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DeerflowAlgorithmSuite", () => {
  // -----------------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------------
  describe("constructor", () => {
    it("creates instances of all three algorithms", () => {
      const suite = new DeerflowAlgorithmSuite();
      expect(suite.research).toBeDefined();
      expect(suite.refinement).toBeDefined();
      expect(suite.dependencies).toBeDefined();
    });

    it("defaults research depth to STANDARD", () => {
      const suite = new DeerflowAlgorithmSuite();
      const report = suite.research.generateResearchReport("test");
      expect(report.depth).toBe(ResearchDepth.STANDARD);
    });

    it("defaults max iterations to 20", () => {
      const suite = new DeerflowAlgorithmSuite();
      const plan = suite.refinement.planIterations(5);
      expect(plan.maxIterations).toBeLessThanOrEqual(20);
    });

    it("accepts custom research depth", () => {
      const suite = new DeerflowAlgorithmSuite({
        researchDepth: ResearchDepth.DEEP,
      });
      const report = suite.research.generateResearchReport("test");
      expect(report.depth).toBe(ResearchDepth.DEEP);
    });

    it("accepts custom max iterations", () => {
      const suite = new DeerflowAlgorithmSuite({ maxIterations: 50 });
      const plan = suite.refinement.planIterations(5);
      expect(plan.maxIterations).toBeLessThanOrEqual(50);
    });

    it("accepts custom minConfidence", () => {
      const suite = new DeerflowAlgorithmSuite({ minConfidence: 0.95 });
      // This is used internally during pre-implementation check
      expect(suite).toBeDefined();
    });

    it("accepts custom reactVersion", () => {
      const suite = new DeerflowAlgorithmSuite({ reactVersion: "19.0.0" });
      // Verify through verifyApi or dependency check
      const result = suite.dependencies.validateReactCompatibility(
        "react-router-dom",
        "19.0.0",
      );
      expect(result.compatible).toBe(true);
    });

    it("can disable React compatibility checks", () => {
      const suite = new DeerflowAlgorithmSuite({
        checkReactCompatibility: false,
      });
      expect(suite).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // runPreImplementationCheck
  // -----------------------------------------------------------------------
  describe("runPreImplementationCheck", () => {
    it("returns result with all required fields", () => {
      const suite = new DeerflowAlgorithmSuite();
      const result = suite.runPreImplementationCheck(
        "React hooks testing",
        { dependencies: { react: "^18.2.0" }, devDependencies: {} },
        [],
      );
      expect(result).toHaveProperty("ready");
      expect(result).toHaveProperty("researchReport");
      expect(result).toHaveProperty("dependencyResults");
      expect(result).toHaveProperty("dependencyReport");
      expect(result).toHaveProperty("blockers");
      expect(result).toHaveProperty("warnings");
      expect(result).toHaveProperty("recommendations");
    });

    it("returns non-null researchReport", () => {
      const suite = new DeerflowAlgorithmSuite();
      const result = suite.runPreImplementationCheck(
        "test topic",
        { dependencies: {}, devDependencies: {} },
      );
      expect(result.researchReport).not.toBeNull();
      expect(result.researchReport!.topic).toBe("test topic");
    });

    it("returns non-null dependencyReport", () => {
      const suite = new DeerflowAlgorithmSuite();
      const result = suite.runPreImplementationCheck(
        "test",
        { dependencies: { react: "^18.2.0" }, devDependencies: {} },
      );
      expect(result.dependencyReport).not.toBeNull();
    });

    it("is ready when no blockers exist", () => {
      const suite = new DeerflowAlgorithmSuite({ minConfidence: 0.1 });
      const result = suite.runPreImplementationCheck(
        "test topic",
        { dependencies: { react: "^18.2.0" }, devDependencies: {} },
        [],
      );
      // With minConfidence=0.1, the simulated research should pass the threshold
      expect(result.ready).toBe(true);
      expect(result.blockers).toEqual([]);
    });

    it("produces empty dependencyResults when no packages requested", () => {
      const suite = new DeerflowAlgorithmSuite();
      const result = suite.runPreImplementationCheck(
        "test",
        { dependencies: { react: "^18.2.0" }, devDependencies: {} },
        [],
      );
      expect(result.dependencyResults).toEqual([]);
    });

    it("checks requested packages for compatibility", () => {
      const suite = new DeerflowAlgorithmSuite();
      const result = suite.runPreImplementationCheck(
        "test",
        { dependencies: { react: "^18.2.0" }, devDependencies: {} },
        [{ name: "zod", version: "^3.22.0", reason: "validation", isDev: false }],
      );
      expect(result.dependencyResults).toHaveLength(1);
    });

    it("adds blockers for incompatible packages", () => {
      const suite = new DeerflowAlgorithmSuite({
        checkReactCompatibility: true,
        reactVersion: "17.0.0",
      });
      const result = suite.runPreImplementationCheck(
        "test",
        { dependencies: { react: "^17.0.0" }, devDependencies: {} },
        [
          {
            name: "react-router-dom",
            version: "^6.20.0",
            reason: "routing",
            isDev: false,
          },
        ],
      );
      expect(result.blockers.length).toBeGreaterThan(0);
      expect(
        result.blockers.some((b) => b.includes("react-router-dom")),
      ).toBe(true);
    });

    it("adds styling warnings for conflicting styling packages", () => {
      const suite = new DeerflowAlgorithmSuite();
      const result = suite.runPreImplementationCheck(
        "test",
        { dependencies: { tailwindcss: "^3.4.0" }, devDependencies: {} },
        [
          {
            name: "bootstrap",
            version: "^5.3.0",
            reason: "styling",
            isDev: false,
          },
        ],
      );
      // tailwindcss + bootstrap same group → warning (not blocker since it's SAME_GROUP not CROSS_GROUP)
      expect(
        result.warnings.some((w) => w.toLowerCase().includes("styling")),
      ).toBe(true);
    });

    it("handles empty package.json gracefully", () => {
      const suite = new DeerflowAlgorithmSuite({ minConfidence: 0.1 });
      const result = suite.runPreImplementationCheck("test", {}, []);
      expect(result.dependencyReport).not.toBeNull();
      expect(result.dependencyReport!.analysis.totalPackages).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // runPostImplementationCheck
  // -----------------------------------------------------------------------
  describe("runPostImplementationCheck", () => {
    it("returns result with all required fields", () => {
      const suite = new DeerflowAlgorithmSuite();
      const result = suite.runPostImplementationCheck([]);
      expect(result).toHaveProperty("converged");
      expect(result).toHaveProperty("convergence");
      expect(result).toHaveProperty("totalIterations");
      expect(result).toHaveProperty("finalState");
      expect(result).toHaveProperty("regressionsDetected");
      expect(result).toHaveProperty("recommendations");
      expect(result).toHaveProperty("requiresManualReview");
    });

    it("returns FAILED finalState for empty iterations", () => {
      const suite = new DeerflowAlgorithmSuite();
      const result = suite.runPostImplementationCheck([]);
      expect(result.finalState).toBe("FAILED");
      expect(result.converged).toBe(false);
    });

    it("returns PASSED when last iteration passes", () => {
      const suite = new DeerflowAlgorithmSuite();
      const iterations = [
        makeIterationResult({
          iteration: 1,
          passed: true,
          remainingIssues: [],
          previousState: makeCodeState({ failingTests: ["t1"] }),
          durationMs: 50,
        }),
      ];
      const result = suite.runPostImplementationCheck(iterations);
      expect(result.finalState).toBe("PASSED");
      expect(result.converged).toBe(true);
      expect(result.totalIterations).toBe(1);
    });

    it("returns DIVERGED when infinite loop detected", () => {
      const suite = new DeerflowAlgorithmSuite();
      const issues = ["stuck"];
      const iterations = [
        makeIterationResult({ iteration: 1, remainingIssues: issues }),
        makeIterationResult({ iteration: 2, remainingIssues: issues }),
        makeIterationResult({ iteration: 3, remainingIssues: issues }),
      ];
      const result = suite.runPostImplementationCheck(iterations);
      expect(result.finalState).toBe("DIVERGED");
    });

    it("counts regressions correctly", () => {
      const suite = new DeerflowAlgorithmSuite();
      const iterations = [
        makeIterationResult({ iteration: 1, regressionDetected: true }),
        makeIterationResult({ iteration: 2, regressionDetected: false }),
      ];
      const result = suite.runPostImplementationCheck(iterations);
      expect(result.regressionsDetected).toBe(1);
    });

    it("requires manual review when PASSED with regressions", () => {
      const suite = new DeerflowAlgorithmSuite();
      const iterations = [
        makeIterationResult({
          iteration: 1,
          passed: true,
          remainingIssues: [],
          regressionDetected: true,
          previousState: makeCodeState({ failingTests: ["t1"] }),
        }),
      ];
      const result = suite.runPostImplementationCheck(iterations);
      expect(result.requiresManualReview).toBe(true);
    });

    it("includes recommendations for PASSED state", () => {
      const suite = new DeerflowAlgorithmSuite();
      const iterations = [
        makeIterationResult({
          iteration: 1,
          passed: true,
          remainingIssues: [],
          previousState: makeCodeState({ failingTests: ["t1"] }),
        }),
      ];
      const result = suite.runPostImplementationCheck(iterations);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // planDevelopment
  // -----------------------------------------------------------------------
  describe("planDevelopment", () => {
    it("delegates to refinement.planIterations", () => {
      const suite = new DeerflowAlgorithmSuite();
      const plan = suite.planDevelopment(5);
      expect(plan.taskComplexity).toBe(5);
      expect(plan.strategy).toBe("SPIRAL");
      expect(plan.steps.length).toBeGreaterThan(0);
    });

    it("returns correct strategy for low complexity", () => {
      const suite = new DeerflowAlgorithmSuite();
      const plan = suite.planDevelopment(2);
      expect(plan.strategy).toBe("INCREMENTAL");
    });

    it("returns correct strategy for high complexity", () => {
      const suite = new DeerflowAlgorithmSuite();
      const plan = suite.planDevelopment(9);
      expect(plan.strategy).toBe("TOP_DOWN");
    });
  });

  // -----------------------------------------------------------------------
  // quickCompatibilityCheck
  // -----------------------------------------------------------------------
  describe("quickCompatibilityCheck", () => {
    it("returns compatible for non-conflicting package", () => {
      const suite = new DeerflowAlgorithmSuite();
      const result = suite.quickCompatibilityCheck(
        { dependencies: { react: "^18.2.0" }, devDependencies: {} },
        { name: "zod", version: "^3.22.0", reason: "validation", isDev: false },
      );
      expect(result.compatible).toBe(true);
    });

    it("returns not compatible for conflicting package", () => {
      const suite = new DeerflowAlgorithmSuite();
      const result = suite.quickCompatibilityCheck(
        { dependencies: { react: "^17.0.0" }, devDependencies: {} },
        {
          name: "react-router-dom",
          version: "^6.20.0",
          reason: "routing",
          isDev: false,
        },
      );
      expect(result.compatible).toBe(false);
    });

    it("returns CompatibilityResult shape", () => {
      const suite = new DeerflowAlgorithmSuite();
      const result = suite.quickCompatibilityCheck(
        {},
        { name: "lodash", version: "^4.17.0", reason: "utils", isDev: false },
      );
      expect(result).toHaveProperty("compatible");
      expect(result).toHaveProperty("conflicts");
      expect(result).toHaveProperty("warnings");
      expect(result).toHaveProperty("recommendations");
    });
  });

  // -----------------------------------------------------------------------
  // verifyApi
  // -----------------------------------------------------------------------
  describe("verifyApi", () => {
    it("delegates to research.verifyApiExists", () => {
      const suite = new DeerflowAlgorithmSuite();
      const result = suite.verifyApi("react", "useState");
      expect(result).toHaveProperty("exists");
      expect(result).toHaveProperty("verifiedFrom");
      expect(result).toHaveProperty("correctUsage");
    });

    it("returns exists=false for empty library", () => {
      const suite = new DeerflowAlgorithmSuite();
      const result = suite.verifyApi("", "useState");
      expect(result.exists).toBe(false);
    });

    it("returns exists=false for empty API", () => {
      const suite = new DeerflowAlgorithmSuite();
      const result = suite.verifyApi("react", "");
      expect(result.exists).toBe(false);
    });
  });
});
