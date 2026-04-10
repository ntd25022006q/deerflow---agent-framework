import { describe, it, expect } from "vitest";
import { SecuritySkill } from "./security-skill";
import type { SecurityCheckResult, SecurityFinding } from "./security-skill";

describe("SecuritySkill", () => {
  // ── xssPrevention ───────────────────────────────────────────────────────

  describe("xssPrevention", () => {
    it("passes for clean code with no XSS patterns", () => {
      const code = `document.getElementById("app").textContent = "Hello";`;
      const result = SecuritySkill.xssPrevention(code);
      expect(result.passed).toBe(true);
      expect(result.findings).toHaveLength(0);
    });

    it("detects innerHTML usage as critical XSS", () => {
      const code = `element.innerHTML = userInput;`;
      const result = SecuritySkill.xssPrevention(code);
      expect(result.passed).toBe(false);
      const critical = result.findings.find((f) => f.severity === "critical");
      expect(critical).toBeDefined();
      expect(critical!.id).toBe("XSS-001");
      expect(critical!.cwe).toBe("CWE-79");
    });

    it("detects dangerouslySetInnerHTML as critical XSS", () => {
      const code = `React.createElement("div", { dangerouslySetInnerHTML: { __html: raw } });`;
      const result = SecuritySkill.xssPrevention(code);
      expect(result.passed).toBe(false);
      expect(result.findings.some((f) => f.id === "XSS-001")).toBe(true);
    });

    it("detects v-html as critical XSS", () => {
      const code = `template: '<div v-html="userContent"></div>';`;
      const result = SecuritySkill.xssPrevention(code);
      expect(result.passed).toBe(false);
    });

    it("detects template literal injection into HTML context as high severity", () => {
      const code = 'html += `<div>${userData}</div>`;';
      const result = SecuritySkill.xssPrevention(code);
      expect(result.findings.some((f) => f.id === "XSS-002" && f.severity === "high")).toBe(true);
    });

    it("maps findings to OWASP A03:2021 – Injection", () => {
      const code = `element.innerHTML = req.body.html;`;
      const result = SecuritySkill.xssPrevention(code);
      expect(result.findings[0].owaspCategory).toContain("A03:2021");
    });

    it("provides remediation suggesting DOMPurify", () => {
      const code = `element.innerHTML = userInput;`;
      const result = SecuritySkill.xssPrevention(code);
      expect(result.findings[0].remediation.some((r) => r.includes("DOMPurify"))).toBe(true);
    });
  });

  // ── sqlInjectionPrevention ──────────────────────────────────────────────

  describe("sqlInjectionPrevention", () => {
    it("passes for parameterized queries", () => {
      const code = `db.query("SELECT * FROM users WHERE id = $1", [userId]);`;
      const result = SecuritySkill.sqlInjectionPrevention(code);
      expect(result.passed).toBe(true);
    });

    it("detects SQL string concatenation with user input as critical", () => {
      const code = `const sql = "SELECT * FROM users WHERE id = " + req.params.id;`;
      const result = SecuritySkill.sqlInjectionPrevention(code);
      expect(result.passed).toBe(false);
      expect(result.findings.some((f) => f.id === "SQLI-001" && f.severity === "critical")).toBe(true);
    });

    it("detects SQL concatenation with process.env as critical", () => {
      const code = `const query = "SELECT * FROM config WHERE key = '" + process.env.KEY + "'";`;
      const result = SecuritySkill.sqlInjectionPrevention(code);
      expect(result.passed).toBe(false);
    });

    it("detects raw query with template interpolation as high", () => {
      const code = `db.raw(\`SELECT * FROM users WHERE name = \${name}\`);`;
      const result = SecuritySkill.sqlInjectionPrevention(code);
      expect(result.findings.some((f) => f.id === "SQLI-002" && f.severity === "high")).toBe(true);
    });

    it("maps to CWE-89", () => {
      const code = `"SELECT * FROM users WHERE id = " + req.query.id;`;
      const result = SecuritySkill.sqlInjectionPrevention(code);
      expect(result.findings.some((f) => f.cwe === "CWE-89")).toBe(true);
    });

    it("suggests using parameterized queries in remediation", () => {
      const code = `"DELETE FROM items WHERE id = " + body.id;`;
      const result = SecuritySkill.sqlInjectionPrevention(code);
      expect(
        result.findings[0].remediation.some((r) => r.includes("parameterized")),
      ).toBe(true);
    });
  });

  // ── csrfProtection ──────────────────────────────────────────────────────

  describe("csrfProtection", () => {
    it("passes when CSRF middleware is present", () => {
      const code = `app.use(csrf({ cookie: true }));`;
      const result = SecuritySkill.csrfProtection(code);
      expect(result.passed).toBe(true);
    });

    it("passes when SameSite cookie is configured", () => {
      const code = `cookie SameSite=Strict;`;
      const result = SecuritySkill.csrfProtection(code);
      expect(result.passed).toBe(true);
    });

    it("fails when neither CSRF middleware nor SameSite cookie is found", () => {
      const code = `app.post("/api/users", createUser);`;
      const result = SecuritySkill.csrfProtection(code);
      expect(result.passed).toBe(false);
      expect(result.findings.some((f) => f.id === "CSRF-001")).toBe(true);
    });

    it("reports OWASP A01:2021 category", () => {
      const code = `app.post("/transfer", transferMoney);`;
      const result = SecuritySkill.csrfProtection(code);
      expect(result.findings[0].owaspCategory).toContain("A01:2021");
    });
  });

  // ── secretDetection ─────────────────────────────────────────────────────

  describe("secretDetection", () => {
    it("passes for code with no hardcoded secrets", () => {
      const code = `const client = new Client({ apiKey: process.env.API_KEY });`;
      const result = SecuritySkill.secretDetection(code);
      expect(result.passed).toBe(true);
    });

    it("detects hardcoded API keys as critical", () => {
      const code = `const api_key = "sk-1234567890abcdef";`;
      const result = SecuritySkill.secretDetection(code);
      expect(result.passed).toBe(false);
      expect(result.findings.some((f) => f.id === "SEC-001" && f.severity === "critical")).toBe(true);
    });

    it("detects hardcoded passwords", () => {
      const code = `const password = "SuperSecret123!";`;
      const result = SecuritySkill.secretDetection(code);
      expect(result.passed).toBe(false);
    });

    it("detects hardcoded tokens", () => {
      const code = `const auth_token = "ghp_ABCDEFGHIJKLMNOPQ";`;
      const result = SecuritySkill.secretDetection(code);
      expect(result.passed).toBe(false);
    });

    it("maps to CWE-798", () => {
      const code = `const secret = "my-super-long-secret-key-1234";`;
      const result = SecuritySkill.secretDetection(code);
      expect(result.findings[0].cwe).toBe("CWE-798");
    });

    it("suggests rotating the exposed credential", () => {
      const code = `const secret = "my-super-long-secret-key-1234";`;
      const result = SecuritySkill.secretDetection(code);
      expect(
        result.findings[0].remediation.some((r) => r.includes("Rotate")),
      ).toBe(true);
    });
  });

  // ── inputValidation ─────────────────────────────────────────────────────

  describe("inputValidation", () => {
    it("passes when body parser has a validation library", () => {
      const code = `import express from 'express';\nimport { z } from 'zod';\napp.use(express.json());`;
      const result = SecuritySkill.inputValidation(code);
      expect(result.passed).toBe(true);
    });

    it("fails when express.json is used without validation library", () => {
      const code = `import express from 'express';\napp.use(express.json());`;
      const result = SecuritySkill.inputValidation(code);
      expect(result.passed).toBe(false);
      expect(result.findings.some((f) => f.id === "IVAL-001")).toBe(true);
    });

    it("passes when no body parser is used", () => {
      const code = `const x = 42;`;
      const result = SecuritySkill.inputValidation(code);
      expect(result.passed).toBe(true);
    });

    it("recognizes Joi as a validation library", () => {
      const code = `app.use(express.json());\nconst schema = joi.object({ name: joi.string() });`;
      const result = SecuritySkill.inputValidation(code);
      expect(result.passed).toBe(true);
    });

    it("recognizes Yup as a validation library", () => {
      const code = `app.use(express.json());\nimport * as yup from 'yup';`;
      const result = SecuritySkill.inputValidation(code);
      expect(result.passed).toBe(true);
    });
  });

  // ── outputEncoding ──────────────────────────────────────────────────────

  describe("outputEncoding", () => {
    it("passes for responses without template literals", () => {
      const code = `res.json({ status: "ok" });`;
      const result = SecuritySkill.outputEncoding(code);
      expect(result.passed).toBe(true);
    });

    it("fails when template literal is used in res.send without encoding", () => {
      const code = `res.send(\`<p>Hello \${name}</p>\`);`;
      const result = SecuritySkill.outputEncoding(code);
      expect(result.passed).toBe(false);
      expect(result.findings.some((f) => f.id === "OENC-001")).toBe(true);
    });

    it("passes when template literal in res.send is accompanied by encodeURIComponent", () => {
      const code = `const safe = encodeURIComponent(userInput);\nres.send(\`<p>\${safe}</p>\`);`;
      const result = SecuritySkill.outputEncoding(code);
      expect(result.passed).toBe(true);
    });

    it("detects res.json with template literal without encoding", () => {
      const code = `res.json(\`<p>Hello \${name}</p>\`);`;
      const result = SecuritySkill.outputEncoding(code);
      expect(result.passed).toBe(false);
    });
  });

  // ── authenticationCheck ─────────────────────────────────────────────────

  describe("authenticationCheck", () => {
    it("passes when a recognized auth library is imported", () => {
      const code = `import passport from 'passport';\napp.use(passport.initialize());`;
      const result = SecuritySkill.authenticationCheck(code);
      expect(result.passed).toBe(true);
    });

    it("passes when jsonwebtoken is imported", () => {
      const code = `import jwt from 'jsonwebtoken';\nconst token = jwt.sign(payload, secret);`;
      const result = SecuritySkill.authenticationCheck(code);
      expect(result.passed).toBe(true);
    });

    it("fails when no auth library is detected", () => {
      const code = `app.get("/api/profile", (req, res) => { res.json({ name: "unknown" }); });`;
      const result = SecuritySkill.authenticationCheck(code);
      expect(result.passed).toBe(false);
      expect(result.findings.some((f) => f.id === "AUTH-001")).toBe(true);
    });

    it("detects manual JWT parsing as a separate finding", () => {
      const code = `import passport from 'passport';\nconst payload = JSON.parse(token.split(".")[1]);`;
      const result = SecuritySkill.authenticationCheck(code);
      expect(result.findings.some((f) => f.id === "AUTH-002")).toBe(true);
    });

    it("detects atob-based JWT decoding", () => {
      const code = `const payload = JSON.parse(atob(jwt));`;
      const result = SecuritySkill.authenticationCheck(code);
      expect(result.findings.some((f) => f.id === "AUTH-002")).toBe(true);
    });
  });

  // ── authorizationCheck ──────────────────────────────────────────────────

  describe("authorizationCheck", () => {
    it("passes when authorization keywords are present", () => {
      const code = `if (!hasRole(user, "admin")) return res.status(403).send("Forbidden");`;
      const result = SecuritySkill.authorizationCheck(code);
      expect(result.passed).toBe(true);
    });

    it("passes when canAccess is used", () => {
      const code = `if (!canAccess(user, resource)) throw new ForbiddenError();`;
      const result = SecuritySkill.authorizationCheck(code);
      expect(result.passed).toBe(true);
    });

    it("fails when no authorization check is found", () => {
      const code = `app.get("/api/admin/users", (req, res) => { res.json(allUsers); });`;
      const result = SecuritySkill.authorizationCheck(code);
      expect(result.passed).toBe(false);
      expect(result.findings.some((f) => f.id === "AUTHZ-001")).toBe(true);
    });

    it("reports CWE-862 for missing authorization", () => {
      const code = `app.delete("/api/users/:id", deleteUser);`;
      const result = SecuritySkill.authorizationCheck(code);
      expect(result.findings[0].cwe).toBe("CWE-862");
    });
  });

  // ── dependencyVulnerabilityScan ─────────────────────────────────────────

  describe("dependencyVulnerabilityScan", () => {
    it("always returns passed=false (requires manual npm audit)", () => {
      const result = SecuritySkill.dependencyVulnerabilityScan();
      expect(result.passed).toBe(false);
    });

    it("includes DEP-001 finding", () => {
      const result = SecuritySkill.dependencyVulnerabilityScan();
      expect(result.findings.some((f) => f.id === "DEP-001")).toBe(true);
    });

    it("suggests running npm audit", () => {
      const result = SecuritySkill.dependencyVulnerabilityScan();
      expect(
        result.findings[0].remediation.some((r) => r.includes("npm audit")),
      ).toBe(true);
    });

    it("maps to OWASP A06:2021", () => {
      const result = SecuritySkill.dependencyVulnerabilityScan();
      expect(result.findings[0].owaspCategory).toContain("A06:2021");
    });
  });

  // ── secureHeadersCheck ──────────────────────────────────────────────────

  describe("secureHeadersCheck", () => {
    it("passes when all required security headers are present", () => {
      const code = [
        "X-Content-Type-Options: nosniff",
        "X-Frame-Options: DENY",
        "Content-Security-Policy: default-src 'self'",
        "Strict-Transport-Security: max-age=31536000",
        "Referrer-Policy: strict-origin-when-cross-origin",
      ].join("\n");
      const result = SecuritySkill.secureHeadersCheck(code);
      expect(result.passed).toBe(true);
    });

    it("fails when security headers are missing", () => {
      const code = `app.listen(3000);`;
      const result = SecuritySkill.secureHeadersCheck(code);
      expect(result.passed).toBe(false);
      expect(result.findings.length).toBeGreaterThan(0);
    });

    it("reports missing Content-Security-Policy as high severity", () => {
      const code = `X-Content-Type-Options: nosniff`;
      const result = SecuritySkill.secureHeadersCheck(code);
      expect(result.findings.some((f) => f.title.includes("Content-Security-Policy") && f.severity === "high")).toBe(true);
    });

    it("reports missing Referrer-Policy as low severity", () => {
      const code = [
        "X-Content-Type-Options: nosniff",
        "X-Frame-Options: DENY",
        "Content-Security-Policy: default-src 'self'",
        "Strict-Transport-Security: max-age=31536000",
      ].join("\n");
      const result = SecuritySkill.secureHeadersCheck(code);
      expect(result.findings.some((f) => f.title.includes("Referrer-Policy") && f.severity === "low")).toBe(true);
    });

    it("suggests using the helmet npm package", () => {
      const code = `app.listen(3000);`;
      const result = SecuritySkill.secureHeadersCheck(code);
      const allRemediation = result.findings.flatMap((f) => f.remediation);
      expect(allRemediation.some((r) => r.includes("helmet"))).toBe(true);
    });
  });
});
