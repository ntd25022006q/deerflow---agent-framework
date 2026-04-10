import { describe, it, expect, beforeEach } from "vitest";
import {
  EnforcementLevel,
  ViolationType,
  ViolationSeverity,
  DEFAULT_ENFORCEMENT_CONFIG,
  DeerflowEnforcementEngine,
  VIOLATION_SEVERITY_MAP,
  type DetectedViolation,
  type EnforcementConfig,
} from "./enforcement";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeViolation(
  overrides: Partial<DetectedViolation> = {},
): DetectedViolation {
  return {
    type: ViolationType.LOW_COVERAGE,
    severity: ViolationSeverity.MEDIUM,
    ruleId: "cov-001",
    message: "Test coverage below threshold",
    suggestedFix: "Add more tests",
    timestamp: Date.now(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Enforcement Configuration", () => {
  // -----------------------------------------------------------------------
  // EnforcementLevel enum
  // -----------------------------------------------------------------------
  describe("EnforcementLevel enum", () => {
    it("has four levels ordered from permissive to strict", () => {
      expect(EnforcementLevel.ADVISORY).toBe("ADVISORY");
      expect(EnforcementLevel.WARNING).toBe("WARNING");
      expect(EnforcementLevel.STRICT).toBe("STRICT");
      expect(EnforcementLevel.MAXIMUM).toBe("MAXIMUM");
    });

    it("has exactly 4 values", () => {
      const values = Object.values(EnforcementLevel);
      expect(values).toHaveLength(4);
    });
  });

  // -----------------------------------------------------------------------
  // ViolationType enum
  // -----------------------------------------------------------------------
  describe("ViolationType enum", () => {
    it("includes data_deletion (protected directory delete)", () => {
      expect(ViolationType.PROTECTED_DIR_DELETE).toBe("data_deletion");
    });

    it("includes mock_data", () => {
      expect(ViolationType.MOCK_DATA).toBe("mock_data");
    });

    it("includes no_tests", () => {
      expect(ViolationType.NO_TESTS).toBe("no_tests");
    });

    it("includes fabrication", () => {
      expect(ViolationType.FABRICATION).toBe("fabrication");
    });

    it("includes secret_exposure", () => {
      expect(ViolationType.SECRET_EXPOSURE).toBe("secret_exposure");
    });

    it("includes broken_build", () => {
      expect(ViolationType.BROKEN_BUILD).toBe("broken_build");
    });

    it("includes hallucination", () => {
      expect(ViolationType.HALLUCINATION).toBe("hallucination");
    });

    it("has more than 30 violation types", () => {
      expect(Object.values(ViolationType).length).toBeGreaterThan(30);
    });
  });

  // -----------------------------------------------------------------------
  // ViolationSeverity enum
  // -----------------------------------------------------------------------
  describe("ViolationSeverity enum", () => {
    it("has four severity levels", () => {
      expect(ViolationSeverity.LOW).toBe("LOW");
      expect(ViolationSeverity.MEDIUM).toBe("MEDIUM");
      expect(ViolationSeverity.HIGH).toBe("HIGH");
      expect(ViolationSeverity.CRITICAL).toBe("CRITICAL");
    });

    it("has exactly 4 values", () => {
      expect(Object.values(ViolationSeverity)).toHaveLength(4);
    });
  });

  // -----------------------------------------------------------------------
  // DEFAULT_ENFORCEMENT_CONFIG
  // -----------------------------------------------------------------------
  describe("DEFAULT_ENFORCEMENT_CONFIG", () => {
    it("uses MAXIMUM enforcement level", () => {
      expect(DEFAULT_ENFORCEMENT_CONFIG.level).toBe(EnforcementLevel.MAXIMUM);
    });

    it("has autoReject enabled", () => {
      expect(DEFAULT_ENFORCEMENT_CONFIG.autoReject).toBe(true);
    });

    it("requires boot sequence", () => {
      expect(DEFAULT_ENFORCEMENT_CONFIG.requireBootSequence).toBe(true);
    });

    it("requires quality gate", () => {
      expect(DEFAULT_ENFORCEMENT_CONFIG.requireQualityGate).toBe(true);
    });

    it("requires test coverage", () => {
      expect(DEFAULT_ENFORCEMENT_CONFIG.requireTestCoverage).toBe(true);
    });

    it("requires build validation", () => {
      expect(DEFAULT_ENFORCEMENT_CONFIG.requireBuildValidation).toBe(true);
    });

    it("requires security audit", () => {
      expect(DEFAULT_ENFORCEMENT_CONFIG.requireSecurityAudit).toBe(true);
    });

    it("has a populated zero-tolerance list", () => {
      expect(DEFAULT_ENFORCEMENT_CONFIG.zeroToleranceViolations.length).toBeGreaterThan(0);
      expect(DEFAULT_ENFORCEMENT_CONFIG.zeroToleranceViolations).toContain("data_deletion");
      expect(DEFAULT_ENFORCEMENT_CONFIG.zeroToleranceViolations).toContain("mock_data");
      expect(DEFAULT_ENFORCEMENT_CONFIG.zeroToleranceViolations).toContain("fabrication");
      expect(DEFAULT_ENFORCEMENT_CONFIG.zeroToleranceViolations).toContain("hallucination");
    });

    it("has blockOnFirstCritical enabled", () => {
      expect(DEFAULT_ENFORCEMENT_CONFIG.blockOnFirstCritical).toBe(true);
    });

    it("has maxViolationsBeforeBlock set to 1", () => {
      expect(DEFAULT_ENFORCEMENT_CONFIG.maxViolationsBeforeBlock).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // VIOLATION_SEVERITY_MAP
  // -----------------------------------------------------------------------
  describe("VIOLATION_SEVERITY_MAP", () => {
    it("maps PROTECTED_DIR_DELETE to CRITICAL", () => {
      expect(VIOLATION_SEVERITY_MAP[ViolationType.PROTECTED_DIR_DELETE]).toBe(
        ViolationSeverity.CRITICAL,
      );
    });

    it("maps MOCK_DATA to HIGH", () => {
      expect(VIOLATION_SEVERITY_MAP[ViolationType.MOCK_DATA]).toBe(
        ViolationSeverity.HIGH,
      );
    });

    it("maps FABRICATION to CRITICAL", () => {
      expect(VIOLATION_SEVERITY_MAP[ViolationType.FABRICATION]).toBe(
        ViolationSeverity.CRITICAL,
      );
    });

    it("maps HALLUCINATION to CRITICAL", () => {
      expect(VIOLATION_SEVERITY_MAP[ViolationType.HALLUCINATION]).toBe(
        ViolationSeverity.CRITICAL,
      );
    });

    it("maps SECRET_EXPOSURE to CRITICAL", () => {
      expect(VIOLATION_SEVERITY_MAP[ViolationType.SECRET_EXPOSURE]).toBe(
        ViolationSeverity.CRITICAL,
      );
    });

    it("maps BROKEN_BUILD to CRITICAL", () => {
      expect(VIOLATION_SEVERITY_MAP[ViolationType.BROKEN_BUILD]).toBe(
        ViolationSeverity.CRITICAL,
      );
    });

    it("maps SKIPPED_TESTS to LOW", () => {
      expect(VIOLATION_SEVERITY_MAP[ViolationType.SKIPPED_TESTS]).toBe(
        ViolationSeverity.LOW,
      );
    });

    it("has an entry for every ViolationType", () => {
      for (const vtype of Object.values(ViolationType)) {
        expect(VIOLATION_SEVERITY_MAP[vtype]).toBeDefined();
        expect(
          Object.values(ViolationSeverity).includes(VIOLATION_SEVERITY_MAP[vtype]),
        ).toBe(true);
      }
    });
  });
});

describe("DeerflowEnforcementEngine", () => {
  let engine: DeerflowEnforcementEngine;

  beforeEach(() => {
    engine = new DeerflowEnforcementEngine();
  });

  // -----------------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------------
  describe("constructor", () => {
    it("creates engine with default config", () => {
      const e = new DeerflowEnforcementEngine();
      expect(e.getViolationCount()).toBe(0);
    });

    it("accepts custom config", () => {
      const customConfig: EnforcementConfig = {
        level: EnforcementLevel.ADVISORY,
        autoReject: false,
        requireBootSequence: false,
        requireQualityGate: false,
        requireTestCoverage: false,
        requireBuildValidation: false,
        requireSecurityAudit: false,
        zeroToleranceViolations: [],
        maxViolationsBeforeBlock: 10,
        blockOnFirstCritical: false,
      };
      const e = new DeerflowEnforcementEngine(customConfig);
      expect(e.getViolationCount()).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // processViolation — zero-tolerance
  // -----------------------------------------------------------------------
  describe("processViolation for zero-tolerance violations", () => {
    it("REJECTs data_deletion (zero-tolerance)", () => {
      const violation = makeViolation({
        type: ViolationType.PROTECTED_DIR_DELETE,
        severity: ViolationSeverity.CRITICAL,
        message: "Attempted to delete protected directory",
      });
      const result = engine.processViolation(violation);
      expect(result.action).toBe("REJECT");
      expect(result.mustRevert).toBe(true);
      expect(result.reason).toContain("Zero-tolerance");
    });

    it("REJECTs mock_data (zero-tolerance)", () => {
      const violation = makeViolation({
        type: ViolationType.MOCK_DATA,
        severity: ViolationSeverity.HIGH,
        message: "Mock data detected in production code",
      });
      const result = engine.processViolation(violation);
      expect(result.action).toBe("REJECT");
      expect(result.mustRevert).toBe(true);
    });

    it("REJECTs fabrication (zero-tolerance)", () => {
      const violation = makeViolation({
        type: ViolationType.FABRICATION,
        severity: ViolationSeverity.CRITICAL,
        message: "Fabricated API claim detected",
      });
      const result = engine.processViolation(violation);
      expect(result.action).toBe("REJECT");
    });

    it("REJECTs hallucination (zero-tolerance)", () => {
      const violation = makeViolation({
        type: ViolationType.HALLUCINATION,
        severity: ViolationSeverity.CRITICAL,
        message: "Hallucinated code generated",
      });
      const result = engine.processViolation(violation);
      expect(result.action).toBe("REJECT");
    });

    it("REJECTs secret_exposure (zero-tolerance)", () => {
      const violation = makeViolation({
        type: ViolationType.SECRET_EXPOSURE,
        severity: ViolationSeverity.CRITICAL,
        message: "API key exposed in source code",
      });
      const result = engine.processViolation(violation);
      expect(result.action).toBe("REJECT");
      expect(result.mustRevert).toBe(true);
    });

    it("REJECTs regression_introduced (zero-tolerance)", () => {
      const violation = makeViolation({
        type: ViolationType.REGRESSION,
        severity: ViolationSeverity.HIGH,
        message: "Regression introduced in commit",
      });
      const result = engine.processViolation(violation);
      expect(result.action).toBe("REJECT");
    });
  });

  // -----------------------------------------------------------------------
  // processViolation — critical (blockOnFirstCritical)
  // -----------------------------------------------------------------------
  describe("processViolation for critical violations", () => {
    it("REJECTs critical violation even when not in zero-tolerance list", () => {
      // Create engine with empty zero-tolerance list but blockOnFirstCritical=true
      const strictEngine = new DeerflowEnforcementEngine({
        ...DEFAULT_ENFORCEMENT_CONFIG,
        zeroToleranceViolations: [],
        blockOnFirstCritical: true,
      });
      const violation = makeViolation({
        type: ViolationType.INFINITE_LOOP,
        severity: ViolationSeverity.CRITICAL,
        message: "Infinite loop detected",
      });
      const result = strictEngine.processViolation(violation);
      expect(result.action).toBe("REJECT");
      expect(result.mustRevert).toBe(true);
      expect(result.reason).toContain("Critical");
    });

    it("does not reject critical when blockOnFirstCritical is false", () => {
      const lenientEngine = new DeerflowEnforcementEngine({
        level: EnforcementLevel.ADVISORY,
        autoReject: false,
        requireBootSequence: false,
        requireQualityGate: false,
        requireTestCoverage: false,
        requireBuildValidation: false,
        requireSecurityAudit: false,
        zeroToleranceViolations: [],
        maxViolationsBeforeBlock: 10,
        blockOnFirstCritical: false,
      });
      const violation = makeViolation({
        type: ViolationType.INFINITE_LOOP,
        severity: ViolationSeverity.CRITICAL,
        message: "Infinite loop detected",
      });
      const result = lenientEngine.processViolation(violation);
      expect(result.action).toBe("LOG");
    });
  });

  // -----------------------------------------------------------------------
  // processViolation — by enforcement level
  // -----------------------------------------------------------------------
  describe("processViolation by enforcement level", () => {
    it("ADVISORY level returns LOG action for non-critical violations", () => {
      const advisoryEngine = new DeerflowEnforcementEngine({
        level: EnforcementLevel.ADVISORY,
        autoReject: false,
        requireBootSequence: false,
        requireQualityGate: false,
        requireTestCoverage: false,
        requireBuildValidation: false,
        requireSecurityAudit: false,
        zeroToleranceViolations: [],
        maxViolationsBeforeBlock: 10,
        blockOnFirstCritical: false,
      });
      const violation = makeViolation({
        type: ViolationType.LOW_COVERAGE,
        severity: ViolationSeverity.MEDIUM,
        message: "Coverage at 50%",
      });
      const result = advisoryEngine.processViolation(violation);
      expect(result.action).toBe("LOG");
    });

    it("WARNING level returns WARN action", () => {
      const warningEngine = new DeerflowEnforcementEngine({
        level: EnforcementLevel.WARNING,
        autoReject: false,
        requireBootSequence: false,
        requireQualityGate: false,
        requireTestCoverage: false,
        requireBuildValidation: false,
        requireSecurityAudit: false,
        zeroToleranceViolations: [],
        maxViolationsBeforeBlock: 10,
        blockOnFirstCritical: false,
      });
      const violation = makeViolation({
        type: ViolationType.LOW_COVERAGE,
        severity: ViolationSeverity.MEDIUM,
        message: "Coverage at 60%",
      });
      const result = warningEngine.processViolation(violation);
      expect(result.action).toBe("WARN");
    });

    it("STRICT level BLOCKs on HIGH severity", () => {
      const strictEngine = new DeerflowEnforcementEngine({
        level: EnforcementLevel.STRICT,
        autoReject: false,
        requireBootSequence: false,
        requireQualityGate: false,
        requireTestCoverage: false,
        requireBuildValidation: false,
        requireSecurityAudit: false,
        zeroToleranceViolations: [],
        maxViolationsBeforeBlock: 10,
        blockOnFirstCritical: false,
      });
      const violation = makeViolation({
        type: ViolationType.NO_TESTS,
        severity: ViolationSeverity.HIGH,
        message: "No tests found",
      });
      const result = strictEngine.processViolation(violation);
      expect(result.action).toBe("BLOCK");
      expect(result.mustRevert).toBe(false);
    });

    it("STRICT level WARNS on MEDIUM severity", () => {
      const strictEngine = new DeerflowEnforcementEngine({
        level: EnforcementLevel.STRICT,
        autoReject: false,
        requireBootSequence: false,
        requireQualityGate: false,
        requireTestCoverage: false,
        requireBuildValidation: false,
        requireSecurityAudit: false,
        zeroToleranceViolations: [],
        maxViolationsBeforeBlock: 10,
        blockOnFirstCritical: false,
      });
      const violation = makeViolation({
        type: ViolationType.LOW_COVERAGE,
        severity: ViolationSeverity.MEDIUM,
        message: "Coverage low",
      });
      const result = strictEngine.processViolation(violation);
      expect(result.action).toBe("WARN");
    });

    it("MAXIMUM level REJECTs on MEDIUM severity", () => {
      const maxEngine = new DeerflowEnforcementEngine({
        level: EnforcementLevel.MAXIMUM,
        autoReject: false,
        requireBootSequence: false,
        requireQualityGate: false,
        requireTestCoverage: false,
        requireBuildValidation: false,
        requireSecurityAudit: false,
        zeroToleranceViolations: [],
        maxViolationsBeforeBlock: 10,
        blockOnFirstCritical: false,
      });
      const violation = makeViolation({
        type: ViolationType.LOW_COVERAGE,
        severity: ViolationSeverity.MEDIUM,
        message: "Coverage low",
      });
      const result = maxEngine.processViolation(violation);
      expect(result.action).toBe("REJECT");
      expect(result.mustRevert).toBe(true);
    });

    it("MAXIMUM level BLOCKs on LOW severity", () => {
      const maxEngine = new DeerflowEnforcementEngine({
        level: EnforcementLevel.MAXIMUM,
        autoReject: false,
        requireBootSequence: false,
        requireQualityGate: false,
        requireTestCoverage: false,
        requireBuildValidation: false,
        requireSecurityAudit: false,
        zeroToleranceViolations: [],
        maxViolationsBeforeBlock: 10,
        blockOnFirstCritical: false,
      });
      const violation = makeViolation({
        type: ViolationType.SKIPPED_TESTS,
        severity: ViolationSeverity.LOW,
        message: "Test was skipped",
      });
      const result = maxEngine.processViolation(violation);
      expect(result.action).toBe("BLOCK");
    });
  });

  // -----------------------------------------------------------------------
  // processViolation — max violations before block
  // -----------------------------------------------------------------------
  describe("processViolation max violations threshold", () => {
    it("REJECTs when high+critical count exceeds maxViolationsBeforeBlock", () => {
      const tolerantEngine = new DeerflowEnforcementEngine({
        level: EnforcementLevel.ADVISORY,
        autoReject: false,
        requireBootSequence: false,
        requireQualityGate: false,
        requireTestCoverage: false,
        requireBuildValidation: false,
        requireSecurityAudit: false,
        zeroToleranceViolations: [],
        maxViolationsBeforeBlock: 2,
        blockOnFirstCritical: false,
      });
      // Add first HIGH violation — should not reject
      const v1 = tolerantEngine.processViolation(
        makeViolation({
          type: ViolationType.NO_TESTS,
          severity: ViolationSeverity.HIGH,
          message: "No tests",
        }),
      );
      expect(v1.action).toBe("LOG");

      // Add second HIGH violation — count reaches 2, should reject
      const v2 = tolerantEngine.processViolation(
        makeViolation({
          type: ViolationType.NO_RESPONSIVE,
          severity: ViolationSeverity.HIGH,
          message: "No responsive design",
        }),
      );
      expect(v2.action).toBe("REJECT");
    });
  });

  // -----------------------------------------------------------------------
  // generateReport
  // -----------------------------------------------------------------------
  describe("generateReport", () => {
    it("returns report with zero violations initially", () => {
      const report = engine.generateReport();
      expect(report.totalViolations).toBe(0);
      expect(report.blocked).toBe(false);
      expect(report.bySeverity).toEqual({
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      });
      expect(report.violations).toEqual([]);
      expect(report.enforcementLevel).toBe(EnforcementLevel.MAXIMUM);
      expect(report.recommendations).toEqual([]);
    });

    it("counts violations by severity correctly", () => {
      engine.processViolation(
        makeViolation({
          type: ViolationType.SKIPPED_TESTS,
          severity: ViolationSeverity.LOW,
          message: "Skipped test",
        }),
      );
      engine.processViolation(
        makeViolation({
          type: ViolationType.LOW_COVERAGE,
          severity: ViolationSeverity.MEDIUM,
          message: "Low coverage",
        }),
      );
      engine.processViolation(
        makeViolation({
          type: ViolationType.NO_TESTS,
          severity: ViolationSeverity.HIGH,
          message: "No tests",
        }),
      );

      const report = engine.generateReport();
      expect(report.totalViolations).toBe(3);
      expect(report.bySeverity.low).toBe(1);
      expect(report.bySeverity.medium).toBe(1);
      expect(report.bySeverity.high).toBe(1);
      expect(report.bySeverity.critical).toBe(0);
    });

    it("includes recommendations based on violations", () => {
      engine.processViolation(
        makeViolation({
          type: ViolationType.NO_TESTS,
          severity: ViolationSeverity.HIGH,
          message: "No tests found",
          suggestedFix: "Add unit tests for all modules",
        }),
      );
      const report = engine.generateReport();
      expect(report.recommendations.length).toBe(1);
      expect(report.recommendations[0]).toContain("No tests found");
      expect(report.recommendations[0]).toContain("Add unit tests");
    });

    it("has a numeric timestamp", () => {
      const report = engine.generateReport();
      expect(typeof report.timestamp).toBe("number");
      expect(report.timestamp).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // isBlocked
  // -----------------------------------------------------------------------
  describe("isBlocked", () => {
    it("returns false with no violations", () => {
      expect(engine.isBlocked()).toBe(false);
    });

    it("returns true after zero-tolerance violation", () => {
      engine.processViolation(
        makeViolation({
          type: ViolationType.MOCK_DATA,
          severity: ViolationSeverity.HIGH,
          message: "Mock data",
        }),
      );
      expect(engine.isBlocked()).toBe(true);
    });

    it("returns true after critical violation with blockOnFirstCritical", () => {
      const strictEngine = new DeerflowEnforcementEngine({
        ...DEFAULT_ENFORCEMENT_CONFIG,
        zeroToleranceViolations: [],
        blockOnFirstCritical: true,
      });
      strictEngine.processViolation(
        makeViolation({
          type: ViolationType.INFINITE_LOOP,
          severity: ViolationSeverity.CRITICAL,
          message: "Infinite loop",
        }),
      );
      expect(strictEngine.isBlocked()).toBe(true);
    });

    it("returns false for LOW severity when no zero-tolerance or critical", () => {
      const lenientEngine = new DeerflowEnforcementEngine({
        level: EnforcementLevel.ADVISORY,
        autoReject: false,
        requireBootSequence: false,
        requireQualityGate: false,
        requireTestCoverage: false,
        requireBuildValidation: false,
        requireSecurityAudit: false,
        zeroToleranceViolations: [],
        maxViolationsBeforeBlock: 10,
        blockOnFirstCritical: false,
      });
      lenientEngine.processViolation(
        makeViolation({
          type: ViolationType.SKIPPED_TESTS,
          severity: ViolationSeverity.LOW,
          message: "Skipped test",
        }),
      );
      expect(lenientEngine.isBlocked()).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // reset
  // -----------------------------------------------------------------------
  describe("reset", () => {
    it("clears all violations", () => {
      engine.processViolation(
        makeViolation({
          type: ViolationType.NO_TESTS,
          severity: ViolationSeverity.HIGH,
          message: "No tests",
        }),
      );
      expect(engine.getViolationCount()).toBe(1);

      engine.reset();
      expect(engine.getViolationCount()).toBe(0);
    });

    it("unblocks after reset", () => {
      engine.processViolation(
        makeViolation({
          type: ViolationType.FABRICATION,
          severity: ViolationSeverity.CRITICAL,
          message: "Fabricated claim",
        }),
      );
      expect(engine.isBlocked()).toBe(true);

      engine.reset();
      expect(engine.isBlocked()).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // getViolationCount
  // -----------------------------------------------------------------------
  describe("getViolationCount", () => {
    it("returns 0 initially", () => {
      expect(engine.getViolationCount()).toBe(0);
    });

    it("increments with each processed violation", () => {
      engine.processViolation(makeViolation({ message: "v1" }));
      expect(engine.getViolationCount()).toBe(1);
      engine.processViolation(makeViolation({ message: "v2" }));
      expect(engine.getViolationCount()).toBe(2);
      engine.processViolation(makeViolation({ message: "v3" }));
      expect(engine.getViolationCount()).toBe(3);
    });

    it("returns to 0 after reset", () => {
      engine.processViolation(makeViolation({ message: "v1" }));
      engine.processViolation(makeViolation({ message: "v2" }));
      engine.reset();
      expect(engine.getViolationCount()).toBe(0);
    });
  });
});
