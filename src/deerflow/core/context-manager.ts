/**
 * DEERFLOW CONTEXT MANAGER
 * ========================
 * Manages session context, worklog, and knowledge persistence.
 * Prevents context loss and ensures continuity across long sessions.
 *
 * @framework Deerflow v1.0.0
 * @license MIT
 */

// ============================================================
// SECTION 1: CONTEXT STORAGE
// ============================================================

/**
 * Types of context entries stored by the manager.
 */
export enum ContextEntryType {
  DECISION = "DECISION",
  FILE_CHANGE = "FILE_CHANGE",
  ERROR_ENCOUNTERED = "ERROR_ENCOUNTERED",
  REQUIREMENT = "REQUIREMENT",
  ARCHITECTURE = "ARCHITECTURE",
  DEPENDENCY = "DEPENDENCY",
  TEST_RESULT = "TEST_RESULT",
  USER_FEEDBACK = "USER_FEEDBACK",
  BUG_FOUND = "BUG_FOUND",
  FIX_APPLIED = "FIX_APPLIED",
  WORKFLOW_STATE = "WORKFLOW_STATE",
  VIOLATION = "VIOLATION",
}

/**
 * A single context entry representing a significant event.
 */
export interface ContextEntry {
  id: string;
  type: ContextEntryType;
  timestamp: number;
  summary: string;
  details: string;
  files: string[];
  tags: string[];
  importance: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

/**
 * The complete session context managed by the Context Manager.
 */
export interface SessionContext {
  sessionId: string;
  startTime: number;
  lastUpdated: number;
  entries: ContextEntry[];
  decisions: Map<string, string>;
  modifiedFiles: Set<string>;
  requirements: string[];
  constraints: string[];
  techStack: string[];
  knownIssues: string[];
  solvedIssues: string[];
}

// ============================================================
// SECTION 2: CONTEXT MANAGER CLASS
// ============================================================

/**
 * Deerflow Context Manager — preserves session knowledge.
 *
 * USAGE PROTOCOL:
 * 1. Initialize at session start
 * 2. Record EVERY significant event
 * 3. Query before making decisions
 * 4. Serialize to worklog periodically
 * 5. Deserialize on session resume
 */
export class DeerflowContextManager {
  private context: SessionContext;
  private maxEntries: number;
  private autoSaveInterval: number | null = null;

  constructor(sessionId?: string, maxEntries = 10000) {
    this.context = {
      sessionId: sessionId ?? `session-${Date.now()}`,
      startTime: Date.now(),
      lastUpdated: Date.now(),
      entries: [],
      decisions: new Map(),
      modifiedFiles: new Set(),
      requirements: [],
      constraints: [],
      techStack: [],
      knownIssues: [],
      solvedIssues: [],
    };
    this.maxEntries = maxEntries;
  }

  // ----------------------------------------------------------
  // RECORDING EVENTS
  // ----------------------------------------------------------

  /**
   * Record a significant decision made during development.
   * MUST be called for every architectural or technical decision.
   */
  recordDecision(decisionId: string, description: string, reasoning: string, files: string[] = []): void {
    const entry = this.createEntry(
      ContextEntryType.DECISION,
      `Decision: ${decisionId}`,
      `${description}\n\nReasoning: ${reasoning}`,
      files,
      ["decision", decisionId],
      "HIGH"
    );
    this.addEntry(entry);
    this.context.decisions.set(decisionId, description);
    this.log(`[DECISION] ${decisionId}: ${description}`);
  }

  /**
   * Record a file modification event.
   * MUST be called after every file change.
   */
  recordFileChange(filePath: string, changeType: "CREATE" | "MODIFY" | "DELETE" | "RENAME", summary: string): void {
    this.addEntry(
      this.createEntry(
        ContextEntryType.FILE_CHANGE,
        `${changeType}: ${filePath}`,
        summary,
        [filePath],
        ["file", changeType.toLowerCase()],
        changeType === "DELETE" ? "HIGH" : "MEDIUM"
      )
    );
    this.context.modifiedFiles.add(filePath);
    this.log(`[FILE] ${changeType} ${filePath}: ${summary}`);
  }

  /**
   * Record an error encountered during development.
   * MUST be called for EVERY error, not just the ones that get fixed.
   */
  recordError(error: Error | string, context: string, files: string[] = []): void {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack ?? "" : "";

    this.addEntry(
      this.createEntry(
        ContextEntryType.ERROR_ENCOUNTERED,
        `Error: ${errorMessage.substring(0, 100)}`,
        `Error: ${errorMessage}\nContext: ${context}\nStack: ${errorStack}`,
        files,
        ["error"],
        "HIGH"
      )
    );
    this.context.knownIssues.push(errorMessage);
    this.log(`[ERROR] ${errorMessage.substring(0, 100)}`);
  }

