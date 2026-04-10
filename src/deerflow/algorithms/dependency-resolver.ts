/**
 * @framework Deerflow v1.0.0
 * @license MIT
 *
 * Dependency Resolver Algorithm
 *
 * Resolve dependency conflicts BEFORE installation — prevent screen flicker
 * and broken builds. This algorithm analyzes package compatibility, detects
 * duplicate functionality, and validates peer dependencies before any
 * packages are added to a project.
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** Represents an npm package with its metadata. */
export interface Package {
  /** npm package name. */
  name: string;
  /** Version string (semver). */
  version: string;
  /** Package type classification. */
  type: "dependency" | "devDependency" | "peerDependency";
  /** Brief description of what the package provides. */
  purpose: string;
  /** List of categories this package belongs to. */
  categories: string[];
}

/** A request to add a new package to the project. */
export interface PackageRequest {
  /** Package name to add. */
  name: string;
  /** Requested version (can be semver range). */
  version: string;
  /** Why this package is being requested. */
  reason: string;
  /** Whether this is a dev dependency. */
  isDev: boolean;
}

/** Describes a conflict between two or more packages. */
export interface DependencyConflict {
  /** Human-readable description of the conflict. */
  description: string;
  /** Packages involved in the conflict. */
  packages: string[];
  /** Severity of the conflict. */
  severity: "ERROR" | "WARNING" | "INFO";
  /** Suggested resolution approaches. */
  suggestedResolutions: string[];
  /** Whether this conflict is a hard blocker for installation. */
  isBlocker: boolean;
}

/** Result of a compatibility check between packages. */
export interface CompatibilityResult {
  /** Whether the checked package is compatible with the existing setup. */
  compatible: boolean;
  /** List of conflicts found (empty if compatible). */
  conflicts: DependencyConflict[];
  /** Warnings that don't block installation but should be noted. */
  warnings: string[];
  /** Recommended actions to ensure compatibility. */
  recommendations: string[];
}

/** Analysis of the current dependency state of a project. */
export interface DependencyAnalysis {
  /** Total number of dependencies. */
  totalPackages: number;
  /** Direct production dependencies. */
  dependencies: string[];
  /** Development dependencies. */
  devDependencies: string[];
  /** Peer dependencies. */
  peerDependencies: string[];
  /** Detected categorization of dependency types. */
  categories: Record<string, string[]>;
  /** Potential issues found in the current dependency tree. */
  issues: DependencyConflict[];
  /** Total estimated bundle size impact. */
  estimatedSizeKB: number;
}

/** Alternative package recommendation. */
export interface AlternativeRecommendation {
  /** The original incompatible package. */
  originalPackage: string;
  /** The recommended alternative package. */
  alternative: string;
  /** Why this alternative was recommended. */
  reason: string;
  /** Expected compatibility rating (0–1). */
  compatibilityScore: number;
  /** Whether this alternative provides the same functionality. */
  functionalityMatch: number;
}

