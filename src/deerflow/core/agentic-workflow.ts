/**
 * DEERFLOW AGENTIC WORKFLOW ENGINE
 * =================================
 * Core workflow orchestration that enforces strict development protocols.
 * Every AI Agent must follow this workflow for every task.
 *
 * @framework Deerflow v1.0.0
 * @license MIT
 */

// Maps string-severity values to numeric order for correct comparison
const RISK_ORDER: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

// ============================================================
// SECTION 1: WORKFLOW STATES & TRANSITIONS
// ============================================================

/**
 * Enum defining all possible workflow states.
 * Each state has mandatory entry/exit conditions.
 */
export enum WorkflowState {
  /** Initial state — Agent must read rules before proceeding */
  BOOT = "BOOT",

  /** Analyzing user requirements — MUST NOT skip to implementation */
  ANALYZE = "ANALYZE",

  /** Researching existing codebase and documentation */
  RESEARCH = "RESEARCH",

  /** Planning implementation strategy */
  PLAN = "PLAN",

  /** Step-by-step code implementation */
  IMPLEMENT = "IMPLEMENT",

  /** Testing each step immediately after implementation */
  TEST = "TEST",

  /** Running all quality gates */
  VERIFY = "VERIFY",

  /** Final delivery with complete package */
  DELIVER = "DELIVER",

  /** Reverting changes and restarting fix cycle */
  REVERT = "REVERT",

  /** Blocked — waiting for user clarification */
  BLOCKED = "BLOCKED",

  /** Task completed successfully */
  COMPLETED = "COMPLETED",

  /** Task rejected due to violation */
  REJECTED = "REJECTED",
}

/**
 * Valid state transitions with conditions.
 * Agent CANNOT jump between arbitrary states.
 */
export const WORKFLOW_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  [WorkflowState.BOOT]: [WorkflowState.ANALYZE],
  [WorkflowState.ANALYZE]: [WorkflowState.RESEARCH, WorkflowState.BLOCKED, WorkflowState.REJECTED],
  [WorkflowState.RESEARCH]: [WorkflowState.PLAN, WorkflowState.BLOCKED],
  [WorkflowState.PLAN]: [WorkflowState.IMPLEMENT, WorkflowState.BLOCKED],
  [WorkflowState.IMPLEMENT]: [WorkflowState.TEST, WorkflowState.REVERT],
  [WorkflowState.TEST]: [WorkflowState.VERIFY, WorkflowState.IMPLEMENT, WorkflowState.REVERT],
  [WorkflowState.VERIFY]: [WorkflowState.DELIVER, WorkflowState.IMPLEMENT, WorkflowState.REVERT],
  [WorkflowState.DELIVER]: [WorkflowState.COMPLETED],
  [WorkflowState.REVERT]: [WorkflowState.ANALYZE, WorkflowState.RESEARCH],
  [WorkflowState.BLOCKED]: [WorkflowState.ANALYZE],
  [WorkflowState.COMPLETED]: [],
  [WorkflowState.REJECTED]: [],
};

// ============================================================
// SECTION 2: TASK CLASSIFICATION ENGINE
// ============================================================

/**
 * Task types with specific workflow requirements.
 * Agent must classify task BEFORE starting work.
 */
export enum TaskType {
  /** New feature development — full workflow required */
  FEATURE = "FEATURE",

  /** Bug fix — root cause analysis required */
  BUGFIX = "BUGFIX",

  /** Refactoring — must maintain behavior */
  REFACTOR = "REFACTOR",

  /** Documentation — must be accurate */
  DOCUMENTATION = "DOCUMENTATION",

  /** Configuration — must validate after changes */
  CONFIGURATION = "CONFIGURATION",

  /** Testing — must cover edge cases */
  TESTING = "TESTING",

  /** Security fix — urgent but must be thorough */
  SECURITY = "SECURITY",

  /** Performance optimization — must benchmark */
  PERFORMANCE = "PERFORMANCE",
}

/**
 * Task priority levels affecting workflow strictness.
 */
export enum TaskPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/**
 * Task classification result with metadata.
 */
export interface ClassifiedTask {
  type: TaskType;
  priority: TaskPriority;
  requiresTests: boolean;
  requiresSecurityReview: boolean;
  requiresBuildValidation: boolean;
  requiresManualVerification: boolean;
  estimatedSteps: number;
  riskLevel: RiskLevel;
}

export enum RiskLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/**
 * Classify a task based on its description and context.
 */