  /**
   * Record a requirement from the user.
   * MUST be called when receiving new requirements.
   */
  recordRequirement(requirement: string, source: "USER" | "INFERRED" | "DOCUMENT"): void {
    this.addEntry(
      this.createEntry(
        ContextEntryType.REQUIREMENT,
        `Requirement: ${requirement.substring(0, 100)}`,
        `Source: ${source}\n${requirement}`,
        [],
        ["requirement"],
        "HIGH"
      )
    );
    this.context.requirements.push(requirement);
    this.log(`[REQUIREMENT] (${source}) ${requirement}`);
  }

  /**
   * Record user feedback on work done.
   * CRITICAL for preventing repeated mistakes.
   */
  recordUserFeedback(feedback: string, sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL", relatedFiles: string[] = []): void {
    const importance = sentiment === "NEGATIVE" ? "CRITICAL" : sentiment === "POSITIVE" ? "MEDIUM" : "LOW";

    this.addEntry(
      this.createEntry(
        ContextEntryType.USER_FEEDBACK,
        `Feedback (${sentiment}): ${feedback.substring(0, 100)}`,
        feedback,
        relatedFiles,
        ["feedback", sentiment.toLowerCase()],
        importance
      )
    );
    this.log(`[FEEDBACK] (${sentiment}) ${feedback}`);
  }

  /**
   * Record a fix applied to resolve an issue.
   * Links fix to the original error for traceability.
   */
  recordFixApplied(issueId: string, fixDescription: string, files: string[] = []): void {
    this.addEntry(
      this.createEntry(
        ContextEntryType.FIX_APPLIED,
        `Fix for ${issueId}`,
        fixDescription,
        files,
        ["fix", issueId],
        "HIGH"
      )
    );
    this.context.solvedIssues.push(issueId);
    // Remove from known issues if present
    const idx = this.context.knownIssues.indexOf(issueId);
    if (idx > -1) this.context.knownIssues.splice(idx, 1);
    this.log(`[FIX] Applied for ${issueId}: ${fixDescription}`);
  }

  /**
   * Record a dependency addition or change.
   */
  recordDependency(packageName: string, version: string, action: "ADD" | "REMOVE" | "UPDATE", reason: string): void {
    this.addEntry(
      this.createEntry(
        ContextEntryType.DEPENDENCY,
        `${action} ${packageName}@${version}`,
        `Reason: ${reason}`,
        ["package.json"],
        ["dependency", packageName],
        "MEDIUM"
      )
    );
    this.log(`[DEP] ${action} ${packageName}@${version}: ${reason}`);
  }

  // ----------------------------------------------------------
  // QUERYING CONTEXT
  // ----------------------------------------------------------

  /**
   * Check if a specific decision was made and retrieve it.
   * MUST be called before re-making similar decisions.
   */
  getDecision(decisionId: string): string | undefined {
    return this.context.decisions.get(decisionId);
  }

  /**
   * Get all decisions related to a specific area.
   */
  getDecisionsByTag(tag: string): ContextEntry[] {
    return this.context.entries.filter(
      e => e.type === ContextEntryType.DECISION && e.tags.includes(tag)
    );
  }

  /**
   * Check if a file was modified during this session.
   * MUST be called before editing to verify current state.
   */
  wasFileModified(filePath: string): boolean {
    return this.context.modifiedFiles.has(filePath);
  }

  /**
   * Get modification history for a specific file.
   */
  getFileHistory(filePath: string): ContextEntry[] {
    return this.context.entries.filter(
      e => e.type === ContextEntryType.FILE_CHANGE && e.files.includes(filePath)
    );
  }

  /**
   * Check if a similar error was encountered before.
   * PREVENTS repeating the same mistake.
   */
  getSimilarErrors(errorPattern: string): ContextEntry[] {
    return this.context.entries.filter(
      e => e.type === ContextEntryType.ERROR_ENCOUNTERED &&
        e.details.toLowerCase().includes(errorPattern.toLowerCase())
    );
  }

  /**
   * Get all requirements for the current session.
   */
  getRequirements(): string[] {
    return [...this.context.requirements];
  }

  /**
   * Get recent entries (last N entries).
   * For context refresh during long sessions.
   */
  getRecentEntries(count: number = 20): ContextEntry[] {
    return this.context.entries.slice(-count);
  }

  /**
   * Get all unresolved known issues.
   */
  getUnresolvedIssues(): string[] {
    return [...this.context.knownIssues];
  }

  /**
   * Search context entries by keyword.
   */
  search(keyword: string): ContextEntry[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.context.entries.filter(
      e => e.summary.toLowerCase().includes(lowerKeyword) ||
        e.details.toLowerCase().includes(lowerKeyword) ||
        e.tags.some(t => t.includes(lowerKeyword))
    );
  }

  // ----------------------------------------------------------
  // SESSION MANAGEMENT
  // ----------------------------------------------------------

