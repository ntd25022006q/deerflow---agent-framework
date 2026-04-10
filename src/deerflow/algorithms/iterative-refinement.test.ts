import { describe, it, expect } from "vitest";
import {
  IterativeRefinementAlgorithm,
  type CodeState,
  type IterationResult,
  type TestFailure,
} from "./iterative-refinement";

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
  const previous = makeCodeState();
  const current = makeCodeState();
  return {
    iteration: 1,
    previousState: previous,
    currentState: current,
    passed: false,
    diff: "",
    remainingIssues: ["some issue"],
    changesMade: [],
    durationMs: 100,
    regressionDetected: false,
    ...overrides,
  };
}

function makeTestFailure(overrides: Partial<TestFailure> = {}): TestFailure {
  return {
    testId: "test-1",
    testFile: "src/index.test.ts",
    assertion: "toBe(1)",
    expected: "1",
    actual: "undefined",
    errorMessage: "Expected 1, Received undefined",
    sourceFile: "src/index.ts",
    contextSnippet: "const result = fn();",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("IterativeRefinementAlgorithm", () => {
  // -----------------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------------
  describe("constructor", () => {
    it("defaults to 20 max iterations", () => {
      const algo = new IterativeRefinementAlgorithm();
      // We can indirectly verify via planIterations or shouldContinue
      const plan = algo.planIterations(5);
      expect(plan.maxIterations).toBeLessThanOrEqual(20);
    });

    it("accepts custom maxIterations", () => {
      const algo = new IterativeRefinementAlgorithm(50);
      // shouldContinue should respect the custom max
      const emptyIterations: IterationResult[] = [];
      const result = algo.shouldContinue(emptyIterations, 50);
      // 0 < 50, so it should continue
      expect(result.shouldContinue).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // planIterations
  // -----------------------------------------------------------------------
  describe("planIterations", () => {
    it("selects INCREMENTAL strategy for low complexity (1–3)", () => {
      const algo = new IterativeRefinementAlgorithm();
      const plan = algo.planIterations(1);
      expect(plan.strategy).toBe("INCREMENTAL");
      expect(plan.taskComplexity).toBe(1);
    });

    it("selects INCREMENTAL for complexity 3", () => {
      const algo = new IterativeRefinementAlgorithm();
      const plan = algo.planIterations(3);
      expect(plan.strategy).toBe("INCREMENTAL");
    });

    it("selects SPIRAL strategy for moderate complexity (4–6)", () => {
      const algo = new IterativeRefinementAlgorithm();
      const plan = algo.planIterations(5);
      expect(plan.strategy).toBe("SPIRAL");
    });

    it("selects BOTTOM_UP for high complexity (7–8)", () => {
      const algo = new IterativeRefinementAlgorithm();
      const plan = algo.planIterations(8);
      expect(plan.strategy).toBe("BOTTOM_UP");
    });

    it("selects TOP_DOWN for very high complexity (9–10)", () => {
      const algo = new IterativeRefinementAlgorithm();
      const plan = algo.planIterations(10);
      expect(plan.strategy).toBe("TOP_DOWN");
    });

    it("clamps complexity to 1–10 range", () => {
      const algo = new IterativeRefinementAlgorithm();
      expect(algo.planIterations(0).taskComplexity).toBe(1);
      expect(algo.planIterations(-5).taskComplexity).toBe(1);
      expect(algo.planIterations(15).taskComplexity).toBe(10);
    });

    it("generates at least one step for complexity 1", () => {
      const algo = new IterativeRefinementAlgorithm();
      const plan = algo.planIterations(1);
      expect(plan.steps.length).toBeGreaterThanOrEqual(1);
    });

    it("has a maxIterations field capped at 30 or less", () => {
      const algo = new IterativeRefinementAlgorithm();
      const plan = algo.planIterations(10);
      expect(plan.maxIterations).toBeLessThanOrEqual(30);
    });

    it("each step has the correct shape", () => {
      const algo = new IterativeRefinementAlgorithm();
      const plan = algo.planIterations(5);
      for (const step of plan.steps) {
        expect(step).toHaveProperty("index");
        expect(step).toHaveProperty("objective");
        expect(step).toHaveProperty("type");
        expect(step).toHaveProperty("expectedOutcome");
        expect(step).toHaveProperty("complexity");
        expect(["IMPLEMENT", "FIX", "REFACTOR", "TEST", "VERIFY"]).toContain(
          step.type,
        );
      }
    });
  });

  // -----------------------------------------------------------------------
  // evaluateIteration
  // -----------------------------------------------------------------------
  describe("evaluateIteration", () => {
    it("returns passed=true when states are identical and clean", () => {
      const algo = new IterativeRefinementAlgorithm();
      const state = makeCodeState({
        passingTests: ["test-1", "test-2"],
        failingTests: [],
        typeErrors: [],
        lintIssues: [],
      });
      const result = algo.evaluateIteration(state, state);
      expect(result.passed).toBe(true);
      expect(result.remaining).toEqual([]);
    });

    it("returns passed=false when there are type errors", () => {
      const algo = new IterativeRefinementAlgorithm();
      const state = makeCodeState({
        typeErrors: ["Cannot find name 'foo'"],
      });
      const expected = makeCodeState();
      const result = algo.evaluateIteration(state, expected);
      expect(result.passed).toBe(false);
      expect(result.remaining.length).toBeGreaterThan(0);
    });

    it("returns passed=false when there are failing tests", () => {
      const algo = new IterativeRefinementAlgorithm();
      const state = makeCodeState({
        failingTests: ["test-add-should-return-sum"],
      });
      const expected = makeCodeState();
      const result = algo.evaluateIteration(state, expected);
      expect(result.passed).toBe(false);
      expect(
        result.remaining.some((r) => r.includes("test-add-should-return-sum")),
      ).toBe(true);
    });

    it("returns passed=false when files differ", () => {
      const algo = new IterativeRefinementAlgorithm();
      const current = makeCodeState({
        files: new Map([["src/index.ts", "export const x = 1;"]]),
      });
      const expected = makeCodeState({
        files: new Map([["src/index.ts", "export const x = 2;"]]),
      });
      const result = algo.evaluateIteration(current, expected);
      expect(result.passed).toBe(false);
      expect(result.diff).toContain("MODIFIED");
    });

    it("detects missing expected files", () => {
      const algo = new IterativeRefinementAlgorithm();
      const current = makeCodeState({
        files: new Map(),
      });
      const expected = makeCodeState({
        files: new Map([["src/new-file.ts", "export {}"]]),
      });
      const result = algo.evaluateIteration(current, expected);
      expect(result.diff).toContain("MISSING");
    });

    it("detects lint issues", () => {
      const algo = new IterativeRefinementAlgorithm();
      const state = makeCodeState({
        lintIssues: ["no-unused-vars"],
      });
      const expected = makeCodeState();
      const result = algo.evaluateIteration(state, expected);
      expect(result.passed).toBe(false);
      expect(result.remaining.some((r) => r.includes("Lint issue"))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // detectRegression
  // -----------------------------------------------------------------------
  describe("detectRegression", () => {
    it("detects no regression when nothing changes", () => {
      const algo = new IterativeRefinementAlgorithm();
      const state = makeCodeState({
        passingTests: ["test-1"],
        failingTests: [],
        typeErrors: [],
        lintIssues: [],
      });
      const result = algo.detectRegression(state, state);
      expect(result.regressed).toBe(false);
      expect(result.details).toEqual([]);
    });

    it("detects test regression (passing → failing)", () => {
      const algo = new IterativeRefinementAlgorithm();
      const pre = makeCodeState({
        passingTests: ["test-1", "test-2"],
        failingTests: [],
      });
      const post = makeCodeState({
        passingTests: ["test-1"],
        failingTests: ["test-2"],
      });
      const result = algo.detectRegression(pre, post);
      expect(result.regressed).toBe(true);
      expect(result.details.length).toBe(1);
      expect(result.details[0]).toContain("test-2");
    });

    it("detects new type errors", () => {
      const algo = new IterativeRefinementAlgorithm();
      const pre = makeCodeState({ typeErrors: [] });
      const post = makeCodeState({
        typeErrors: ["Property 'foo' does not exist"],
      });
      const result = algo.detectRegression(pre, post);
      expect(result.regressed).toBe(true);
      expect(result.details[0]).toContain("New type error");
    });

    it("does not flag pre-existing type errors as regression", () => {
      const algo = new IterativeRefinementAlgorithm();
      const pre = makeCodeState({
        typeErrors: ["Existing error"],
      });
      const post = makeCodeState({
        typeErrors: ["Existing error"],
      });
      const result = algo.detectRegression(pre, post);
      expect(result.regressed).toBe(false);
    });

    it("detects new lint issues", () => {
      const algo = new IterativeRefinementAlgorithm();
      const pre = makeCodeState({ lintIssues: [] });
      const post = makeCodeState({
        lintIssues: ["Unexpected console statement"],
      });
      const result = algo.detectRegression(pre, post);
      expect(result.regressed).toBe(true);
      expect(result.details[0]).toContain("New lint issue");
    });
  });

  // -----------------------------------------------------------------------
  // calculateConvergence
  // -----------------------------------------------------------------------
  describe("calculateConvergence", () => {
    it("returns converging=true with insufficient data (0–1 iterations)", () => {
      const algo = new IterativeRefinementAlgorithm();
      const result = algo.calculateConvergence([]);
      expect(result.converging).toBe(true);
      expect(result.trend).toBe("CONVERGING");
    });

    it("detects converging trend with decreasing issues", () => {
      const algo = new IterativeRefinementAlgorithm();
      const iterations: IterationResult[] = [
        makeIterationResult({ iteration: 1, remainingIssues: ["a", "b", "c", "d", "e"] }),
        makeIterationResult({ iteration: 2, remainingIssues: ["a", "b"] }),
        makeIterationResult({ iteration: 3, remainingIssues: [] }),
      ];
      const result = algo.calculateConvergence(iterations);
      expect(result.converging).toBe(true);
      expect(result.trend).toBe("CONVERGING");
      expect(result.ratePerIteration).toBeGreaterThan(0);
    });

    it("detects diverging trend with increasing issues", () => {
      const algo = new IterativeRefinementAlgorithm();
      const iterations: IterationResult[] = [
        makeIterationResult({ iteration: 1, remainingIssues: ["a"] }),
        makeIterationResult({ iteration: 2, remainingIssues: ["a", "b", "c"] }),
        makeIterationResult({ iteration: 3, remainingIssues: ["a", "b", "c", "d", "e", "f"] }),
      ];
      const result = algo.calculateConvergence(iterations);
      expect(result.trend).toBe("DIVERGING");
      expect(result.converging).toBe(false);
    });

    it("detects stagnation with near-zero issue reduction rate", () => {
      const algo = new IterativeRefinementAlgorithm();
      // Use slightly different issue sets so infinite loop detection is not triggered,
      // but the average delta is near-zero → stagnation
      const iterations: IterationResult[] = [
        makeIterationResult({ iteration: 1, remainingIssues: ["a", "b", "c", "d", "e"] }),
        makeIterationResult({ iteration: 2, remainingIssues: ["a", "b", "c", "d", "e"] }),
        makeIterationResult({ iteration: 3, remainingIssues: ["a", "b", "c", "d", "f"] }),
        makeIterationResult({ iteration: 4, remainingIssues: ["a", "b", "c", "d", "g"] }),
        makeIterationResult({ iteration: 5, remainingIssues: ["a", "b", "c", "d", "h"] }),
      ];
      const result = algo.calculateConvergence(iterations);
      // Issue counts: [5, 5, 5, 5, 5] → deltas [0, 0, 0, 0] → avg 0 → stagnation
      expect(result.trend).toBe("STAGNATING");
      expect(result.converging).toBe(false);
    });

    it("detects infinite loop with identical issues for 3+ iterations", () => {
      const algo = new IterativeRefinementAlgorithm();
      const issues = ["x", "y"];
      const iterations: IterationResult[] = [
        makeIterationResult({ iteration: 1, remainingIssues: issues }),
        makeIterationResult({ iteration: 2, remainingIssues: issues }),
        makeIterationResult({ iteration: 3, remainingIssues: issues }),
      ];
      const result = algo.calculateConvergence(iterations);
      expect(result.infiniteLoopDetected).toBe(true);
    });

    it("returns estimated remaining when converging", () => {
      const algo = new IterativeRefinementAlgorithm();
      const iterations: IterationResult[] = [
        makeIterationResult({ iteration: 1, remainingIssues: ["a", "b", "c", "d"] }),
        makeIterationResult({ iteration: 2, remainingIssues: ["a"] }),
      ];
      const result = algo.calculateConvergence(iterations);
      if (result.converging) {
        expect(result.estimatedRemaining).toBeLessThan(Infinity);
      }
    });
  });

  // -----------------------------------------------------------------------
  // shouldContinue
  // -----------------------------------------------------------------------
  describe("shouldContinue", () => {
    it("returns shouldContinue=true with no iterations", () => {
      const algo = new IterativeRefinementAlgorithm();
      const result = algo.shouldContinue([]);
      expect(result.shouldContinue).toBe(true);
    });

    it("stops when max iterations is reached", () => {
      const algo = new IterativeRefinementAlgorithm(3);
      const iterations = [
        makeIterationResult({ iteration: 1 }),
        makeIterationResult({ iteration: 2 }),
        makeIterationResult({ iteration: 3 }),
      ];
      const result = algo.shouldContinue(iterations);
      expect(result.shouldContinue).toBe(false);
      expect(result.reason).toContain("Maximum iteration count");
    });

    it("stops when last iteration passed with no remaining issues", () => {
      const algo = new IterativeRefinementAlgorithm();
      const iterations = [
        makeIterationResult({
          iteration: 1,
          passed: true,
          remainingIssues: [],
        }),
      ];
      const result = algo.shouldContinue(iterations);
      expect(result.shouldContinue).toBe(false);
      expect(result.reason).toContain("All objectives achieved");
    });

    it("stops on infinite loop detection", () => {
      const algo = new IterativeRefinementAlgorithm();
      const issues = ["stuck"];
      const iterations = [
        makeIterationResult({ iteration: 1, remainingIssues: issues }),
        makeIterationResult({ iteration: 2, remainingIssues: issues }),
        makeIterationResult({ iteration: 3, remainingIssues: issues }),
      ];
      const result = algo.shouldContinue(iterations);
      expect(result.shouldContinue).toBe(false);
      expect(result.reason).toContain("Infinite loop");
    });

    it("respects hard cap of 30 even with higher custom max", () => {
      const algo = new IterativeRefinementAlgorithm(100);
      const iterations = Array.from({ length: 30 }, (_, i) =>
        makeIterationResult({ iteration: i + 1 }),
      );
      const result = algo.shouldContinue(iterations, 100);
      expect(result.shouldContinue).toBe(false);
      expect(result.reason).toContain("Hard maximum");
    });
  });

  // -----------------------------------------------------------------------
  // generateFixForFailure
  // -----------------------------------------------------------------------
  describe("generateFixForFailure", () => {
    it("returns structured fix for a test failure", () => {
      const algo = new IterativeRefinementAlgorithm();
      const failure = makeTestFailure();
      const fix = algo.generateFixForFailure(failure);
      expect(fix.targetFile).toBe("src/index.ts");
      expect(fix.confidence).toBeGreaterThanOrEqual(0.1);
      expect(fix.confidence).toBeLessThanOrEqual(0.95);
      expect(typeof fix.approach).toBe("string");
      expect(typeof fix.codeChange).toBe("string");
      expect(typeof fix.rationale).toBe("string");
    });

    it("includes failure details in rationale", () => {
      const algo = new IterativeRefinementAlgorithm();
      const failure = makeTestFailure({
        expected: "42",
        actual: "undefined",
        testId: "math-add-test",
      });
      const fix = algo.generateFixForFailure(failure);
      expect(fix.rationale).toContain("math-add-test");
      expect(fix.rationale).toContain("42");
      expect(fix.rationale).toContain("undefined");
    });
  });

  // -----------------------------------------------------------------------
  // generateSummary
  // -----------------------------------------------------------------------
  describe("generateSummary", () => {
    it("returns FAILED for empty iterations", () => {
      const algo = new IterativeRefinementAlgorithm();
      const summary = algo.generateSummary([]);
      expect(summary.totalIterations).toBe(0);
      expect(summary.finalState).toBe("FAILED");
      expect(summary.totalDurationMs).toBe(0);
    });

    it("returns PASSED when last iteration passes", () => {
      const algo = new IterativeRefinementAlgorithm();
      const iterations = [
        makeIterationResult({
          iteration: 1,
          passed: true,
          remainingIssues: [],
          previousState: makeCodeState({ failingTests: ["t1"] }),
        }),
      ];
      const summary = algo.generateSummary(iterations);
      expect(summary.finalState).toBe("PASSED");
      expect(summary.recommendations.length).toBeGreaterThan(0);
    });

    it("counts regressions correctly", () => {
      const algo = new IterativeRefinementAlgorithm();
      const iterations = [
        makeIterationResult({ iteration: 1, regressionDetected: true }),
        makeIterationResult({ iteration: 2, regressionDetected: false }),
        makeIterationResult({ iteration: 3, regressionDetected: true }),
      ];
      const summary = algo.generateSummary(iterations);
      expect(summary.regressions).toBe(2);
    });

    it("returns DIVERGED when infinite loop detected", () => {
      const algo = new IterativeRefinementAlgorithm();
      const issues = ["stuck"];
      const iterations = [
        makeIterationResult({ iteration: 1, remainingIssues: issues }),
        makeIterationResult({ iteration: 2, remainingIssues: issues }),
        makeIterationResult({ iteration: 3, remainingIssues: issues }),
      ];
      const summary = algo.generateSummary(iterations);
      expect(summary.finalState).toBe("DIVERGED");
    });

    it("includes key milestones in summary", () => {
      const algo = new IterativeRefinementAlgorithm();
      const iterations = [
        makeIterationResult({
          iteration: 1,
          passed: true,
          remainingIssues: [],
          previousState: makeCodeState({ failingTests: ["t1", "t2"] }),
          durationMs: 50,
        }),
      ];
      const summary = algo.generateSummary(iterations);
      expect(summary.keyMilestones.length).toBeGreaterThan(0);
      expect(summary.totalDurationMs).toBe(50);
    });

    it("has convergence data in summary", () => {
      const algo = new IterativeRefinementAlgorithm();
      const iterations = [
        makeIterationResult({ iteration: 1 }),
        makeIterationResult({ iteration: 2 }),
      ];
      const summary = algo.generateSummary(iterations);
      expect(summary.convergence).toBeDefined();
      expect(summary.convergence).toHaveProperty("trend");
    });
  });
});
