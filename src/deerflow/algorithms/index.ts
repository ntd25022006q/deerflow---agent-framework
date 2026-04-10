/**
 * @framework Deerflow v1.0.0
 * @license MIT
 *
 * Deerflow Algorithm Suite — Index & Orchestration
 *
 * Re-exports all individual algorithms and provides the top-level
 * `DeerflowAlgorithmSuite` class that orchestrates pre- and post-
 * implementation checks.
 */

// ---------------------------------------------------------------------------
// Re-exports: Deep Research
// ---------------------------------------------------------------------------
export {
  DeepResearchAlgorithm,
  ResearchDepth,
} from "./deep-research";

export type {
  DocSource,
  SearchResult,
  ApiVerificationResult,
  CompatibilityEntry,
  CompatibilityMatrix,
  KnownIssue,
  VersionInfo,
  CrossReferenceResult,
  ResearchReport,
} from "./deep-research";

// ---------------------------------------------------------------------------
// Re-exports: Iterative Refinement
// ---------------------------------------------------------------------------
export {
  IterativeRefinementAlgorithm,
} from "./iterative-refinement";

export type {
  CodeState,
  IterationStep,
  IterationPlan,
  IterationResult,
  TestFailure,
  ConvergenceResult,
} from "./iterative-refinement";

// ---------------------------------------------------------------------------
// Re-exports: Dependency Resolver
// ---------------------------------------------------------------------------
export {
  DependencyResolver,
} from "./dependency-resolver";

export type {
  Package,
  PackageRequest,
  DependencyConflict,
  CompatibilityResult,
  DependencyAnalysis,
  AlternativeRecommendation,
  DependencyReport,
} from "./dependency-resolver";

// ---------------------------------------------------------------------------
// Orchestration Imports
// ---------------------------------------------------------------------------
import {
  DeepResearchAlgorithm,
  ResearchDepth,
  type ResearchReport,
  type CompatibilityMatrix,
} from "./deep-research";

import {
  IterativeRefinementAlgorithm,
  type CodeState,
  type IterationResult,
  type IterationPlan,
  type ConvergenceResult,
} from "./iterative-refinement";

import {
  DependencyResolver,
  type PackageRequest,
  type CompatibilityResult,
  type DependencyReport,
} from "./dependency-resolver";

// ---------------------------------------------------------------------------
// Orchestration Interfaces
// ---------------------------------------------------------------------------

/** Result of a pre-implementation check. */
export interface PreImplementationCheckResult {
  /** Whether the project is ready for implementation. */
  ready: boolean;
  /** Research report from deep-research phase. */
  researchReport: ResearchReport | null;
  /** Dependency compatibility checks for proposed packages. */
  dependencyResults: CompatibilityResult[];
  /** Full dependency report. */
  dependencyReport: DependencyReport | null;
  /** Blockers that must be resolved before coding can begin. */
  blockers: string[];
  /** Warnings that should be acknowledged but don't block work. */
  warnings: string[];
  /** Recommendations for the implementation phase. */
  recommendations: string[];
}

/** Result of a post-implementation check. */
export interface PostImplementationCheckResult {
  /** Whether the implementation converged successfully. */
  converged: boolean;
  /** Convergence analysis from iterative refinement. */
  convergence: ConvergenceResult;
  /** Total iterations performed. */
  totalIterations: number;
  /** Final state assessment. */
  finalState: "PASSED" | "FAILED" | "TIMEOUT" | "DIVERGED";
  /** Whether any regressions were detected. */
  regressionsDetected: number;
  /** Recommendations for next steps. */
  recommendations: string[];
  /** Whether a manual review is needed. */
  requiresManualReview: boolean;
}

/** Configuration for the Deerflow Algorithm Suite. */
export interface SuiteConfig {
  /** Research depth for the deep-research algorithm. */
  researchDepth?: ResearchDepth;
  /** Maximum iterations for iterative refinement. */
  maxIterations?: number;
  /** Minimum confidence threshold to proceed with implementation. */
  minConfidence?: number;
  /** Whether to automatically check React compatibility. */
  checkReactCompatibility?: boolean;
  /** React version string (auto-detected if not provided). */
  reactVersion?: string;
}

// ---------------------------------------------------------------------------
// DeerflowAlgorithmSuite
// ---------------------------------------------------------------------------

/**
 * Top-level orchestrator for all Deerflow algorithms.
 *
 * Provides two primary workflows:
 *
 *  1. **Pre-implementation check** — Run deep-research + dependency-resolver
 *     BEFORE writing any code to ensure the agent has accurate information
 *     and no dependency conflicts exist.
 *
 *  2. **Post-implementation check** — Run iterative-refinement convergence
 *     analysis AFTER coding to verify the solution is stable and complete.
 *
 * Usage:
 * ```ts
 * const suite = new DeerflowAlgorithmSuite({ researchDepth: ResearchDepth.DEEP });
 *
 * // Before coding:
 * const preCheck = suite.runPreImplementationCheck(topic, packages);
 *
 * // After coding:
 * const postCheck = suite.runPostImplementationCheck(iterations);
 * ```
 */
