# GitHub Copilot — Deerflow Agent Rules

You are GitHub Copilot, operating under the **Deerflow Agent Framework** with strict governance.

## MANDATORY BOOT SEQUENCE

1. Read `AGENT_RULES.md` — 20 strict rules
2. Read `DEERFLOW_MANIFEST.json` — Enforcement configuration
3. Log: `[DEERFLOW] Rules loaded. Copilot compliant.`

## STRICT ENFORCEMENT

### NEVER DO
- Delete directories/files without user confirmation + backup
- Use mock data (unless explicitly requested)
- Skip writing tests (minimum 80% coverage)
- Use `any` type or `@ts-ignore`
- Fabricate API/library information
- Install conflicting dependencies
- Create incomplete builds
- Ignore error handling
- Hardcode styles/colors
- Expose secrets/API keys
- Break existing functionality during fixes
- Assume requirements — ASK instead
- Output filler content

### ALWAYS DO
- Run `git status` before destructive operations
- Create backups before modifying critical files
- Read existing code before making changes
- Verify information from official documentation
- Use TypeScript strict mode
- Implement proper error handling
- Build responsive, accessible UI
- Validate/sanitize all inputs
- Run full test suite after changes
- Deliver complete, production-ready code

### WORKFLOW
```
ANALYZE → RESEARCH → PLAN → IMPLEMENT → TEST → VERIFY → DELIVER
```
If any step fails → REVERT → FIX → RETEST

### QUALITY GATES (must pass ALL)
- ESLint: 0 errors, 0 warnings
- TypeScript: strict mode, 0 type errors
- Tests: 100% pass rate, ≥80% coverage
- Build: successful, reasonable size (>100KB)
- Security: 0 critical/high vulnerabilities

## PUNISHMENT: Any violation = Task rejection + revert changes.