/** A comprehensive dependency report. */
export interface DependencyReport {
  /** Current dependency analysis. */
  analysis: DependencyAnalysis;
  /** All detected conflicts. */
  conflicts: DependencyConflict[];
  /** Duplicate functionality detected. */
  duplicates: Array<{ category: string; packages: string[] }>;
  /** Recommendations for improving the dependency tree. */
  recommendations: string[];
  /** Risk score for the current dependency setup (0 = safe, 1 = risky). */
  riskScore: number;
  /** ISO 8601 timestamp of report generation. */
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Known Conflict Database
// ---------------------------------------------------------------------------

/**
 * Hardcoded database of known package conflicts.
 *
 * In production this would be loaded from a maintained JSON/JSONB file
 * and updated periodically from community reports.
 */
const KNOWN_CONFLICTS: Array<{
  packageA: string;
  versionRangeA: string;
  packageB: string;
  versionRangeB: string;
  description: string;
  severity: DependencyConflict["severity"];
  resolution: string;
}> = [
  // React version conflicts
  {
    packageA: "react",
    versionRangeA: ">=19.0.0",
    packageB: "react-dom",
    versionRangeB: "<18.0.0",
    description: "React 19 requires react-dom 19+. Using older react-dom will cause hydration errors and SSR failures.",
    severity: "ERROR",
    resolution: "Upgrade react-dom to version 19+ to match React 19.",
  },
  {
    packageA: "react",
    versionRangeA: ">=18.0.0",
    packageB: "react-dom",
    versionRangeB: "<18.0.0",
    description: "React 18 requires react-dom 18+. Version mismatch causes createRoot errors.",
    severity: "ERROR",
    resolution: "Upgrade react-dom to version 18+ to match React 18.",
  },
  // CSS framework conflicts
  {
    packageA: "tailwindcss",
    versionRangeA: "*",
    packageB: "bootstrap",
    versionRangeB: "*",
    description: "Tailwind CSS and Bootstrap both apply base styles to HTML elements, causing unpredictable overrides and visual conflicts.",
    severity: "WARNING",
    resolution: "Choose one CSS framework. If using Tailwind, remove Bootstrap. Use Tailwind's @apply or utility classes for custom styles.",
  },
  {
    packageA: "tailwindcss",
    versionRangeA: "*",
    packageB: "styled-components",
    versionRangeB: "*",
    description: "Mixing Tailwind utility classes with styled-components can cause specificity conflicts and screen flicker during hydration.",
    severity: "WARNING",
    resolution: "Use one styling approach consistently. If mixing is necessary, ensure CSS specificity is managed carefully.",
  },
  {
    packageA: "bootstrap",
    versionRangeA: "*",
    packageB: "material-ui",
    versionRangeB: "*",
    description: "Bootstrap and Material UI both define their own component libraries with conflicting base styles.",
    severity: "ERROR",
    resolution: "Choose one UI component library. Using both causes severe styling conflicts and bloated bundle size.",
  },
  // State management conflicts
  {
    packageA: "zustand",
    versionRangeA: "*",
    packageB: "redux",
    versionRangeB: "*",
    description: "Using multiple state management solutions increases complexity and bundle size without benefit.",
    severity: "WARNING",
    resolution: "Choose one state management solution. Zustand is lighter; Redux has a larger ecosystem.",
  },
  {
    packageA: "@reduxjs/toolkit",
    versionRangeA: "*",
    packageB: "mobx",
    versionRangeB: "*",
    description: "Redux Toolkit and MobX use fundamentally different state management paradigms. Combining them causes confusion and potential state sync issues.",
    severity: "WARNING",
    resolution: "Choose one state management paradigm. Redux (immutability) or MobX (reactivity).",
  },
  // Router conflicts
  {
    packageA: "next",
    versionRangeA: ">=13.0.0",
    packageB: "react-router-dom",
    versionRangeB: ">=6.0.0",
    description: "Next.js 13+ has a built-in App Router. Using react-router-dom alongside it causes routing conflicts and unnecessary complexity.",
    severity: "WARNING",
    resolution: "Use Next.js built-in routing. Remove react-router-dom if using Next.js App Router.",
  },
  // Deprecated packages
  {
    packageA: "moment",
    versionRangeA: "*",
    packageB: "date-fns",
    versionRangeB: "*",
    description: "Moment.js is deprecated and adds ~300KB to bundle. date-fns is tree-shakeable and actively maintained.",
    severity: "INFO",
    resolution: "Replace moment with date-fns or dayjs for a smaller, modern date library.",
  },
];

/**
 * Map of packages to their functional categories for duplicate detection.
 */
const PACKAGE_CATEGORIES: Record<string, string[]> = {
  // Date libraries
  "moment": ["date", "time", "formatting"],
  "date-fns": ["date", "time", "formatting"],
  "dayjs": ["date", "time", "formatting"],
  "luxon": ["date", "time", "formatting"],
  // CSS frameworks
  "tailwindcss": ["css-framework", "styling", "utility-css"],
  "bootstrap": ["css-framework", "styling", "component-library"],
  "styled-components": ["css-in-js", "styling"],
  "emotion": ["css-in-js", "styling"],
  "@emotion/styled": ["css-in-js", "styling"],
  "sass": ["css-preprocessor", "styling"],
  "less": ["css-preprocessor", "styling"],
  // State management
  "redux": ["state-management", "global-state"],
  "@reduxjs/toolkit": ["state-management", "global-state"],
  "zustand": ["state-management", "global-state"],
  "mobx": ["state-management", "reactive-state"],
  "jotai": ["state-management", "atomic-state"],
  "recoil": ["state-management", "atomic-state"],
  // HTTP clients
  "axios": ["http-client", "api"],
  "fetch": ["http-client", "api"],
  "ky": ["http-client", "api"],
  "got": ["http-client", "api"],
  // Form libraries
  "react-hook-form": ["forms", "validation"],
  "formik": ["forms", "validation"],
  // UI component libraries
  "material-ui": ["component-library", "ui-components"],
  "@mui/material": ["component-library", "ui-components"],
  "@radix-ui/react-*": ["component-library", "ui-components", "headless"],
  "shadcn/ui": ["component-library", "ui-components", "headless"],
  "@headlessui/react": ["component-library", "ui-components", "headless"],
  // Animation
  "framer-motion": ["animation"],
  "react-spring": ["animation"],
  "gsap": ["animation"],
};

/** React version compatibility requirements for common packages. */
const REACT_COMPATIBILITY: Record<string, { minReact: string; notes: string }[]> = {
  "react-router-dom": [
    { minReact: "18.0.0", notes: "v6+ requires React 18 for concurrent features." },
  ],
  "@tanstack/react-query": [
    { minReact: "18.0.0", notes: "v5+ requires React 18." },
  ],
  "framer-motion": [
    { minReact: "18.0.0", notes: "v11+ leverages React 18 concurrent features." },
  ],
  "react-hook-form": [
    { minReact: "18.0.0", notes: "v7.40+ requires React 18." },
  ],
  "@mui/material": [
    { minReact: "18.0.0", notes: "v5+ requires React 18." },
  ],
  "next": [
    { minReact: "18.2.0", notes: "Next.js 13+ requires React 18.2+." },
  ],
  "zustand": [
    { minReact: "18.0.0", notes: "v4+ requires React 18." },
  ],
  "recoil": [
    { minReact: "18.0.0", notes: "Recoil requires React 18." },
  ],
};

// ---------------------------------------------------------------------------
// DependencyResolver
// ---------------------------------------------------------------------------

/**
 * Analyzes and resolves dependency conflicts before installation.
 *
 * This algorithm prevents common mistakes like:
 *  - Installing two CSS frameworks (Tailwind + Bootstrap)
 *  - Using React 19 packages with React 18
 *  - Adding packages with overlapping functionality
 *  - Ignoring peer dependency requirements
 */
export class DependencyResolver {
  /** Current project dependencies (populated via analyzeCurrentDependencies). */
  private currentPackages: Map<string, Package> = new Map();