export class DeerflowAlgorithmSuite {
  /** The deep research algorithm instance. */
  readonly research: DeepResearchAlgorithm;

  /** The iterative refinement algorithm instance. */
  readonly refinement: IterativeRefinementAlgorithm;

  /** The dependency resolver algorithm instance. */
  readonly dependencies: DependencyResolver;

  /** Suite configuration. */
  private readonly config: Required<SuiteConfig>;

  constructor(config: SuiteConfig = {}) {
    this.config = {
      researchDepth: config.researchDepth ?? ResearchDepth.STANDARD,
      maxIterations: config.maxIterations ?? 20,
      minConfidence: config.minConfidence ?? 0.7,
      checkReactCompatibility: config.checkReactCompatibility ?? true,
      reactVersion: config.reactVersion ?? "18.2.0",
    };

    this.research = new DeepResearchAlgorithm(this.config.researchDepth);
    this.refinement = new IterativeRefinementAlgorithm(this.config.maxIterations);
    this.dependencies = new DependencyResolver();
  }

  // -----------------------------------------------------------------------
  // Pre-Implementation Check
  // -----------------------------------------------------------------------

  /**
   * Run all pre-implementation checks before coding begins.
   *
   * This method orchestrates:
   *  1. Deep research on the implementation topic
   *  2. Dependency compatibility analysis for proposed packages
   *  3. React-specific compatibility validation (if applicable)
   *  4. Comprehensive dependency report
   *
   * @param topic          - The implementation topic to research.
   * @param packageJson    - The current project's package.json object.
   * @param requestedPkgs  - Packages the agent intends to add.
   * @returns Pre-implementation check result with go/no-go decision.
   */
  runPreImplementationCheck(
    topic: string,
    packageJson: object,
    requestedPkgs: PackageRequest[] = [],
  ): PreImplementationCheckResult {
    const blockers: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Phase 1: Deep research on the topic
    const researchReport = this.research.generateResearchReport(topic);

    if (researchReport.confidence < this.config.minConfidence) {
      blockers.push(
        `Research confidence (${(researchReport.confidence * 100).toFixed(1)}%) is below the minimum threshold (${(this.config.minConfidence * 100).toFixed(1)}%). ` +
        `Increase research depth or consult additional sources before proceeding.`,
      );
    }

    // Add research recommendations to the output
    recommendations.push(...researchReport.recommendations);

    // Phase 2: Analyze current dependencies
    this.dependencies.analyzeCurrentDependencies(packageJson);
    const dependencyReport = this.dependencies.generateDependencyReport();

    // Check for existing conflicts
    const existingErrors = dependencyReport.conflicts.filter(
      (c) => c.severity === "ERROR",
    );
    if (existingErrors.length > 0) {
      blockers.push(
        `Found ${existingErrors.length} blocking dependency conflict(s) in the current project. ` +
        `Resolve these before adding new packages.`,
      );
    }

    // Phase 3: Check compatibility of requested packages
    const dependencyResults: CompatibilityResult[] = [];

    for (const pkg of requestedPkgs) {
      const result = this.dependencies.checkCompatibility(pkg);

      dependencyResults.push(result);

      if (!result.compatible) {
        const blockingConflicts = result.conflicts.filter((c) => c.isBlocker);
        for (const conflict of blockingConflicts) {
          blockers.push(
            `Package "${pkg.name}" has a blocking conflict: ${conflict.description}`,
          );
        }
      }

      warnings.push(...result.warnings);
      recommendations.push(...result.recommendations);

      // Phase 3a: React-specific compatibility
      if (this.config.checkReactCompatibility) {
        const reactCompat = this.dependencies.validateReactCompatibility(
          pkg.name,
          this.config.reactVersion,
        );
        if (!reactCompat.compatible) {
          blockers.push(
            `Package "${pkg.name}" is not compatible with React ${this.config.reactVersion}. ` +
            `Requires React ${reactCompat.minRequired}+. ${reactCompat.notes}`,
          );
        }
      }
    }

    // Phase 4: Styling conflict checks for requested packages
    const stylingPkgs = requestedPkgs.filter(
      (p) =>
        p.name.includes("css") ||
        p.name.includes("style") ||
        p.name.includes("tailwind") ||
        p.name.includes("bootstrap") ||
        p.name.includes("sass") ||
        p.name.includes("emotion") ||
        p.name.includes("styled"),
    );

    const existingStylingPkgs = dependencyReport.analysis.dependencies.filter(
      (p) =>
        p.includes("css") ||
        p.includes("style") ||
        p.includes("tailwind") ||
        p.includes("bootstrap") ||
        p.includes("sass") ||
        p.includes("emotion") ||
        p.includes("styled"),
    );

    for (const stylePkg of stylingPkgs) {
      const styleCheck = this.dependencies.validateStylingSolutionConflicts(
        existingStylingPkgs,
        stylePkg.name,
      );
      if (styleCheck.hasConflict && styleCheck.conflictType === "CROSS_GROUP") {
        blockers.push(`Styling conflict: ${styleCheck.explanation}`);
      } else if (styleCheck.hasConflict) {
        warnings.push(`Styling warning: ${styleCheck.explanation}`);
      }
    }

    // Determine readiness
    const ready = blockers.length === 0;

    return {
      ready,
      researchReport,
      dependencyResults,
      dependencyReport,
      blockers,
      warnings,
      recommendations,
    };
  }

