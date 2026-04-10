import { describe, it, expect } from "vitest";
import {
  WorkflowState,
  WORKFLOW_TRANSITIONS,
  TaskType,
  TaskPriority,
  RiskLevel,
  classifyTask,
  isValidTransition,
  canDeliver,
  executeWorkflow,
  checkViolation,
  getViolationAction,
  MANDATORY_QUALITY_GATES,
  type ClassifiedTask,
  type WorkflowContext,
} from "./agentic-workflow";

// ---------------------------------------------------------------------------
// Helper: build a WorkflowContext with all critical gates passing
// ---------------------------------------------------------------------------
function makeContext(overrides?: Partial<WorkflowContext>): WorkflowContext {
  return {
    taskId: "test-1",
    classifiedTask: {
      type: TaskType.FEATURE,
      priority: TaskPriority.MEDIUM,
      requiresTests: true,
      requiresSecurityReview: false,
      requiresBuildValidation: true,
      requiresManualVerification: false,
      estimatedSteps: 8,
      riskLevel: RiskLevel.LOW,
    },
    currentState: WorkflowState.VERIFY,
    steps: [],
    violations: [],
    qualityGateResults: new Map([
      ["eslint", { gateId: "eslint", passed: true, actual: 0, expected: 0, output: "ok", duration: 100 }],
      ["typescript", { gateId: "typescript", passed: true, actual: 0, expected: 0, output: "ok", duration: 50 }],
      ["tests-pass", { gateId: "tests-pass", passed: true, actual: 100, expected: 100, output: "ok", duration: 200 }],
      ["build", { gateId: "build", passed: true, actual: true, expected: true, output: "ok", duration: 300 }],
      ["security", { gateId: "security", passed: true, actual: 0, expected: 0, output: "ok", duration: 150 }],
    ]),
    startTime: Date.now(),
    worklog: [],
    ...overrides,
  };
}

// ===========================================================================
// classifyTask
// ===========================================================================
describe("classifyTask", () => {
  it("returns FEATURE for general descriptions", () => {
    const result = classifyTask("Add a new settings page", {});
    expect(result.type).toBe(TaskType.FEATURE);
  });

  it("returns BUGFIX for 'fix' keyword", () => {
    const result = classifyTask("Fix the login bug", {});
    expect(result.type).toBe(TaskType.BUGFIX);
  });

  it("returns SECURITY for 'security' keyword", () => {
    const result = classifyTask("Patch a security vulnerability in auth", {});
    expect(result.type).toBe(TaskType.SECURITY);
  });

  it("returns PERFORMANCE for 'optimize' keyword", () => {
    const result = classifyTask("Optimize database query performance", {});
    expect(result.type).toBe(TaskType.PERFORMANCE);
  });

  it("returns TESTING for 'spec' keyword", () => {
    const result = classifyTask("Write spec for user service", {});
    expect(result.type).toBe(TaskType.TESTING);
  });

  it("returns DOCUMENTATION for 'readme' keyword", () => {
    const result = classifyTask("Update the readme", {});
    expect(result.type).toBe(TaskType.DOCUMENTATION);
  });

  it("returns CONFIGURATION for 'setup' keyword", () => {
    const result = classifyTask("Setup CI pipeline configuration", {});
    expect(result.type).toBe(TaskType.CONFIGURATION);
  });

  it("sets CRITICAL risk for 'delete database' description", () => {
    const result = classifyTask("delete the database table", {});
    expect(result.riskLevel).toBe(RiskLevel.CRITICAL);
  });

  it("sets HIGH risk for 'auth api' description", () => {
    const result = classifyTask("Implement auth api endpoints", {});
    expect(result.riskLevel).toBe(RiskLevel.HIGH);
  });

  it("sets LOW risk for 'ui component' description", () => {
    const result = classifyTask("Create a new ui component", {});
    expect(result.riskLevel).toBe(RiskLevel.LOW);
  });

  it("sets HIGH priority for SECURITY type", () => {
    const result = classifyTask("Address a security vulnerability", {});
    expect(result.priority).toBe(TaskPriority.HIGH);
  });

  it("sets requiresTests=false for DOCUMENTATION type", () => {
    const result = classifyTask("Write documentation for the API", {});
    expect(result.requiresTests).toBe(false);
  });

  it("sets requiresSecurityReview=true for SECURITY type", () => {
    const result = classifyTask("Patch security vulnerability in auth flow", {});
    expect(result.requiresSecurityReview).toBe(true);
  });
});

