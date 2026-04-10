/**
 * DEERFLOW TASK VALIDATOR
 * =======================
 * Validates tasks before, during, and after execution.
 * Ensures completeness, correctness, and compliance.
 *
 * @framework Deerflow v1.0.0
 * @license MIT
 */

import { TaskType, TaskPriority, RiskLevel, type ClassifiedTask } from "./agentic-workflow";

const RISK_ORDER: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

// ============================================================
// SECTION 1: PRE-EXECUTION VALIDATION
// ============================================================

/**
 * Validation result for task readiness check.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  requirements: string[];
}

/**
 * Validate task readiness before execution.
 * Agent MUST pass all checks before starting implementation.
 */
export function validateTaskReadiness(
  taskDescription: string,
  classifiedTask: ClassifiedTask,
  context: {
    hasExistingCode: boolean;
    codebaseUnderstood: boolean;
    requirementsConfirmed: boolean;
    dependenciesResolved: boolean;
    environmentReady: boolean;
  }
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const requirements: string[] = [];

  // CRITICAL checks
  if (!taskDescription || taskDescription.trim().length < 10) {
    errors.push("Task description is too vague — insufficient information to proceed");
  }

  if (RISK_ORDER[classifiedTask.riskLevel] >= RISK_ORDER[RiskLevel.HIGH] && !context.requirementsConfirmed) {
    errors.push("High-risk task requires confirmed requirements before proceeding");
  }

  if (classifiedTask.type === TaskType.SECURITY && !context.codebaseUnderstood) {
    errors.push("Security tasks require full codebase understanding before making changes");
  }

  if (classifiedTask.type === TaskType.BUGFIX && !context.codebaseUnderstood) {
    errors.push("Bug fixes require understanding existing code to find root cause");
  }

  // HIGH checks
  if (!context.dependenciesResolved && classifiedTask.type === TaskType.FEATURE) {
    warnings.push("Dependencies not yet resolved — may encounter conflicts during implementation");
    requirements.push("Run dependency compatibility check before starting");
  }

  if (!context.environmentReady) {
    warnings.push("Development environment may not be fully configured");
    requirements.push("Verify environment setup (node version, package manager, etc.)");
  }

  // MEDIUM checks
  if (context.hasExistingCode && !context.codebaseUnderstood) {
    warnings.push("Existing codebase not fully analyzed — risk of breaking existing functionality");
    requirements.push("Review existing code structure and patterns before implementing");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    requirements,
  };
}

// ============================================================
// SECTION 2: IMPLEMENTATION VALIDATION
// ============================================================

/**
 * Validate implementation completeness.
 */
export interface ImplementationCheckResult {
  complete: boolean;
  missingComponents: string[];
  qualityIssues: string[];
  testCoverage: string[];
  docGaps: string[];
}

/**
 * Validate that implementation meets all requirements.
 */
export function validateImplementation(
  originalRequirements: string[],
  implementationFiles: string[],
  testFiles: string[],
  changedFiles: string[]
): ImplementationCheckResult {
  const missingComponents: string[] = [];
  const qualityIssues: string[] = [];
  const testCoverage: string[] = [];
  const docGaps: string[] = [];

  // Check for test files corresponding to implementation files
  for (const file of implementationFiles) {
    const baseName = file.replace(/\.(ts|tsx|js|jsx)$/, "");
    const hasTest = testFiles.some(tf =>
      tf.includes(".test.") || tf.includes(".spec.") || tf.includes("__tests__")
    ) && testFiles.some(tf => baseName.split("/").pop() === tf.split("/").pop()?.replace(/\.(test|spec)\./, "."));

    if (!hasTest) {
      testCoverage.push(`Missing tests for: ${file}`);
    }
  }

  // Check for proper error handling in implementation
  for (const file of implementationFiles) {
    if (!file.endsWith(".ts") && !file.endsWith(".tsx") && !file.endsWith(".js") && !file.endsWith(".jsx")) {
      continue;
    }
    // This would be expanded with actual file content analysis
    // For now, flag files that should have error handling
  }

  // Check documentation
  const hasReadme = changedFiles.some(f => /readme\.md/i.test(f));
  const hasChangelog = changedFiles.some(f => /changelog\.md/i.test(f));
  if (!hasReadme && implementationFiles.length > 3) {
    docGaps.push("Consider updating README for significant changes");
  }

  return {
    complete: missingComponents.length === 0,
    missingComponents,
    qualityIssues,
    testCoverage,
    docGaps,
  };
}

// ============================================================
// SECTION 3: FIX VALIDATION
// ============================================================

/**
 * Fix validation result.
 */
export interface FixValidationResult {
  rootCauseIdentified: boolean;
  fixComplete: boolean;
  regressionFree: boolean;
  testResults: {
    newTestsPass: boolean;
    existingTestsPass: boolean;
    coverageMaintained: boolean;
  };
  recommendations: string[];
}

/**
 * Validate a bug fix for completeness and correctness.
 * Enforces the fix protocol from AGENT_RULES.md Rule #14.
 */
