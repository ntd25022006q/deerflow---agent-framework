/**
 * @framework Deerflow v1.0.0
 * @license MIT
 * @module SecuritySkill
 * @description Provides security analysis and enforcement for the Deerflow
 *   Agent Framework. Every check references the OWASP Top 10 (2021) and
 *   maps to industry-standard remediation guidance.
 *
 *   Agents MUST run all applicable security checks before any code is
 *   promoted to a staging or production environment. A single critical
 *   finding blocks deployment entirely.
 *
 *   References:
 *   • OWASP Top 10 – https://owasp.org/Top10/
 *   • CWE Top 25 – https://cwe.mitre.org/top25/
 *   • NIST SP 800-53 – Security and Privacy Controls
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Severity levels aligned with CVSS v3.1 scoring. */
export type Severity = "critical" | "high" | "medium" | "low" | "info";

/** A single security finding. */
export interface SecurityFinding {
  /** Short identifier, e.g. "XSS-001". */
  readonly id: string;
  /** Human-readable title. */
  readonly title: string;
  /** OWASP Top 10 category reference. */
  readonly owaspCategory: string;
  /** CWE identifier, if applicable. */
  readonly cwe: string;
  /** Severity of the finding. */
  readonly severity: Severity;
  /** Detailed description of the vulnerability. */
  readonly description: string;
  /** Step-by-step guidance for remediation. */
  readonly remediation: string[];
}

/** Result returned by every security check. */
export interface SecurityCheckResult {
  /** `true` when no findings above the configured threshold exist. */
  readonly passed: boolean;
  /** All findings produced by this check. */
  readonly findings: SecurityFinding[];
}

// ---------------------------------------------------------------------------
// SecuritySkill
// ---------------------------------------------------------------------------

/**
 * Provides methods for detecting, classifying, and remediating security
 * vulnerabilities in application code.
 *
 * Design rationale
 * ────────────────
 * • **OWASP alignment** – The OWASP Top 10 represents the ten most critical
 *   web application security risks. By mapping every check to an OWASP
 *   category we ensure comprehensive coverage of known attack vectors.
 * • **Severity classification** – CVSS-based severity allows agents to
 *   triage findings: critical/high block deployment, medium/low generate
 *   backlogged tickets, info is advisory only.
 * • **Actionable remediation** – Each finding includes specific, copy-paste
 *   remediation steps rather than vague advice. This reduces the mean time
 *   to remediation (MTTR) from days to hours.
 */
export class SecuritySkill {
  // ── Detection patterns ──────────────────────────────────────────────────

  /** Matches `dangerouslySetInnerHTML`, `v-html`, or `innerHTML` assignments. */
  private static readonly XSS_INNER_HTML_PATTERN =
    /(?:dangerouslySetInnerHTML|v-html|\.innerHTML\s*=)/g;

