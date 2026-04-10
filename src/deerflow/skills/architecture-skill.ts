/**
 * @framework Deerflow v1.0.0
 * @license MIT
 * @module ArchitectureSkill
 * @description Enforces architectural patterns and principles for the Deerflow
 *   Agent Framework. Based on SOLID principles, Clean Architecture
 *   (Robert C. Martin), Domain-Driven Design (Eric Evans), and
 *   established microservice / monolith patterns.
 *
 *   Agents must verify structural constraints before proposing changes.
 *   Architectural drift is the leading cause of long-term maintainability
 *   collapse (Microsoft Research, 2019).
 *
 *   References:
 *   • Robert C. Martin – "Clean Architecture" (2017)
 *   • Eric Evans – "Domain-Driven Design" (2003)
 *   • Martin Fowler – "Patterns of Enterprise Application Architecture" (2002)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Architecture layer names following Clean Architecture. */
export type ArchitectureLayer =
  | "domain"
  | "application"
  | "infrastructure"
  | "presentation";

/** Severity of an architectural finding. */
export type ArchSeverity = "violation" | "warning" | "info";

/** A single architectural finding. */
export interface ArchFinding {
  /** Short identifier, e.g. "ARCH-001". */
  readonly id: string;
  /** Human-readable title. */
  readonly title: string;
  /** Severity level. */
  readonly severity: ArchSeverity;
  /** SOLID principle or pattern reference. */
  readonly principle: string;
  /** Detailed explanation. */
  readonly description: string;
  /** Actionable remediation steps. */
  readonly remediation: string[];
}

/** Result returned by every architecture check. */
export interface ArchCheckResult {
  /** `true` when no violations exist. */
  readonly passed: boolean;
  /** All findings from the check. */
  readonly findings: ArchFinding[];
}

/** Represents a module / file dependency. */
export interface DependencyEdge {
  readonly from: string;
  readonly to: string;
}

// ---------------------------------------------------------------------------
// ArchitectureSkill
// ---------------------------------------------------------------------------

/**
 * Provides methods for validating architectural constraints including
 * SOLID principles, Clean Architecture layering, dependency rules, and
 * common anti-patterns.
 *
 * Design rationale
 * ────────────────
 * • **Layered Architecture** – Separating concerns into layers (domain,
 *   application, infrastructure, presentation) ensures that business logic
 *   remains independent of frameworks and delivery mechanisms. Uncle Bob's
 *   Dependency Rule states that source dependencies must point inward only.
 * • **SOLID Enforcement** – These five principles are the most widely cited
 *   set of object-oriented design guidelines. Violations correlate strongly
 *   with increased change cost and defect density (NASA study, 2004).
 * • **Anti-pattern Detection** – Architecture anti-patterns (God Object,
 *   Spaghetti Code, etc.) are systematic causes of technical debt. Early
 *   detection prevents compounding interest on that debt.
 */
export class ArchitectureSkill {
  // ── Layer definitions ───────────────────────────────────────────────────

  /** Canonical layer ordering (innermost first). */
  private static readonly LAYER_ORDER: readonly ArchitectureLayer[] = [
    "domain",
    "application",
    "infrastructure",
    "presentation",
  ] as const;

  /** Map of layer to allowed import targets (layers it may depend on). */
  private static readonly ALLOWED_DEPENDENCIES: ReadonlyMap<ArchitectureLayer, ReadonlySet<ArchitectureLayer>> =
    new Map([
      ["domain", new Set()],
      ["application", new Set(["domain"])],
      ["infrastructure", new Set(["domain", "application"])],
      ["presentation", new Set(["domain", "application", "infrastructure"])],
    ]);

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Validates that the project follows Clean Architecture layering.
   *
   * **Principle: Dependency Rule (Clean Architecture, §4)**
   *
   * The Dependency Rule: source code dependencies must point inward only.
   * Nothing in an inner circle can know anything about something in an
   * outer circle.
   */
  static layeredArchitectureCheck(importMap: ReadonlyArray<DependencyEdge>): ArchCheckResult {
    const findings: ArchFinding[] = [];

    for (const edge of importMap) {
      const fromLayer = ArchitectureSkill.inferLayer(edge.from);
      const toLayer = ArchitectureSkill.inferLayer(edge.to);

      if (fromLayer === undefined || toLayer === undefined) continue;

      const allowed = ArchitectureSkill.ALLOWED_DEPENDENCIES.get(fromLayer);
      if (allowed && !allowed.has(toLayer)) {
        findings.push({
          id: "LAYER-001",
          title: "Inward dependency violation",
          severity: "violation",
          principle: "Clean Architecture – Dependency Rule",
          description: `${edge.from} (${fromLayer}) imports ${edge.to} (${toLayer}), which violates the inward-only dependency rule.`,
          remediation: [
            "Move the shared abstraction to the inner layer.",
            "Introduce a port/interface in the inner layer and implement it in the outer layer.",
            "Use dependency inversion: the inner layer defines the interface, the outer layer implements it.",
          ],
        });
      }
    }

    return {
      passed: findings.length === 0,
      findings,
    };
  }