  /** Known conflicts loaded into memory for fast lookup. */
  private conflicts: typeof KNOWN_CONFLICTS;

  constructor() {
    this.conflicts = [...KNOWN_CONFLICTS];
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Analyze the current project dependencies from a package.json.
   *
   * @param packageJson - The parsed package.json object.
   * @returns Comprehensive dependency analysis.
   */
  analyzeCurrentDependencies(packageJson: object): DependencyAnalysis {
    const pkg = packageJson as Record<string, Record<string, string>>;

    const dependencies = pkg.dependencies ? Object.keys(pkg.dependencies) : [];
    const devDependencies = pkg.devDependencies ? Object.keys(pkg.devDependencies) : [];
    const peerDependencies = pkg.peerDependencies ? Object.keys(pkg.peerDependencies) : [];

    // Build internal package map
    this.currentPackages.clear();

    for (const name of dependencies) {
      this.currentPackages.set(name, {
        name,
        version: pkg.dependencies[name],
        type: "dependency",
        purpose: this.inferPackagePurpose(name),
        categories: PACKAGE_CATEGORIES[name] ?? [],
      });
    }
    for (const name of devDependencies) {
      this.currentPackages.set(name, {
        name,
        version: pkg.devDependencies[name],
        type: "devDependency",
        purpose: this.inferPackagePurpose(name),
        categories: PACKAGE_CATEGORIES[name] ?? [],
      });
    }
    for (const name of peerDependencies) {
      this.currentPackages.set(name, {
        name,
        version: pkg.peerDependencies[name],
        type: "peerDependency",
        purpose: this.inferPackagePurpose(name),
        categories: PACKAGE_CATEGORIES[name] ?? [],
      });
    }

    // Detect issues in current setup
    const issues = this.detectCurrentIssues();

    // Categorize packages
    const categories: Record<string, string[]> = {};
    for (const [name, pkg] of this.currentPackages) {
      const cats = pkg.categories.length > 0 ? pkg.categories : ["uncategorized"];
      for (const cat of cats) {
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(name);
      }
    }

    // Estimate size (rough heuristic)
    const estimatedSizeKB = this.currentPackages.size * 150; // ~150KB average per package

    return {
      totalPackages: this.currentPackages.size,
      dependencies,
      devDependencies,
      peerDependencies,
      categories,
      issues,
      estimatedSizeKB,
    };
  }

  /**
   * Check if a new package is compatible with the current dependencies.
   *
   * @param newPackage - The package request to evaluate.
   * @returns Compatibility result with conflicts and recommendations.
   */
  checkCompatibility(newPackage: PackageRequest): CompatibilityResult {
    const conflicts: DependencyConflict[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check against known conflict database
    for (const conflict of this.conflicts) {
      const matchesA =
        conflict.packageA === newPackage.name ||
        conflict.packageA === "*" ||
        this.packageMatchesAny(conflict.packageA, newPackage.name);
      const matchesB = this.currentPackages.has(conflict.packageB);

      const matchesBAlt =
        conflict.packageB === newPackage.name ||
        conflict.packageB === "*" ||
        this.packageMatchesAny(conflict.packageB, newPackage.name);
      const matchesAAlt = this.currentPackages.has(conflict.packageA);

      if ((matchesA && matchesB) || (matchesBAlt && matchesAAlt)) {
        conflicts.push({
          description: conflict.description,
          packages: [conflict.packageA, conflict.packageB],
          severity: conflict.severity,
          suggestedResolutions: [conflict.resolution],
          isBlocker: conflict.severity === "ERROR",
        });
      }
    }

    // Check for duplicate functionality
    const requestedCategories = PACKAGE_CATEGORIES[newPackage.name] ?? [];
    if (requestedCategories.length > 0) {
      for (const [existingName, existingPkg] of this.currentPackages) {
        const existingCategories = existingPkg.categories;
        const overlap = requestedCategories.filter((c) =>
          existingCategories.includes(c),
        );
        if (overlap.length > 0 && overlap.length >= requestedCategories.length * 0.5) {
          warnings.push(
            `"${newPackage.name}" may overlap with existing package "${existingName}" (shared categories: ${overlap.join(", ")}).`,
          );
          recommendations.push(
            `Consider whether "${newPackage.name}" is truly needed alongside "${existingName}".`,
          );
        }
      }
    }

    // Check React compatibility if React is a dependency
    if (this.currentPackages.has("react")) {
      const reactPkg = this.currentPackages.get("react")!;
      const reactCompat = REACT_COMPATIBILITY[newPackage.name];
      if (reactCompat) {
        const reactVersion = this.parseSemver(reactPkg.version);
        for (const requirement of reactCompat) {
          const minVersion = this.parseSemver(requirement.minReact);
          if (this.compareVersions(reactVersion, minVersion) < 0) {
            conflicts.push({
              description: `${newPackage.name} requires React ${requirement.minReact}+, but project has React ${reactPkg.version}. ${requirement.notes}`,
              packages: [newPackage.name, "react"],
              severity: "ERROR",
              suggestedResolutions: [
                `Upgrade React to ${requirement.minReact}+ to use ${newPackage.name}.`,
                `Use an older version of ${newPackage.name} that supports React ${reactPkg.version}.`,
              ],
              isBlocker: true,
            });
          }
        }
      }
    }

    return {
      compatible: conflicts.filter((c) => c.isBlocker).length === 0,
      conflicts,
      warnings,
      recommendations,
    };
  }

  /**
   * Resolve a list of detected dependency conflicts.
   *
   * @param conflicts - The conflicts to resolve.
   * @returns Array of suggested resolutions ranked by effectiveness.
   */
  resolveConflicts(
    conflicts: DependencyConflict[],
  ): Array<{
    conflict: DependencyConflict;
    resolution: string;
    packagesToRemove: string[];
    packagesToAdd: Array<{ name: string; version: string }>;
    confidence: number;
  }> {
    return conflicts.map((conflict) => {
      const resolution = conflict.suggestedResolutions[0] ?? "Manual resolution required.";
      const packagesToRemove = conflict.severity === "ERROR"
        ? conflict.packages.filter((p) => this.currentPackages.has(p))
        : [];

      return {
        conflict,
        resolution,
        packagesToRemove,
        packagesToAdd: [],
        confidence: conflict.suggestedResolutions.length > 1 ? 0.6 : 0.8,
      };
    });
  }

  /**
   * Detect if a requested package duplicates functionality already provided.
   *
   * @param existing  - Currently installed packages.
   * @param requested - The package being requested.
   * @returns Array of existing packages that provide similar functionality.
   */
  detectDuplicateFunctionality(
    existing: Package[],
    requested: Package,
  ): Array<{ existing: Package; overlapScore: number; sharedCategories: string[] }> {
    const results: Array<{ existing: Package; overlapScore: number; sharedCategories: string[] }> = [];

    const requestedCategories = new Set(requested.categories);

    for (const pkg of existing) {
      const existingCategories = new Set(pkg.categories);
      const shared = [...requestedCategories].filter((c) => existingCategories.has(c));

      if (shared.length > 0) {
        const overlapScore = shared.length / Math.max(requestedCategories.size, existingCategories.size);
        if (overlapScore >= 0.3) {
          results.push({
            existing: pkg,
            overlapScore: Math.round(overlapScore * 100) / 100,
            sharedCategories: shared,
          });
        }
      }
    }

    return results.sort((a, b) => b.overlapScore - a.overlapScore);
  }

  /**
   * Validate peer dependency requirements for a set of packages.
   *
   * @param packages - Packages to validate peer dependencies for.
   * @returns List of unmet peer dependency requirements.
   */
  checkPeerDependencyRequirements(
    packages: Package[],
  ): Array<{
    package: string;
    peerDependency: string;
    requiredRange: string;
    found: string;
    satisfied: boolean;
  }> {
    const results: Array<{
      package: string;
      peerDependency: string;
      requiredRange: string;
      found: string;
      satisfied: boolean;
    }> = [];

    // Cross-reference each package's peer deps against the installed set
    for (const pkg of packages) {
      const existingVersion = this.currentPackages.get(pkg.name)?.version;

      if (existingVersion) {
        // In production this would read the package's peerDependencies from npm
        const knownPeerReqs = this.getKnownPeerRequirements(pkg.name);

        for (const req of knownPeerReqs) {
          const installedVersion = this.currentPackages.get(req.name)?.version ?? "not installed";
          const satisfied = installedVersion !== "not installed" &&
            this.satisfiesRange(installedVersion, req.range);

          results.push({
            package: pkg.name,
            peerDependency: req.name,
            requiredRange: req.range,
            found: installedVersion,
            satisfied,
          });
        }
      }
    }

    return results;
  }

  /**
   * Recommend an alternative package that is compatible with the current setup.
   *
   * @param incompatible - The package that is incompatible.
   * @param purpose      - What functionality is needed.
   * @returns Array of alternative recommendations sorted by compatibility.
   */
  recommendAlternative(
    incompatible: Package,
    purpose: string,
  ): AlternativeRecommendation[] {
    const alternatives: AlternativeRecommendation[] = [];

    // Find packages in the same category that aren't conflicting
    const categories = incompatible.categories;
    const conflictingNames = new Set([incompatible.name]);

    // Add known conflict partners
    for (const conflict of this.conflicts) {
      if (conflict.packageA === incompatible.name) conflictingNames.add(conflict.packageB);
      if (conflict.packageB === incompatible.name) conflictingNames.add(conflict.packageA);
    }

    for (const [name, cats] of Object.entries(PACKAGE_CATEGORIES)) {
      if (conflictingNames.has(name)) continue;
      if (!cats.some((c) => categories.includes(c))) continue;

      const hasConflict = this.conflicts.some(
        (c) =>
          (c.packageA === name && this.currentPackages.has(c.packageB)) ||
          (c.packageB === name && this.currentPackages.has(c.packageA)),
      );

      const sharedCats = cats.filter((c) => categories.includes(c));
      const functionalityMatch = sharedCats.length / categories.length;

      alternatives.push({
        originalPackage: incompatible.name,
        alternative: name,
        reason: hasConflict
          ? `Alternative with potential warnings. Provides ${sharedCats.join(", ")} functionality.`
          : `Compatible alternative providing ${sharedCats.join(", ")} functionality.`,
        compatibilityScore: hasConflict ? 0.5 : 0.9,
        functionalityMatch: Math.round(functionalityMatch * 100) / 100,
      });
    }

    return alternatives.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  }

  /**
   * Validate a package's compatibility with a specific React version.
   *
   * @param packageName  - The package to validate.
   * @param reactVersion - The React version string (e.g. "18.2.0").
   * @returns Compatibility result focused on React compatibility.
   */
  validateReactCompatibility(
    packageName: string,
    reactVersion: string,
  ): { compatible: boolean; minRequired: string; currentVersion: string; notes: string } {
    const requirements = REACT_COMPATIBILITY[packageName];

    if (!requirements) {
      return {
        compatible: true,
        minRequired: "unknown",
        currentVersion: reactVersion,
        notes: `No specific React version requirement found for "${packageName}".`,
      };
    }

    const parsedReact = this.parseSemver(reactVersion);

    for (const req of requirements) {
      const minVersion = this.parseSemver(req.minReact);
      if (this.compareVersions(parsedReact, minVersion) < 0) {
        return {
          compatible: false,
          minRequired: req.minReact,
          currentVersion: reactVersion,
          notes: req.notes,
        };
      }
    }

    return {
      compatible: true,
      minRequired: requirements.map((r) => r.minReact).join(", "),
      currentVersion: reactVersion,
      notes: `"${packageName}" is compatible with React ${reactVersion}.`,
    };
  }

  /**
   * Validate potential conflicts between styling solutions.
   *
   * Prevents issues like using Tailwind + Bootstrap simultaneously.
   *
   * @param existing  - Currently installed styling-related package names.
   * @param requested - The new styling package being considered.
   * @returns Conflict analysis for styling solutions.
   */
  validateStylingSolutionConflicts(
    existing: string[],
    requested: string,
  ): { hasConflict: boolean; conflictType: string; explanation: string; recommendation: string } {
    // Normalize names for comparison
    const normalize = (name: string) => name.toLowerCase().replace(/[@/]/g, "-");
    const requestedNorm = normalize(requested);

    // Define conflict groups
    const cssFrameworks = ["tailwindcss", "bootstrap", "bulma", "foundation", "semantic-ui"];
    const cssInJs = ["styled-components", "emotion", "@emotion styled", "goober", "stitches"];
    const cssPreprocessors = ["sass", "less", "stylus"];

    const requestedGroup = this.identifyStylingGroup(requestedNorm, cssFrameworks, cssInJs, cssPreprocessors);

    if (!requestedGroup) {
      return {
        hasConflict: false,
        conflictType: "NONE",
        explanation: `"${requested}" is not recognized as a styling solution that conflicts with others.`,
        recommendation: "No action needed.",
      };
    }

    for (const existingPkg of existing) {
      const existingNorm = normalize(existingPkg);
      const existingGroup = this.identifyStylingGroup(existingNorm, cssFrameworks, cssInJs, cssPreprocessors);

      if (existingGroup && existingGroup === requestedGroup) {
        return {
          hasConflict: true,
          conflictType: "SAME_GROUP",
          explanation: `Both "${existingPkg}" and "${requested}" belong to the ${requestedGroup} category. Using both is redundant and may cause conflicts.`,
          recommendation: `Choose one: either "${existingPkg}" or "${requested}". Remove the other.`,
        };
      }

      if (existingGroup && existingGroup !== requestedGroup) {
        // Cross-group conflicts are warnings, not errors
        const isKnownConflict = this.conflicts.some(
          (c) =>
            (c.packageA === requested || c.packageA === existingPkg) &&
            (c.packageB === requested || c.packageB === existingPkg),
        );

        if (isKnownConflict) {
          return {
            hasConflict: true,
            conflictType: "CROSS_GROUP",
            explanation: `"${existingPkg}" (${existingGroup}) and "${requested}" (${requestedGroup}) have known styling conflicts. This can cause screen flicker, specificity wars, and unpredictable layouts.`,
            recommendation: `Pick one styling paradigm. If "${requested}" is preferred, remove "${existingPkg}" and migrate styles.`,
          };
        }
      }
    }

    return {
      hasConflict: false,
      conflictType: "NONE",
      explanation: `"${requested}" does not conflict with existing styling packages.`,
      recommendation: "Safe to install.",
    };
  }

  /**
   * Generate a comprehensive dependency report for the project.
   *
   * @returns A full dependency report with analysis, conflicts, and recommendations.
   */
  generateDependencyReport(): DependencyReport {
    const packages = Array.from(this.currentPackages.values());

    // Detect duplicates
    const duplicates: Array<{ category: string; packages: string[] }> = [];
    const categoryMap: Record<string, string[]> = {};
    for (const pkg of packages) {
      for (const cat of pkg.categories) {
        if (!categoryMap[cat]) categoryMap[cat] = [];
        categoryMap[cat].push(pkg.name);
      }
    }
    for (const [category, pkgs] of Object.entries(categoryMap)) {
      if (pkgs.length > 1) {
        duplicates.push({ category, packages: pkgs });
      }
    }

    // Detect conflicts
    const conflicts: DependencyConflict[] = [];
    for (const conflict of this.conflicts) {
      const hasA = this.currentPackages.has(conflict.packageA);
      const hasB = this.currentPackages.has(conflict.packageB);
      if (hasA && hasB) {
        conflicts.push({
          description: conflict.description,
          packages: [conflict.packageA, conflict.packageB],
          severity: conflict.severity,
          suggestedResolutions: [conflict.resolution],
          isBlocker: conflict.severity === "ERROR",
        });
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (duplicates.length > 0) {
      recommendations.push(
        ...duplicates.map(
          (d) => `Consolidate ${d.category} packages: ${d.packages.join(", ")}. Choose one to reduce complexity.`,
        ),
      );
    }
    const errorConflicts = conflicts.filter((c) => c.severity === "ERROR");
    if (errorConflicts.length > 0) {
      recommendations.push(
        `Resolve ${errorConflicts.length} blocking conflict(s) before continuing development.`,
      );
    }

    // Calculate risk score
    const riskScore = this.calculateRiskScore(packages, conflicts, duplicates);

    return {
      analysis: {
        totalPackages: packages.length,
        dependencies: packages.filter((p) => p.type === "dependency").map((p) => p.name),
        devDependencies: packages.filter((p) => p.type === "devDependency").map((p) => p.name),
        peerDependencies: packages.filter((p) => p.type === "peerDependency").map((p) => p.name),
        categories: categoryMap,
        issues: conflicts,
        estimatedSizeKB: packages.length * 150,
      },
      conflicts,
      duplicates,
      recommendations,
      riskScore,
      generatedAt: new Date().toISOString(),
    };
  }

  // -----------------------------------------------------------------------
  // Helpers (private)
  // -----------------------------------------------------------------------

  /** Infer a package's purpose from its name. */
  private inferPackagePurpose(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes("react")) return "React ecosystem";
    if (lower.includes("css") || lower.includes("style") || lower.includes("tailwind") || lower.includes("bootstrap")) return "Styling";
    if (lower.includes("test") || lower.includes("jest") || lower.includes("vitest")) return "Testing";
    if (lower.includes("lint") || lower.includes("eslint") || lower.includes("prettier")) return "Linting/Formatting";
    if (lower.includes("types") || lower.includes("@types")) return "Type definitions";
    return "General utility";
  }

  /** Detect issues in the current dependency setup. */
  private detectCurrentIssues(): DependencyConflict[] {
    const issues: DependencyConflict[] = [];
    const pkgNames = Array.from(this.currentPackages.keys());

    for (const conflict of this.conflicts) {
      if (pkgNames.includes(conflict.packageA) && pkgNames.includes(conflict.packageB)) {
        issues.push({
          description: conflict.description,
          packages: [conflict.packageA, conflict.packageB],
          severity: conflict.severity,
          suggestedResolutions: [conflict.resolution],
          isBlocker: conflict.severity === "ERROR",
        });
      }
    }

    return issues;
  }

  /** Check if a package name matches a pattern (with wildcard support). */
  private packageMatchesAny(pattern: string, name: string): boolean {
    if (pattern === "*") return true;
    if (pattern === name) return true;
    // Simple glob: "react-*" matches "react-dom", "react-router", etc.
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      return name.startsWith(prefix);
    }
    return false;
  }

  /** Parse a semver string into [major, minor, patch]. */
  private parseSemver(version: string): [number, number, number] {
    const cleaned = version.replace(/^[\^~>=<]+/, "");
    const parts = cleaned.split(".").map(Number);
    return [
      parts[0] ?? 0,
      parts[1] ?? 0,
      parts[2] ?? 0,
    ];
  }

  /** Compare two parsed semver tuples. Returns -1, 0, or 1. */
  private compareVersions(
    a: [number, number, number],
    b: [number, number, number],
  ): number {
    if (a[0] !== b[0]) return a[0] > b[0] ? 1 : -1;
    if (a[1] !== b[1]) return a[1] > b[1] ? 1 : -1;
    if (a[2] !== b[2]) return a[2] > b[2] ? 1 : -1;
    return 0;
  }

  /** Check if a version satisfies a semver range (simplified). */
  private satisfiesRange(version: string, range: string): boolean {
    const parsedVersion = this.parseSemver(version);
    const cleanRange = range.replace(/^[\^~]/, "");
    const parsedRange = this.parseSemver(cleanRange);
    return this.compareVersions(parsedVersion, parsedRange) >= 0;
  }

  /** Get known peer dependency requirements for a package (subset). */
  private getKnownPeerRequirements(
    packageName: string,
  ): Array<{ name: string; range: string }> {
    // Hardcoded subset of common peer dependency requirements
    const peerDeps: Record<string, Array<{ name: string; range: string }>> = {
      "eslint-plugin-react": [{ name: "eslint", range: ">=8.0.0" }],
      "prettier-plugin-tailwindcss": [{ name: "prettier", range: ">=3.0.0" }],
      "@testing-library/react": [{ name: "react", range: ">=18.0.0" }],
      "react-router-dom": [{ name: "react", range: ">=18.0.0" }, { name: "react-dom", range: ">=18.0.0" }],
    };
    return peerDeps[packageName] ?? [];
  }

  /** Identify which styling group a package belongs to. */
  private identifyStylingGroup(
    normalized: string,
    cssFrameworks: string[],
    cssInJs: string[],
    cssPreprocessors: string[],
  ): string | null {
    if (cssFrameworks.some((f) => normalized.includes(f.replace(/[-/]/g, "")))) return "CSS Framework";
    if (cssInJs.some((j) => normalized.includes(j.replace(/[-/@ ]/g, "")))) return "CSS-in-JS";
    if (cssPreprocessors.some((p) => normalized.includes(p))) return "CSS Preprocessor";
    return null;
  }

  /** Calculate a risk score (0–1) based on the dependency analysis. */
  private calculateRiskScore(
    packages: Package[],
    conflicts: DependencyConflict[],
    duplicates: Array<{ category: string; packages: string[] }>,
  ): number {
    let score = 0;

    // Errors are high risk
    const errorCount = conflicts.filter((c) => c.severity === "ERROR").length;
    score += errorCount * 0.2;

    // Warnings add moderate risk
    const warningCount = conflicts.filter((c) => c.severity === "WARNING").length;
    score += warningCount * 0.1;

    // Duplicates add some risk
    score += duplicates.length * 0.05;

    // Too many packages increases risk
    if (packages.length > 50) score += 0.15;
    else if (packages.length > 30) score += 0.08;

    return Math.min(1.0, Math.round(score * 100) / 100);
  }
}