export function classifyTask(description: string, context: Record<string, unknown>): ClassifiedTask {
  const lowerDesc = description.toLowerCase();

  // Determine task type
  let type = TaskType.FEATURE;
  if (lowerDesc.includes("fix") || lowerDesc.includes("bug") || lowerDesc.includes("error")) {
    type = TaskType.BUGFIX;
  } else if (lowerDesc.includes("refactor") || lowerDesc.includes("restructure")) {
    type = TaskType.REFACTOR;
  } else if (lowerDesc.includes("security") || lowerDesc.includes("vulnerability")) {
    type = TaskType.SECURITY;
  } else if (lowerDesc.includes("performance") || lowerDesc.includes("optimize") || lowerDesc.includes("slow")) {
    type = TaskType.PERFORMANCE;
  } else if (lowerDesc.includes("test") || lowerDesc.includes("spec") || lowerDesc.includes("coverage")) {
    type = TaskType.TESTING;
  } else if (lowerDesc.includes("doc") || lowerDesc.includes("readme") || lowerDesc.includes("comment")) {
    type = TaskType.DOCUMENTATION;
  } else if (lowerDesc.includes("config") || lowerDesc.includes("setup") || lowerDesc.includes("install")) {
    type = TaskType.CONFIGURATION;
  }

  // Determine risk level based on keywords and context
  let riskLevel = RiskLevel.MEDIUM;
  if (lowerDesc.includes("delete") || lowerDesc.includes("remove") || lowerDesc.includes("database") || lowerDesc.includes("migration")) {
    riskLevel = RiskLevel.CRITICAL;
  } else if (lowerDesc.includes("auth") || lowerDesc.includes("payment") || lowerDesc.includes("api") || lowerDesc.includes("deploy")) {
    riskLevel = RiskLevel.HIGH;
  } else if (lowerDesc.includes("ui") || lowerDesc.includes("style") || lowerDesc.includes("component")) {
    riskLevel = RiskLevel.LOW;
  }

  // Security and performance tasks are always high priority
  const priority = (type === TaskType.SECURITY || type === TaskType.PERFORMANCE)
    ? TaskPriority.HIGH
    : TaskPriority.MEDIUM;

  return {
    type,
    priority,
    requiresTests: type !== TaskType.DOCUMENTATION && type !== TaskType.CONFIGURATION,
    requiresSecurityReview: type === TaskType.SECURITY || RISK_ORDER[riskLevel] >= RISK_ORDER[RiskLevel.HIGH],
    requiresBuildValidation: type !== TaskType.DOCUMENTATION,
    requiresManualVerification: RISK_ORDER[riskLevel] >= RISK_ORDER[RiskLevel.HIGH],
    estimatedSteps: estimateSteps(type, riskLevel),
    riskLevel,
  };
}

function estimateSteps(type: TaskType, risk: RiskLevel): number {
  const baseSteps: Record<TaskType, number> = {
    [TaskType.FEATURE]: 8,
    [TaskType.BUGFIX]: 6,
    [TaskType.REFACTOR]: 7,
    [TaskType.DOCUMENTATION]: 3,
    [TaskType.CONFIGURATION]: 5,
    [TaskType.TESTING]: 6,
    [TaskType.SECURITY]: 10,
    [TaskType.PERFORMANCE]: 8,
  };

  const riskMultiplier: Record<RiskLevel, number> = {
    [RiskLevel.LOW]: 1,
    [RiskLevel.MEDIUM]: 1.2,
    [RiskLevel.HIGH]: 1.5,
    [RiskLevel.CRITICAL]: 2,
  };

  return Math.ceil(baseSteps[type] * riskMultiplier[risk]);
}

// ============================================================
// SECTION 3: QUALITY GATE DEFINITIONS
// ============================================================

/**
 * Individual quality gate check.
 */
export interface QualityGate {
  id: string;
  name: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  command: string;
  successCriteria: QualityGateCriteria;
  onFailure: "REJECT" | "WARN" | "AUTO_FIX";
}

export interface QualityGateCriteria {
  property: string;
  operator: "EQ" | "NEQ" | "GT" | "GTE" | "LT" | "LTE" | "CONTAINS" | "MATCHES";
  value: unknown;
}

/**
 * All mandatory quality gates that MUST pass before delivery.
 */
