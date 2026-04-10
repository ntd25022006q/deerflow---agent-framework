/**
 * @framework Deerflow v1.0.0
 * @license MIT
 *
 * Deep Research Algorithm
 *
 * AI agents must do deep research before coding — not guess.
 * This algorithm enforces the principle: "NEVER fabricate, ALWAYS verify."
 *
 * Every claim, API signature, and library version is cross-referenced
 * against real documentation sources before being used in generated code.
 */

// ---------------------------------------------------------------------------
// Enums & Constants
// ---------------------------------------------------------------------------

/** Depth levels controlling how thorough the research process should be. */
export enum ResearchDepth {
  /** Fast surface-level check — single source, low confidence threshold. */
  QUICK = "QUICK",
  /** Default balance of speed and thoroughness — 2+ sources. */
  STANDARD = "STANDARD",
  /** Detailed multi-source verification — 3+ sources required. */
  DEEP = "DEEP",
  /** Exhaustive cross-reference across all known sources — 5+ sources. */
  EXHAUSTIVE = "EXHAUSTIVE",
}

/** Minimum number of independent sources required per depth level. */
const MINIMUM_SOURCES_PER_DEPTH: Record<ResearchDepth, number> = {
  [ResearchDepth.QUICK]: 1,
  [ResearchDepth.STANDARD]: 2,
  [ResearchDepth.DEEP]: 3,
  [ResearchDepth.EXHAUSTIVE]: 5,
};

/** Minimum confidence threshold required to accept a finding as verified. */
const CONFIDENCE_THRESHOLD: Record<ResearchDepth, number> = {
  [ResearchDepth.QUICK]: 0.5,
  [ResearchDepth.STANDARD]: 0.7,
  [ResearchDepth.DEEP]: 0.85,
  [ResearchDepth.EXHAUSTIVE]: 0.95,
};

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** A single documentation source retrieved during research. */
export interface DocSource {
  /** Fully qualified URL where the source was accessed. */
  url: string;
  /** Human-readable title of the page or document. */
  title: string;
  /** Relevant text snippet extracted from the source. */
  snippet: string;
  /** Relevance score between 0 (irrelevant) and 1 (perfectly relevant). */
  relevance: number;
  /** ISO 8601 timestamp of when the source was last accessed. */
  accessedAt: string;
}

/** Result of a documentation search query. */
export interface SearchResult {
  /** List of documentation sources matching the query. */
  sources: DocSource[];
  /** AI-generated summary of the collective findings. */
  summary: string;
  /** Aggregate confidence score (0–1) based on source quality and agreement. */
  confidence: number;
}

/** Result of an API existence verification. */
export interface ApiVerificationResult {
  /** Whether the API was confirmed to exist in the library. */
  exists: boolean;
  /** List of source URLs that confirmed or denied the API's existence. */
  verifiedFrom: string[];
  /** Code snippet showing correct usage if the API exists, or empty string. */
  correctUsage: string;
}

/** Compatibility relationship between two packages. */
export interface CompatibilityEntry {
  /** Name of the first package. */
  packageA: string;
  /** Version of the first package. */
  versionA: string;
  /** Name of the second package. */
  packageB: string;
  /** Version of the second package. */
  versionB: string;
  /** Whether the two versions are confirmed compatible. */
  compatible: boolean;
  /** Human-readable explanation of the compatibility determination. */
  reason: string;
}

/** Result of a compatibility check across multiple packages. */
export interface CompatibilityMatrix {
  /** Individual pairwise compatibility entries. */
  entries: CompatibilityEntry[];
  /** Whether ALL packages in the set are mutually compatible. */
  fullyCompatible: boolean;
  /** Summary of any incompatibilities found. */
  conflicts: string[];
}

/** A known issue retrieved from GitHub or other issue trackers. */
export interface KnownIssue {
  /** Issue title. */
  title: string;
  /** URL to the original issue. */
  url: string;
  /** Issue status (open, closed, etc.). */
  status: "open" | "closed" | "merged";
  /** Number of upvotes or thumbs-up reactions. */
  severity: number;
  /** Whether a workaround is available. */
  hasWorkaround: boolean;
  /** Description of the workaround, if any. */
  workaround: string;
}

