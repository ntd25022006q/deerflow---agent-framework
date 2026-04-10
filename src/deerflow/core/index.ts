/**
 * DEERFLOW CORE — Main Entry Point
 * ================================
 * Central export for all Deerflow framework modules.
 *
 * @framework Deerflow v1.0.0
 * @license MIT
 */

// Workflow Engine
export {
  WorkflowState,
  classifyTask,
  isValidTransition,
  canDeliver,
  executeWorkflow,
  checkViolation,
  getViolationAction,
  RuleCategory,
  MANDATORY_QUALITY_GATES,
  WORKFLOW_TRANSITIONS,
  type WorkflowContext,
  type WorkflowStep,
  type Violation,
  type QualityGate,
  type QualityGateCriteria,
  type QualityGateResult,
  type TaskType,
  type TaskPriority,
  type RiskLevel,
  type ClassifiedTask,
} from "./agentic-workflow";

// Context Manager
export {
  DeerflowContextManager,
  type ContextEntryType,
  type ContextEntry,
  type SessionContext,
} from "./context-manager";

// Quality Gates
export {
  executeQualityGate,
  analyzeFileQuality,
  assessProjectQuality,
  validateBuildOutput,
  type QualityGateReport,
  type FileQualityIssue,
  type ProjectQualityAssessment,
  type BuildValidationResult,
  type QualityCategory,
} from "./quality-gate";

// Task Validation
export {
  validateTaskReadiness,
  validateImplementation,
  validateFix,
  validateDeliverable,
  type ValidationResult,
  type ImplementationCheckResult,
  type FixValidationResult,
  type DeliverableValidationResult,
} from "./task-validator";