  // -----------------------------------------------------------------------
  // Post-Implementation Check
  // -----------------------------------------------------------------------

  /**
   * Run post-implementation checks after coding is complete.
   *
   * This method analyzes the iteration history to determine:
   *  1. Whether the implementation converged to a stable solution
   *  2. Whether any regressions were introduced
   *  3. Whether manual review is needed
   *
   * @param iterations - Complete history of iteration results.
   * @returns Post-implementation check result.
   */
  runPostImplementationCheck(
    iterations: IterationResult[],
  ): PostImplementationCheckResult {
    // Run convergence analysis
    const convergence = this.refinement.calculateConvergence(iterations);

    // Check if we should continue
    const shouldContinueResult = this.refinement.shouldContinue(iterations);

    // Generate full summary
    const summary = this.refinement.generateSummary(iterations);

    // Count regressions
    const regressionsDetected = summary.regressions;

    // Determine final state
    const finalState = summary.finalState;

    // Determine if manual review is needed
    const requiresManualReview =
      finalState !== "PASSED" ||
      convergence.trend === "OSCILLATING" ||
      convergence.trend === "STAGNATING" ||
      regressionsDetected > 0 ||
      summary.convergence.infiniteLoopDetected;

    // Build recommendations
    const recommendations: string[] = [];

    if (finalState === "PASSED") {
      recommendations.push(
        "Implementation converged successfully. Consider running integration tests and reviewing edge cases.",
      );
      if (regressionsDetected > 0) {
        recommendations.push(
          `Although the implementation passed, ${regressionsDetected} regression(s) were detected during development. ` +
          "Verify that all originally passing tests still pass.",
        );
      }
    } else if (finalState === "DIVERGED") {
      recommendations.push(
        "The implementation process diverged. Recommended actions:",
        "1. Review the iteration history for patterns of conflicting fixes.",
        "2. Simplify the approach — break the task into smaller, independent sub-tasks.",
        "3. Re-run deep research to verify assumptions about APIs and libraries.",
      );
    } else if (finalState === "TIMEOUT") {
      recommendations.push(
        `Maximum iterations (${iterations.length}) reached without convergence. Recommended actions:`,
        "1. Identify the root cause of recurring failures.",
        "2. Consider whether the task is too complex and needs to be decomposed.",
        "3. Check if there are unresolvable dependency conflicts causing test failures.",
      );
    } else {
      recommendations.push(
        "Implementation is incomplete. Review remaining issues and adjust the approach before continuing.",
      );
    }

    if (convergence.trend === "OSCILLATING") {
      recommendations.push(
        "Oscillation detected — the same changes are being made and undone. " +
        "This often indicates conflicting requirements or a misunderstanding of the target behavior.",
      );
    }

    return {
      converged: convergence.converging && finalState === "PASSED",
      convergence,
      totalIterations: iterations.length,
      finalState,
      regressionsDetected,
      recommendations,
      requiresManualReview,
    };
  }

  // -----------------------------------------------------------------------
  // Utility Methods
  // -----------------------------------------------------------------------

  /**
   * Plan an iterative development approach for a given task.
   *
   * Convenience method that delegates to the iterative refinement algorithm.
   *
   * @param taskComplexity - Complexity rating (1–10).
   * @returns An iteration plan with step breakdown.
   */
  planDevelopment(taskComplexity: number): IterationPlan {
    return this.refinement.planIterations(taskComplexity);
  }

  /**
   * Quick compatibility check for a single package addition.
   *
   * Useful for agents that need to check one package at a time during
   * implementation.
   *
   * @param packageJson   - The current project's package.json.
   * @param newPackage    - The package to check.
   * @returns Compatibility result.
   */
  quickCompatibilityCheck(
    packageJson: object,
    newPackage: PackageRequest,
  ): CompatibilityResult {
    this.dependencies.analyzeCurrentDependencies(packageJson);
    return this.dependencies.checkCompatibility(newPackage);
  }

  /**
   * Verify a specific API claim before using it in code.
   *
   * Enforces the "NEVER fabricate, ALWAYS verify" principle for
   * individual API lookups during implementation.
   *
   * @param library - The library name.
   * @param api     - The API to verify.
   * @returns Whether the API exists and how to use it correctly.
   */
  verifyApi(library: string, api: string) {
    return this.research.verifyApiExists(library, api);
  }
}