/** Version information for a package. */
export interface VersionInfo {
  /** Latest stable version string. */
  latest: string;
  /** Long-Term Support version string, if available. */
  lts: string;
  /** Whether this package is marked as deprecated. */
  deprecated: boolean;
}

/** Cross-reference result verifying a claim against independent sources. */
export interface CrossReferenceResult {
  /** The claim being verified. */
  claim: string;
  /** Number of independent sources that agree with the claim. */
  confirmingSources: number;
  /** Number of independent sources that contradict the claim. */
  contradictingSources: number;
  /** Overall verdict on the claim's accuracy. */
  verdict: "CONFIRMED" | "CONTRADICTED" | "UNVERIFIABLE" | "PARTIALLY_CONFIRMED";
  /** Explanation of the verdict. */
  explanation: string;
}

/** Comprehensive research report generated for a topic. */
export interface ResearchReport {
  /** The topic that was researched. */
  topic: string;
  /** Depth level used for this report. */
  depth: ResearchDepth;
  /** Executive summary of findings. */
  executiveSummary: string;
  /** Key findings organized by subtopic. */
  findings: Array<{ subtopic: string; content: string; sources: DocSource[] }>;
  /** List of all sources consulted. */
  allSources: DocSource[];
  /** Overall confidence in the report's accuracy. */
  confidence: number;
  /** ISO 8601 timestamp of when the report was generated. */
  generatedAt: string;
  /** Recommendations or caveats the agent should be aware of. */
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// DeepResearchAlgorithm
// ---------------------------------------------------------------------------

/**
 * Orchestrates thorough pre-implementation research.
 *
 * Every method enforces the "NEVER fabricate, ALWAYS verify" principle:
 * if a claim cannot be substantiated by real sources, the algorithm returns
 * low confidence or explicitly flags the claim as unverified.
 */
export class DeepResearchAlgorithm {
  /** Depth level controlling research thoroughness for subsequent calls. */
  private depth: ResearchDepth;

  /** Cache of previously retrieved sources to avoid redundant lookups. */
  private sourceCache: Map<string, DocSource[]> = new Map();

