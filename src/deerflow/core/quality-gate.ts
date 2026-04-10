/**
 * DEERFLOW QUALITY GATE ENGINE
 * ============================
 * Runtime quality gate validation system.
 * Enforces production-ready standards before any code delivery.
 *
 * @framework Deerflow v1.0.0
 * @license MIT
 */

import { QualityGate, QualityGateResult, QualityGateCriteria } from "./agentic-workflow";

// ============================================================
// SECTION 1: QUALITY GATE EXECUTOR
// ============================================================

/**
 * Result of a full quality gate evaluation.
 */
export interface QualityGateReport {
  timestamp: number;
  overallResult: "PASS" | "FAIL" | "WARN";
  gates: QualityGateResult[];
  passedCount: number;
  failedCount: number;
  warnedCount: number;
  criticalFailures: string[];
  recommendations: string[];
}

/**
 * Execute a single quality gate check.
 */
export function executeQualityGate(gate: QualityGate, actualValue: unknown, output: string, duration: number): QualityGateResult {
  const passed = evaluateCriteria(gate.successCriteria, actualValue);

  return {
    gateId: gate.id,
    passed,
    actual: actualValue,
    expected: gate.successCriteria.value,
    output,
    duration,
  };
}

/**
 * Evaluate a quality gate criteria against actual value.
 */
function evaluateCriteria(criteria: QualityGateCriteria, actual: unknown): boolean {
  switch (criteria.operator) {
    case "EQ":
      return actual === criteria.value;
    case "NEQ":
      return actual !== criteria.value;
    case "GT":
      return (actual as number) > (criteria.value as number);
    case "GTE":
      return (actual as number) >= (criteria.value as number);
    case "LT":
      return (actual as number) < (criteria.value as number);
    case "LTE":
      return (actual as number) <= (criteria.value as number);
    case "CONTAINS":
      return String(actual).includes(String(criteria.value));
    case "MATCHES":
      return new RegExp(String(criteria.value)).test(String(actual));
    default:
      return false;
  }
}

// ============================================================
// SECTION 2: FILE QUALITY CHECKER
// ============================================================

/**
 * Check types for file quality analysis.
 */
export interface FileQualityIssue {
  file: string;
  line: number;
  column: number;
  severity: "ERROR" | "WARNING" | "INFO";
  ruleId: string;
  message: string;
  fixSuggestion?: string;
}

/**
 * Analyze a file for quality issues based on Deerflow rules.
 */