  /**
   * Serialize the entire context to JSON for persistence.
   * SHOULD be called periodically and at session end.
   */
  serialize(): string {
    return JSON.stringify({
      sessionId: this.context.sessionId,
      startTime: this.context.startTime,
      lastUpdated: this.context.lastUpdated,
      entries: this.context.entries,
      decisions: Object.fromEntries(this.context.decisions),
      modifiedFiles: Array.from(this.context.modifiedFiles),
      requirements: this.context.requirements,
      constraints: this.context.constraints,
      techStack: this.context.techStack,
      knownIssues: this.context.knownIssues,
      solvedIssues: this.context.solvedIssues,
    }, null, 2);
  }

  /**
   * Deserialize context from JSON.
   * MUST be called when resuming a session.
   */
  static deserialize(json: string): DeerflowContextManager {
    const data = JSON.parse(json);
    const manager = new DeerflowContextManager(data.sessionId);
    manager.context.startTime = data.startTime;
    manager.context.lastUpdated = data.lastUpdated;
    manager.context.entries = data.entries;
    manager.context.decisions = new Map(Object.entries(data.decisions));
    manager.context.modifiedFiles = new Set(data.modifiedFiles);
    manager.context.requirements = data.requirements;
    manager.context.constraints = data.constraints;
    manager.context.techStack = data.techStack;
    manager.context.knownIssues = data.knownIssues;
    manager.context.solvedIssues = data.solvedIssues;
    return manager;
  }

  /**
   * Generate a worklog summary for the session.
   * Output format compatible with AGENT_WORKLOG.md format.
   */
  generateWorklog(): string {
    const lines: string[] = [];
    lines.push(`---`);
    lines.push(`Session ID: ${this.context.sessionId}`);
    lines.push(`Started: ${new Date(this.context.startTime).toISOString()}`);
    lines.push(`Last Updated: ${new Date(this.context.lastUpdated).toISOString()}`);
    lines.push(`Duration: ${Math.round((this.context.lastUpdated - this.context.startTime) / 60000)} minutes`);
    lines.push(`Total Entries: ${this.context.entries.length}`);
    lines.push(`Files Modified: ${this.context.modifiedFiles.size}`);
    lines.push(`Decisions Made: ${this.context.decisions.size}`);
    lines.push(`Issues Found: ${this.context.knownIssues.length + this.context.solvedIssues.length}`);
    lines.push(`Issues Resolved: ${this.context.solvedIssues.length}`);
    lines.push(`Issues Remaining: ${this.context.knownIssues.length}`);
    lines.push();

    // Group entries by type for readability
    const grouped = new Map<ContextEntryType, ContextEntry[]>();
    for (const entry of this.context.entries) {
      const existing = grouped.get(entry.type) ?? [];
      existing.push(entry);
      grouped.set(entry.type, existing);
    }

    for (const [type, entries] of grouped) {
      lines.push(`### ${type}`);
      for (const entry of entries) {
        const time = new Date(entry.timestamp).toISOString().substring(11, 19);
        lines.push(`- [${time}] [${entry.importance}] ${entry.summary}`);
        if (entry.files.length > 0) {
          lines.push(`  Files: ${entry.files.join(", ")}`);
        }
      }
      lines.push();
    }

    // Unresolved issues
    if (this.context.knownIssues.length > 0) {
      lines.push(`### UNRESOLVED ISSUES`);
      for (const issue of this.context.knownIssues) {
        lines.push(`- [ ] ${issue}`);
      }
      lines.push();
    }

    return lines.join("\n");
  }

  // ----------------------------------------------------------
  // PRIVATE HELPERS
  // ----------------------------------------------------------

  private createEntry(
    type: ContextEntryType,
    summary: string,
    details: string,
    files: string[],
    tags: string[],
    importance: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  ): ContextEntry {
    return {
      id: `ctx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      timestamp: Date.now(),
      summary: summary.substring(0, 200),
      details,
      files,
      tags,
      importance,
    };
  }

  private addEntry(entry: ContextEntry): void {
    // Evict oldest LOW importance entries if at capacity
    if (this.context.entries.length >= this.maxEntries) {
      const lowEntries = this.context.entries
        .map((e, i) => ({ entry: e, index: i }))
        .filter(({ entry }) => entry.importance === "LOW");
      if (lowEntries.length > 0) {
        this.context.entries.splice(lowEntries[0].index, 1);
      }
    }
    this.context.entries.push(entry);
    this.context.lastUpdated = Date.now();
  }

  private log(message: string): void {
    // In runtime environments, this would output to agent console
    // For now, it's available via getRecentEntries
    const logEntry = this.createEntry(
      ContextEntryType.WORKFLOW_STATE,
      message,
      "",
      [],
      ["log"],
      "LOW"
    );
    // Don't count log entries toward max
    this.context.entries.push(logEntry);
  }

  getSessionId(): string {
    return this.context.sessionId;
  }

  getStats(): { entries: number; filesModified: number; decisions: number; issuesRemaining: number } {
    return {
      entries: this.context.entries.length,
      filesModified: this.context.modifiedFiles.size,
      decisions: this.context.decisions.size,
      issuesRemaining: this.context.knownIssues.length,
    };
  }
}
