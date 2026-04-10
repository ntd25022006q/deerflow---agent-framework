import { describe, it, expect, beforeEach } from "vitest";
import {
  DependencyResolver,
  type Package,
  type PackageRequest,
} from "./dependency-resolver";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMPTY_PACKAGE_JSON = {};

const SIMPLE_PACKAGE_JSON = {
  name: "test-project",
  dependencies: {
    react: "^18.2.0",
    "react-dom": "^18.2.0",
    next: "^14.0.0",
  },
  devDependencies: {
    typescript: "^5.3.0",
    vitest: "^1.0.0",
  },
};

const CONFLICTING_PACKAGE_JSON = {
  name: "conflict-project",
  dependencies: {
    react: "^19.0.0",
    "react-dom": "^17.0.0",
    tailwindcss: "^3.4.0",
    bootstrap: "^5.3.0",
  },
  devDependencies: {
    typescript: "^5.3.0",
  },
};

const DUPLICATE_STATE_PACKAGE_JSON = {
  name: "dup-project",
  dependencies: {
    moment: "^1.9.0",
    "date-fns": "^3.0.0",
    dayjs: "^1.11.0",
  },
  devDependencies: {},
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DependencyResolver", () => {
  let resolver: DependencyResolver;

  beforeEach(() => {
    resolver = new DependencyResolver();
  });

  // -----------------------------------------------------------------------
  // analyzeCurrentDependencies
  // -----------------------------------------------------------------------
  describe("analyzeCurrentDependencies", () => {
    it("returns zero packages for empty package.json", () => {
      const analysis = resolver.analyzeCurrentDependencies(EMPTY_PACKAGE_JSON);
      expect(analysis.totalPackages).toBe(0);
      expect(analysis.dependencies).toEqual([]);
      expect(analysis.devDependencies).toEqual([]);
      expect(analysis.peerDependencies).toEqual([]);
      expect(analysis.estimatedSizeKB).toBe(0);
    });

    it("counts dependencies and devDependencies correctly", () => {
      const analysis = resolver.analyzeCurrentDependencies(SIMPLE_PACKAGE_JSON);
      expect(analysis.totalPackages).toBe(5); // 3 deps + 2 devDeps
      expect(analysis.dependencies).toEqual(["react", "react-dom", "next"]);
      expect(analysis.devDependencies).toEqual(["typescript", "vitest"]);
    });

    it("categorizes known packages into categories", () => {
      const analysis = resolver.analyzeCurrentDependencies(SIMPLE_PACKAGE_JSON);
      // react, react-dom, next should be categorized
      expect(Object.keys(analysis.categories).length).toBeGreaterThan(0);
    });

    it("detects conflicts in conflicting package.json", () => {
      const analysis = resolver.analyzeCurrentDependencies(CONFLICTING_PACKAGE_JSON);
      // tailwindcss + bootstrap should be a WARNING conflict
      const issues = analysis.issues;
      expect(issues.length).toBeGreaterThan(0);
    });

    it("estimates bundle size based on package count", () => {
      const analysis = resolver.analyzeCurrentDependencies(SIMPLE_PACKAGE_JSON);
      // 5 packages × 150KB = 750KB
      expect(analysis.estimatedSizeKB).toBe(5 * 150);
    });
  });

  // -----------------------------------------------------------------------
  // checkCompatibility
  // -----------------------------------------------------------------------
  describe("checkCompatibility", () => {
    it("returns compatible=true when no conflicts exist", () => {
      resolver.analyzeCurrentDependencies(SIMPLE_PACKAGE_JSON);
      const result = resolver.checkCompatibility({
        name: "zod",
        version: "^3.22.0",
        reason: "Schema validation",
        isDev: false,
      });
      expect(result.compatible).toBe(true);
      expect(result.conflicts).toEqual([]);
    });

    it("detects tailwindcss + bootstrap conflict", () => {
      resolver.analyzeCurrentDependencies({
        dependencies: { tailwindcss: "^3.4.0" },
        devDependencies: {},
      });
      const result = resolver.checkCompatibility({
        name: "bootstrap",
        version: "^5.3.0",
        reason: "UI framework",
        isDev: false,
      });
      // tailwindcss + bootstrap is a WARNING → not a blocker
      expect(result.conflicts.length).toBeGreaterThan(0);
    });

    it("detects React version mismatch for react-router-dom", () => {
      resolver.analyzeCurrentDependencies({
        dependencies: { react: "^17.0.0" },
        devDependencies: {},
      });
      const result = resolver.checkCompatibility({
        name: "react-router-dom",
        version: "^6.20.0",
        reason: "Client routing",
        isDev: false,
      });
      // react-router-dom requires React 18+, but we have 17
      expect(result.compatible).toBe(false);
      expect(
        result.conflicts.some((c) => c.isBlocker),
      ).toBe(true);
    });

    it("warns about duplicate functionality (moment + date-fns scenario)", () => {
      resolver.analyzeCurrentDependencies({
        dependencies: { moment: "^1.9.0" },
        devDependencies: {},
      });
      const result = resolver.checkCompatibility({
        name: "date-fns",
        version: "^3.0.0",
        reason: "Date utilities",
        isDev: false,
      });
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("returns warnings array and recommendations", () => {
      resolver.analyzeCurrentDependencies(SIMPLE_PACKAGE_JSON);
      const result = resolver.checkCompatibility({
        name: "lodash",
        version: "^4.17.0",
        reason: "Utility functions",
        isDev: false,
      });
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // resolveConflicts
  // -----------------------------------------------------------------------
  describe("resolveConflicts", () => {
    it("returns empty array for no conflicts", () => {
      const result = resolver.resolveConflicts([]);
      expect(result).toEqual([]);
    });

    it("provides resolution for each conflict", () => {
      const conflicts = [
        {
          description: "Test conflict",
          packages: ["pkg-a", "pkg-b"],
          severity: "ERROR" as const,
          suggestedResolutions: ["Remove pkg-b"],
          isBlocker: true,
        },
        {
          description: "Warning conflict",
          packages: ["pkg-c", "pkg-d"],
          severity: "WARNING" as const,
          suggestedResolutions: ["Choose one"],
          isBlocker: false,
        },
      ];
      const result = resolver.resolveConflicts(conflicts);
      expect(result).toHaveLength(2);
      expect(result[0].resolution).toBe("Remove pkg-b");
      expect(result[1].resolution).toBe("Choose one");
    });

    it("sets higher confidence for single-resolution conflicts", () => {
      const conflicts = [
        {
          description: "Conflict with one resolution",
          packages: ["a", "b"],
          severity: "ERROR" as const,
          suggestedResolutions: ["Fix it"],
          isBlocker: true,
        },
        {
          description: "Conflict with two resolutions",
          packages: ["c", "d"],
          severity: "WARNING" as const,
          suggestedResolutions: ["Fix 1", "Fix 2"],
          isBlocker: false,
        },
      ];
      const result = resolver.resolveConflicts(conflicts);
      expect(result[0].confidence).toBeGreaterThan(result[1].confidence);
    });

    it("includes packagesToRemove for ERROR severity when package is in current", () => {
      resolver.analyzeCurrentDependencies({
        dependencies: { tailwindcss: "^3.4.0" },
        devDependencies: {},
      });
      const conflicts = [
        {
          description: "CSS framework conflict",
          packages: ["tailwindcss", "bootstrap"],
          severity: "ERROR" as const,
          suggestedResolutions: ["Remove one"],
          isBlocker: true,
        },
      ];
      const result = resolver.resolveConflicts(conflicts);
      expect(result[0].packagesToRemove).toContain("tailwindcss");
    });
  });

  // -----------------------------------------------------------------------
  // detectDuplicateFunctionality
  // -----------------------------------------------------------------------
  describe("detectDuplicateFunctionality", () => {
    it("returns empty array when no overlap exists", () => {
      const existing: Package[] = [
        { name: "react", version: "^18.2.0", type: "dependency", purpose: "UI", categories: ["react-ecosystem"] },
      ];
      const requested: Package = {
        name: "axios",
        version: "^1.6.0",
        type: "dependency",
        purpose: "HTTP client",
        categories: ["http-client", "api"],
      };
      const result = resolver.detectDuplicateFunctionality(existing, requested);
      expect(result).toEqual([]);
    });

    it("detects overlap between date libraries", () => {
      const existing: Package[] = [
        { name: "moment", version: "^1.9.0", type: "dependency", purpose: "Dates", categories: ["date", "time", "formatting"] },
      ];
      const requested: Package = {
        name: "date-fns",
        version: "^3.0.0",
        type: "dependency",
        purpose: "Dates",
        categories: ["date", "time", "formatting"],
      };
      const result = resolver.detectDuplicateFunctionality(existing, requested);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].existing.name).toBe("moment");
      expect(result[0].overlapScore).toBeGreaterThanOrEqual(0.3);
    });

    it("sorts results by overlapScore descending", () => {
      const existing: Package[] = [
        { name: "moment", version: "^1.9.0", type: "dependency", purpose: "Dates", categories: ["date", "time"] },
        { name: "dayjs", version: "^1.11.0", type: "dependency", purpose: "Dates", categories: ["date", "time", "formatting"] },
      ];
      const requested: Package = {
        name: "date-fns",
        version: "^3.0.0",
        type: "dependency",
        purpose: "Dates",
        categories: ["date", "time", "formatting"],
      };
      const result = resolver.detectDuplicateFunctionality(existing, requested);
      if (result.length >= 2) {
        expect(result[0].overlapScore).toBeGreaterThanOrEqual(
          result[1].overlapScore,
        );
      }
    });

    it("filters out packages with overlapScore below 0.3", () => {
      const existing: Package[] = [
        { name: "react", version: "^18.2.0", type: "dependency", purpose: "UI", categories: ["ui-framework"] },
      ];
      const requested: Package = {
        name: "next",
        version: "^14.0.0",
        type: "dependency",
        purpose: "Framework",
        categories: ["framework", "ssr"],
      };
      const result = resolver.detectDuplicateFunctionality(existing, requested);
      // No shared categories → empty result
      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // checkPeerDependencyRequirements
  // -----------------------------------------------------------------------
  describe("checkPeerDependencyRequirements", () => {
    it("returns empty array when packages are not in current set", () => {
      const packages: Package[] = [
        { name: "unknown-pkg", version: "^1.0.0", type: "dependency", purpose: "test", categories: [] },
      ];
      const result = resolver.checkPeerDependencyRequirements(packages);
      expect(result).toEqual([]);
    });

    it("checks peer deps for packages in the current set", () => {
      resolver.analyzeCurrentDependencies({
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          "eslint-plugin-react": "^4.2.0",
        },
        devDependencies: {
          eslint: "^8.50.0",
        },
      });
      const packages: Package[] = [
        { name: "eslint-plugin-react", version: "^4.2.0", type: "devDependency", purpose: "Lint", categories: ["linting"] },
      ];
      const result = resolver.checkPeerDependencyRequirements(packages);
      expect(result.length).toBeGreaterThan(0);
      // eslint-plugin-react requires eslint >=8.0.0, and we have it
      expect(result[0].satisfied).toBe(true);
    });

    it("reports unsatisfied peer dependencies", () => {
      resolver.analyzeCurrentDependencies({
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          "eslint-plugin-react": "^4.2.0",
        },
        devDependencies: {
          eslint: "^7.0.0", // Too old for eslint-plugin-react which needs >=8.0.0
        },
      });
      const packages: Package[] = [
        { name: "eslint-plugin-react", version: "^4.2.0", type: "devDependency", purpose: "Lint", categories: [] },
      ];
      const result = resolver.checkPeerDependencyRequirements(packages);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].satisfied).toBe(false);
    });

    it("returns correct shape for each result entry", () => {
      resolver.analyzeCurrentDependencies({
        dependencies: { react: "^18.2.0", "react-router-dom": "^6.20.0" },
        devDependencies: {},
      });
      const packages: Package[] = [
        { name: "react-router-dom", version: "^6.20.0", type: "dependency", purpose: "Routing", categories: [] },
      ];
      const result = resolver.checkPeerDependencyRequirements(packages);
      for (const entry of result) {
        expect(entry).toHaveProperty("package");
        expect(entry).toHaveProperty("peerDependency");
        expect(entry).toHaveProperty("requiredRange");
        expect(entry).toHaveProperty("found");
        expect(entry).toHaveProperty("satisfied");
      }
    });
  });

  // -----------------------------------------------------------------------
  // recommendAlternative
  // -----------------------------------------------------------------------
  describe("recommendAlternative", () => {
    it("returns alternatives sorted by compatibility score", () => {
      resolver.analyzeCurrentDependencies(SIMPLE_PACKAGE_JSON);
      const incompatible: Package = {
        name: "moment",
        version: "^1.9.0",
        type: "dependency",
        purpose: "Date library",
        categories: ["date", "time", "formatting"],
      };
      const result = resolver.recommendAlternative(incompatible, "date utilities");
      expect(result.length).toBeGreaterThan(0);
      // Should be sorted by compatibilityScore descending
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].compatibilityScore).toBeGreaterThanOrEqual(
          result[i].compatibilityScore,
        );
      }
    });

    it("excludes the original package from alternatives", () => {
      resolver.analyzeCurrentDependencies(EMPTY_PACKAGE_JSON);
      const incompatible: Package = {
        name: "moment",
        version: "^1.9.0",
        type: "dependency",
        purpose: "Date library",
        categories: ["date", "time", "formatting"],
      };
      const result = resolver.recommendAlternative(incompatible, "dates");
      const names = result.map((r) => r.alternative);
      expect(names).not.toContain("moment");
    });

    it("includes dayjs and luxon as alternatives to moment (date-fns is a known conflict partner)", () => {
      resolver.analyzeCurrentDependencies(EMPTY_PACKAGE_JSON);
      const incompatible: Package = {
        name: "moment",
        version: "^1.9.0",
        type: "dependency",
        purpose: "Date library",
        categories: ["date", "time", "formatting"],
      };
      const result = resolver.recommendAlternative(incompatible, "dates");
      const names = result.map((r) => r.alternative);
      // date-fns is excluded because it's a known conflict partner of moment in KNOWN_CONFLICTS
      expect(names).not.toContain("date-fns");
      expect(names).toContain("dayjs");
      expect(names).toContain("luxon");
    });

    it("returns empty array for package with no known categories", () => {
      resolver.analyzeCurrentDependencies(EMPTY_PACKAGE_JSON);
      const incompatible: Package = {
        name: "totally-unknown-pkg",
        version: "^1.0.0",
        type: "dependency",
        purpose: "Unknown",
        categories: [],
      };
      const result = resolver.recommendAlternative(incompatible, "something");
      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // validateReactCompatibility
  // -----------------------------------------------------------------------
  describe("validateReactCompatibility", () => {
    it("returns compatible=true for package without React requirements", () => {
      const result = resolver.validateReactCompatibility("lodash", "18.2.0");
      expect(result.compatible).toBe(true);
      expect(result.minRequired).toBe("unknown");
    });

    it("returns compatible=true for react-router-dom with React 18", () => {
      const result = resolver.validateReactCompatibility(
        "react-router-dom",
        "18.2.0",
      );
      expect(result.compatible).toBe(true);
    });

    it("returns compatible=false for react-router-dom with React 17", () => {
      const result = resolver.validateReactCompatibility(
        "react-router-dom",
        "17.0.2",
      );
      expect(result.compatible).toBe(false);
      expect(result.minRequired).toBe("18.0.0");
    });

    it("returns compatible=false for next (requires 18.2+) with React 18.0", () => {
      const result = resolver.validateReactCompatibility("next", "18.0.0");
      expect(result.compatible).toBe(false);
      expect(result.minRequired).toBe("18.2.0");
    });

    it("returns compatible=true for next with React 18.2+", () => {
      const result = resolver.validateReactCompatibility("next", "18.2.0");
      expect(result.compatible).toBe(true);
    });

    it("includes notes when incompatible", () => {
      const result = resolver.validateReactCompatibility(
        "react-router-dom",
        "17.0.0",
      );
      expect(result.notes.length).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // validateStylingSolutionConflicts
  // -----------------------------------------------------------------------
  describe("validateStylingSolutionConflicts", () => {
    it("returns no conflict for non-styling package", () => {
      const result = resolver.validateStylingSolutionConflicts(
        ["react", "next"],
        "axios",
      );
      expect(result.hasConflict).toBe(false);
    });

    it("detects same-group conflict (two CSS frameworks)", () => {
      const result = resolver.validateStylingSolutionConflicts(
        ["tailwindcss"],
        "bootstrap",
      );
      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe("SAME_GROUP");
    });

    it("detects tailwindcss + bootstrap same-group conflict via known conflict DB", () => {
      // tailwindcss + bootstrap is a known WARNING conflict in KNOWN_CONFLICTS.
      // Both are CSS Frameworks (same group) AND have a known conflict entry.
      const result = resolver.validateStylingSolutionConflicts(
        ["tailwindcss"],
        "bootstrap",
      );
      // Same group detection triggers first
      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe("SAME_GROUP");
    });

    it("returns no conflict for first styling package", () => {
      const result = resolver.validateStylingSolutionConflicts(
        [],
        "tailwindcss",
      );
      expect(result.hasConflict).toBe(false);
    });

    it("includes recommendation when conflict detected", () => {
      const result = resolver.validateStylingSolutionConflicts(
        ["tailwindcss"],
        "bootstrap",
      );
      expect(result.recommendation.length).toBeGreaterThan(0);
    });

    it("recognizes tailwindcss and bulma as same CSS framework group", () => {
      const result = resolver.validateStylingSolutionConflicts(
        ["tailwindcss"],
        "bulma",
      );
      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe("SAME_GROUP");
    });
  });

  // -----------------------------------------------------------------------
  // generateDependencyReport
  // -----------------------------------------------------------------------
  describe("generateDependencyReport", () => {
    it("returns report with zero packages when no dependencies analyzed", () => {
      const report = resolver.generateDependencyReport();
      expect(report.analysis.totalPackages).toBe(0);
      expect(report.analysis.dependencies).toEqual([]);
      expect(report.conflicts).toEqual([]);
      expect(report.duplicates).toEqual([]);
      expect(report.riskScore).toBe(0);
    });

    it("detects duplicate categories", () => {
      resolver.analyzeCurrentDependencies(DUPLICATE_STATE_PACKAGE_JSON);
      const report = resolver.generateDependencyReport();
      expect(report.duplicates.length).toBeGreaterThan(0);
      // moment, date-fns, dayjs share "date" category
      const dateDup = report.duplicates.find((d) =>
        d.packages.includes("moment"),
      );
      expect(dateDup).toBeDefined();
      expect(dateDup!.packages).toContain("date-fns");
      expect(dateDup!.packages).toContain("dayjs");
    });

    it("calculates risk score based on conflicts and duplicates", () => {
      resolver.analyzeCurrentDependencies(CONFLICTING_PACKAGE_JSON);
      const report = resolver.generateDependencyReport();
      // Has tailwindcss+bootstrap (WARNING) and react19+react-dom17 (ERROR)
      expect(report.riskScore).toBeGreaterThan(0);
    });

    it("generates recommendations for duplicate packages", () => {
      resolver.analyzeCurrentDependencies(DUPLICATE_STATE_PACKAGE_JSON);
      const report = resolver.generateDependencyReport();
      expect(report.recommendations.length).toBeGreaterThan(0);
      const hasConsolidation = report.recommendations.some((r) =>
        r.includes("Consolidate"),
      );
      expect(hasConsolidation).toBe(true);
    });

    it("includes generatedAt timestamp", () => {
      resolver.analyzeCurrentDependencies(SIMPLE_PACKAGE_JSON);
      const report = resolver.generateDependencyReport();
      expect(report.generatedAt).toBeTruthy();
      expect(new Date(report.generatedAt).getTime()).not.toBeNaN();
    });

    it("includes conflict details with correct severity", () => {
      resolver.analyzeCurrentDependencies(CONFLICTING_PACKAGE_JSON);
      const report = resolver.generateDependencyReport();
      const errorConflicts = report.conflicts.filter(
        (c) => c.severity === "ERROR",
      );
      // react 19 + react-dom 17 is an ERROR
      expect(errorConflicts.length).toBeGreaterThanOrEqual(1);
    });
  });
});