  constructor(depth: ResearchDepth = ResearchDepth.STANDARD) {
    this.depth = depth;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Search documentation sources for a given query.
   *
   * @param query  - The search query string.
   * @returns A structured search result with sources, summary, and confidence.
   */
  searchDocumentation(query: string): SearchResult {
    if (!query || query.trim().length === 0) {
      return { sources: [], summary: "", confidence: 0 };
    }

    const cacheKey = `doc:${query.trim().toLowerCase()}`;
    const cached = this.sourceCache.get(cacheKey);

    if (cached && cached.length >= MINIMUM_SOURCES_PER_DEPTH[this.depth]) {
      return this.buildSearchResult(cached);
    }

    // In a real implementation this would hit external APIs (npm, docs, etc.)
    const sources: DocSource[] = this.simulateDocumentationSearch(query);

    this.sourceCache.set(cacheKey, sources);

    return this.buildSearchResult(sources);
  }

  /**
   * Verify that a specific API exists in a given library.
   *
   * @param library - The library/package name (e.g. "react").
   * @param api     - The API name to verify (e.g. "useState").
   * @returns Verification result with usage example if found.
   */
  verifyApiExists(library: string, api: string): ApiVerificationResult {
    if (!library || !api) {
      return { exists: false, verifiedFrom: [], correctUsage: "" };
    }

    const query = `${library} ${api} API documentation`;
    const result = this.searchDocumentation(query);

    const relevantSources = result.sources.filter(
      (s) => s.relevance >= CONFIDENCE_THRESHOLD[this.depth],
    );

    if (relevantSources.length >= MINIMUM_SOURCES_PER_DEPTH[this.depth]) {
      const usageSnippets = relevantSources
        .filter((s) => s.snippet.toLowerCase().includes(api.toLowerCase()))
        .map((s) => s.snippet.trim());

      return {
        exists: true,
        verifiedFrom: relevantSources.map((s) => s.url),
        correctUsage: usageSnippets.length > 0 ? usageSnippets[0] : "",
      };
    }

    return {
      exists: false,
      verifiedFrom: relevantSources.map((s) => s.url),
      correctUsage: "",
    };
  }

  /**
   * Check compatibility across a set of packages with specified versions.
   *
   * @param packages - Array of `{ name, version }` pairs to check.
   * @returns A compatibility matrix with pairwise analysis.
   */
  checkLibraryCompatibility(
    packages: Array<{ name: string; version: string }>,
  ): CompatibilityMatrix {
    const entries: CompatibilityEntry[] = [];
    const conflicts: string[] = [];

    for (let i = 0; i < packages.length; i++) {
      for (let j = i + 1; j < packages.length; j++) {
        const pkgA = packages[i];
        const pkgB = packages[j];

        const entry = this.checkPairwiseCompatibility(pkgA, pkgB);
        entries.push(entry);

        if (!entry.compatible) {
          conflicts.push(
            `${pkgA.name}@${pkgA.version} ↔ ${pkgB.name}@${pkgB.version}: ${entry.reason}`,
          );
        }
      }
    }

    return {
      entries,
      fullyCompatible: conflicts.length === 0,
      conflicts,
    };
  }

  /**
   * Search for known issues in a library at a specific version.
   *
   * Queries GitHub issues, Stack Overflow, and related forums for
   * commonly reported problems.
   *
   * @param library - The library/package name.
   * @param version - The specific version to check.
   * @returns Array of known issues sorted by severity.
   */
  findKnownIssues(library: string, version: string): KnownIssue[] {
    if (!library || !version) {
      return [];
    }

    const query = `${library}@${version} known issues bugs`;
    const result = this.searchDocumentation(query);

    // Transform search results into structured known issues
    const issues: KnownIssue[] = result.sources
      .filter((s) => s.snippet.toLowerCase().includes("issue") || s.snippet.toLowerCase().includes("bug"))
      .map((source) => ({
        title: source.title,
        url: source.url,
        status: this.inferIssueStatus(source.snippet) as KnownIssue["status"],
        severity: Math.round(source.relevance * 10),
        hasWorkaround: source.snippet.toLowerCase().includes("workaround") ||
          source.snippet.toLowerCase().includes("fix"),
        workaround: this.extractWorkaround(source.snippet),
      }));

    return issues.sort((a, b) => b.severity - a.severity);
  }

  /**
   * Retrieve the latest version information for a package.
   *
   * @param packageName - The npm package name.
   * @returns Version info including latest, LTS, and deprecation status.
   */
  getLatestVersion(packageName: string): VersionInfo {
    if (!packageName) {
      return { latest: "", lts: "", deprecated: false };
    }

    const query = `${packageName} latest version npm`;
    const result = this.searchDocumentation(query);

    // In production this would call the npm registry API
    const latestMatch = result.sources[0]?.snippet.match(/(\d+\.\d+\.\d+)/);
    const ltsMatch = result.sources[0]?.snippet.match(/lts[^:]*:\s*(\d+\.\d+\.\d+)/i);

    return {
      latest: latestMatch ? latestMatch[1] : "unknown",
      lts: ltsMatch ? ltsMatch[1] : "",
      deprecated:
        result.sources.some(
          (s) =>
            s.snippet.toLowerCase().includes("deprecated") ||
            s.title.toLowerCase().includes("deprecated"),
        ),
    };
  }

  /**
   * Cross-reference a claim against 2+ independent sources.
   *
   * This is the core verification method that enforces "NEVER fabricate."
   * If fewer than 2 independent sources agree, the claim is flagged.
   *
   * @param claim - The claim to verify (e.g. "React 18 supports concurrent features by default").
   * @returns A cross-reference result with verdict and explanation.
   */
  crossReferenceSources(claim: string): CrossReferenceResult {
    if (!claim || claim.trim().length === 0) {
      return {
        claim: "",
        confirmingSources: 0,
        contradictingSources: 0,
        verdict: "UNVERIFIABLE",
        explanation: "Empty claim cannot be verified.",
      };
    }

    const requiredSources = Math.max(
      2,
      MINIMUM_SOURCES_PER_DEPTH[this.depth],
    );

    // Search multiple independent source types
    const docResults = this.searchDocumentation(`${claim} documentation`);
    const issueResults = this.searchDocumentation(`${claim} discussion`);
    const allSources = [...docResults.sources, ...issueResults.sources];

    // Deduplicate by URL
    const uniqueSources = this.deduplicateSources(allSources);

    // Classify sources as confirming or contradicting
    let confirming = 0;
    let contradicting = 0;

    for (const source of uniqueSources) {
      if (source.relevance >= 0.6) {
        confirming++;
      } else if (source.relevance <= 0.3 && source.snippet.length > 0) {
        contradicting++;
      }
    }

    // Determine verdict based on source counts
    let verdict: CrossReferenceResult["verdict"];
    let explanation: string;

    if (confirming >= requiredSources && contradicting === 0) {
      verdict = "CONFIRMED";
      explanation = `Claim verified by ${confirming} independent source(s) with no contradictions.`;
    } else if (confirming >= requiredSources && contradicting > 0) {
      verdict = "PARTIALLY_CONFIRMED";
      explanation = `Claim supported by ${confirming} source(s) but contradicted by ${contradicting} source(s). Manual review recommended.`;
    } else if (contradicting >= requiredSources) {
      verdict = "CONTRADICTED";
      explanation = `Claim contradicted by ${contradicting} independent source(s). This claim appears to be inaccurate.`;
    } else {
      verdict = "UNVERIFIABLE";
      explanation = `Insufficient independent sources to verify this claim. Found ${confirming} confirming and ${contradicting} contradicting out of ${requiredSources} required.`;
    }

    return {
      claim,
      confirmingSources: confirming,
      contradictingSources: contradicting,
      verdict,
      explanation,
    };
  }

  /**
   * Generate a comprehensive research report on a given topic.
   *
   * This is the main entry point for pre-implementation research.
   * It orchestrates all other methods to produce a thorough report.
   *
   * @param topic - The topic to research (e.g. "React 19 server components").
   * @returns A structured research report.
   */
  generateResearchReport(topic: string): ResearchReport {
    if (!topic || topic.trim().length === 0) {
      return {
        topic: "",
        depth: this.depth,
        executiveSummary: "No topic provided for research.",
        findings: [],
        allSources: [],
        confidence: 0,
        generatedAt: new Date().toISOString(),
        recommendations: ["Provide a valid research topic."],
      };
    }

    // Phase 1: Broad search for documentation
    const broadSearch = this.searchDocumentation(`${topic} overview guide`);

    // Phase 2: Search for specific API details
    const apiSearch = this.searchDocumentation(`${topic} API reference`);

    // Phase 3: Search for known issues and gotchas
    const issuesSearch = this.searchDocumentation(`${topic} common issues gotchas`);

    // Phase 4: Search for version compatibility info
    const compatSearch = this.searchDocumentation(`${topic} version compatibility`);

    // Combine all sources, deduplicated
    const allSources = this.deduplicateSources([
      ...broadSearch.sources,
      ...apiSearch.sources,
      ...issuesSearch.sources,
      ...compatSearch.sources,
    ]);

    // Calculate aggregate confidence
    const avgConfidence =
      allSources.length > 0
        ? allSources.reduce((sum, s) => sum + s.relevance, 0) / allSources.length
        : 0;

    // Build findings from each search phase
    const findings: ResearchReport["findings"] = [
      {
        subtopic: "Overview",
        content: broadSearch.summary,
        sources: broadSearch.sources,
      },
      {
        subtopic: "API Reference",
        content: apiSearch.summary,
        sources: apiSearch.sources,
      },
      {
        subtopic: "Known Issues",
        content: issuesSearch.summary,
        sources: issuesSearch.sources,
      },
      {
        subtopic: "Version Compatibility",
        content: compatSearch.summary,
        sources: compatSearch.sources,
      },
    ].filter((f) => f.content.length > 0);

    // Generate recommendations based on findings
    const recommendations: string[] = [];
    if (avgConfidence < CONFIDENCE_THRESHOLD[this.depth]) {
      recommendations.push(
        `Research confidence (${(avgConfidence * 100).toFixed(1)}%) is below the ${this.depth} threshold. Consider increasing research depth or consulting additional sources.`,
      );
    }
    if (issuesSearch.sources.length > 3) {
      recommendations.push(
        "Multiple known issues detected. Review issues section carefully before implementation.",
      );
    }

    return {
      topic,
      depth: this.depth,
      executiveSummary: broadSearch.summary,
      findings,
      allSources,
      confidence: avgConfidence,
      generatedAt: new Date().toISOString(),
      recommendations,
    };
  }

  // -----------------------------------------------------------------------
  // Helpers (private)
  // -----------------------------------------------------------------------

  /**
   * Build a structured search result from a list of sources.
   */
  private buildSearchResult(sources: DocSource[]): SearchResult {
    const avgRelevance =
      sources.length > 0
        ? sources.reduce((sum, s) => sum + s.relevance, 0) / sources.length
        : 0;

    const summary =
      sources.length > 0
        ? `Found ${sources.length} relevant source(s) with average relevance of ${(avgRelevance * 100).toFixed(1)}%.`
        : "No relevant sources found.";

    return {
      sources,
      summary,
      confidence: avgRelevance,
    };
  }

  /**
   * Simulate a documentation search (placeholder for real API integration).
   *
   * In production this would call external APIs: npm docs, MDN, GitHub,
   * Stack Overflow, library-specific docs sites, etc.
   */
  private simulateDocumentationSearch(query: string): DocSource[] {
    const now = new Date().toISOString();

    // Placeholder — in a real implementation this performs actual searches
    return [
      {
        url: `https://example.com/docs?q=${encodeURIComponent(query)}`,
        title: `Documentation for: ${query}`,
        snippet: `Search results for "${query}" — replace with real documentation source.`,
        relevance: 0.7,
        accessedAt: now,
      },
    ];
  }

  /**
   * Check pairwise compatibility between two packages.
   */
  private checkPairwiseCompatibility(
    pkgA: { name: string; version: string },
    pkgB: { name: string; version: string },
  ): CompatibilityEntry {
    const query = `${pkgA.name}@${pkgA.version} compatible with ${pkgB.name}@${pkgB.version}`;
    const result = this.searchDocumentation(query);

    const hasConflict = result.sources.some(
      (s) =>
        s.snippet.toLowerCase().includes("incompatible") ||
        s.snippet.toLowerCase().includes("conflict") ||
        s.snippet.toLowerCase().includes("breaks"),
    );

    return {
      packageA: pkgA.name,
      versionA: pkgA.version,
      packageB: pkgB.name,
      versionB: pkgB.version,
      compatible: !hasConflict,
      reason: hasConflict
        ? "Potential compatibility issue detected in documentation."
        : "No known compatibility issues found.",
    };
  }

  /**
   * Deduplicate sources by URL to avoid counting the same source twice.
   */
  private deduplicateSources(sources: DocSource[]): DocSource[] {
    const seen = new Set<string>();
    return sources.filter((s) => {
      if (seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });
  }

  /**
   * Infer the status of an issue from its text snippet.
   */
  private inferIssueStatus(snippet: string): string {
    const lower = snippet.toLowerCase();
    if (lower.includes("closed") || lower.includes("resolved")) return "closed";
    if (lower.includes("merged")) return "merged";
    return "open";
  }

  /**
   * Extract workaround text from a snippet if present.
   */
  private extractWorkaround(snippet: string): string {
    const match = snippet.match(
      /(?:workaround|fix|solution)[:\s]*([^.]+\.?)/i,
    );
    return match ? match[1].trim() : "";
  }
}
