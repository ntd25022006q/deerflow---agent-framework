/**
 * @framework Deerflow v1.0.0
 * @license MIT
 *
 * Iterative Refinement Algorithm
 *
 * Enforce iterative development — build, test, fix, repeat.
 * This algorithm ensures agents don't declare success prematurely and
 * provides convergence detection to avoid infinite fix loops.
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** Represents the current state of generated code at a point in time. */
export interface CodeState {
  /** Unique identifier for this code state snapshot. */
  id: string;
  /** Map of file paths to their contents at this state. */
  files: Map<string, string>;
  /** List of passing test IDs at this state. */
  passingTests: string[];
  /** List of failing test IDs at this state. */
  failingTests: string[];
  /** TypeScript compilation errors (if applicable). */
  typeErrors: string[];
  /** Lint warnings and errors. */
  lintIssues: string[];
  /** ISO 8601 timestamp when this state was captured. */
  capturedAt: string;
}

/** A single planned iteration step. */
export interface IterationStep {
  /** Zero-based index of this step. */
  index: number;
  /** Human-readable description of what this step should accomplish. */
  objective: string;
  /** The type of work this step involves. */
  type: "IMPLEMENT" | "FIX" | "REFACTOR" | "TEST" | "VERIFY";
  /** Expected outcome upon successful completion. */
  expectedOutcome: string;
  /** Estimated complexity (1–10). */
  complexity: number;
}

/** A plan describing how to break a task into iterations. */
export interface IterationPlan {
  /** The original task description. */
  task: string;
  /** Assessed complexity of the task (1–10). */
  taskComplexity: number;
  /** Planned iteration steps. */
  steps: IterationStep[];
  /** Estimated total number of iterations required. */
  estimatedIterations: number;
  /** Maximum safe number of iterations before forced termination. */
  maxIterations: number;
  /** Strategy chosen based on complexity. */
  strategy: "INCREMENTAL" | "SPIRAL" | "TOP_DOWN" | "BOTTOM_UP";
}

/** The result of evaluating a single iteration. */
export interface IterationResult {
  /** Which iteration number this result represents (1-based). */
  iteration: number;
  /** The code state before this iteration's changes. */
  previousState: CodeState;
  /** The code state after this iteration's changes. */
  currentState: CodeState;
  /** Whether this iteration achieved its objective. */
  passed: boolean;
  /** Unified diff between previous and current state. */
  diff: string;
  /** List of remaining issues that still need to be addressed. */
  remainingIssues: string[];
  /** What was fixed or changed in this iteration. */
  changesMade: string[];
  /** Duration of this iteration in milliseconds. */
  durationMs: number;
  /** Whether a regression was detected during this iteration. */
  regressionDetected: boolean;
}

/** Describes a single test failure for targeted fix generation. */
export interface TestFailure {
  /** The test ID or name that failed. */
  testId: string;
  /** File where the test is defined. */
  testFile: string;
  /** The assertion that failed. */
  assertion: string;
  /** Expected value. */
  expected: string;
  /** Actual value received. */
  actual: string;
  /** The error message or stack trace. */
  errorMessage: string;
  /** The source file suspected to contain the bug. */
  sourceFile: string;
  /** Relevant code snippet around the failure location. */
  contextSnippet: string;
}

/** Result of convergence analysis. */
export interface ConvergenceResult {
  /** Whether the iterations are converging toward a solution. */
  converging: boolean;
  /** Current trend direction. */
  trend: "CONVERGING" | "DIVERGING" | "STAGNATING" | "OSCILLATING";
  /** Rate of convergence/divergence (negative = diverging). */
  ratePerIteration: number;
  /** Estimated iterations remaining until convergence (if converging). */
  estimatedRemaining: number;
  /** Whether an infinite loop has been detected. */
  infiniteLoopDetected: boolean;
  /** Human-readable analysis summary. */
  summary: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default maximum iterations to prevent infinite refinement. */
const DEFAULT_MAX_ITERATIONS = 20;

/** Maximum iterations for simple tasks (complexity 1–3). */
const SIMPLE_TASK_MAX = 10;

/** Maximum iterations for moderate tasks (complexity 4–6). */
const MODERATE_TASK_MAX = 15;

/** Maximum iterations for complex tasks (complexity 7–9). */
const COMPLEX_TASK_MAX = 20;

/** Hard cap — no task should exceed this regardless of complexity. */
const HARD_MAX_ITERATIONS = 30;

/** Convergence threshold: improvement rate below this is "stagnating." */
const STAGNATION_THRESHOLD = 0.02;

/** Number of identical states in a row to declare an infinite loop. */
const INFINITE_LOOP_THRESHOLD = 3;

// ---------------------------------------------------------------------------
// IterativeRefinementAlgorithm
// ---------------------------------------------------------------------------

/**
 * Orchestrates iterative development with safety guardrails.
 *
 * Key principles:
 *  1. Build incrementally — don't attempt everything at once.
 *  2. Test after every change — catch regressions immediately.
 *  3. Detect convergence — know when to stop or pivot.
 *  4. Prevent infinite loops — hard cap on iteration count.
 */
export class IterativeRefinementAlgorithm {
  /** Maximum number of iterations allowed before forced termination. */
  private maxIterations: number;