  /** Matches raw string interpolation into HTML / SQL contexts. */
  private static readonly XSS_TEMPLATE_PATTERN =
    /\$\{[^}]*\}(?:\s*(?:<\/|<[a-z]))/gi;

  /** Matches string-concatenated SQL queries. */
  private static readonly SQL_CONCAT_PATTERN =
    /(?:SELECT|INSERT|UPDATE|DELETE|DROP)\s+.*?\+\s*(?:req\.|params\.|query\.|body\.|process\.env)/gi;

  /** Matches common secret patterns (keys, tokens, passwords). */
  private static readonly SECRET_PATTERN =
    /(?:(?:api[_-]?key|secret|password|token|auth|credential|private[_-]?key)\s*[:=]\s*['"][^'"]{8,}['"])/gi;

  /** Matches JWT decode/verify without library usage. */
  private static readonly JWT_MANUAL_PATTERN =
    /(?:JSON\.parse|atob)\s*\(\s*(?:token|jwt|header|payload)/gi;

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Detects Cross-Site Scripting (XSS) vulnerabilities.
   *
   * **OWASP A03:2021 – Injection**
   * **CWE-79: Improper Neutralization of Input During Web Page Generation**
   *
   * XSS allows attackers to execute arbitrary scripts in a victim's browser,
   * enabling session hijacking, defacement, and malware distribution.
   * According to Verizon DBIR (2023), injection attacks account for ~4 % of
   * breaches but have the highest average cost per incident.
   */
  static xssPrevention(sourceCode: string): SecurityCheckResult {
    const findings: SecurityFinding[] = [];

    // Check for direct innerHTML usage
    const innerHtmlMatches = sourceCode.match(SecuritySkill.XSS_INNER_HTML_PATTERN);
    if (innerHtmlMatches) {
      findings.push({
        id: "XSS-001",
        title: "Direct HTML injection via innerHTML",
        owaspCategory: "A03:2021 – Injection",
        cwe: "CWE-79",
        severity: "critical",
        description: `Found ${innerHtmlMatches.length} usage(s) of innerHTML / dangerouslySetInnerHTML. This renders user-controlled content as raw HTML, enabling XSS.`,
        remediation: [
          "Use textContent instead of innerHTML for plain text.",
          "If HTML rendering is required, sanitize input with a library like DOMPurify.",
          "In React, avoid dangerouslySetInnerHTML. If unavoidable, always sanitize the prop.",
        ],
      });
    }

    // Check for template literal injection into HTML
    const templateMatches = sourceCode.match(SecuritySkill.XSS_TEMPLATE_PATTERN);
    if (templateMatches) {
      findings.push({
        id: "XSS-002",
        title: "Template literal injected into HTML context",
        owaspCategory: "A03:2021 – Injection",
        cwe: "CWE-79",
        severity: "high",
        description: `Found ${templateMatches.length} instance(s) where template literal output is directly embedded in HTML.`,
        remediation: [
          "HTML-encode all dynamic values before embedding in markup.",
          "Use a templating engine with auto-escaping (e.g., Handlebars, Nunjucks with autoEscape).",
          "Apply context-aware encoding (HTML attribute, JavaScript, CSS, URL).",
        ],
      });
    }

    return {
      passed: findings.every((f) => f.severity !== "critical"),
      findings,
    };
  }

  /**
   * Detects SQL Injection vulnerabilities.
   *
   * **OWASP A03:2021 – Injection**
   * **CWE-89: Improper Neutralization of Special Elements in SQL**
   *
   * SQL injection remains the #1 risk in the OWASP Top 10. It allows
   * attackers to read, modify, or delete database content and sometimes
   * execute operating-system commands.
   */
  static sqlInjectionPrevention(sourceCode: string): SecurityCheckResult {
    const findings: SecurityFinding[] = [];

    const matches = sourceCode.match(SecuritySkill.SQL_CONCAT_PATTERN);
    if (matches) {
      findings.push({
        id: "SQLI-001",
        title: "String concatenation in SQL query",
        owaspCategory: "A03:2021 – Injection",
        cwe: "CWE-89",
        severity: "critical",
        description: `Found ${matches.length} SQL query(ies) built via string concatenation with user-controlled input.`,
        remediation: [
          "Use parameterized queries / prepared statements exclusively.",
          "With ORMs, use the built-in query builder (never raw queries with interpolation).",
          "Apply input validation as a defense-in-depth measure.",
        ],
      });
    }

    // Check for ORM raw() / query() usage without parameterization
    const rawQueryPattern = /(?:\.raw|\.query|\.execute)\s*\(\s*`[^`]*\$\{/g;
    const rawMatches = sourceCode.match(rawQueryPattern);
    if (rawMatches) {
      findings.push({
        id: "SQLI-002",
        title: "Raw query with template literal interpolation",
        owaspCategory: "A03:2021 – Injection",
        cwe: "CWE-89",
        severity: "high",
        description: "Raw query method called with template literal, risking SQL injection.",
        remediation: [
          "Pass user input as bind parameters, not interpolated values.",
          "Example: db.raw('SELECT * FROM users WHERE id = ?', [userId])",
        ],
      });
    }

    return {
      passed: findings.every((f) => f.severity !== "critical"),
      findings,
    };
  }

  /**
   * Verifies Cross-Site Request Forgery (CSRF) protection.
   *
   * **OWASP A01:2021 – Broken Access Control**
   * **CWE-352: Cross-Site Request Forgery**
   */
  static csrfProtection(sourceCode: string): SecurityCheckResult {
    const findings: SecurityFinding[] = [];

    const hasCsrfMiddleware = /csrf/i.test(sourceCode);
    const hasSameSiteCookie = /SameSite\s*=\s*(?:Strict|Lax)/i.test(sourceCode);

    if (!hasCsrfMiddleware && !hasSameSiteCookie) {
      findings.push({
        id: "CSRF-001",
        title: "No CSRF protection detected",
        owaspCategory: "A01:2021 – Broken Access Control",
        cwe: "CWE-352",
        severity: "high",
        description: "No CSRF token middleware or SameSite cookie attribute found. State-changing endpoints are vulnerable to cross-site request forgery.",
        remediation: [
          "Add CSRF token middleware (e.g., csurf, csrf-sync, or framework-built-in).",
          "Set SameSite=Strict or SameSite=Lax on session cookies.",
          "Verify CSRF tokens on all POST/PUT/DELETE/PATCH endpoints.",
        ],
      });
    }

    return {
      passed: findings.length === 0,
      findings,
    };
  }

  /**
   * Scans for hardcoded secrets, API keys, and credentials.
   *
   * **OWASP A07:2021 – Identification and Authentication Failures**
   * **CWE-798: Use of Hard-coded Credentials**
   *
   * Hardcoded secrets in source code are the #1 cause of accidental
   * credential exposure. GitGuardian (2023) found 10 M+ secrets exposed
   * on GitHub in a single year.
   */
  static secretDetection(sourceCode: string): SecurityCheckResult {
    const findings: SecurityFinding[] = [];

    const matches = sourceCode.match(SecuritySkill.SECRET_PATTERN);
    if (matches) {
      findings.push({
        id: "SEC-001",
        title: "Hardcoded secret detected",
        owaspCategory: "A07:2021 – Identification and Authentication Failures",
        cwe: "CWE-798",
        severity: "critical",
        description: `Found ${matches.length} hardcoded secret(s). Secrets MUST never appear in source code.`,
        remediation: [
          "Move secrets to environment variables or a secrets manager (e.g., AWS Secrets Manager, Vault).",
          "Rotate the exposed credential immediately.",
          "Add .env files to .gitignore and use a .env.example template.",
          "Enable git-secrets or gitleaks in CI/CD to prevent future commits.",
        ],
      });
    }

    return {
      passed: findings.length === 0,
      findings,
    };
  }

  /**
   * Validates input sanitization and validation practices.
   *
   * **OWASP A03:2021 – Injection (defense-in-depth)**
   * **CWE-20: Improper Input Validation**
   */
  static inputValidation(sourceCode: string): SecurityCheckResult {
    const findings: SecurityFinding[] = [];

    // Check for express.json() / body-parser without validation schema
    const hasBodyParser = /(?:express\.json|bodyParser)/.test(sourceCode);
    const hasValidation = /(?:zod|joi|yup|class-validator|ajv|hapi\/joi)/.test(sourceCode);

    if (hasBodyParser && !hasValidation) {
      findings.push({
        id: "IVAL-001",
        title: "Request body parsed without schema validation",
        owaspCategory: "A03:2021 – Injection",
        cwe: "CWE-20",
        severity: "high",
        description: "Express body parser is active but no input validation library (Zod, Joi, Yup, etc.) is detected.",
        remediation: [
          "Install and integrate Zod (recommended) for runtime schema validation.",
          "Validate ALL incoming request body, query, and params at the route level.",
          "Use middleware to reject malformed requests with a 400 status before they reach handlers.",
        ],
      });
    }

    return {
      passed: findings.length === 0,
      findings,
    };
  }

  /**
   * Checks that output encoding is applied where required.
   *
   * **OWASP A03:2021 – Injection**
   * **CWE-116: Improper Output Neutralization**
   */
  static outputEncoding(sourceCode: string): SecurityCheckResult {
    const findings: SecurityFinding[] = [];

    const hasEncodeFunction = /(?:encodeURI|encodeURIComponent|escape|he\.encode|sanitize)/.test(sourceCode);
    const hasInterpolationInResponse = /res\.(?:send|json|write)\s*\(\s*`/.test(sourceCode);

    if (hasInterpolationInResponse && !hasEncodeFunction) {
      findings.push({
        id: "OENC-001",
        title: "Response output without encoding",
        owaspCategory: "A03:2021 – Injection",
        cwe: "CWE-116",
        severity: "medium",
        description: "Template literal used in response without visible output encoding.",
        remediation: [
          "Encode all user-supplied values before including them in responses.",
          "Use encodeURIComponent for URL contexts and a sanitization library for HTML.",
        ],
      });
    }

    return {
      passed: findings.length === 0,
      findings,
    };
  }

  /**
   * Verifies authentication mechanisms are properly implemented.
   *
   * **OWASP A07:2021 – Identification and Authentication Failures**
   * **CWE-287: Improper Authentication**
   */
  static authenticationCheck(sourceCode: string): SecurityCheckResult {
    const findings: SecurityFinding[] = [];

    const hasAuthLibrary = /(?:passport|jsonwebtoken|bcrypt|argon2|next-auth|clerk)/.test(sourceCode);
    const hasManualJwt = sourceCode.match(SecuritySkill.JWT_MANUAL_PATTERN);

    if (!hasAuthLibrary) {
      findings.push({
        id: "AUTH-001",
        title: "No recognized authentication library detected",
        owaspCategory: "A07:2021 – Identification and Authentication Failures",
        cwe: "CWE-287",
        severity: "high",
        description: "Source code does not import a recognized authentication library.",
        remediation: [
          "Use an established authentication library (e.g., Passport.js, next-auth, Clerk, Firebase Auth).",
          "Never implement JWT verification manually — use jsonwebtoken or jose.",
          "Enforce strong password hashing with bcrypt or argon2.",
        ],
      });
    }

    if (hasManualJwt) {
      findings.push({
        id: "AUTH-002",
        title: "Manual JWT parsing detected",
        owaspCategory: "A07:2021 – Identification and Authentication Failures",
        cwe: "CWE-345",
        severity: "high",
        description: "JWT token is being parsed/decoded manually. This bypasses signature verification.",
        remediation: [
          "Use the 'jose' or 'jsonwebtoken' library for all JWT operations.",
          "Always verify the token signature — decoding the payload alone provides no security.",
        ],
      });
    }

    return {
      passed: findings.length === 0,
      findings,
    };
  }

  /**
   * Verifies authorization (access control) is enforced.
   *
   * **OWASP A01:2021 – Broken Access Control**
   * **CWE-862: Missing Authorization**
   */
  static authorizationCheck(sourceCode: string): SecurityCheckResult {
    const findings: SecurityFinding[] = [];

    const hasAuthzCheck = /(?:authorize|isAuthorized|canAccess|hasRole|hasPermission|rbac|acl)/.test(sourceCode);

    if (!hasAuthzCheck) {
      findings.push({
        id: "AUTHZ-001",
        title: "No authorization check detected",
        owaspCategory: "A01:2021 – Broken Access Control",
        cwe: "CWE-862",
        severity: "high",
        description: "No authorization logic found. Users may access resources belonging to other users.",
        remediation: [
          "Implement role-based (RBAC) or attribute-based (ABAC) access control.",
          "Check ownership on every resource access: verify userId matches resource.ownerId.",
          "Apply the principle of least privilege: default deny, explicit allow.",
        ],
      });
    }

    return {
      passed: findings.length === 0,
      findings,
    };
  }

  /**
   * Scans for known vulnerable dependencies.
   *
   * **OWASP A06:2021 – Vulnerable and Outdated Components**
   * **CWE-1035: Using Components with Known Vulnerabilities**
   *
   * In a real agent context this shells out to `npm audit` or `snyk test`.
   */
  static dependencyVulnerabilityScan(): SecurityCheckResult {
    return {
      passed: false, // Agent must run `npm audit` and determine pass/fail.
      findings: [
        {
          id: "DEP-001",
          title: "Dependency vulnerability scan required",
          owaspCategory: "A06:2021 – Vulnerable and Outdated Components",
          cwe: "CWE-1035",
          severity: "high",
          description: "Agent must run 'npm audit --json' or 'snyk test' and parse the output.",
          remediation: [
            "Run 'npm audit' to identify vulnerable dependencies.",
            "Run 'npm audit fix' to auto-fix where possible.",
            "For non-fixable vulnerabilities, evaluate alternatives or pin to a patched version.",
            "Enable Dependabot or Renovate for automated dependency updates.",
          ],
        },
      ],
    };
  }

  /**
   * Validates that secure HTTP headers are configured.
   *
   * **OWASP A05:2021 – Security Misconfiguration**
   * **CWE-693: Protection Mechanism Failure**
   *
   * Proper security headers prevent clickjacking, MIME sniffing, and
   * other browser-based attacks.
   */
  static secureHeadersCheck(sourceCode: string): SecurityCheckResult {
    const findings: SecurityFinding[] = [];

    const requiredHeaders: Array<{ header: string; severity: Severity; pattern: RegExp }> = [
      { header: "X-Content-Type-Options: nosniff", severity: "medium", pattern: /X-Content-Type-Options/i },
      { header: "X-Frame-Options: DENY|SAMEORIGIN", severity: "medium", pattern: /X-Frame-Options/i },
      { header: "Content-Security-Policy", severity: "high", pattern: /Content-Security-Policy/i },
      { header: "Strict-Transport-Security (HSTS)", severity: "medium", pattern: /Strict-Transport-Security/i },
      { header: "Referrer-Policy", severity: "low", pattern: /Referrer-Policy/i },
    ];

    for (const { header, severity, pattern } of requiredHeaders) {
      if (!pattern.test(sourceCode)) {
        findings.push({
          id: `HDR-${header.slice(0, 6).toUpperCase().replace(/[^A-Z]/g, "")}`,
          title: `Missing security header: ${header}`,
          owaspCategory: "A05:2021 – Security Misconfiguration",
          cwe: "CWE-693",
          severity,
          description: `The '${header}' security header is not configured.`,
          remediation: [
            `Add '${header}' to your response headers.`,
            "Use the 'helmet' npm package for Express to set security headers automatically.",
          ],
        });
      }
    }

    return {
      passed: findings.every((f) => f.severity === "low" || f.severity === "info"),
      findings,
    };
  }
}