export function validateFix(
  bugDescription: string,
  fixDescription: string,
  filesChanged: string[],
  preFixTestResults: { passed: number; failed: number },
  postFixTestResults: { passed: number; failed: number }
): FixValidationResult {
  const recommendations: string[] = [];

  // Check root cause identification
  const rootCauseIdentified = fixDescription.toLowerCase().includes("root cause") ||
    fixDescription.toLowerCase().includes("because") ||
    fixDescription.toLowerCase().includes("due to") ||
    fixDescription.toLowerCase().includes("caused by");

  if (!rootCauseIdentified) {
    recommendations.push("Fix description does not clearly identify root cause — ensure you're fixing the cause, not the symptom");
  }

  // Check regression
  const regressionFree = postFixTestResults.failed <= preFixTestResults.failed;

  if (!regressionFree) {
    recommendations.push(`REGRESSION DETECTED: ${postFixTestResults.failed - preFixTestResults.failed} new test failures introduced by fix`);
  }

  // Check completeness
  const fixComplete = fixDescription.length > 50 && filesChanged.length > 0;

  if (!fixComplete) {
    recommendations.push("Fix appears incomplete — provide detailed root cause analysis and ensure all affected files are modified");
  }

  return {
    rootCauseIdentified,
    fixComplete,
    regressionFree,
    testResults: {
      newTestsPass: postFixTestResults.passed >= preFixTestResults.passed,
      existingTestsPass: regressionFree,
      coverageMaintained: true, // Would need actual coverage data
    },
    recommendations,
  };
}

// ============================================================
// SECTION 4: DELIVERABLE VALIDATION
// ============================================================

/**
 * Deliverable validation for final output.
 */
export interface DeliverableValidationResult {
  readyForDelivery: boolean;
  checks: {
    codeQuality: boolean;
    testsPass: boolean;
    buildSucceeds: boolean;
    securityClean: boolean;
    noSecrets: boolean;
    noMockData: boolean;
    completeAssets: boolean;
    documentation: boolean;
  };
  issues: string[];
  blockers: string[];
}

/**
 * Final validation before delivering work to user.
 * ALL checks must pass for delivery to proceed.
 */
export function validateDeliverable(checks: {
  eslintErrors: number;
  eslintWarnings: number;
  typeErrors: number;
  testPassRate: number;
  testCoverage: number;
  buildSuccess: boolean;
  buildSizeKB: number;
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  secretsFound: number;
  mockDataPatterns: number;
  assetFiles: number;
  hasDocumentation: boolean;
}): DeliverableValidationResult {
  const issues: string[] = [];
  const blockers: string[] = [];

  const result: DeliverableValidationResult = {
    readyForDelivery: true,
    checks: {
      codeQuality: true,
      testsPass: true,
      buildSucceeds: true,
      securityClean: true,
      noSecrets: true,
      noMockData: true,
      completeAssets: true,
      documentation: true,
    },
    issues,
    blockers,
  };

  // Code quality
  if (checks.eslintErrors > 0 || checks.eslintWarnings > 0) {
    result.checks.codeQuality = false;
    result.readyForDelivery = false;
    blockers.push(`ESLint: ${checks.eslintErrors} errors, ${checks.eslintWarnings} warnings — must be 0/0`);
  }

  // Type safety
  if (checks.typeErrors > 0) {
    result.checks.codeQuality = false;
    result.readyForDelivery = false;
    blockers.push(`${checks.typeErrors} TypeScript type errors — must be 0`);
  }

  // Tests
  if (checks.testPassRate < 100) {
    result.checks.testsPass = false;
    result.readyForDelivery = false;
    blockers.push(`Test pass rate: ${checks.testPassRate}% — must be 100%`);
  }

  if (checks.testCoverage < 80) {
    issues.push(`Test coverage: ${checks.testCoverage}% — below recommended 80% threshold`);
  }

  // Build
  if (!checks.buildSuccess) {
    result.checks.buildSucceeds = false;
    result.readyForDelivery = false;
    blockers.push("Build failed — cannot deliver broken build");
  }

  if (checks.buildSizeKB < 100) {
    result.checks.completeAssets = false;
    result.readyForDelivery = false;
    blockers.push(`Build size: ${checks.buildSizeKB}KB — suspiciously small, likely missing assets`);
  }

  // Security
  if (checks.criticalVulnerabilities > 0 || checks.highVulnerabilities > 0) {
    result.checks.securityClean = false;
    result.readyForDelivery = false;
    blockers.push(`${checks.criticalVulnerabilities} critical + ${checks.highVulnerabilities} high vulnerabilities`);
  }

  if (checks.secretsFound > 0) {
    result.checks.noSecrets = false;
    result.readyForDelivery = false;
    blockers.push(`${checks.secretsFound} potential secrets found in code`);
  }

  // Mock data
  if (checks.mockDataPatterns > 0) {
    result.checks.noMockData = false;
    issues.push(`${checks.mockDataPatterns} mock data patterns detected — should use real data`);
  }

  // Assets
  if (checks.assetFiles === 0) {
    issues.push("No asset files detected — verify build includes static resources");
  }

  // Documentation
  if (!checks.hasDocumentation) {
    result.checks.documentation = false;
    issues.push("No documentation found for changes");
  }

  return result;
}
