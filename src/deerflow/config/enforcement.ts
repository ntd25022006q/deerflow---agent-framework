/**
 * DEERFLOW ENFORCEMENT ENGINE
 * ===========================
 * The enforcement layer that makes Deerflow rules non-negotiable.
 * Provides automated violation detection, reporting, and prevention.
 *
 * @framework Deerflow v1.0.0
 * @license MIT
 */

// ============================================================
// SECTION 1: ENFORCEMENT CONFIGURATION
// ============================================================

/**
 * Enforcement levels — how strictly rules are applied.
 */
export enum EnforcementLevel {
  /** Log violations but allow task to continue */
  ADVISORY = "ADVISORY",
  /** Warn on violations, require acknowledgment */
  WARNING = "WARNING",
  /** Block task on violations, require fix before proceeding */
  STRICT = "STRICT",
  /** Block task + revert changes + report */
  MAXIMUM = "MAXIMUM",
}

/**
 * Enforcement configuration for the framework.
 */
export interface EnforcementConfig {
  level: EnforcementLevel;
  autoReject: boolean;
  requireBootSequence: boolean;
  requireQualityGate: boolean;
  requireTestCoverage: boolean;
  requireBuildValidation: boolean;
  requireSecurityAudit: boolean;
  zeroToleranceViolations: string[];
  maxViolationsBeforeBlock: number;
  blockOnFirstCritical: boolean;
}

/**
 * Default strict enforcement configuration.
 * This is what Deerflow ships with — MAXIMUM enforcement.
 */
export const DEFAULT_ENFORCEMENT_CONFIG: EnforcementConfig = {
  level: EnforcementLevel.MAXIMUM,
  autoReject: true,
  requireBootSequence: true,
  requireQualityGate: true,
  requireTestCoverage: true,
  requireBuildValidation: true,
  requireSecurityAudit: true,
  zeroToleranceViolations: [
    "data_deletion",
    "mock_data",
    "no_tests",
    "type_any",
    "fabrication",
    "infinite_loop",
    "secret_exposure",
    "broken_build",
    "incomplete_deliverable",
    "hallucination",
    "root_cause_not_found",
    "regression_introduced",
  ],
  maxViolationsBeforeBlock: 1,
  blockOnFirstCritical: true,
};

// ============================================================
// SECTION 2: VIOLATION DETECTION
// ============================================================

/**
 * Types of violations that Deerflow can detect.
 */
export enum ViolationType {
  // Code Safety (Rule #1)
  PROTECTED_DIR_DELETE = "data_deletion",
  UNCONFIRMED_DELETE = "unconfirmed_delete",
  NO_BACKUP = "no_backup",

  // Data Integrity (Rule #2)
  MOCK_DATA = "mock_data",
  HARDCODED_FAKE_DATA = "hardcoded_fake_data",

  // Testing (Rule #3)
  NO_TESTS = "no_tests",
  LOW_COVERAGE = "low_coverage",
  TRIVIAL_TESTS = "trivial_tests",
  SKIPPED_TESTS = "skipped_tests",

  // Code Quality (Rule #4)
  INFINITE_LOOP = "infinite_loop",
  DEAD_CODE = "dead_code",
  UNREACHABLE_CODE = "unreachable_code",

  // UI/UX (Rule #5)
  HARDCODED_STYLES = "hardcoded_styles",
  NO_RESPONSIVE = "no_responsive",
  NO_ACCESSIBILITY = "no_accessibility",
  NO_LOADING_STATES = "no_loading_states",

  // Dependencies (Rule #6)
  DEPENDENCY_CONFLICT = "dependency_conflict",
  STYLING_CONFLICT = "styling_conflict",
  SCREEN_FLICKER = "screen_flicker",

  // Evidence (Rule #7)
  FABRICATION = "fabrication",
  UNVERIFIED_CLAIM = "unverified_claim",
  DEPRECATED_API = "deprecated_api",

  // Build (Rule #8)
  BROKEN_BUILD = "broken_build",
  INCOMPLETE_BUILD = "incomplete_deliverable",
  SKELETON_BUILD = "skeleton_build",

  // Security (Rule #10)
  SECRET_EXPOSURE = "secret_exposure",
  XSS_VULNERABILITY = "xss_vulnerability",
  SQL_INJECTION = "sql_injection",
  CSRF_VULNERABILITY = "csrf_vulnerability",

  // TypeScript (Rule #12)
  TYPE_ANY = "type_any",
  TS_IGNORE = "ts_ignore",

  // Fix Protocol (Rule #14)
  REGRESSION = "regression_introduced",
  ROOT_CAUSE_NOT_FOUND = "root_cause_not_found",
  PARTIAL_FIX = "partial_fix",