export function analyzeFileQuality(filePath: string, content: string): FileQualityIssue[] {
  const issues: FileQualityIssue[] = [];
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Check for `any` type usage
    if (/\bany\b/.test(line) && !line.trim().startsWith("//") && !line.includes("typeof")) {
      // Exclude legitimate uses
      if (!line.includes("Record<string, any>") && !line.includes("unknown")) {
        issues.push({
          file: filePath,
          line: lineNum,
          column: 1,
          severity: "WARNING",
          ruleId: "deerflow/no-any",
          message: "TypeScript `any` type detected. Use proper type definitions or `unknown`.",
          fixSuggestion: "Replace `any` with the correct type or use `unknown` and narrow with type guards.",
        });
      }
    }

    // Check for @ts-ignore and @ts-expect-error
    if (line.includes("@ts-ignore") || line.includes("@ts-expect-error")) {
      issues.push({
        file: filePath,
        line: lineNum,
        column: 1,
        severity: "ERROR",
        ruleId: "deerflow/no-ts-ignore",
        message: "TypeScript suppression directive detected. Fix the underlying type error instead.",
        fixSuggestion: "Remove the directive and fix the type error properly.",
      });
    }

    // Check for console.log in production code
    if (/console\.(log|warn|error|info|debug)/.test(line) && !line.trim().startsWith("//")) {
      issues.push({
        file: filePath,
        line: lineNum,
        column: 1,
        severity: "WARNING",
        ruleId: "deerflow/no-console",
        message: "Console statement found in code. Use proper logging framework.",
        fixSuggestion: "Use a logging library (e.g., pino, winston) or remove for production.",
      });
    }

    // Check for TODO without ticket reference
    if (/\/\/\s*TODO/i.test(line) && !/TODO[:\s]*#\d+/.test(line)) {
      issues.push({
        file: filePath,
        line: lineNum,
        column: 1,
        severity: "INFO",
        ruleId: "deerflow/no-bare-todo",
        message: "TODO found without ticket/issue reference.",
        fixSuggestion: "Add issue reference: // TODO: #123 description",
      });
    }

    // Check for empty catch blocks
    if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line) || (line.includes("catch") && /^\s*\}\s*$/.test(lines[index + 1] ?? ""))) {
      issues.push({
        file: filePath,
        line: lineNum,
        column: 1,
        severity: "ERROR",
        ruleId: "deerflow/no-empty-catch",
        message: "Empty catch block detected. Errors must be handled or rethrown.",
        fixSuggestion: "Add error handling or rethrow: catch(error) { logger.error(error); throw error; }",
      });
    }

    // Check for hardcoded secrets patterns
    if (/(?:api[_-]?key|secret|password|token|auth)[_-\s]*[:=]\s*['"][^'"]{8,}['"]/i.test(line)) {
      issues.push({
        file: filePath,
        line: lineNum,
        column: 1,
        severity: "ERROR",
        ruleId: "deerflow/no-hardcoded-secrets",
        message: "Potential hardcoded secret detected. Use environment variables.",
        fixSuggestion: "Move to .env file: process.env.API_KEY",
      });
    }

    // Check for dangerouslySetInnerHTML
    if (/dangerouslySetInnerHTML/.test(line)) {
      issues.push({
        file: filePath,
        line: lineNum,
        column: 1,
        severity: "ERROR",
        ruleId: "deerflow/no-dangerous-html",
        message: "dangerouslySetInnerHTML detected. XSS vulnerability risk.",
        fixSuggestion: "Use DOMPurify or a sanitization library. Never inject raw HTML.",
      });
    }

    // Check for eval usage
    if (/\beval\s*\(/.test(line)) {
      issues.push({
        file: filePath,
        line: lineNum,
        column: 1,
        severity: "ERROR",
        ruleId: "deerflow/no-eval",
        message: "eval() detected. Code injection vulnerability.",
        fixSuggestion: "Never use eval(). Use JSON.parse() or Function constructor with extreme caution.",
      });
    }

    // Check for mock data patterns
    if (/const\s+\w+\s*=\s*\{[\s\S]*?name:\s*['"](?:test|mock|fake|dummy|sample)/i.test(line)) {
      issues.push({
        file: filePath,
        line: lineNum,
        column: 1,
        severity: "WARNING",
        ruleId: "deerflow/no-mock-data",
        message: "Potential mock data detected. Use real data sources.",
        fixSuggestion: "Create proper data fixtures or use database seed data.",
      });
    }

    // Check for while(true) without clear break
    if (/while\s*\(\s*true\s*\)/.test(line)) {
      issues.push({
        file: filePath,
        line: lineNum,
        column: 1,
        severity: "ERROR",
        ruleId: "deerflow/no-infinite-while",
        message: "while(true) detected without safety termination.",
        fixSuggestion: "Add max iteration counter: while(condition && iterations++ < MAX)",
      });
    }
  });

  // Check file length
  if (lines.length > 300) {
    issues.push({
      file: filePath,
      line: 0,
      column: 0,
      severity: "WARNING",
      ruleId: "deerflow/max-file-length",
      message: `File has ${lines.length} lines (max 300). Split into smaller modules.`,
      fixSuggestion: "Extract related functions/components into separate files.",
    });
  }

  // Check for deep nesting (>3 levels)
  let maxNesting = 0;
  let currentNesting = 0;
  for (const line of lines) {
    const opens = (line.match(/\{/g) ?? []).length;
    const closes = (line.match(/\}/g) ?? []).length;
    currentNesting += opens - closes;
    if (currentNesting > maxNesting) maxNesting = currentNesting;
  }
  if (maxNesting > 4) {
    issues.push({
      file: filePath,
      line: 0,
      column: 0,
      severity: "WARNING",
      ruleId: "deerflow/max-nesting",
      message: `Deep nesting detected (${maxNesting} levels, max 4). Use early returns.`,
      fixSuggestion: "Refactor with early returns, extract methods, or use guard clauses.",
    });
  }

  return issues;
}

// ============================================================
// SECTION 3: PROJECT QUALITY ASSESSMENT
// ============================================================

/**
 * Comprehensive project quality assessment.
 */
export interface ProjectQualityAssessment {
  overallScore: number;
  categories: QualityCategory[];
  criticalIssues: FileQualityIssue[];
  summary: string;
  grade: "A" | "B" | "C" | "D" | "F";
}

export interface QualityCategory {
  name: string;
  score: number;
  maxScore: number;
  issues: number;
  details: string;
}

/**
 * Assess the overall quality of a project.
 * Returns a grade and detailed breakdown.
 */