export const MANDATORY_QUALITY_GATES: QualityGate[] = [
  {
    id: "eslint",
    name: "ESLint Code Quality",
    description: "Zero ESLint errors and warnings",
    severity: "CRITICAL",
    command: "bun run lint",
    successCriteria: { property: "errors", operator: "EQ", value: 0 },
    onFailure: "REJECT",
  },
  {
    id: "typescript",
    name: "TypeScript Type Safety",
    description: "Zero type errors with strict mode enabled",
    severity: "CRITICAL",
    command: "bun run type-check",
    successCriteria: { property: "typeErrors", operator: "EQ", value: 0 },
    onFailure: "REJECT",
  },
  {
    id: "tests-pass",
    name: "Test Suite Pass Rate",
    description: "100% of tests must pass",
    severity: "CRITICAL",
    command: "bun run test",
    successCriteria: { property: "passRate", operator: "EQ", value: 100 },
    onFailure: "REJECT",
  },
  {
    id: "test-coverage",
    name: "Test Coverage Threshold",
    description: "Minimum 80% code coverage for business logic",
    severity: "HIGH",
    command: "bun run test:coverage",
    successCriteria: { property: "coverage", operator: "GTE", value: 80 },
    onFailure: "WARN",
  },
  {
    id: "build",
    name: "Build Validation",
    description: "Build must succeed with reasonable output size",
    severity: "CRITICAL",
    command: "bun run build",
    successCriteria: { property: "success", operator: "EQ", value: true },
    onFailure: "REJECT",
  },
  {
    id: "build-size",
    name: "Build Size Check",
    description: "Build output must be > 100KB (not skeleton)",
    severity: "HIGH",
    command: "du -sh dist/",
    successCriteria: { property: "sizeKB", operator: "GT", value: 100 },
    onFailure: "REJECT",
  },
  {
    id: "security",
    name: "Security Audit",
    description: "Zero critical and high severity vulnerabilities",
    severity: "CRITICAL",
    command: "npm audit --audit-level=high",
    successCriteria: { property: "criticalCount", operator: "EQ", value: 0 },
    onFailure: "REJECT",
  },
  {
    id: "no-any",
    name: "TypeScript Strictness — No `any`",
    description: "No usage of `any` type or `@ts-ignore`",
    severity: "HIGH",
    command: "rg --type ts '\\bany\\b|@ts-ignore|@ts-expect-error'",
    successCriteria: { property: "matchCount", operator: "EQ", value: 0 },
    onFailure: "WARN",
  },
  {
    id: "no-mock-data",
    name: "No Mock Data Detection",
    description: "No hardcoded mock data in production code",
    severity: "HIGH",
    command: "deerflow-check --mock-data",
    successCriteria: { property: "mockDataFound", operator: "EQ", value: false },
    onFailure: "REJECT",
  },
  {
    id: "dead-code",
    name: "Dead Code Detection",
    description: "No unreachable code or unused imports",
    severity: "MEDIUM",
    command: "bun run lint --rule no-unused-vars",
    successCriteria: { property: "unusedCount", operator: "EQ", value: 0 },
    onFailure: "AUTO_FIX",
  },
];

// ============================================================
// SECTION 4: WORKFLOW EXECUTION ENGINE
// ============================================================

/**
 * Context for a single workflow execution.
 */
export interface WorkflowContext {
  taskId: string;
  classifiedTask: ClassifiedTask;
  currentState: WorkflowState;
  steps: WorkflowStep[];
  violations: Violation[];
  qualityGateResults: Map<string, QualityGateResult>;
  startTime: number;
  worklog: string[];
}

export interface WorkflowStep {
  state: WorkflowState;
  action: string;
  result: "SUCCESS" | "FAILURE" | "SKIPPED";
  timestamp: number;
  details?: string;
  filesModified?: string[];
  testsRun?: number;
}

export interface Violation {
  ruleId: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  file?: string;
  line?: number;
  suggestedFix?: string;
}

export interface QualityGateResult {
  gateId: string;
  passed: boolean;
  actual: unknown;
  expected: unknown;
  output: string;
  duration: number;
}

/**
 * Validate a state transition is legal.
 */