  // Understanding (Rule #16)
  REQUIREMENT_MISUNDERSTANDING = "requirement_misunderstanding",

  // Hallucination (Rule #17)
  HALLUCINATION = "hallucination",
}

/**
 * Severity levels for violations.
 */
export enum ViolationSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

const SEVERITY_ORDER: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

/**
 * A detected violation with full context.
 */
export interface DetectedViolation {
  type: ViolationType;
  severity: ViolationSeverity;
  ruleId: string;
  message: string;
  file?: string;
  line?: number;
  snippet?: string;
  suggestedFix: string;
  timestamp: number;
}

/**
 * Map violation types to their default severities.
 */
export const VIOLATION_SEVERITY_MAP: Record<ViolationType, ViolationSeverity> = {
  [ViolationType.PROTECTED_DIR_DELETE]: ViolationSeverity.CRITICAL,
  [ViolationType.UNCONFIRMED_DELETE]: ViolationSeverity.HIGH,
  [ViolationType.NO_BACKUP]: ViolationSeverity.MEDIUM,
  [ViolationType.MOCK_DATA]: ViolationSeverity.HIGH,
  [ViolationType.HARDCODED_FAKE_DATA]: ViolationSeverity.MEDIUM,
  [ViolationType.NO_TESTS]: ViolationSeverity.HIGH,
  [ViolationType.LOW_COVERAGE]: ViolationSeverity.MEDIUM,
  [ViolationType.TRIVIAL_TESTS]: ViolationSeverity.MEDIUM,
  [ViolationType.SKIPPED_TESTS]: ViolationSeverity.LOW,
  [ViolationType.INFINITE_LOOP]: ViolationSeverity.CRITICAL,
  [ViolationType.DEAD_CODE]: ViolationSeverity.MEDIUM,
  [ViolationType.UNREACHABLE_CODE]: ViolationSeverity.LOW,
  [ViolationType.HARDCODED_STYLES]: ViolationSeverity.MEDIUM,
  [ViolationType.NO_RESPONSIVE]: ViolationSeverity.HIGH,
  [ViolationType.NO_ACCESSIBILITY]: ViolationSeverity.HIGH,
  [ViolationType.NO_LOADING_STATES]: ViolationSeverity.MEDIUM,
  [ViolationType.DEPENDENCY_CONFLICT]: ViolationSeverity.HIGH,
  [ViolationType.STYLING_CONFLICT]: ViolationSeverity.HIGH,
  [ViolationType.SCREEN_FLICKER]: ViolationSeverity.MEDIUM,
  [ViolationType.FABRICATION]: ViolationSeverity.CRITICAL,
  [ViolationType.UNVERIFIED_CLAIM]: ViolationSeverity.HIGH,
  [ViolationType.DEPRECATED_API]: ViolationSeverity.MEDIUM,
  [ViolationType.BROKEN_BUILD]: ViolationSeverity.CRITICAL,
  [ViolationType.INCOMPLETE_BUILD]: ViolationSeverity.HIGH,
  [ViolationType.SKELETON_BUILD]: ViolationSeverity.CRITICAL,
  [ViolationType.SECRET_EXPOSURE]: ViolationSeverity.CRITICAL,
  [ViolationType.XSS_VULNERABILITY]: ViolationSeverity.CRITICAL,
  [ViolationType.SQL_INJECTION]: ViolationSeverity.CRITICAL,
  [ViolationType.CSRF_VULNERABILITY]: ViolationSeverity.HIGH,
  [ViolationType.TYPE_ANY]: ViolationSeverity.HIGH,
  [ViolationType.TS_IGNORE]: ViolationSeverity.HIGH,
  [ViolationType.REGRESSION]: ViolationSeverity.HIGH,
  [ViolationType.ROOT_CAUSE_NOT_FOUND]: ViolationSeverity.HIGH,
  [ViolationType.PARTIAL_FIX]: ViolationSeverity.MEDIUM,
  [ViolationType.REQUIREMENT_MISUNDERSTANDING]: ViolationSeverity.HIGH,
  [ViolationType.HALLUCINATION]: ViolationSeverity.CRITICAL,
};

// ============================================================
// SECTION 3: ENFORCEMENT ENGINE
// ============================================================

/**
 * The main enforcement engine that processes violations
 * and determines actions.
 */
export class DeerflowEnforcementEngine {
  private config: EnforcementConfig;
  private violations: DetectedViolation[] = [];
  private blocked = false;

  constructor(config: EnforcementConfig = DEFAULT_ENFORCEMENT_CONFIG) {
    this.config = config;
  }