  /**
   * Verifies that dependency direction follows the intended architecture.
   *
   * **Principle: Acyclic Dependencies Principle (Martin, 1996)**
   *
   * The dependency graph between packages must have no cycles. Cycles
   * make it impossible to understand, test, or deploy modules independently.
   */
  static dependencyDirectionCheck(edges: ReadonlyArray<DependencyEdge>): ArchCheckResult {
    const findings: ArchFinding[] = [];

    // Build adjacency list
    const adjacency = new Map<string, string[]>();
    for (const edge of edges) {
      const deps = adjacency.get(edge.from) ?? [];
      deps.push(edge.to);
      adjacency.set(edge.from, deps);
    }

    // Check if any edge points from a "higher" package to a "lower" one
    // based on naming conventions (e.g., domain should not import infra).
    for (const edge of edges) {
      if (edge.from.includes("domain") && edge.to.includes("infrastructure")) {
        findings.push({
          id: "DEP-001",
          title: "Domain depends on Infrastructure",
          severity: "violation",
          principle: "Dependency Inversion Principle (SOLID-D)",
          description: `${edge.from} depends on ${edge.to}. Domain must be independent of infrastructure concerns.`,
          remediation: [
            "Define a repository interface in the domain layer.",
            "Implement the interface in the infrastructure layer.",
            "Wire the implementation via dependency injection.",
          ],
        });
      }
    }

    return {
      passed: findings.length === 0,
      findings,
    };
  }

  /**
   * Detects circular dependencies between modules.
   *
   * **Principle: Acyclic Dependencies Principle (ADP)**
   *
   * Circular dependencies create tightly coupled modules that cannot be
   * built, tested, or reasoned about in isolation. They are the single
   * most damaging architectural anti-pattern.
   */
  static circularDependencyCheck(edges: ReadonlyArray<DependencyEdge>): ArchCheckResult {
    const findings: ArchFinding[] = [];

    // Build adjacency list for cycle detection
    const adjacency = new Map<string, Set<string>>();
    for (const edge of edges) {
      const deps = adjacency.get(edge.from) ?? new Set();
      deps.add(edge.to);
      adjacency.set(edge.from, deps);
    }

    // DFS-based cycle detection
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recursionStack.add(node);

      const neighbors = adjacency.get(node) ?? new Set();
      for (const neighbor of neighbors) {
        if (recursionStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          cycles.push([...path.slice(cycleStart), neighbor]);
        } else if (!visited.has(neighbor)) {
          dfs(neighbor, [...path, neighbor]);
        }
      }

      recursionStack.delete(node);
    };

    for (const node of adjacency.keys()) {
      if (!visited.has(node)) {
        dfs(node, [node]);
      }
    }

    for (const cycle of cycles) {
      findings.push({
        id: "CIRC-001",
        title: "Circular dependency detected",
        severity: "violation",
        principle: "Acyclic Dependencies Principle (ADP)",
        description: `Cycle: ${cycle.join(" → ")}. This creates tight coupling and prevents independent deployment.`,
        remediation: [
          "Extract the shared dependency into a new module that both modules depend on.",
          "Apply Dependency Inversion: introduce an interface in one module.",
          "Use event-driven architecture to replace direct calls with event emission.",
        ],
      });
    }