export function isValidTransition(from: WorkflowState, to: WorkflowState): boolean {
  return WORKFLOW_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Check if delivery is allowed — all quality gates must pass.
 */
export function canDeliver(ctx: WorkflowContext): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check all critical quality gates
  const criticalGates = MANDATORY_QUALITY_GATES.filter(g => g.severity === "CRITICAL");
  for (const gate of criticalGates) {
    const result = ctx.qualityGateResults.get(gate.id);
    if (!result) {
      reasons.push(`Quality gate "${gate.name}" was not executed`);
    } else if (!result.passed) {
      reasons.push(`Quality gate "${gate.name}" failed: ${result.output}`);
    }
  }

  // Check for unresolved violations
  const criticalViolations = ctx.violations.filter(v => v.severity === "CRITICAL");
  if (criticalViolations.length > 0) {
    reasons.push(`${criticalViolations.length} critical violations unresolved`);
  }

  return { allowed: reasons.length === 0, reasons };
}

/**
 * Execute the complete workflow for a task.
 * This is the main entry point that AI Agents should follow.
 */
export function executeWorkflow(
  taskDescription: string,
  context: Record<string, unknown>
): WorkflowContext {
  const classifiedTask = classifyTask(taskDescription, context);

  const workflowCtx: WorkflowContext = {
    taskId: generateTaskId(),
    classifiedTask,
    currentState: WorkflowState.BOOT,
    steps: [],
    violations: [],
    qualityGateResults: new Map(),
    startTime: Date.now(),
    worklog: [],
  };

  return workflowCtx;
}

function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// ============================================================
// SECTION 5: RULE ENFORCEMENT ENGINE
// ============================================================

/**
 * Violation categories mapped to rules.
 */
export enum RuleCategory {
  CODE_SAFETY = "CODE_SAFETY",
  DATA_INTEGRITY = "DATA_INTEGRITY",
  TESTING = "TESTING",
  CODE_QUALITY = "CODE_QUALITY",
  UI_UX = "UI_UX",
  DEPENDENCY = "DEPENDENCY",
  SECURITY = "SECURITY",
  BUILD = "BUILD",
  WORKFLOW = "WORKFLOW",
  COMMUNICATION = "COMMUNICATION",
  ACCURACY = "ACCURACY",
}

/**
 * Check if a specific action violates any rule.
 */
export function checkViolation(
  action: string,
  context: Record<string, unknown>
): Violation[] {
  const violations: Violation[] = [];

  // Rule 1: Directory deletion protection
  if (action.includes("rm") || action.includes("delete")) {
    const targetPath = context.path as string;
    const protectedDirs = ["src/", "public/", "assets/", "node_modules/", "dist/", ".git/"];
    for (const dir of protectedDirs) {
      if (targetPath?.includes(dir) && !context.userConfirmed) {
        violations.push({
          ruleId: "R1.1",
          severity: "CRITICAL",
          description: `Attempted to delete protected directory: ${targetPath}`,
          file: targetPath,
          suggestedFix: "Create backup first, then confirm with user before deletion",
        });
      }
    }
  }

  // Rule 2: Mock data detection
  if (action.includes("mock") || action.includes("fake") || action.includes("placeholder")) {
    if (!context.userRequested) {
      violations.push({
        ruleId: "R2.1",
        severity: "HIGH",
        description: "Mock/fake data detected without user request",
        suggestedFix: "Use real data sources or proper data fixtures",
      });
    }
  }

  // Rule 3: Test requirement
  if (action.includes("implement") || action.includes("create function") || action.includes("add component")) {
    if (!context.hasTests) {
      violations.push({
        ruleId: "R3.1",
        severity: "HIGH",
        description: "Code implementation without corresponding tests",
        suggestedFix: "Write tests alongside implementation (TDD approach)",
      });
    }
  }

  // Rule 12: TypeScript strictness
  if (action.includes("any") || action.includes("@ts-ignore")) {
    violations.push({
      ruleId: "R12.1",
      severity: "HIGH",
      description: "TypeScript `any` type or @ts-ignore detected",
      suggestedFix: "Use proper type definitions or `unknown` type",
    });
  }

  // Rule 17: Hallucination check
  if (action.includes("this API supports") || action.includes("the library provides")) {
    if (!context.verified) {
      violations.push({
        ruleId: "R17.1",
        severity: "CRITICAL",
        description: "Potential hallucination — claim made without verification",
        suggestedFix: "Verify from official documentation before claiming",
      });
    }
  }

  return violations;
}

/**
 * Determine action for a violation.
 */
export function getViolationAction(violation: Violation): "REJECT" | "WARN_FIX" | "BLOCK" {
  if (violation.severity === "CRITICAL") return "REJECT";
  if (violation.severity === "HIGH") return "WARN_FIX";
  return "BLOCK";
}