// ===========================================================================
// isValidTransition
// ===========================================================================
describe("isValidTransition", () => {
  it("BOOT → ANALYZE returns true", () => {
    expect(isValidTransition(WorkflowState.BOOT, WorkflowState.ANALYZE)).toBe(true);
  });

  it("BOOT → IMPLEMENT returns false", () => {
    expect(isValidTransition(WorkflowState.BOOT, WorkflowState.IMPLEMENT)).toBe(false);
  });

  it("REVERT → ANALYZE returns true", () => {
    expect(isValidTransition(WorkflowState.REVERT, WorkflowState.ANALYZE)).toBe(true);
  });

  it("COMPLETED → any state returns false", () => {
    expect(isValidTransition(WorkflowState.COMPLETED, WorkflowState.BOOT)).toBe(false);
  });

  it("IMPLEMENT → TEST returns true", () => {
    expect(isValidTransition(WorkflowState.IMPLEMENT, WorkflowState.TEST)).toBe(true);
  });

  it("TEST → DELIVER returns false (must go through VERIFY)", () => {
    expect(isValidTransition(WorkflowState.TEST, WorkflowState.DELIVER)).toBe(false);
  });
});

// ===========================================================================
// canDeliver
// ===========================================================================
describe("canDeliver", () => {
  it("returns allowed=true when all critical gates pass and no violations", () => {
    const ctx = makeContext();
    const result = canDeliver(ctx);
    expect(result.allowed).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("returns allowed=false when a critical gate fails", () => {
    const ctx = makeContext();
    // Make the eslint gate fail
    ctx.qualityGateResults.set("eslint", {
      gateId: "eslint",
      passed: false,
      actual: 3,
      expected: 0,
      output: "3 errors found",
      duration: 100,
    });
    const result = canDeliver(ctx);
    expect(result.allowed).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons[0]).toContain("ESLint");
  });

  it("returns allowed=false when critical violations exist", () => {
    const ctx = makeContext({
      violations: [
        { ruleId: "R1.1", severity: "CRITICAL", description: "Deleted protected directory" },
      ],
    });
    const result = canDeliver(ctx);
    expect(result.allowed).toBe(false);
    expect(result.reasons.some((r) => r.includes("critical violations"))).toBe(true);
  });

  it("returns allowed=false when a critical gate was not executed", () => {
    const ctx = makeContext();
    ctx.qualityGateResults.delete("security");
    const result = canDeliver(ctx);
    expect(result.allowed).toBe(false);
    expect(result.reasons.some((r) => r.includes("not executed"))).toBe(true);
  });

  it("allows delivery when violations are non-critical", () => {
    const ctx = makeContext({
      violations: [
        { ruleId: "R-low", severity: "LOW", description: "Minor style issue" },
      ],
    });
    const result = canDeliver(ctx);
    expect(result.allowed).toBe(true);
  });
});

// ===========================================================================
// checkViolation
// ===========================================================================
describe("checkViolation", () => {
  it("detects protected directory deletion", () => {
    const violations = checkViolation("rm -rf src/utils", { path: "src/" });
    expect(violations).toHaveLength(1);
    expect(violations[0].severity).toBe("CRITICAL");
    expect(violations[0].ruleId).toBe("R1.1");
    expect(violations[0].description).toContain("protected directory");
  });

  it("allows deletion when user has confirmed", () => {
    const violations = checkViolation("rm -rf src/utils", { path: "src/", userConfirmed: true });
    expect(violations).toHaveLength(0);
  });

  it("detects mock data without user request", () => {
    const violations = checkViolation("Insert mock data into database", {});
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("R2.1");
  });

  it("allows mock data when user requested", () => {
    const violations = checkViolation("Insert mock data into database", { userRequested: true });
    expect(violations).toHaveLength(0);
  });

  it("detects missing tests for implementation", () => {
    const violations = checkViolation("implement new feature", {});
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("R3.1");
  });

  it("does not flag implementation when tests exist", () => {
    const violations = checkViolation("implement new feature", { hasTests: true });
    expect(violations).toHaveLength(0);
  });

  it("detects TypeScript any usage", () => {
    const violations = checkViolation("Use any type for the payload", {});
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("R12.1");
  });

  it("detects potential hallucination without verification", () => {
    const violations = checkViolation("this API supports batch operations", {});
    expect(violations).toHaveLength(1);
    expect(violations[0].severity).toBe("CRITICAL");
    expect(violations[0].ruleId).toBe("R17.1");
  });

  it("allows verified claims", () => {
    const violations = checkViolation("this API supports batch operations", { verified: true });
    expect(violations).toHaveLength(0);
  });
});

// ===========================================================================
// getViolationAction
// ===========================================================================
describe("getViolationAction", () => {
  it("returns REJECT for CRITICAL severity", () => {
    const action = getViolationAction({ ruleId: "x", severity: "CRITICAL", description: "test" });
    expect(action).toBe("REJECT");
  });

  it("returns WARN_FIX for HIGH severity", () => {
    const action = getViolationAction({ ruleId: "x", severity: "HIGH", description: "test" });
    expect(action).toBe("WARN_FIX");
  });

  it("returns BLOCK for LOW severity", () => {
    const action = getViolationAction({ ruleId: "x", severity: "LOW", description: "test" });
    expect(action).toBe("BLOCK");
  });

  it("returns BLOCK for MEDIUM severity", () => {
    const action = getViolationAction({ ruleId: "x", severity: "MEDIUM", description: "test" });
    expect(action).toBe("BLOCK");
  });
});

// ===========================================================================
// MANDATORY_QUALITY_GATES
// ===========================================================================
describe("MANDATORY_QUALITY_GATES", () => {
  it("has at least 10 gates", () => {
    expect(MANDATORY_QUALITY_GATES.length).toBeGreaterThanOrEqual(10);
  });

  it("includes eslint, typescript, tests-pass, build, and security gates", () => {
    const ids = MANDATORY_QUALITY_GATES.map((g) => g.id);
    expect(ids).toContain("eslint");
    expect(ids).toContain("typescript");
    expect(ids).toContain("tests-pass");
    expect(ids).toContain("build");
    expect(ids).toContain("security");
  });

  it("every gate has an id, name, severity, and command", () => {
    for (const gate of MANDATORY_QUALITY_GATES) {
      expect(gate.id).toBeTruthy();
      expect(gate.name).toBeTruthy();
      expect(gate.severity).toBeTruthy();
      expect(gate.command).toBeTruthy();
      expect(gate.successCriteria).toBeDefined();
    }
  });
});

// ===========================================================================
// executeWorkflow
// ===========================================================================
describe("executeWorkflow", () => {
  it("returns a valid WorkflowContext with BOOT state", () => {
    const ctx = executeWorkflow("Add a new feature", {});
    expect(ctx.currentState).toBe(WorkflowState.BOOT);
    expect(ctx.taskId).toBeTruthy();
    expect(ctx.steps).toHaveLength(0);
    expect(ctx.violations).toHaveLength(0);
    expect(ctx.qualityGateResults).toBeInstanceOf(Map);
    expect(ctx.classifiedTask).toBeDefined();
  });

  it("classifies the task from the description", () => {
    const ctx = executeWorkflow("Fix login bug on mobile", {});
    expect(ctx.classifiedTask.type).toBe(TaskType.BUGFIX);
  });

  it("sets startTime to a reasonable timestamp", () => {
    const before = Date.now();
    const ctx = executeWorkflow("Some task", {});
    const after = Date.now();
    expect(ctx.startTime).toBeGreaterThanOrEqual(before);
    expect(ctx.startTime).toBeLessThanOrEqual(after);
  });
});