  /**
   * Process a detected violation and determine action.
   */
  processViolation(violation: DetectedViolation): EnforcementAction {
    this.violations.push(violation);

    // Check zero-tolerance list
    if (this.config.zeroToleranceViolations.includes(violation.type)) {
      return {
        action: "REJECT",
        reason: `Zero-tolerance violation: ${violation.type}`,
        severity: violation.severity,
        violation,
        mustRevert: true,
      };
    }

    // Check if block on first critical
    if (this.config.blockOnFirstCritical && violation.severity === ViolationSeverity.CRITICAL) {
      return {
        action: "REJECT",
        reason: `Critical violation: ${violation.message}`,
        severity: violation.severity,
        violation,
        mustRevert: true,
      };
    }

    // Check max violations before block
    const highAndCriticalCount = this.violations.filter(
      v => v.severity === ViolationSeverity.HIGH || v.severity === ViolationSeverity.CRITICAL
    ).length;

    if (highAndCriticalCount >= this.config.maxViolationsBeforeBlock) {
      return {
        action: "REJECT",
        reason: `Max violations reached (${highAndCriticalCount}/${this.config.maxViolationsBeforeBlock})`,
        severity: violation.severity,
        violation,
        mustRevert: true,
      };
    }

    // Determine action based on enforcement level and severity
    return this.determineAction(violation);
  }

  /**
   * Check if the task should be blocked based on current violations.
   */
  isBlocked(): boolean {
    return this.blocked || this.violations.some(v => {
      if (this.config.zeroToleranceViolations.includes(v.type)) return true;
      if (this.config.blockOnFirstCritical && v.severity === ViolationSeverity.CRITICAL) return true;
      return false;
    });
  }

  /**
   * Generate a comprehensive enforcement report.
   */
  generateReport(): EnforcementReport {
    const critical = this.violations.filter(v => v.severity === ViolationSeverity.CRITICAL);
    const high = this.violations.filter(v => v.severity === ViolationSeverity.HIGH);
    const medium = this.violations.filter(v => v.severity === ViolationSeverity.MEDIUM);
    const low = this.violations.filter(v => v.severity === ViolationSeverity.LOW);

    return {
      timestamp: Date.now(),
      blocked: this.isBlocked(),
      totalViolations: this.violations.length,
      bySeverity: { critical: critical.length, high: high.length, medium: medium.length, low: low.length },
      violations: [...this.violations],
      enforcementLevel: this.config.level,
      recommendations: this.generateRecommendations(),
    };
  }

  /**
   * Reset violations (for new task).
   */
  reset(): void {
    this.violations = [];
    this.blocked = false;
  }

  /**
   * Get current violation count.
   */
  getViolationCount(): number {
    return this.violations.length;
  }

  private determineAction(violation: DetectedViolation): EnforcementAction {
    switch (this.config.level) {
      case EnforcementLevel.ADVISORY:
        return { action: "LOG", severity: violation.severity, violation, reason: violation.message };
      case EnforcementLevel.WARNING:
        return { action: "WARN", severity: violation.severity, violation, reason: violation.message };
      case EnforcementLevel.STRICT:
        if (SEVERITY_ORDER[violation.severity] >= SEVERITY_ORDER[ViolationSeverity.HIGH]) {
          return { action: "BLOCK", severity: violation.severity, violation, reason: violation.message, mustRevert: false };
        }
        return { action: "WARN", severity: violation.severity, violation, reason: violation.message };
      case EnforcementLevel.MAXIMUM:
        if (SEVERITY_ORDER[violation.severity] >= SEVERITY_ORDER[ViolationSeverity.MEDIUM]) {
          return { action: "REJECT", severity: violation.severity, violation, reason: violation.message, mustRevert: true };
        }
        return { action: "BLOCK", severity: violation.severity, violation, reason: violation.message };
    }
  }

  private generateRecommendations(): string[] {
    return this.violations.map(v => {
      return `[${v.severity}] ${v.message} → Fix: ${v.suggestedFix}`;
    });
  }
}

// ============================================================
// SECTION 4: ENFORCEMENT ACTION TYPES
// ============================================================

export interface EnforcementAction {
  action: "LOG" | "WARN" | "BLOCK" | "REJECT";
  reason: string;
  severity: ViolationSeverity;
  violation: DetectedViolation;
  mustRevert?: boolean;
}

export interface EnforcementReport {
  timestamp: number;
  blocked: boolean;
  totalViolations: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  violations: DetectedViolation[];
  enforcementLevel: EnforcementLevel;
  recommendations: string[];
}
