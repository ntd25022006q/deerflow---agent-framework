import { describe, it, expect } from "vitest";
import {
  validateTaskReadiness,
  validateImplementation,
  validateFix,
  validateDeliverable,
  type ValidationResult,
} from "./task-validator";
import { TaskType, RiskLevel, TaskPriority } from "./agentic-workflow";

// ---------------------------------------------------------------------------
// Helper: build a ClassifiedTask
// ---------------------------------------------------------------------------
function makeClassifiedTask(overrides: Partial<import("./agentic-workflow").ClassifiedTask> = {}) {
  return {
    type: TaskType.FEATURE,
    priority: TaskPriority.MEDIUM,
    requiresTests: true,
    requiresSecurityReview: false,
    requiresBuildValidation: true,
    requiresManualVerification: false,
    estimatedSteps: 8,
    riskLevel: RiskLevel.LOW,
    ...overrides,
  };
}

function makeReadyContext(overrides: Record<string, boolean> = {}) {
  return {
    hasExistingCode: false,
    codebaseUnderstood: true,
    requirementsConfirmed: true,
    dependenciesResolved: true,
    environmentReady: true,
    ...overrides,
  };
}

// ===========================================================================
// validateTaskReadiness
// ===========================================================================
describe("validateTaskReadiness", () => {
  it("fails for vague descriptions (< 10 chars)", () => {
    const result = validateTaskReadiness(
      "fix it",
      makeClassifiedTask(),
      makeReadyContext()
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("vague"))).toBe(true);
  });

  it("fails for high-risk tasks without confirmed requirements", () => {
    const result = validateTaskReadiness(
      "Delete the production database and recreate the schema from scratch",
      makeClassifiedTask({ riskLevel: RiskLevel.HIGH }),
      makeReadyContext({ requirementsConfirmed: false })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("confirmed requirements"))).toBe(true);
  });

  it("passes for a well-defined task with all conditions met", () => {
    const result = validateTaskReadiness(
      "Add a dark mode toggle to the user settings page with persistence",
      makeClassifiedTask(),
      makeReadyContext()
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("warns about unresolved dependencies for FEATURE tasks", () => {
    const result = validateTaskReadiness(
      "Build a new dashboard with charts and real-time data feeds",
      makeClassifiedTask({ type: TaskType.FEATURE }),
      makeReadyContext({ dependenciesResolved: false })
    );
    expect(result.valid).toBe(true); // warning, not error
    expect(result.warnings.some((w) => w.includes("Dependencies"))).toBe(true);
    expect(result.requirements.length).toBeGreaterThan(0);
  });

  it("fails for SECURITY tasks without codebase understanding", () => {
    const result = validateTaskReadiness(
      "Patch XSS vulnerability in the authentication flow",
      makeClassifiedTask({ type: TaskType.SECURITY }),
      makeReadyContext({ codebaseUnderstood: false })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Security tasks require"))).toBe(true);
  });

  it("fails for BUGFIX tasks without codebase understanding", () => {
    const result = validateTaskReadiness(
      "Fix the intermittent crash when user uploads a large file",
      makeClassifiedTask({ type: TaskType.BUGFIX }),
      makeReadyContext({ codebaseUnderstood: false })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Bug fixes require"))).toBe(true);
  });

  it("warns when environment is not ready", () => {
    const result = validateTaskReadiness(
      "Implement user authentication with OAuth2 provider integration",
      makeClassifiedTask(),
      makeReadyContext({ environmentReady: false })
    );
    expect(result.warnings.some((w) => w.includes("environment"))).toBe(true);
  });

  it("warns when existing codebase not analyzed", () => {
    const result = validateTaskReadiness(
      "Refactor the data access layer to use the repository pattern with proper abstractions",
      makeClassifiedTask(),
      makeReadyContext({ hasExistingCode: true, codebaseUnderstood: false })
    );
    expect(result.warnings.some((w) => w.includes("Existing codebase"))).toBe(true);
  });
});

// ===========================================================================
// validateImplementation
// ===========================================================================
describe("validateImplementation", () => {
  it("detects missing test files", () => {
    const result = validateImplementation(
      ["Add user search feature"],
      ["src/services/userService.ts"],
      ["src/services/authService.test.ts"], // wrong test
      ["src/services/userService.ts"]
    );
    // The matching logic in the source compares base names — this test file
    // does not match the implementation file, so it reports missing tests.
    expect(result.testCoverage.length).toBeGreaterThanOrEqual(1);
    expect(result.testCoverage[0]).toContain("userService.ts");
  });

  it("reports no missing tests when matching test files are provided", () => {
    // The source's matching logic: baseName.pop() must equal
    // testFile.pop().replace(/\.(test|spec)\./, ".").
    // File "src/helper.ts" → base = "src/helper" → pop = "helper"
    // Test "__tests__/helper" → includes "__tests__" → pop = "helper" → replace → "helper" ✓
    const result = validateImplementation(
      ["Utility functions"],
      ["src/helper.ts"],
      ["__tests__/helper"],
      ["src/helper.ts"]
    );
    expect(result.testCoverage).toHaveLength(0);
  });

  it("reports doc gaps when many files changed without README update", () => {
    const result = validateImplementation(
      ["Major refactoring"],
      ["src/a.ts", "src/b.ts", "src/c.ts", "src/d.ts"],
      [],
      ["src/a.ts", "src/b.ts", "src/c.ts", "src/d.ts"]
    );
    expect(result.docGaps.length).toBeGreaterThanOrEqual(1);
    expect(result.docGaps[0]).toContain("README");
  });

  it("sets complete=true when no components are missing", () => {
    const result = validateImplementation(
      ["Feature X"],
      [],
      [],
      []
    );
    expect(result.complete).toBe(true);
  });
});

// ===========================================================================
// validateFix
// ===========================================================================
describe("validateFix", () => {
  it("detects missing root cause in fix description", () => {
    const result = validateFix(
      "Login button doesn't work",
      "Changed the color to blue and updated the text",
      ["src/Login.tsx"],
      { passed: 10, failed: 0 },
      { passed: 10, failed: 0 }
    );
    expect(result.rootCauseIdentified).toBe(false);
    expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
    expect(result.recommendations[0]).toContain("root cause");
  });

  it("identifies root cause when keywords are present", () => {
    const result = validateFix(
      "Login button doesn't work",
      "The root cause was an event handler attached to the wrong element due to refactoring",
      ["src/Login.tsx"],
      { passed: 10, failed: 0 },
      { passed: 10, failed: 0 }
    );
    expect(result.rootCauseIdentified).toBe(true);
  });

  it("detects regressions when post-fix failures increase", () => {
    const result = validateFix(
      "Header overlaps on mobile",
      "Fixed CSS positioning",
      ["src/Header.css"],
      { passed: 20, failed: 0 },
      { passed: 18, failed: 2 }
    );
    expect(result.regressionFree).toBe(false);
    expect(result.recommendations.some((r) => r.includes("REGRESSION"))).toBe(true);
  });

  it("passes regression check when failures don't increase", () => {
    const result = validateFix(
      "Slow query on dashboard",
      "Added database index for performance optimization",
      ["src/db/migration.sql"],
      { passed: 20, failed: 2 },
      { passed: 22, failed: 2 }
    );
    expect(result.regressionFree).toBe(true);
  });

  it("reports fixComplete=false for short descriptions and no file changes", () => {
    const result = validateFix(
      "A bug",
      "Short",
      [],
      { passed: 5, failed: 1 },
      { passed: 5, failed: 0 }
    );
    expect(result.fixComplete).toBe(false);
  });

  it("reports fixComplete=true for detailed fix with files changed", () => {
    const result = validateFix(
      "Memory leak in WebSocket handler",
      "Root cause: event listeners were not cleaned up on disconnect. Fixed by adding cleanup in the close handler.",
      ["src/ws/Handler.ts"],
      { passed: 10, failed: 1 },
      { passed: 12, failed: 0 }
    );
    expect(result.fixComplete).toBe(true);
  });

  it("reports newTestsPass=true when post-fix pass count is >= pre-fix", () => {
    const result = validateFix(
      "Bug X",
      "Fixed it due to null reference",
      ["src/a.ts"],
      { passed: 5, failed: 1 },
      { passed: 7, failed: 0 }
    );
    expect(result.testResults.newTestsPass).toBe(true);
  });

  it("reports newTestsPass=false when fewer tests pass after fix", () => {
    const result = validateFix(
      "Bug Y",
      "Fixed it because of logic error",
      ["src/b.ts"],
      { passed: 10, failed: 0 },
      { passed: 8, failed: 2 }
    );
    expect(result.testResults.newTestsPass).toBe(false);
  });
});

// ===========================================================================
// validateDeliverable
// ===========================================================================
describe("validateDeliverable", () => {
  function makeGoodChecks() {
    return {
      eslintErrors: 0,
      eslintWarnings: 0,
      typeErrors: 0,
      testPassRate: 100,
      testCoverage: 90,
      buildSuccess: true,
      buildSizeKB: 500,
      criticalVulnerabilities: 0,
      highVulnerabilities: 0,
      secretsFound: 0,
      mockDataPatterns: 0,
      assetFiles: 5,
      hasDocumentation: true,
    };
  }

  it("fails with eslint errors", () => {
    const result = validateDeliverable({ ...makeGoodChecks(), eslintErrors: 3 });
    expect(result.readyForDelivery).toBe(false);
    expect(result.checks.codeQuality).toBe(false);
    expect(result.blockers.some((b) => b.includes("ESLint"))).toBe(true);
  });

  it("fails with eslint warnings", () => {
    const result = validateDeliverable({ ...makeGoodChecks(), eslintWarnings: 2 });
    expect(result.readyForDelivery).toBe(false);
    expect(result.checks.codeQuality).toBe(false);
  });

  it("fails with test pass rate below 100", () => {
    const result = validateDeliverable({ ...makeGoodChecks(), testPassRate: 95 });
    expect(result.readyForDelivery).toBe(false);
    expect(result.checks.testsPass).toBe(false);
    expect(result.blockers.some((b) => b.includes("95%"))).toBe(true);
  });

  it("adds an issue (not blocker) for test coverage below 80", () => {
    const result = validateDeliverable({ ...makeGoodChecks(), testCoverage: 70 });
    // Coverage < 80 is an issue only — does NOT block delivery
    expect(result.readyForDelivery).toBe(true);
    expect(result.issues.some((i) => i.includes("70%"))).toBe(true);
  });

  it("fails with broken build", () => {
    const result = validateDeliverable({ ...makeGoodChecks(), buildSuccess: false });
    expect(result.readyForDelivery).toBe(false);
    expect(result.checks.buildSucceeds).toBe(false);
    expect(result.blockers.some((b) => b.includes("Build failed"))).toBe(true);
  });

  it("fails with tiny build size", () => {
    const result = validateDeliverable({ ...makeGoodChecks(), buildSizeKB: 42 });
    expect(result.readyForDelivery).toBe(false);
    expect(result.checks.completeAssets).toBe(false);
    expect(result.blockers.some((b) => b.includes("42KB"))).toBe(true);
  });

  it("fails with secrets found", () => {
    const result = validateDeliverable({ ...makeGoodChecks(), secretsFound: 2 });
    expect(result.readyForDelivery).toBe(false);
    expect(result.checks.noSecrets).toBe(false);
    expect(result.blockers.some((b) => b.includes("secrets"))).toBe(true);
  });

  it("fails with critical vulnerabilities", () => {
    const result = validateDeliverable({ ...makeGoodChecks(), criticalVulnerabilities: 1 });
    expect(result.readyForDelivery).toBe(false);
    expect(result.checks.securityClean).toBe(false);
  });

  it("fails with high vulnerabilities", () => {
    const result = validateDeliverable({ ...makeGoodChecks(), highVulnerabilities: 3 });
    expect(result.readyForDelivery).toBe(false);
    expect(result.checks.securityClean).toBe(false);
  });

  it("adds issue (not blocker) for mock data patterns", () => {
    const result = validateDeliverable({ ...makeGoodChecks(), mockDataPatterns: 4 });
    // Mock data is an issue, not a blocker
    expect(result.issues.some((i) => i.includes("mock data"))).toBe(true);
    expect(result.checks.noMockData).toBe(false);
  });

  it("adds issue for missing documentation", () => {
    const result = validateDeliverable({ ...makeGoodChecks(), hasDocumentation: false });
    expect(result.checks.documentation).toBe(false);
    expect(result.issues.some((i) => i.includes("documentation"))).toBe(true);
  });

  it("passes when all checks pass", () => {
    const result = validateDeliverable(makeGoodChecks());
    expect(result.readyForDelivery).toBe(true);
    expect(result.blockers).toHaveLength(0);
    expect(result.checks.codeQuality).toBe(true);
    expect(result.checks.testsPass).toBe(true);
    expect(result.checks.buildSucceeds).toBe(true);
    expect(result.checks.securityClean).toBe(true);
    expect(result.checks.noSecrets).toBe(true);
    expect(result.checks.completeAssets).toBe(true);
    expect(result.checks.documentation).toBe(true);
  });

  it("collects multiple blockers at once", () => {
    const result = validateDeliverable({
      ...makeGoodChecks(),
      eslintErrors: 5,
      buildSuccess: false,
      testPassRate: 80,
    });
    expect(result.readyForDelivery).toBe(false);
    expect(result.blockers.length).toBeGreaterThanOrEqual(3);
  });
});
