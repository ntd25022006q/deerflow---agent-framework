import { describe, it, expect, beforeEach } from "vitest";
import { ArchitectureSkill } from "./architecture-skill";
import { DeerflowSkillRegistry } from "./index";
import type { DependencyEdge, ArchCheckResult } from "./architecture-skill";
import type { SkillReport, SkillDescriptor, SkillValidationResult } from "./index";

// ═══════════════════════════════════════════════════════════════════════════
// ArchitectureSkill Tests
// ═══════════════════════════════════════════════════════════════════════════

describe("ArchitectureSkill", () => {
  // ── layeredArchitectureCheck ────────────────────────────────────────────

  describe("layeredArchitectureCheck", () => {
    it("passes for inward-only dependencies (presentation → application)", () => {
      const edges: DependencyEdge[] = [
        { from: "src/controllers/UserController", to: "src/application/CreateUser" },
      ];
      const result = ArchitectureSkill.layeredArchitectureCheck(edges);
      expect(result.passed).toBe(true);
    });

    it("passes for infrastructure → domain dependencies", () => {
      const edges: DependencyEdge[] = [
        { from: "src/infrastructure/UserRepository", to: "src/domain/User" },
      ];
      const result = ArchitectureSkill.layeredArchitectureCheck(edges);
      expect(result.passed).toBe(true);
    });

    it("fails when domain depends on infrastructure", () => {
      const edges: DependencyEdge[] = [
        { from: "src/domain/User", to: "src/infrastructure/Database" },
      ];
      const result = ArchitectureSkill.layeredArchitectureCheck(edges);
      expect(result.passed).toBe(false);
      expect(result.findings.some((f) => f.id === "LAYER-001")).toBe(true);
    });

    it("fails when domain depends on presentation", () => {
      const edges: DependencyEdge[] = [
        { from: "src/entities/Order", to: "src/controllers/OrderController" },
      ];
      const result = ArchitectureSkill.layeredArchitectureCheck(edges);
      expect(result.passed).toBe(false);
    });

    it("passes for empty dependency map", () => {
      const result = ArchitectureSkill.layeredArchitectureCheck([]);
      expect(result.passed).toBe(true);
    });

    it("skips edges where layers cannot be inferred", () => {
      const edges: DependencyEdge[] = [
        { from: "src/utils/helpers", to: "src/common/constants" },
      ];
      const result = ArchitectureSkill.layeredArchitectureCheck(edges);
      expect(result.passed).toBe(true);
    });
  });

  // ── dependencyDirectionCheck ────────────────────────────────────────────

  describe("dependencyDirectionCheck", () => {
    it("passes for clean dependency direction", () => {
      const edges: DependencyEdge[] = [
        { from: "src/infrastructure/Repo", to: "src/domain/Entity" },
      ];
      const result = ArchitectureSkill.dependencyDirectionCheck(edges);
      expect(result.passed).toBe(true);
    });

    it("fails when domain depends on infrastructure", () => {
      const edges: DependencyEdge[] = [
        { from: "src/domain/Entity", to: "src/infrastructure/Database" },
      ];
      const result = ArchitectureSkill.dependencyDirectionCheck(edges);
      expect(result.passed).toBe(false);
      expect(result.findings[0].principle).toContain("Dependency Inversion");
    });

    it("reports DEP-001 finding for domain→infrastructure", () => {
      const edges: DependencyEdge[] = [
        { from: "src/domain/User", to: "src/infrastructure/DbClient" },
      ];
      const result = ArchitectureSkill.dependencyDirectionCheck(edges);
      expect(result.findings[0].id).toBe("DEP-001");
    });

    it("passes for empty edges", () => {
      const result = ArchitectureSkill.dependencyDirectionCheck([]);
      expect(result.passed).toBe(true);
    });
  });

  // ── circularDependencyCheck ─────────────────────────────────────────────

  describe("circularDependencyCheck", () => {
    it("passes for acyclic dependencies", () => {
      const edges: DependencyEdge[] = [
        { from: "A", to: "B" },
        { from: "B", to: "C" },
      ];
      const result = ArchitectureSkill.circularDependencyCheck(edges);
      expect(result.passed).toBe(true);
    });

    it("detects a direct two-node cycle (A → B → A)", () => {
      const edges: DependencyEdge[] = [
        { from: "A", to: "B" },
        { from: "B", to: "A" },
      ];
      const result = ArchitectureSkill.circularDependencyCheck(edges);
      expect(result.passed).toBe(false);
      expect(result.findings[0].id).toBe("CIRC-001");
    });

    it("detects a three-node cycle (A → B → C → A)", () => {
      const edges: DependencyEdge[] = [
        { from: "A", to: "B" },
        { from: "B", to: "C" },
        { from: "C", to: "A" },
      ];
      const result = ArchitectureSkill.circularDependencyCheck(edges);
      expect(result.passed).toBe(false);
      expect(result.findings.some((f) => f.description.includes("→"))).toBe(true);
    });

    it("passes for empty edges", () => {
      const result = ArchitectureSkill.circularDependencyCheck([]);
      expect(result.passed).toBe(true);
    });

    it("suggests extracting shared dependency as remediation", () => {
      const edges: DependencyEdge[] = [
        { from: "ModuleA", to: "ModuleB" },
        { from: "ModuleB", to: "ModuleA" },
      ];
      const result = ArchitectureSkill.circularDependencyCheck(edges);
      expect(
        result.findings[0].remediation.some((r) => r.includes("shared dependency")),
      ).toBe(true);
    });
  });

  // ── singleResponsibilityCheck ───────────────────────────────────────────

  describe("singleResponsibilityCheck", () => {
    it("passes for a focused module with few concern keywords", () => {
      const code = `function validateEmail(email: string) { return email.includes("@"); }`;
      const result = ArchitectureSkill.singleResponsibilityCheck(code, "src/validators/email.ts");
      expect(result.passed).toBe(true);
    });

    it("fails for a module mixing many concerns", () => {
      const code = `
        import express from 'express';
        import { Pool } from 'pg';
        import jwt from 'jsonwebtoken';
        import { createTransport } from 'nodemailer';
        function handler() {
          const sql = "SELECT * FROM users";
          const token = jwt.sign({});
          sendEmail();
          validateSchema();
          computeResult();
          cacheResult();
          logger.info("done");
        }
      `;
      const result = ArchitectureSkill.singleResponsibilityCheck(code, "src/handlers/bigHandler.ts");
      expect(result.passed).toBe(false);
      expect(result.findings[0].id).toBe("SRP-001");
    });

    it("reports the number of distinct concerns found", () => {
      const code = `
        const query = "SELECT 1";
        const request = fetch("/api");
        const email = sendNotification();
        const log = logger.info();
        const cache = redis.get();
      `;
      const result = ArchitectureSkill.singleResponsibilityCheck(code, "src/mixed.ts");
      expect(result.findings[0].description).toMatch(/\d+ distinct concerns/);
    });
  });

  // ── interfaceSegregationCheck ───────────────────────────────────────────

  describe("interfaceSegregationCheck", () => {
    it("passes for interfaces with <= 7 methods", () => {
      const code = `interface UserRepo {
        findById(id: string): User;
        save(user: User): void;
        delete(id: string): void;
      }`;
      const result = ArchitectureSkill.interfaceSegregationCheck(code);
      expect(result.passed).toBe(true);
    });

    it("fails for interfaces with > 7 methods", () => {
      const methods = Array.from({ length: 8 }, (_, i) => `  method${i}(): void;`);
      const code = `interface FatInterface {\n${methods.join("\n")}\n}`;
      const result = ArchitectureSkill.interfaceSegregationCheck(code);
      expect(result.passed).toBe(false);
      expect(result.findings[0].id).toBe("ISP-001");
    });

    it("reports the method count in the finding description", () => {
      const methods = Array.from({ length: 10 }, (_, i) => `  m${i}(): void;`);
      const code = `interface Big {\n${methods.join("\n")}\n}`;
      const result = ArchitectureSkill.interfaceSegregationCheck(code);
      expect(result.findings[0].description).toContain("10 methods");
    });

    it("passes for code with no interfaces", () => {
      const code = `const x = 42;`;
      const result = ArchitectureSkill.interfaceSegregationCheck(code);
      expect(result.passed).toBe(true);
    });
  });

  // ── componentBoundaryCheck ──────────────────────────────────────────────

  describe("componentBoundaryCheck", () => {
    it("passes for modules with few exports", () => {
      const code = `export function hello() { return "world"; }`;
      const result = ArchitectureSkill.componentBoundaryCheck("src/utils/hello.ts", code);
      expect(result.passed).toBe(true);
    });

    it("fails for modules exporting more than 15 symbols", () => {
      const exports = Array.from({ length: 16 }, (_, i) => `export const exp${i} = ${i};`);
      const code = exports.join("\n");
      const result = ArchitectureSkill.componentBoundaryCheck("src/big/index.ts", code);
      expect(result.passed).toBe(false);
      expect(result.findings[0].id).toBe("COMP-001");
    });

    it("reports the number of exported symbols", () => {
      const exports = Array.from({ length: 20 }, (_, i) => `export function fn${i}() {}`);
      const code = exports.join("\n");
      const result = ArchitectureSkill.componentBoundaryCheck("src/exports.ts", code);
      expect(result.findings[0].description).toContain("20 symbols");
    });
  });

  // ── stateManagementCheck ────────────────────────────────────────────────

  describe("stateManagementCheck", () => {
    it("passes for code with no global mutable state", () => {
      const code = `function compute(a: number, b: number) { return a + b; }`;
      const result = ArchitectureSkill.stateManagementCheck(code);
      expect(result.passed).toBe(true);
    });

    it("detects globalThis mutations as violation", () => {
      const code = `globalThis.counter = 0;`;
      const result = ArchitectureSkill.stateManagementCheck(code);
      expect(result.passed).toBe(false);
      expect(result.findings[0].id).toBe("STATE-001");
    });

    it("detects process.env mutations", () => {
      const code = `process.env.DEBUG = "true";`;
      const result = ArchitectureSkill.stateManagementCheck(code);
      expect(result.passed).toBe(false);
    });

    it("warns about excessive module-level let declarations", () => {
      const lets = Array.from({ length: 4 }, (_, i) => `let var${i} = ${i};`);
      const code = lets.join("\n");
      const result = ArchitectureSkill.stateManagementCheck(code);
      expect(result.findings.some((f) => f.id === "STATE-002")).toBe(true);
    });

    it("suggests encapsulating state within closures", () => {
      const code = `global.appState = {};`;
      const result = ArchitectureSkill.stateManagementCheck(code);
      expect(
        result.findings[0].remediation.some((r) => r.includes("closures")),
      ).toBe(true);
    });
  });

  // ── apiDesignCheck ──────────────────────────────────────────────────────

  describe("apiDesignCheck", () => {
    it("passes for versioned routes with consistent trailing slashes", () => {
      const code = `
        router.get("/api/v1/users", handler);
        router.post("/api/v1/users", createHandler);
      `;
      const result = ArchitectureSkill.apiDesignCheck(code);
      expect(result.passed).toBe(true);
    });

    it("reports info for unversioned routes", () => {
      const code = `router.get("/api/users", handler);`;
      const result = ArchitectureSkill.apiDesignCheck(code);
      expect(result.findings.some((f) => f.id === "API-002" && f.severity === "info")).toBe(true);
    });

    it("warns about inconsistent trailing slashes", () => {
      const code = `
        router.get("/api/v1/users", listUsers);
        router.get("/api/v1/orders/", listOrders);
      `;
      const result = ArchitectureSkill.apiDesignCheck(code);
      expect(result.findings.some((f) => f.id === "API-001")).toBe(true);
    });

    it("passes for code with no routes", () => {
      const code = `const x = 42;`;
      const result = ArchitectureSkill.apiDesignCheck(code);
      expect(result.passed).toBe(true);
    });
  });

  // ── databaseSchemaCheck ─────────────────────────────────────────────────

  describe("databaseSchemaCheck", () => {
    it("passes for a well-defined schema with PK, indexes, and timestamps", () => {
      const schema = `
        @Entity()
        @PrimaryGeneratedColumn()
        id: number;

        @Index()
        @ManyToOne(() => User)
        user: User;

        @Column()
        createdAt: Date;

        @Column()
        updatedAt: Date;
      `;
      const result = ArchitectureSkill.databaseSchemaCheck(schema);
      expect(result.passed).toBe(true);
    });

    it("fails when no primary key is detected", () => {
      const schema = `CREATE TABLE items (name VARCHAR(255));`;
      const result = ArchitectureSkill.databaseSchemaCheck(schema);
      expect(result.passed).toBe(false);
      expect(result.findings.some((f) => f.id === "DB-001")).toBe(true);
    });

    it("warns when foreign key exists without index", () => {
      const schema = `
        id: number;
        @ForeignKey(() => User)
        userId: number;
      `;
      const result = ArchitectureSkill.databaseSchemaCheck(schema);
      expect(result.findings.some((f) => f.id === "DB-002")).toBe(true);
    });

    it("reports info for missing timestamp columns", () => {
      const schema = `id: number; name: string;`;
      const result = ArchitectureSkill.databaseSchemaCheck(schema);
      expect(result.findings.some((f) => f.id === "DB-003" && f.severity === "info")).toBe(true);
    });

    it("recognizes SQL PRIMARY KEY", () => {
      const schema = `CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255), created_at TIMESTAMP);`;
      const result = ArchitectureSkill.databaseSchemaCheck(schema);
      expect(result.findings.some((f) => f.id === "DB-001")).toBe(false);
    });
  });

  // ── scalabilityAssessment ───────────────────────────────────────────────

  describe("scalabilityAssessment", () => {
    it("passes for code with no scalability anti-patterns", () => {
      const code = `const pool = createPool({ max: 10 });`;
      const result = ArchitectureSkill.scalabilityAssessment(code);
      expect(result.passed).toBe(true);
    });

    it("warns about in-memory session storage", () => {
      const code = `app.use(session({ store: new MemoryStore() }));`;
      const result = ArchitectureSkill.scalabilityAssessment(code);
      expect(result.passed).toBe(false);
      expect(result.findings.some((f) => f.id === "SCALE-001")).toBe(true);
    });

    it("warns about local file storage for user data", () => {
      const code = `writeFileSync("./uploads/avatar.png", data);`;
      const result = ArchitectureSkill.scalabilityAssessment(code);
      expect(result.passed).toBe(false);
      expect(result.findings.some((f) => f.id === "SCALE-002")).toBe(true);
    });

    it("warns about database connections without pooling", () => {
      const code = `const client = new MongoClient(uri);\nawait client.connect();`;
      const result = ArchitectureSkill.scalabilityAssessment(code);
      expect(result.findings.some((f) => f.id === "SCALE-003")).toBe(true);
    });

    it("suggests Redis for session storage", () => {
      const code = `app.use(session({ store: new MemoryStore() }));`;
      const result = ArchitectureSkill.scalabilityAssessment(code);
      expect(
        result.findings[0].remediation.some((r) => r.includes("Redis")),
      ).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DeerflowSkillRegistry Tests
// ═══════════════════════════════════════════════════════════════════════════

describe("DeerflowSkillRegistry", () => {
  beforeEach(() => {
    DeerflowSkillRegistry.resetInstance();
  });

  // ── Singleton behavior ──────────────────────────────────────────────────

  describe("singleton", () => {
    it("getInstance returns the same instance on subsequent calls", () => {
      const a = DeerflowSkillRegistry.getInstance();
      const b = DeerflowSkillRegistry.getInstance();
      expect(a).toBe(b);
    });

    it("resetInstance allows a new instance to be created", () => {
      const first = DeerflowSkillRegistry.getInstance();
      DeerflowSkillRegistry.resetInstance();
      const second = DeerflowSkillRegistry.getInstance();
      expect(first).not.toBe(second);
    });

    it("getInstance re-registers built-in skills after reset", () => {
      DeerflowSkillRegistry.resetInstance();
      const registry = DeerflowSkillRegistry.getInstance();
      const names = registry.listSkills();
      expect(names).toContain("code-quality");
      expect(names).toContain("testing");
      expect(names).toContain("security");
      expect(names).toContain("architecture");
    });
  });

  // ── registerSkill ───────────────────────────────────────────────────────

  describe("registerSkill", () => {
    it("stores a skill with correct name, description, and version", () => {
      const registry = DeerflowSkillRegistry.getInstance();

      class DummySkill {
        static check() { return "ok"; }
      }

      registry.registerSkill("dummy", "A test skill", "2.0.0", DummySkill as never);
      const skill = registry.getSkill("dummy");

      expect(skill.name).toBe("dummy");
      expect(skill.description).toBe("A test skill");
      expect(skill.version).toBe("2.0.0");
    });

    it("throws when registering a skill with a duplicate name", () => {
      const registry = DeerflowSkillRegistry.getInstance();

      class SkillA { static run() {} }
      class SkillB { static run() {} }

      registry.registerSkill("dup", "first", "1.0.0", SkillA as never);
      expect(() => registry.registerSkill("dup", "second", "1.0.0", SkillB as never)).toThrow(
        /already registered/,
      );
    });

    it("extracts public method names from the skill class", () => {
      const registry = DeerflowSkillRegistry.getInstance();

      class MultiMethodSkill {
        static methodA() {}
        static methodB() {}
        static methodC() {}
      }

      registry.registerSkill("multi", "multi method skill", "1.0.0", MultiMethodSkill as never);
      const skill = registry.getSkill("multi");
      expect(skill.methods).toContain("methodA");
      expect(skill.methods).toContain("methodB");
      expect(skill.methods).toContain("methodC");
    });
  });

  // ── getSkill ────────────────────────────────────────────────────────────

  describe("getSkill", () => {
    it("retrieves a registered built-in skill", () => {
      const registry = DeerflowSkillRegistry.getInstance();
      const skill = registry.getSkill("code-quality");
      expect(skill.name).toBe("code-quality");
      expect(skill.version).toBe("1.0.0");
    });

    it("throws for a non-existent skill", () => {
      const registry = DeerflowSkillRegistry.getInstance();
      expect(() => registry.getSkill("nonexistent")).toThrow(/not found/);
    });

    it("includes available skill names in the error message", () => {
      const registry = DeerflowSkillRegistry.getInstance();
      try {
        registry.getSkill("missing");
        expect.unreachable("Should have thrown");
      } catch (err: unknown) {
        const message = (err as Error).message;
        expect(message).toContain("code-quality");
        expect(message).toContain("testing");
      }
    });

    it("returns a SkillDescriptor with methods array", () => {
      const registry = DeerflowSkillRegistry.getInstance();
      const skill = registry.getSkill("testing");
      expect(Array.isArray(skill.methods)).toBe(true);
      expect(skill.methods.length).toBeGreaterThan(0);
    });
  });

  // ── listSkills ──────────────────────────────────────────────────────────

  describe("listSkills", () => {
    it("returns all built-in skill names", () => {
      const registry = DeerflowSkillRegistry.getInstance();
      const names = registry.listSkills();
      expect(names).toContain("code-quality");
      expect(names).toContain("testing");
      expect(names).toContain("security");
      expect(names).toContain("architecture");
    });

    it("returns a readonly array", () => {
      const registry = DeerflowSkillRegistry.getInstance();
      const names = registry.listSkills();
      expect(Object.isFrozen(names)).toBe(false); // ReadonlyArray is not frozen at runtime
      expect(Array.isArray(names)).toBe(true);
    });

    it("includes newly registered skills", () => {
      const registry = DeerflowSkillRegistry.getInstance();

      class NewSkill { static exec() {} }
      registry.registerSkill("new-skill", "brand new", "1.0.0", NewSkill as never);

      const names = registry.listSkills();
      expect(names).toContain("new-skill");
    });
  });

  // ── validateAll ─────────────────────────────────────────────────────────

  describe("validateAll", () => {
    it("returns a validation result for each registered skill", () => {
      const registry = DeerflowSkillRegistry.getInstance();
      const results = registry.validateAll();
      const skillNames = registry.listSkills();
      expect(results.length).toBe(skillNames.length);
    });

    it("each result includes skillName, passed, and issues", () => {
      const registry = DeerflowSkillRegistry.getInstance();
      const results = registry.validateAll();
      for (const r of results) {
        expect(r).toHaveProperty("skillName");
        expect(r).toHaveProperty("passed");
        expect(r).toHaveProperty("issues");
        expect(Array.isArray(r.issues)).toBe(true);
      }
    });

    it("built-in skills all pass validation (have methods and no collisions)", () => {
      const registry = DeerflowSkillRegistry.getInstance();
      const results = registry.validateAll();
      expect(results.every((r) => r.passed)).toBe(true);
    });

    it("detects a skill with no public methods", () => {
      const registry = DeerflowSkillRegistry.getInstance();

      class EmptySkill {}
      registry.registerSkill("empty", "no methods", "1.0.0", EmptySkill as never);

      const results = registry.validateAll();
      const emptyResult = results.find((r) => r.skillName === "empty");
      expect(emptyResult!.passed).toBe(false);
      expect(emptyResult!.issues.some((i) => i.includes("no public methods"))).toBe(true);
    });

    it("detects method name collisions across skills", () => {
      const registry = DeerflowSkillRegistry.getInstance();

      class CollidingSkillA {
        static uniqueMethod() {}
        static shared() {}
      }
      class CollidingSkillB {
        static shared() {}
        static otherMethod() {}
      }

      registry.registerSkill("collide-a", "A", "1.0.0", CollidingSkillA as never);
      registry.registerSkill("collide-b", "B", "1.0.0", CollidingSkillB as never);

      const results = registry.validateAll();
      const resultB = results.find((r) => r.skillName === "collide-b");
      expect(resultB!.passed).toBe(false);
      expect(resultB!.issues.some((i) => i.includes("collides") && i.includes("shared"))).toBe(true);
    });
  });

  // ── getReport ───────────────────────────────────────────────────────────

  describe("getReport", () => {
    it("returns a report with all required fields", () => {
      const registry = DeerflowSkillRegistry.getInstance();
      const report = registry.getReport();

      expect(report).toHaveProperty("generatedAt");
      expect(report).toHaveProperty("totalSkills");
      expect(report).toHaveProperty("totalMethods");
      expect(report).toHaveProperty("skills");
      expect(report).toHaveProperty("validationResults");
      expect(report).toHaveProperty("status");
    });

    it("totalSkills matches the number of registered skills", () => {
      const registry = DeerflowSkillRegistry.getInstance();
      const report = registry.getReport();
      expect(report.totalSkills).toBe(registry.listSkills().length);
    });

    it("totalMethods is the sum of all skill method counts", () => {
      const registry = DeerflowSkillRegistry.getInstance();
      const report = registry.getReport();
      const expectedTotal = report.skills.reduce((sum, s) => sum + s.methods.length, 0);
      expect(report.totalMethods).toBe(expectedTotal);
    });

    it("generatedAt is a valid ISO 8601 timestamp", () => {
      const registry = DeerflowSkillRegistry.getInstance();
      const report = registry.getReport();
      expect(new Date(report.generatedAt).toISOString()).toBe(report.generatedAt);
    });

    it("status is 'healthy' when all validations pass", () => {
      const registry = DeerflowSkillRegistry.getInstance();
      const report = registry.getReport();
      expect(report.status).toBe("healthy");
    });

    it("status is 'degraded' when a validation fails", () => {
      const registry = DeerflowSkillRegistry.getInstance();

      class EmptySkill {}
      registry.registerSkill("bad-skill", "empty", "1.0.0", EmptySkill as never);

      const report = registry.getReport();
      expect(report.status).toBe("degraded");
    });

    it("includes all registered skills in the skills array", () => {
      const registry = DeerflowSkillRegistry.getInstance();
      const report = registry.getReport();
      const reportNames = report.skills.map((s) => s.name);
      for (const name of registry.listSkills()) {
        expect(reportNames).toContain(name);
      }
    });

    it("validationResults correspond to the registered skills", () => {
      const registry = DeerflowSkillRegistry.getInstance();
      const report = registry.getReport();
      const reportNames = report.validationResults.map((r) => r.skillName);
      for (const name of registry.listSkills()) {
        expect(reportNames).toContain(name);
      }
    });

    it("each skill descriptor includes skillClass reference", () => {
      const registry = DeerflowSkillRegistry.getInstance();
      const report = registry.getReport();
      for (const skill of report.skills) {
        expect(skill).toHaveProperty("skillClass");
        expect(typeof skill.skillClass).toBe("function");
      }
    });
  });
});