    return {
      passed: cycles.length === 0,
      findings,
    };
  }

  /**
   * Checks that each module has a single responsibility.
   *
   * **Principle: Single Responsibility Principle (SOLID-S)**
   *
   * A module should have only one reason to change. When a module handles
   * multiple unrelated concerns, changes to one concern risk breaking another.
   */
  static singleResponsibilityCheck(sourceCode: string, modulePath: string): ArchCheckResult {
    const findings: ArchFinding[] = [];

    // Heuristic: count distinct "concern" keywords in the file
    const concernKeywords = [
      "database", "query", "sql", "orm",          // persistence
      "http", "request", "response", "express",     // transport
      "email", "send", "notification", "sms",       // messaging
      "log", "logger", "telemetry",                 // observability
      "cache", "redis", "memo",                     // caching
      "auth", "jwt", "token", "permission",         // auth
      "validate", "schema", "sanitize",             // validation
      "calculate", "compute", "transform",          // business logic
    ];

    const foundConcerns = concernKeywords.filter((kw) =>
      new RegExp(`\\b${kw}\\b`, "i").test(sourceCode),
    );

    if (foundConcerns.length > 3) {
      findings.push({
        id: "SRP-001",
        title: "Module handles multiple concerns",
        severity: "warning",
        principle: "Single Responsibility Principle (SOLID-S)",
        description: `${modulePath} appears to handle ${foundConcerns.length} distinct concerns: ${foundConcerns.join(", ")}.`,
        remediation: [
          "Split this module into focused classes or functions, one per concern.",
          "Each module should have exactly one reason to change.",
          "Apply the Separation of Concerns principle to isolate each domain.",
        ],
      });
    }

    return {
      passed: findings.length === 0,
      findings,
    };
  }

  /**
   * Validates that interfaces are not bloated with unrelated methods.
   *
   * **Principle: Interface Segregation Principle (SOLID-I)**
   *
   * Clients should not be forced to depend on methods they do not use.
   * Fat interfaces lead to coupling and unnecessary implementation burden.
   */
  static interfaceSegregationCheck(sourceCode: string): ArchCheckResult {
    const findings: ArchFinding[] = [];

    // Find interface declarations and count their methods
    const interfaceRegex = /(?:interface|abstract class)\s+(\w+)\s*(?:extends\s+\w+\s*)?\{([^}]*)\}/g;
    let match: RegExpExecArray | null;

    while ((match = interfaceRegex.exec(sourceCode)) !== null) {
      const interfaceName = match[1];
      const body = match[2];
      const methodCount = (body.match(/\w+\s*\(/g) ?? []).length;

      if (methodCount > 7) {
        findings.push({
          id: "ISP-001",
          title: `Interface '${interfaceName}' has too many methods (${methodCount})`,
          severity: "warning",
          principle: "Interface Segregation Principle (SOLID-I)",
          description: `${interfaceName} defines ${methodCount} methods. Interfaces with > 7 methods likely combine unrelated responsibilities.`,
          remediation: [
            `Split ${interfaceName} into smaller, focused interfaces.`,
            "Clients should only depend on the specific interface they need.",
            "Consider using composition over inheritance for the implementations.",
          ],
        });
      }
    }

    return {
      passed: findings.length === 0,
      findings,
    };
  }

  /**
   * Validates that component boundaries are respected.
   *
   * **Principle: Common Closure Principle (CCP)**
   *
   * Classes that change for the same reason should be in the same component.
   * Components should have well-defined public APIs and minimal leakage.
   */
  static componentBoundaryCheck(modulePath: string, sourceCode: string): ArchCheckResult {
    const findings: ArchFinding[] = [];

    const exports = (sourceCode.match(/export\s+(?!default|type|interface)(?:const|let|var|function|class|async\s+function)\s+(\w+)/g) ?? []).length;

    // Barrel file check: re-exports only
    const reExports = (sourceCode.match(/export\s*\{[^}]*\}/g) ?? []).length;

    if (exports > 15) {
      findings.push({
        id: "COMP-001",
        title: "Component exports too many symbols",
        severity: "warning",
        principle: "Common Closure Principle (CCP)",
        description: `${modulePath} exports ${exports} symbols. Large public APIs indicate the component is doing too much.`,
        remediation: [
          "Split the component into sub-components with focused exports.",
          "Use barrel files (index.ts) to provide a clean public surface.",
          "Consider the Facade pattern to simplify the public API.",
        ],
      });
    }

    return {
      passed: findings.length === 0,
      findings,
    };
  }

  /**
   * Evaluates state management patterns for correctness.
   *
   * **Principle: Encapsulation & Immutability**
   *
   * Shared mutable state is the root of many concurrency bugs and makes
   * reasoning about application behavior difficult (Rich Hickey, "Are We
   * There Yet?", 2014).
   */
  static stateManagementCheck(sourceCode: string): ArchCheckResult {
    const findings: ArchFinding[] = [];

    // Detect global mutable state
    const globalMutablePattern = /(?:declare\s+)?(?:global|globalThis|process\.env)\s*\.\s*\w+\s*=/g;
    const globalMutations = sourceCode.match(globalMutablePattern);

    if (globalMutations && globalMutations.length > 0) {
      findings.push({
        id: "STATE-001",
        title: "Global mutable state detected",
        severity: "violation",
        principle: "Encapsulation & Immutability",
        description: `Found ${globalMutations.length} global mutable state assignment(s). Global state makes testing and reasoning about behavior extremely difficult.`,
        remediation: [
          "Encapsulate state within classes or functions using closures.",
          "Prefer immutable data structures (Object.freeze, Immer, or structural sharing).",
          "Use a dedicated state management solution (Redux, Zustand, React Context) with clear update patterns.",
          "For server-side, use dependency injection to pass state rather than global variables.",
        ],
      });
    }

    // Detect let without const where const would suffice (heuristic: let at top level)
    const topLevelLet = sourceCode.match(/^(?:export\s+)?let\s+/gm);
    if (topLevelLet && topLevelLet.length > 3) {
      findings.push({
        id: "STATE-002",
        title: "Excessive use of 'let' for module-level variables",
        severity: "warning",
        principle: "Prefer Immutability",
        description: `Found ${topLevelLet.length} module-level 'let' declarations. Prefer 'const' and re-assign through function parameters.`,
        remediation: [
          "Use 'const' by default. Only use 'let' when reassignment is necessary.",
          "Prefer pure functions that return new values instead of mutating variables.",
        ],
      });
    }

    return {
      passed: findings.length === 0,
      findings,
    };
  }

  /**
   * Validates API design patterns for consistency and usability.
   *
   * **Principle: Uniform Access Principle (Bertrand Meyer)**
   *
   * The API should be consistent, predictable, and well-documented.
   * Inconsistent APIs increase cognitive load and adoption friction.
   */
  static apiDesignCheck(sourceCode: string): ArchCheckResult {
    const findings: ArchFinding[] = [];

    // Check for inconsistent route naming
    const routePattern = /(?:router\.(?:get|post|put|delete|patch))\s*\(\s*["']([^"']+)["']/g;
    let match: RegExpExecArray | null;
    const routes: string[] = [];

    while ((match = routePattern.exec(sourceCode)) !== null) {
      routes.push(match[1]);
    }

    // Check for trailing-slash inconsistency
    const withSlash = routes.filter((r) => r.endsWith("/")).length;
    const withoutSlash = routes.filter((r) => !r.endsWith("/") && r.length > 1).length;
    if (withSlash > 0 && withoutSlash > 0) {
      findings.push({
        id: "API-001",
        title: "Inconsistent trailing slashes in API routes",
        severity: "warning",
        principle: "Uniform Access Principle",
        description: `${withSlash} route(s) have trailing slashes while ${withoutSlash} do not. Pick one convention and enforce it.`,
        remediation: [
          "Choose a convention: always or never use trailing slashes.",
          "Add middleware to normalize trailing slashes (redirect 301).",
        ],
      });
    }

    // Check for versioning
    if (routes.length > 0 && !sourceCode.includes("/v1/") && !sourceCode.includes("/v2/")) {
      findings.push({
        id: "API-002",
        title: "API routes are not versioned",
        severity: "info",
        principle: "API Stability & Evolution",
        description: "API routes do not include a version prefix. This makes backward-incompatible changes risky.",
        remediation: [
          "Add a version prefix to all routes (e.g., /api/v1/...).",
          "Plan for versioning from day one to avoid breaking changes.",
        ],
      });
    }

    return {
      passed: findings.every((f) => f.severity === "info"),
      findings,
    };
  }

  /**
   * Validates database schema design patterns.
   *
   * **Principle: Normalization & Data Integrity**
   *
   * Well-designed schemas prevent anomalies and ensure data consistency.
   * Referential integrity, appropriate indexing, and naming conventions
   * are foundational to a reliable data layer.
   */
  static databaseSchemaCheck(schemaDefinition: string): ArchCheckResult {
    const findings: ArchFinding[] = [];

    // Check for missing primary keys (heuristic: model/table without @id or PRIMARY KEY)
    const hasPrimaryKey = /(?:@PrimaryGeneratedColumn|@PrimaryKey|PRIMARY\s+KEY|\.primary\(\)|id\s*:)/i.test(schemaDefinition);

    if (!hasPrimaryKey) {
      findings.push({
        id: "DB-001",
        title: "No primary key detected in schema",
        severity: "violation",
        principle: "Data Integrity – Primary Key Requirement",
        description: "Database table/entity lacks a primary key. Every table must have a unique identifier.",
        remediation: [
          "Add a primary key column (typically 'id' with auto-increment or UUID).",
          "Use the ORM decorator for your framework (@PrimaryGeneratedColumn, @PrimaryKey, etc.).",
        ],
      });
    }

    // Check for missing indexes on foreign keys
    const hasForeignKey = /(?:@ForeignKey|@ManyToOne|REFERENCES|foreign_key)/i.test(schemaDefinition);
    const hasIndex = /(?:@Index|CREATE\s+INDEX|\.index\(\))/i.test(schemaDefinition);

    if (hasForeignKey && !hasIndex) {
      findings.push({
        id: "DB-002",
        title: "Foreign key without index",
        severity: "warning",
        principle: "Query Performance – Index Foreign Keys",
        description: "Foreign key relationship detected but no index found. This will cause slow JOIN queries.",
        remediation: [
          "Add an index on every foreign key column.",
          "Most ORMs support @Index or equivalent decorators.",
        ],
      });
    }

    // Check for timestamp columns
    const hasTimestamps = /(?:createdAt|updatedAt|created_at|updated_at|timestamps)/i.test(schemaDefinition);
    if (!hasTimestamps) {
      findings.push({
        id: "DB-003",
        title: "No timestamp columns",
        severity: "info",
        principle: "Auditability & Debugging",
        description: "Schema does not include createdAt/updatedAt columns.",
        remediation: [
          "Add createdAt and updatedAt columns to all tables.",
          "Configure the ORM to auto-manage these timestamps.",
        ],
      });
    }

    return {
      passed: findings.every((f) => f.severity !== "violation"),
      findings,
    };
  }

  /**
   * Assesses the architecture for scalability concerns.
   *
   * **Principle: Horizontal Scalability & Loose Coupling**
   *
   * A scalable architecture allows capacity to be added by deploying more
   * instances rather than requiring hardware upgrades (vertical scaling).
   */
  static scalabilityAssessment(sourceCode: string): ArchCheckResult {
    const findings: ArchFinding[] = [];

    // Check for in-memory session store (non-scalable)
    const inMemorySession = /(?:MemoryStore|memory-store|store:\s*new\s+MemoryStore)/i.test(sourceCode);
    if (inMemorySession) {
      findings.push({
        id: "SCALE-001",
        title: "In-memory session storage detected",
        severity: "warning",
        principle: "Horizontal Scalability – Stateless Services",
        description: "In-memory session storage prevents horizontal scaling. Sessions are lost when instances restart and are not shared across instances.",
        remediation: [
          "Use Redis, Memcached, or a database-backed session store.",
          "Consider JWT tokens for stateless authentication.",
        ],
      });
    }

    // Check for file-system storage of user data
    const fileStorage = /(?:writeFileSync|writeFile|fs\.write|createWriteStream)/i.test(sourceCode);
    const inUserPath = /(?:uploads|data|storage|public)/i.test(sourceCode);

    if (fileStorage && inUserPath) {
      findings.push({
        id: "SCALE-002",
        title: "Local file system used for user data",
        severity: "warning",
        principle: "Stateless Services – Externalized Storage",
        description: "User data is being written to the local file system. This does not work in containerized / multi-instance deployments.",
        remediation: [
          "Use object storage (S3, GCS, Azure Blob) for user-uploaded files.",
          "Use a database for structured user data.",
        ],
      });
    }

    // Check for connection pooling
    const hasConnectionPool = /(?:pool|Pool|createPool|connectionPool)/i.test(sourceCode);
    const hasDbClient = /(?:createConnection|mysql\.connect|pg\.connect|new\s+MongoClient)/i.test(sourceCode);

    if (hasDbClient && !hasConnectionPool) {
      findings.push({
        id: "SCALE-003",
        title: "Database connection without pooling",
        severity: "warning",
        principle: "Resource Efficiency – Connection Pooling",
        description: "Database client is created without connection pooling. This exhausts connections under load.",
        remediation: [
          "Configure a connection pool with appropriate min/max sizes.",
          "Use the ORM's built-in connection pooling (e.g., TypeORM, Prisma, Knex).",
        ],
      });
    }

    return {
      passed: findings.length === 0,
      findings,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────

  /**
   * Infers the architectural layer from a file path.
   *
   * Conventions:
   *   src/domain/**     → domain
   *   src/application/** → application
   *   src/infra...      → infrastructure
   *   src/present...    → presentation
   */
  private static inferLayer(filePath: string): ArchitectureLayer | undefined {
    const lower = filePath.toLowerCase();
    if (lower.includes("domain") || lower.includes("entities") || lower.includes("models")) {
      return "domain";
    }
    if (lower.includes("application") || lower.includes("use-cases") || lower.includes("services")) {
      return "application";
    }
    if (lower.includes("infra") || lower.includes("repository") || lower.includes("adapters")) {
      return "infrastructure";
    }
    if (lower.includes("present") || lower.includes("controllers") || lower.includes("routes") || lower.includes("handlers")) {
      return "presentation";
    }
    return undefined;
  }
}
