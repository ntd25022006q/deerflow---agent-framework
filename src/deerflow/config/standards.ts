/**
 * DEERFLOW QUALITY STANDARDS CONFIGURATION
 * ========================================
 * Defines all quality thresholds, rules, and standards
 * that every AI Agent must comply with.
 *
 * @framework Deerflow v1.0.0
 * @license MIT
 */

// ============================================================
// SECTION 1: CODE QUALITY STANDARDS
// ============================================================

/**
 * TypeScript strictness levels.
 */
export const TypeScriptStandards = {
  strict: true,
  noImplicitAny: true,
  strictNullChecks: true,
  strictFunctionTypes: true,
  strictBindCallApply: true,
  strictPropertyInitialization: true,
  noImplicitThis: true,
  alwaysStrict: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  noImplicitReturns: true,
  noFallthroughCasesInSwitch: true,
  noUncheckedIndexedAccess: true,
  exactOptionalPropertyTypes: false,
  noPropertyAccessFromIndexSignature: true,
  allowUnusedLabels: false,
  allowUnreachableCode: false,
} as const;

/**
 * Code complexity thresholds.
 */
export const ComplexityLimits = {
  maxFunctionLines: 50,
  maxFileLines: 300,
  maxNestingDepth: 4,
  maxCyclomaticComplexity: 15,
  maxFunctionParameters: 5,
  maxCognitiveComplexity: 20,
  maxSwitchCases: 10,
} as const;

/**
 * Naming conventions.
 */
export const NamingConventions = {
  camelCase: {
    pattern: /^[a-z][a-zA-Z0-9]*$/,
    appliesTo: ["variables", "functions", "methods", "properties"],
  },
  PascalCase: {
    pattern: /^[A-Z][a-zA-Z0-9]*$/,
    appliesTo: ["classes", "interfaces", "types", "enums", "components", "React components"],
  },
  UPPER_SNAKE_CASE: {
    pattern: /^[A-Z][A-Z0-9_]*$/,
    appliesTo: ["constants", "environment variables", "enums members"],
  },
  kebabCase: {
    pattern: /^[a-z][a-z0-9-]*$/,
    appliesTo: ["file names", "css classes", "html attributes", "url paths"],
  },
} as const;

// ============================================================
// SECTION 2: TESTING STANDARDS
// ============================================================

/**
 * Test coverage thresholds.
 */
export const CoverageThresholds = {
  statements: 80,
  branches: 80,
  functions: 80,
  lines: 80,
} as const;

/**
 * Required test types per component type.
 */
export const TestRequirements = {
  utility: ["unit"],
  service: ["unit", "integration"],
  apiRoute: ["integration", "security"],
  component: ["component", "accessibility"],
  hook: ["unit", "integration"],
  middleware: ["unit", "integration"],
  database: ["integration"],
  criticalFlow: ["e2e", "integration"],
} as const;

/**
 * Test anti-patterns that MUST be avoided.
 */
