import { describe, it, expect, beforeEach } from "vitest";
import { DeerflowContextManager, ContextEntryType } from "./context-manager";

describe("DeerflowContextManager", () => {
  let mgr: DeerflowContextManager;

  beforeEach(() => {
    mgr = new DeerflowContextManager("test-session");
  });

  // =========================================================================
  // Constructor & session basics
  // =========================================================================
  describe("constructor", () => {
    it("creates a new session with a valid ID", () => {
      const m = new DeerflowContextManager();
      expect(m.getSessionId()).toBeTruthy();
      expect(typeof m.getSessionId()).toBe("string");
    });

    it("uses the provided sessionId when given", () => {
      expect(mgr.getSessionId()).toBe("test-session");
    });

    it("session has a valid start time close to Date.now()", () => {
      const before = Date.now();
      const m = new DeerflowContextManager();
      // We can't access startTime directly, but serialize reveals it
      const json = JSON.parse(m.serialize());
      const after = Date.now();
      expect(json.startTime).toBeGreaterThanOrEqual(before);
      expect(json.startTime).toBeLessThanOrEqual(after);
    });
  });

  // =========================================================================
  // recordDecision
  // =========================================================================
  describe("recordDecision", () => {
    it("stores a decision that can be retrieved", () => {
      mgr.recordDecision("use-react", "Use React for UI", "Team expertise");
      expect(mgr.getDecision("use-react")).toBe("Use React for UI");
    });

    it("creates an entry of type DECISION", () => {
      mgr.recordDecision("db-choice", "Use PostgreSQL", "ACID compliance");
      const entries = mgr.getRecentEntries(50);
      const decisionEntries = entries.filter(
        (e) => e.type === ContextEntryType.DECISION
      );
      expect(decisionEntries.length).toBeGreaterThanOrEqual(1);
      expect(decisionEntries[0].summary).toContain("db-choice");
    });
  });

  // =========================================================================
  // recordFileChange
  // =========================================================================
  describe("recordFileChange", () => {
    it("tracks file modifications", () => {
      mgr.recordFileChange("src/index.ts", "MODIFY", "Updated export");
      expect(mgr.wasFileModified("src/index.ts")).toBe(true);
    });

    it("does not report unmodified files", () => {
      expect(mgr.wasFileModified("src/other.ts")).toBe(false);
    });

    it("creates FILE_CHANGE entries", () => {
      mgr.recordFileChange("src/app.ts", "CREATE", "New file");
      const history = mgr.getFileHistory("src/app.ts");
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].type).toBe(ContextEntryType.FILE_CHANGE);
    });
  });

  // =========================================================================
  // recordError
  // =========================================================================
  describe("recordError", () => {
    it("stores an error with context", () => {
      mgr.recordError(new Error("Connection refused"), "during API call", ["src/api.ts"]);
      const issues = mgr.getUnresolvedIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0]).toContain("Connection refused");
    });

    it("stores string errors too", () => {
      mgr.recordError("Type mismatch in handler", "compilation phase");
      const issues = mgr.getUnresolvedIssues();
      expect(issues.some((e) => e.includes("Type mismatch"))).toBe(true);
    });
  });

  // =========================================================================
  // recordRequirement
  // =========================================================================
  describe("recordRequirement", () => {
    it("stores a user requirement", () => {
      mgr.recordRequirement("Must support dark mode", "USER");
      const reqs = mgr.getRequirements();
      expect(reqs).toContain("Must support dark mode");
    });

    it("stores multiple requirements in order", () => {
      mgr.recordRequirement("Req A", "USER");
      mgr.recordRequirement("Req B", "DOCUMENT");
      expect(mgr.getRequirements()).toEqual(["Req A", "Req B"]);
    });
  });

  // =========================================================================
  // recordUserFeedback
  // =========================================================================
  describe("recordUserFeedback", () => {
    it("stores feedback with sentiment", () => {
      mgr.recordUserFeedback("Looks great!", "POSITIVE");
      const found = mgr.search("Looks great!");
      expect(found.length).toBeGreaterThanOrEqual(1);
      expect(found[0].tags).toContain("positive");
    });

    it("stores negative feedback as CRITICAL importance", () => {
      mgr.recordUserFeedback("This is broken", "NEGATIVE");
      const found = mgr.search("This is broken");
      expect(found[0].importance).toBe("CRITICAL");
    });
  });

  // =========================================================================
  // recordFixApplied
  // =========================================================================
  describe("recordFixApplied", () => {
    it("marks an issue as solved", () => {
      mgr.recordError(new Error("Null pointer"), "runtime", []);
      expect(mgr.getUnresolvedIssues().length).toBeGreaterThanOrEqual(1);

      mgr.recordFixApplied("Null pointer", "Added null check");
      // "Null pointer" should no longer be in knownIssues
      expect(mgr.getUnresolvedIssues().some((i) => i === "Null pointer")).toBe(false);
    });

    it("creates a FIX_APPLIED entry", () => {
      mgr.recordFixApplied("bug-42", "Patched the race condition");
      const entries = mgr.getRecentEntries(50);
      const fixEntries = entries.filter((e) => e.type === ContextEntryType.FIX_APPLIED);
      expect(fixEntries.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // recordDependency
  // =========================================================================
  describe("recordDependency", () => {
    it("tracks dependency changes", () => {
      mgr.recordDependency("zod", "3.22.0", "ADD", "Schema validation needed");
      const found = mgr.search("zod");
      expect(found.length).toBeGreaterThanOrEqual(1);
      expect(found[0].type).toBe(ContextEntryType.DEPENDENCY);
    });
  });

  // =========================================================================
  // Querying
  // =========================================================================
  describe("getDecision", () => {
    it("returns undefined for unknown decision", () => {
      expect(mgr.getDecision("nonexistent")).toBeUndefined();
    });
  });

  describe("getSimilarErrors", () => {
    it("finds errors that match a pattern", () => {
      mgr.recordError(new Error("TypeError: Cannot read property of undefined"), "test", []);
      mgr.recordError(new Error("TypeError: null is not an object"), "prod", []);
      const similar = mgr.getSimilarErrors("TypeError");
      expect(similar.length).toBeGreaterThanOrEqual(2);
    });

    it("returns empty when no errors match", () => {
      mgr.recordError(new Error("SyntaxError"), "compile", []);
      const similar = mgr.getSimilarErrors("NetworkError");
      expect(similar.length).toBe(0);
    });
  });

  describe("getRecentEntries", () => {
    it("returns limited number of entries", () => {
      for (let i = 0; i < 10; i++) {
        mgr.recordDecision(`d-${i}`, `Decision ${i}`, `Reason ${i}`);
      }
      const recent = mgr.getRecentEntries(3);
      // Each recordDecision also creates a log entry, so actual entries are more
      // But we asked for 3, so slice(-3) returns 3
      expect(recent.length).toBe(3);
    });

    it("returns all entries when count exceeds total", () => {
      mgr.recordDecision("a", "A", "x");
      const recent = mgr.getRecentEntries(1000);
      expect(recent.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("search", () => {
    it("finds entries by keyword", () => {
      mgr.recordRequirement("Support pagination", "USER");
      const results = mgr.search("pagination");
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it("search is case-insensitive", () => {
      mgr.recordRequirement("Support DARK MODE", "USER");
      const results = mgr.search("dark mode");
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it("returns empty for no matches", () => {
      const results = mgr.search("xyznonexistent123");
      expect(results).toHaveLength(0);
    });
  });

  // =========================================================================
  // Serialization
  // =========================================================================
  describe("serialize", () => {
    it("produces valid JSON", () => {
      mgr.recordDecision("d1", "Use Redis", "Caching");
      const json = mgr.serialize();
      expect(() => JSON.parse(json)).not.toThrow();
      const parsed = JSON.parse(json);
      expect(parsed.sessionId).toBe("test-session");
      expect(parsed.decisions.d1).toBe("Use Redis");
    });
  });

  describe("deserialize", () => {
    it("recreates manager from serialized JSON", () => {
      mgr.recordDecision("d1", "Use Redis", "Caching");
      mgr.recordFileChange("src/cache.ts", "CREATE", "New cache module");
      const json = mgr.serialize();

      const restored = DeerflowContextManager.deserialize(json);
      expect(restored.getSessionId()).toBe("test-session");
      expect(restored.getDecision("d1")).toBe("Use Redis");
      expect(restored.wasFileModified("src/cache.ts")).toBe(true);
    });

    it("preserves requirements across serialization", () => {
      mgr.recordRequirement("Must be responsive", "USER");
      const json = mgr.serialize();
      const restored = DeerflowContextManager.deserialize(json);
      expect(restored.getRequirements()).toContain("Must be responsive");
    });
  });

  // =========================================================================
  // generateWorklog
  // =========================================================================
  describe("generateWorklog", () => {
    it("produces a non-empty string", () => {
      const worklog = mgr.generateWorklog();
      expect(typeof worklog).toBe("string");
      expect(worklog.length).toBeGreaterThan(0);
    });

    it("includes the session ID", () => {
      const worklog = mgr.generateWorklog();
      expect(worklog).toContain("test-session");
    });

    it("includes entry sections when entries exist", () => {
      mgr.recordDecision("d1", "Use Postgres", "ACID");
      const worklog = mgr.generateWorklog();
      expect(worklog).toContain("DECISION");
    });
  });

  // =========================================================================
  // getStats
  // =========================================================================
  describe("getStats", () => {
    it("returns correct counts for empty session", () => {
      const stats = mgr.getStats();
      expect(stats.decisions).toBe(0);
      expect(stats.filesModified).toBe(0);
      expect(stats.issuesRemaining).toBe(0);
    });

    it("returns incremented counts after recording", () => {
      mgr.recordDecision("d1", "Choice A", "Reason");
      mgr.recordFileChange("src/a.ts", "CREATE", "New");
      mgr.recordError(new Error("Oops"), "test");
      mgr.recordFixApplied("Oops", "Fixed");

      const stats = mgr.getStats();
      expect(stats.decisions).toBe(1);
      expect(stats.filesModified).toBe(1);
      expect(stats.issuesRemaining).toBe(0); // fixed
    });
  });
});