export function assessProjectQuality(files: Map<string, string>): ProjectQualityAssessment {
  const allIssues: FileQualityIssue[] = [];
  const categoryScores: Record<string, { score: number; max: number; issues: number }> = {};

  // Analyze each file
  for (const [filePath, content] of files) {
    const issues = analyzeFileQuality(filePath, content);
    allIssues.push(...issues);

    for (const issue of issues) {
      if (!categoryScores[issue.ruleId]) {
        categoryScores[issue.ruleId] = { score: 100, max: 100, issues: 0 };
      }
      if (issue.severity === "ERROR") categoryScores[issue.ruleId].score -= 20;
      else if (issue.severity === "WARNING") categoryScores[issue.ruleId].score -= 10;
      else categoryScores[issue.ruleId].score -= 2;
      categoryScores[issue.ruleId].issues++;
      categoryScores[issue.ruleId].score = Math.max(0, categoryScores[issue.ruleId].score);
    }
  }

  // Calculate categories
  const categories: QualityCategory[] = Object.entries(categoryScores).map(([ruleId, data]) => ({
    name: ruleId,
    score: data.score,
    maxScore: data.max,
    issues: data.issues,
    details: `${data.issues} issues found`,
  }));

  // Calculate overall score
  const overallScore = categories.length > 0
    ? Math.round(categories.reduce((sum, cat) => sum + cat.score, 0) / categories.length)
    : 100;

  // Determine grade
  const grade = overallScore >= 90 ? "A"
    : overallScore >= 80 ? "B"
    : overallScore >= 70 ? "C"
    : overallScore >= 60 ? "D"
    : "F";

  // Critical issues
  const criticalIssues = allIssues.filter(i => i.severity === "ERROR");

  return {
    overallScore,
    categories,
    criticalIssues,
    summary: `Project Quality: ${grade} (${overallScore}/100) — ${allIssues.length} total issues, ${criticalIssues.length} critical`,
    grade,
  };
}

// ============================================================
// SECTION 4: BUILD VALIDATOR
// ============================================================

/**
 * Build validation result.
 */
export interface BuildValidationResult {
  valid: boolean;
  issues: string[];
  sizeInfo: {
    totalSizeKB: number;
    fileCount: number;
    hasAssets: boolean;
    hasSource: boolean;
    hasConfig: boolean;
  };
  recommendations: string[];
}

/**
 * Minimum thresholds for a valid build.
 */
const BUILD_MINIMUMS = {
  totalSizeKB: 100,
  fileCount: 10,
  criticalPaths: ["src/", "assets/", "public/", "static/"],
  requiredFilePatterns: [
    /\.(js|ts|jsx|tsx)$/,  // Source files
    /\.(css|scss)$/,       // Styles
    /\.(json)$/,           // Config
    /\.(html)$/,           // Entry point
  ],
};

/**
 * Validate a build output directory.
 */
export function validateBuildOutput(buildPath: string, fileList: string[], fileSizes: Map<string, number>): BuildValidationResult {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check total size
  let totalSize = 0;
  for (const size of fileSizes.values()) {
    totalSize += size;
  }
  const totalSizeKB = Math.round(totalSize / 1024);

  if (totalSizeKB < BUILD_MINIMUMS.totalSizeKB) {
    issues.push(`Build size ${totalSizeKB}KB is below minimum ${BUILD_MINIMUMS.totalSizeKB}KB — likely incomplete`);
    recommendations.push("Check that all source files, assets, and dependencies are included in build output");
  }

  // Check file count
  if (fileList.length < BUILD_MINIMUMS.fileCount) {
    issues.push(`Build contains only ${fileList.length} files (minimum ${BUILD_MINIMUMS.fileCount})`);
    recommendations.push("Verify build configuration includes all necessary files and assets");
  }

  // Check for critical content types
  const hasSource = fileList.some(f => /\.(js|ts|jsx|tsx)$/.test(f));
  const hasAssets = fileList.some(f => /\.(png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf)$/.test(f));
  const hasConfig = fileList.some(f => /package\.json|manifest\.json|\.config\./.test(f));

  if (!hasSource) {
    issues.push("No source/compiled files found in build output");
    recommendations.push("Ensure compilation/transpilation step is included in build process");
  }

  if (!hasConfig) {
    recommendations.push("Consider including runtime configuration for deployment");
  }

  // Check for potential incomplete builds
  if (fileList.length <= 3 && totalSizeKB < 50) {
    issues.push("CRITICAL: Build appears to be a skeleton/placeholder — missing core content");
    recommendations.push("Review build pipeline — assets, source, and static files must be bundled");
  }

  return {
    valid: issues.length === 0,
    issues,
    sizeInfo: {
      totalSizeKB,
      fileCount: fileList.length,
      hasAssets,
      hasSource,
      hasConfig,
    },
    recommendations,
  };
}