export const TestAntiPatterns = [
  {
    name: "Assertionless test",
    pattern: /test\(|it\(|describe\((?![^)]*expect)/,
    description: "Test without any expect() assertion",
    severity: "ERROR" as const,
  },
  {
    name: "Trivial assertion",
    pattern: /expect\(\s*(true|false|null|undefined|1|"")\s*\)/,
    description: "Asserting a literal value — test verifies nothing meaningful",
    severity: "WARNING" as const,
  },
  {
    name: "Always passing test",
    pattern: /expect\(\s*anything\s*\)\.toBe\(\s*anything\s*\)/,
    description: "Test that always passes regardless of implementation",
    severity: "ERROR" as const,
  },
  {
    name: "Empty test body",
    pattern: /(?:test|it)\s*\([^)]*\)\s*\{\s*\}/,
    description: "Test with empty body — no assertions or logic",
    severity: "ERROR" as const,
  },
  {
    name: "Disabled test",
    pattern: /(?:test|it)\s*\.skip\s*\(/,
    description: "Skipped test — all tests must be active",
    severity: "WARNING" as const,
  },
] as const;

// ============================================================
// SECTION 3: SECURITY STANDARDS
// ============================================================

/**
 * OWASP Top 10 (2021) mapped to Deerflow security checks.
 */
export const OWASPMapping = {
  A01_BROKEN_ACCESS_CONTROL: ["authorization-check", "route-protection", "rbac-verification"],
  A02_CRYPTOGRAPHIC_FAILURES: ["encryption-check", "sensitive-data-protection", "key-management"],
  A03_INJECTION: ["sql-injection-prevention", "xss-prevention", "command-injection-check"],
  A04_INSECURE_DESIGN: ["threat-modeling", "abuse-case-analysis", "secure-by-design"],
  A05_SECURITY_MISCONFIGURATION: ["default-config-check", "header-security", "cors-verification"],
  A06_VULNERABLE_COMPONENTS: ["dependency-audit", "version-check", "patch-verification"],
  A07_AUTH_FAILURES: ["auth-flow-check", "session-management", "mfa-verification"],
  A08_SOFTWARE_DATA_INTEGRITY: ["supply-chain-check", "integrity-verification", "signature-check"],
  A09_LOGGING_MONITORING: ["audit-logging", "error-tracking", "incident-response"],
  A10_SSRF: ["url-validation", "network-restriction", "internal-access-check"],
} as const;

/**
 * Security scanning rules.
 */
export const SecurityRules = {
  secrets: {
    patterns: [
      /(?:api[_-]?key|secret|password|token|auth|private)[_-\s]*[:=]\s*['"][^'"]{8,}['"]/i,
      /-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/,
      /AKIA[0-9A-Z]{16}/,
      /ghp_[0-9a-zA-Z]{36}/,
      /gho_[0-9a-zA-Z]{36}/,
      /ghu_[0-9a-zA-Z]{36}/,
      /ghs_[0-9a-zA-Z]{36}/,
      /xox[bpras]-[0-9a-zA-Z-]+/,
      /hooks\.slack\.com\/services\/T[0-9A-Z]{8,}\/B[0-9A-Z]{8,}\/[0-9a-zA-Z]{24,}/,
    ],
    severity: "CRITICAL" as const,
  },
  dangerousFunctions: {
    patterns: [
      /\beval\s*\(/,
      /new\s+Function\s*\(/,
      /document\.write\s*\(/,
      /innerHTML\s*=/,
      /dangerouslySetInnerHTML/,
      /exec\s*\(/,
      /execSync\s*\(/,
      /child_process/,
    ],
    severity: "HIGH" as const,
  },
} as const;

// ============================================================
// SECTION 4: BUILD STANDARDS
// ============================================================

/**
 * Minimum build requirements.
 */
export const BuildStandards = {
  minimumSizeKB: 100,
  minimumFileCount: 10,
  maximumBundleSizeMB: 10,
  warningBundleSizeMB: 5,
  mustIncludeAssetTypes: [".js", ".css", ".html"],
  recommendedAssetTypes: [".png", ".svg", ".woff2", ".webp", ".ico"],
  mustRunIndependently: true,
} as const;

/**
 * Performance budgets.
 */
export const PerformanceBudgets = {
  firstContentfulPaint: 1800,
  largestContentfulPaint: 2500,
  cumulativeLayoutShift: 0.1,
  firstInputDelay: 100,
  timeToInteractive: 3800,
  totalBlockingTime: 300,
} as const;

// ============================================================
// SECTION 5: WORKFLOW STANDARDS
// ============================================================

/**
 * Maximum iterations for various operations.
 */
export const WorkflowLimits = {
  maxFixIterations: 5,
  maxRefinementIterations: 30,
  maxRetryAttempts: 3,
  maxResearchDepth: "EXHAUSTIVE" as const,
  maxFilesPerTask: 50,
  maxConcurrentOperations: 5,
} as const;

/**
 * Context management limits.
 */
export const ContextLimits = {
  maxSessionEntries: 10000,
  maxWorklogSize: 50000,
  contextRefreshInterval: 20,
  importantEntryRetentionDays: 30,
  lowImportanceRetentionDays: 7,
} as const;