  /** History of all iteration results for convergence tracking. */
  private iterationHistory: IterationResult[] = [];

  constructor(maxIterations?: number) {
    this.maxIterations = maxIterations ?? DEFAULT_MAX_ITERATIONS;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Plan iterations based on task complexity.
   *
   * Breaks down a task into discrete, ordered steps with appropriate
   * strategy selection based on assessed complexity.
   *
   * @param taskComplexity - Complexity rating from 1 (trivial) to 10 (extremely complex).
   * @returns A structured iteration plan.
   */
  planIterations(taskComplexity: number): IterationPlan {
    const clampedComplexity = Math.max(1, Math.min(10, taskComplexity));

    // Select strategy based on complexity
    const strategy = this.selectStrategy(clampedComplexity);

    // Determine step breakdown
    const stepCount = this.estimateStepCount(clampedComplexity);
    const steps = this.generateSteps(clampedComplexity, stepCount, strategy);

    // Determine safe maximum iterations
    const maxIter = this.calculateSafeMaxIterations(clampedComplexity);

    return {
      task: "",
      taskComplexity: clampedComplexity,
      steps,
      estimatedIterations: stepCount,
      maxIterations: maxIter,
      strategy,
    };
  }

  /**
   * Evaluate the result of a single iteration.
   *
   * Compares the current code state against the expected state to determine
   * whether the iteration achieved its goal, and identifies remaining work.
   *
   * @param current  - The actual code state after the iteration.
   * @param expected - The target code state the iteration was aiming for.
   * @returns Evaluation result with pass/fail status and remaining issues.
   */
  evaluateIteration(
    current: CodeState,
    expected: CodeState,
  ): { passed: boolean; diff: string; remaining: string[] } {
    const diff = this.computeDiff(current, expected);
    const remaining: string[] = [];

    // Check for remaining type errors
    if (current.typeErrors.length > 0) {
      remaining.push(
        ...current.typeErrors.map((e) => `Type error: ${e}`),
      );
    }

    // Check for remaining lint issues
    if (current.lintIssues.length > 0) {
      remaining.push(
        ...current.lintIssues.map((i) => `Lint issue: ${i}`),
      );
    }

    // Check for failing tests
    if (current.failingTests.length > 0) {
      remaining.push(
        ...current.failingTests.map((t) => `Failing test: ${t}`),
      );
    }

    // Compare passing tests against expected
    const missingTests = expected.passingTests.filter(
      (t) => !current.passingTests.includes(t),
    );
    if (missingTests.length > 0) {
      remaining.push(
        ...missingTests.map((t) => `Missing passing test: ${t}`),
      );
    }

    const passed = remaining.length === 0 && diff === "";

    return { passed, diff, remaining };
  }

  /**
   * Detect if a code change introduced a regression.
   *
   * A regression is defined as a previously passing test that now fails,
   * or a previously clean file that now has type errors.
   *
   * @param preState  - Code state before the changes.
   * @param postState - Code state after the changes.
   * @returns Object describing any detected regressions.
   */
  detectRegression(
    preState: CodeState,
    postState: CodeState,
  ): { regressed: boolean; details: string[] } {
    const details: string[] = [];

    // Check for tests that were passing but are now failing
    const regressedTests = preState.passingTests.filter(
      (t) => postState.failingTests.includes(t),
    );
    for (const test of regressedTests) {
      details.push(`Test regression: "${test}" was passing, now failing.`);
    }

    // Check for new type errors in files that previously had none
    const newTypeErrors = postState.typeErrors.filter(
      (e) => !preState.typeErrors.includes(e),
    );
    for (const error of newTypeErrors) {
      details.push(`New type error introduced: ${error}`);
    }

    // Check for new lint issues
    const newLintIssues = postState.lintIssues.filter(
      (i) => !preState.lintIssues.includes(i),
    );
    for (const issue of newLintIssues) {
      details.push(`New lint issue introduced: ${issue}`);
    }

    return {
      regressed: details.length > 0,
      details,
    };
  }

  /**
   * Generate a targeted fix for a specific test failure.
   *
   * Produces a structured fix suggestion rather than a blind patch,
   * ensuring the fix is scoped to the actual failure.
   *
   * @param failure - The test failure to generate a fix for.
   * @returns Object describing the suggested fix approach.
   */
  generateFixForFailure(
    failure: TestFailure,
  ): {
    targetFile: string;
    approach: string;
    codeChange: string;
    rationale: string;
    confidence: number;
  } {
    // Analyze the failure to determine the most likely cause
    const cause = this.analyzeFailureCause(failure);
    const confidence = this.estimateFixConfidence(failure, cause);

    return {
      targetFile: failure.sourceFile,
      approach: cause,
      codeChange: this.generateFixCode(failure, cause),
      rationale: `Test "${failure.testId}" expects "${failure.expected}" but received "${failure.actual}". ` +
        `Analysis suggests: ${cause}. Fix targets ${failure.sourceFile}.`,
      confidence,
    };
  }

  /**
   * Calculate whether iterations are converging or diverging.
   *
   * Analyzes the trend of remaining issues across iterations to determine
   * if the agent is making progress or stuck in a loop.
   *
   * @param iterations - History of iteration results to analyze.
   * @returns Convergence analysis result.
   */
  calculateConvergence(iterations: IterationResult[]): ConvergenceResult {
    if (iterations.length < 2) {
      return {
        converging: true,
        trend: "CONVERGING",
        ratePerIteration: 0,
        estimatedRemaining: 10,
        infiniteLoopDetected: false,
        summary: "Insufficient data for convergence analysis. Need at least 2 iterations.",
      };
    }

    // Track remaining issues count per iteration
    const issueCounts = iterations.map((i) => i.remainingIssues.length);
    const deltas: number[] = [];

    for (let i = 1; i < issueCounts.length; i++) {
      deltas.push(issueCounts[i - 1] - issueCounts[i]);
    }

    // Average rate of issue reduction per iteration
    const avgDelta =
      deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
    const ratePerIteration = Math.round(avgDelta * 100) / 100;

    // Detect oscillation (alternating increases and decreases)
    let oscillations = 0;
    for (let i = 1; i < deltas.length; i++) {
      if (
        (deltas[i] > 0 && deltas[i - 1] < 0) ||
        (deltas[i] < 0 && deltas[i - 1] > 0)
      ) {
        oscillations++;
      }
    }
    const isOscillating = oscillations > deltas.length * 0.5;

    // Detect stagnation (very little change)
    const isStagnating =
      Math.abs(ratePerIteration) < STAGNATION_THRESHOLD && !isOscillating;

    // Detect infinite loop (identical remaining issues for N consecutive iterations)
    const infiniteLoopDetected = this.detectInfiniteLoop(iterations);

    // Determine trend
    let trend: ConvergenceResult["trend"];
    let converging: boolean;
    let estimatedRemaining: number;

    if (infiniteLoopDetected) {
      trend = "OSCILLATING";
      converging = false;
      estimatedRemaining = Infinity;
    } else if (isOscillating) {
      trend = "OSCILLATING";
      converging = false;
      estimatedRemaining = Infinity;
    } else if (isStagnating) {
      trend = "STAGNATING";
      converging = false;
      estimatedRemaining = iterations[iterations.length - 1].remainingIssues.length;
    } else if (ratePerIteration > 0) {
      trend = "CONVERGING";
      converging = true;
      const lastCount = issueCounts[issueCounts.length - 1];
      estimatedRemaining =
        ratePerIteration > 0
          ? Math.ceil(lastCount / ratePerIteration)
          : 999;
    } else {
      trend = "DIVERGING";
      converging = false;
      estimatedRemaining = Infinity;
    }

    return {
      converging,
      trend,
      ratePerIteration,
      estimatedRemaining,
      infiniteLoopDetected,
      summary: this.generateConvergenceSummary(trend, ratePerIteration, iterations.length),
    };
  }

  /**
   * Decide whether to continue iterating.
   *
   * Stops if: all tests pass, max iterations reached, or convergence
   * analysis indicates no further progress is being made.
   *
   * @param iterations     - History of iteration results so far.
   * @param maxIterations  - Override for the maximum iteration count.
   * @returns Whether the agent should continue refining.
   */
  shouldContinue(
    iterations: IterationResult[],
    maxIterations?: number,
  ): { shouldContinue: boolean; reason: string } {
    const effectiveMax = maxIterations ?? this.maxIterations;

    // Check hard maximum — safety first
    if (iterations.length >= effectiveMax) {
      return {
        shouldContinue: false,
        reason: `Maximum iteration count (${effectiveMax}) reached. Stopping to prevent infinite refinement.`,
      };
    }

    // Check hard cap — absolute safety limit
    if (iterations.length >= HARD_MAX_ITERATIONS) {
      return {
        shouldContinue: false,
        reason: `Hard maximum (${HARD_MAX_ITERATIONS}) reached. This is a safety limit that cannot be overridden.`,
      };
    }

    // Check if last iteration passed with no remaining issues
    const lastIteration = iterations[iterations.length - 1];
    if (lastIteration && lastIteration.passed && lastIteration.remainingIssues.length === 0) {
      return {
        shouldContinue: false,
        reason: "All objectives achieved. No remaining issues detected.",
      };
    }

    // Run convergence analysis
    const convergence = this.calculateConvergence(iterations);

    if (convergence.infiniteLoopDetected) {
      return {
        shouldContinue: false,
        reason: `Infinite loop detected. The same fixes are being applied and undone. ${convergence.summary}`,
      };
    }

    if (convergence.trend === "DIVERGING") {
      return {
        shouldContinue: false,
        reason: `Iterations are diverging — changes are making things worse. ${convergence.summary}`,
      };
    }

    if (convergence.trend === "STAGNATING" && iterations.length >= 5) {
      return {
        shouldContinue: false,
        reason: `Iterations are stagnating — no meaningful progress in the last ${iterations.length} iterations. Consider a different approach.`,
      };
    }

    if (convergence.trend === "OSCILLATING" && iterations.length >= 6) {
      return {
        shouldContinue: false,
        reason: `Oscillation detected — fixes are alternating between states. Breaking the loop to reassess strategy.`,
      };
    }

    return {
      shouldContinue: true,
      reason: `Continuing iteration ${iterations.length + 1}. ${convergence.summary}`,
    };
  }

  /**
   * Generate a human-readable summary of the refinement process.
   *
   * @param iterations - Complete history of iteration results.
   * @returns Structured summary of the entire refinement process.
   */
  generateSummary(iterations: IterationResult[]): {
    totalIterations: number;
    finalState: "PASSED" | "FAILED" | "TIMEOUT" | "DIVERGED";
    convergence: ConvergenceResult;
    regressions: number;
    totalDurationMs: number;
    keyMilestones: string[];
    recommendations: string[];
  } {
    const convergence = this.calculateConvergence(iterations);
    const totalDurationMs = iterations.reduce((sum, i) => sum + i.durationMs, 0);
    const regressions = iterations.filter((i) => i.regressionDetected).length;

    // Determine final state
    let finalState: "PASSED" | "FAILED" | "TIMEOUT" | "DIVERGED";
    const last = iterations[iterations.length - 1];

    if (last && last.passed && last.remainingIssues.length === 0) {
      finalState = "PASSED";
    } else if (convergence.infiniteLoopDetected || convergence.trend === "OSCILLATING") {
      finalState = "DIVERGED";
    } else if (iterations.length >= this.maxIterations) {
      finalState = "TIMEOUT";
    } else {
      finalState = "FAILED";
    }

    // Extract key milestones
    const keyMilestones: string[] = [];
    if (iterations.length > 0) {
      keyMilestones.push(`Started with ${iterations[0].previousState.failingTests.length} failing test(s).`);
    }
    const firstPassing = iterations.find((i) => i.passed);
    if (firstPassing) {
      keyMilestones.push(`First successful iteration at step ${firstPassing.iteration}.`);
    }
    if (regressions > 0) {
      keyMilestones.push(`${regressions} regression(s) detected and addressed.`);
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (finalState === "PASSED") {
      recommendations.push("Implementation is complete. Consider adding additional edge case tests.");
    } else if (finalState === "DIVERGED") {
      recommendations.push(
        "The iterative process diverged. Consider: (1) simplifying the approach, (2) breaking the task into smaller sub-tasks, (3) consulting documentation.",
      );
    } else if (finalState === "TIMEOUT") {
      recommendations.push(
        "Maximum iterations reached without resolution. Consider: (1) reducing task scope, (2) identifying root cause of recurring failures.",
      );
    } else {
      recommendations.push("Implementation incomplete. Review remaining issues and adjust strategy.");
    }

    return {
      totalIterations: iterations.length,
      finalState,
      convergence,
      regressions,
      totalDurationMs,
      keyMilestones,
      recommendations,
    };
  }

  // -----------------------------------------------------------------------
  // Helpers (private)
  // -----------------------------------------------------------------------

  /**
   * Select an iteration strategy based on task complexity.
   */
  private selectStrategy(complexity: number): IterationPlan["strategy"] {
    if (complexity <= 3) return "INCREMENTAL";
    if (complexity <= 6) return "SPIRAL";
    if (complexity <= 8) return "BOTTOM_UP";
    return "TOP_DOWN";
  }

  /**
   * Estimate the number of steps needed based on complexity.
   */
  private estimateStepCount(complexity: number): number {
    if (complexity <= 2) return complexity + 1;
    if (complexity <= 5) return Math.ceil(complexity * 1.5);
    return complexity * 2;
  }

  /**
   * Generate iteration steps based on complexity and strategy.
   */
  private generateSteps(
    complexity: number,
    count: number,
    strategy: IterationPlan["strategy"],
  ): IterationStep[] {
    const steps: IterationStep[] = [];

    if (strategy === "INCREMENTAL") {
      steps.push({ index: 0, objective: "Set up basic structure", type: "IMPLEMENT", expectedOutcome: "Skeleton code compiles", complexity: 1 });
      for (let i = 1; i < count - 1; i++) {
        steps.push({ index: i, objective: `Implement feature part ${i}`, type: "IMPLEMENT", expectedOutcome: `Feature part ${i} functional`, complexity: Math.min(5, complexity) });
      }
      steps.push({ index: count - 1, objective: "Final verification and cleanup", type: "VERIFY", expectedOutcome: "All tests pass", complexity: 2 });
    } else if (strategy === "SPIRAL") {
      for (let i = 0; i < count; i++) {
        const phase = i % 4;
        const phaseTypes = ["IMPLEMENT", "TEST", "FIX", "VERIFY"] as const;
        const type = phaseTypes[phase];
        steps.push({ index: i, objective: `Spiral pass ${i + 1}`, type, expectedOutcome: `Increment ${i + 1} complete`, complexity: Math.ceil(complexity / count) });
      }
    } else if (strategy === "BOTTOM_UP") {
      steps.push({ index: 0, objective: "Implement utility functions and helpers", type: "IMPLEMENT", expectedOutcome: "Low-level utilities tested", complexity: Math.ceil(complexity * 0.3) });
      steps.push({ index: 1, objective: "Build core logic layer", type: "IMPLEMENT", expectedOutcome: "Core logic functional", complexity: Math.ceil(complexity * 0.5) });
      steps.push({ index: 2, objective: "Add integration and orchestration", type: "IMPLEMENT", expectedOutcome: "Full integration working", complexity: Math.ceil(complexity * 0.7) });
      steps.push({ index: 3, objective: "Top-level verification", type: "VERIFY", expectedOutcome: "End-to-end tests pass", complexity: 3 });
    } else {
      // TOP_DOWN
      steps.push({ index: 0, objective: "Define top-level API and interfaces", type: "IMPLEMENT", expectedOutcome: "Public API defined", complexity: 2 });
      for (let i = 1; i < count - 1; i++) {
        steps.push({ index: i, objective: `Implement internal layer ${i}`, type: "IMPLEMENT", expectedOutcome: `Layer ${i} functional`, complexity: Math.ceil(complexity * 0.6) });
      }
      steps.push({ index: count - 1, objective: "Connect all layers and test", type: "VERIFY", expectedOutcome: "All layers integrated", complexity: complexity });
    }

    return steps;
  }

  /**
   * Calculate a safe maximum iteration count based on task complexity.
   */
  private calculateSafeMaxIterations(complexity: number): number {
    if (complexity <= 3) return SIMPLE_TASK_MAX;
    if (complexity <= 6) return MODERATE_TASK_MAX;
    if (complexity <= 9) return COMPLEX_TASK_MAX;
    return HARD_MAX_ITERATIONS;
  }

  /**
   * Compute a simplified unified diff between two code states.
   */
  private computeDiff(current: CodeState, expected: CodeState): string {
    const diffs: string[] = [];

    // Compare files present in expected but not in current
    const expectedFiles = Array.from(expected.files.keys());
    const currentFiles = Array.from(current.files.keys());

    for (const file of expectedFiles) {
      if (!currentFiles.includes(file)) {
        diffs.push(`MISSING: ${file}`);
      } else if (current.files.get(file) !== expected.files.get(file)) {
        diffs.push(`MODIFIED: ${file}`);
      }
    }

    for (const file of currentFiles) {
      if (!expectedFiles.includes(file)) {
        diffs.push(`UNEXPECTED: ${file}`);
      }
    }

    return diffs.join("\n");
  }

  /**
   * Analyze the likely cause of a test failure.
   */
  private analyzeFailureCause(failure: TestFailure): string {
    if (failure.expected === "undefined" || failure.actual === "undefined") {
      return "Likely a missing import, incorrect reference, or undefined variable access.";
    }
    if (failure.errorMessage.includes("TypeError")) {
      return "Type error — likely incorrect type usage or missing type coercion.";
    }
    if (failure.errorMessage.includes("Cannot read property")) {
      return "Null/undefined access — likely a missing null check or incorrect data shape.";
    }
    if (failure.errorMessage.includes("Expected") && failure.errorMessage.includes("Received")) {
      return "Value mismatch — logic error producing incorrect output.";
    }
    return "General assertion failure — review logic in the target function.";
  }

  /**
   * Estimate confidence that a generated fix will resolve the failure.
   */
  private estimateFixConfidence(failure: TestFailure, cause: string): number {
    let confidence = 0.5;

    if (failure.contextSnippet.length > 0) confidence += 0.1;
    if (failure.sourceFile.length > 0) confidence += 0.1;
    if (cause.includes("Likely")) confidence -= 0.1;
    if (failure.errorMessage.includes("TypeError")) confidence += 0.15;

    return Math.min(0.95, Math.max(0.1, confidence));
  }

  /**
   * Generate a fix code snippet for a given failure and cause analysis.
   */
  private generateFixCode(failure: TestFailure, cause: string): string {
    return `// Fix for: ${failure.testId}\n` +
      `// File: ${failure.sourceFile}\n` +
      `// Cause: ${cause}\n` +
      `// Expected: ${failure.expected}\n` +
      `// Actual: ${failure.actual}\n` +
      `// TODO: Implement targeted fix based on the above analysis.`;
  }

  /**
   * Detect if iterations are stuck in an infinite loop.
   *
   * Checks if the same set of remaining issues appears across
   * multiple consecutive iterations.
   */
  private detectInfiniteLoop(iterations: IterationResult[]): boolean {
    if (iterations.length < INFINITE_LOOP_THRESHOLD) return false;

    const recent = iterations.slice(-INFINITE_LOOP_THRESHOLD);
    const issueSets = recent.map((i) =>
      [...i.remainingIssues].sort().join("|||"),
    );

    // If all recent iterations have the exact same remaining issues, we're looping
    const first = issueSets[0];
    return issueSets.every((set) => set === first);
  }

  /**
   * Generate a human-readable convergence summary.
   */
  private generateConvergenceSummary(
    trend: ConvergenceResult["trend"],
    rate: number,
    iterationCount: number,
  ): string {
    const rateStr = rate > 0 ? `+${rate}` : `${rate}`;
    switch (trend) {
      case "CONVERGING":
        return `Converging at ${rateStr} issues/iteration over ${iterationCount} iteration(s).`;
      case "DIVERGING":
        return `DIVERGING at ${rateStr} issues/iteration. Changes are making things worse.`;
      case "STAGNATING":
        return `Stagnating — near-zero progress (${rateStr} issues/iteration).`;
      case "OSCILLATING":
        return `Oscillating — fixes are cycling between states. No net progress.`;
    }
  }
}
