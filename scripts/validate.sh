#!/usr/bin/env bash
# =============================================================================
# Deerflow Agent Framework — Validation Script
# =============================================================================
# Runs comprehensive quality checks against the Deerflow Agent Framework
# standards. Supports selective or full validation with color-coded output.
# Exit code 0 = all checks passed, 1 = failures found.
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

info()    { echo -e "${BLUE}ℹ  ${NC}$1"; }
success() { echo -e "${GREEN}✔  ${NC}$1"; }
warn()    { echo -e "${YELLOW}⚠  ${NC}$1"; }
error()   { echo -e "${RED}✖  ${NC}$1"; }
header()  { echo -e "\n${CYAN}${BOLD}━━━ $1 ━━━${NC}"; }
pass()    { TOTAL_PASSED=$((TOTAL_PASSED + 1)); echo -e "  ${GREEN}✔ PASS${NC} — $1"; }
fail()    { TOTAL_FAILED=$((TOTAL_FAILED + 1)); echo -e "  ${RED}✖ FAIL${NC} — $1"; FAILED_DETAILS+=("❌ $1"); }
warnmsg() { TOTAL_WARNINGS=$((TOTAL_WARNINGS + 1)); echo -e "  ${YELLOW}⚠ WARN${NC} — $1"; }

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------
TOTAL_PASSED=0
TOTAL_FAILED=0
TOTAL_WARNINGS=0
FAILED_DETAILS=()
VERBOSE=false
RUN_QUALITY=false
RUN_SECURITY=false
RUN_ALL=false

# Project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEERFLOW_DIR="${PROJECT_ROOT}/.deerflow"
REPORT_DIR="${DEERFLOW_DIR}/reports"
mkdir -p "${REPORT_DIR}"

# Configuration
MIN_COVERAGE=${DEERFLOW_MIN_COVERAGE:-80}
MAX_BUILD_KB=${DEERFLOW_MAX_BUNDLE_SIZE_KB:-500}
MIN_BUILD_KB=${DEERFLOW_MIN_BUNDLE_SIZE_KB:-10}

# ---------------------------------------------------------------------------
# Argument Parsing
# ---------------------------------------------------------------------------
usage() {
  cat <<USAGE
🦌 Deerflow Validation Script

Usage: $0 [OPTIONS]

Options:
  --quality-gate    Run quality checks (lint, typecheck, test, build)
  --security        Run security checks (audit, secrets, patterns)
  --all             Run all checks (equivalent to --quality-gate --security)
  --verbose, -v     Show detailed output for each check
  --help, -h        Show this help message

Examples:
  $0 --all                          # Full validation
  $0 --quality-gate -v              # Quality checks with verbose output
  $0 --security                     # Security scan only

Exit Codes:
  0  All checks passed
  1  One or more checks failed
USAGE
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --quality-gate) RUN_QUALITY=true; shift ;;
    --security)     RUN_SECURITY=true; shift ;;
    --all)          RUN_QUALITY=true; RUN_SECURITY=true; shift ;;
    --verbose|-v)   VERBOSE=true; shift ;;
    --help|-h)      usage ;;
    *) error "Unknown argument: $1"; usage ;;
  esac
done

# Default to --all if no flags specified
if [[ "$RUN_QUALITY" == false && "$RUN_SECURITY" == false ]]; then
  RUN_QUALITY=true
  RUN_SECURITY=true
fi

# ---------------------------------------------------------------------------
# Utility: Verbose output
# ---------------------------------------------------------------------------
verbose() {
  if [[ "$VERBOSE" == true ]]; then
    echo -e "${DIM}    → $1${NC}"
  fi
}

# ---------------------------------------------------------------------------
# CHECK: ESLint
# ---------------------------------------------------------------------------
check_lint() {
  header "🧹 ESLint"

  if ! command -v npx &>/dev/null; then
    fail "npx not available"
    return
  fi

  local LINT_OUTPUT
  LINT_OUTPUT=$(npx eslint . --ext .ts,.tsx,.js,.jsx \
    --format compact \
    --max-warnings 0 \
    2>&1) && local LINT_EXIT=0 || local LINT_EXIT=$?

  if [[ $LINT_EXIT -eq 0 ]]; then
    pass "ESLint — no errors or warnings"
    verbose "Clean lint output"
  else
    local ERROR_COUNT
    ERROR_COUNT=$(echo "$LINT_OUTPUT" | rg -c "^\S" 2>/dev/null || echo "1")
    fail "ESLint — ${ERROR_COUNT} issue(s) found"
    if [[ "$VERBOSE" == true ]]; then
      echo -e "${DIM}$(echo "$LINT_OUTPUT" | head -30)${NC}"
    fi
  fi
}

# ---------------------------------------------------------------------------
# CHECK: TypeScript
# ---------------------------------------------------------------------------
check_typescript() {
  header "🔍 TypeScript Strict Check"

  if ! command -v npx &>/dev/null; then
    fail "npx not available"
    return
  fi

  local TSC_OUTPUT
  TSC_OUTPUT=$(npx tsc --noEmit --strict 2>&1) && local TSC_EXIT=0 || local TSC_EXIT=$?

  if [[ $TSC_EXIT -eq 0 ]]; then
    pass "TypeScript strict check — no errors"
  else
    local ERROR_COUNT
    ERROR_COUNT=$(echo "$TSC_OUTPUT" | rg -c "error TS" 2>/dev/null || echo "1")
    fail "TypeScript — ${ERROR_COUNT} type error(s)"
    if [[ "$VERBOSE" == true ]]; then
      echo -e "${DIM}$(echo "$TSC_OUTPUT" | head -30)${NC}"
    fi
  fi
}

# ---------------------------------------------------------------------------
# CHECK: Tests
# ---------------------------------------------------------------------------
check_tests() {
  header "🧪 Tests & Coverage"

  if ! command -v npx &>/dev/null; then
    fail "npx not available"
    return
  fi

  local TEST_OUTPUT
  TEST_OUTPUT=$(npx vitest run --reporter=verbose 2>&1) && local TEST_EXIT=0 || local TEST_EXIT=$?

  if [[ $TEST_EXIT -eq 0 ]]; then
    pass "Tests — all passing"
  else
    local FAIL_COUNT
    FAIL_COUNT=$(echo "$TEST_OUTPUT" | rg -c "FAIL" 2>/dev/null || echo "unknown")
    fail "Tests — ${FAIL_COUNT} failure(s)"
    if [[ "$VERBOSE" == true ]]; then
      echo -e "${DIM}$(echo "$TEST_OUTPUT" | tail -20)${NC}"
    fi
    return
  fi

  # Coverage check
  if [[ -f "coverage/coverage-summary.json" ]]; then
    local LINES COVERAGE
    LINES=$(node -p "require('./coverage/coverage-summary.json').total.lines.pct" 2>/dev/null || echo "0")
    COVERAGE=$(printf "%.1f" "$LINES" 2>/dev/null || echo "$LINES")

    if (( $(echo "$LINES >= $MIN_COVERAGE" | bc -l 2>/dev/null || echo "0") )); then
      pass "Coverage: ${COVERAGE}% (threshold: ${MIN_COVERAGE}%)"
    else
      fail "Coverage: ${COVERAGE}% — below ${MIN_COVERAGE}% threshold"
    fi
  else
    warnmsg "Coverage report not found"
  fi
}

# ---------------------------------------------------------------------------
# CHECK: Build
# ---------------------------------------------------------------------------
check_build() {
  header "🏗️ Build Validation"

  if [[ ! -d "dist" ]]; then
    fail "dist/ directory not found — run 'npm run build' first"
    return
  fi

  # Size check
  local BUILD_SIZE
  BUILD_SIZE=$(du -sk dist/ 2>/dev/null | cut -f1)

  if [[ -z "$BUILD_SIZE" || "$BUILD_SIZE" -eq 0 ]]; then
    fail "Build output is empty"
    return
  fi

  if [[ "$BUILD_SIZE" -lt "$MIN_BUILD_KB" ]]; then
    warnmsg "Build suspiciously small: ${BUILD_SIZE}KB (min expected: ${MIN_BUILD_KB}KB)"
  fi

  if [[ "$BUILD_SIZE" -le "$MAX_BUILD_KB" ]]; then
    pass "Build size: ${BUILD_SIZE}KB (limit: ${MAX_BUILD_KB}KB)"
  else
    fail "Build too large: ${BUILD_SIZE}KB (limit: ${MAX_BUILD_KB}KB)"
    if [[ "$VERBOSE" == true ]]; then
      echo -e "${DIM}$(du -ak dist/ | sort -rn | head -10)${NC}"
    fi
  fi

  # Check for required files
  local MISSING=0
  for pattern in "dist/index.js" "dist/index.d.ts"; do
    if [[ -f "$pattern" ]]; then
      verbose "Found: $pattern"
    else
      warnmsg "Expected file missing: $pattern"
      MISSING=$((MISSING + 1))
    fi
  done

  if [[ $MISSING -eq 0 ]]; then
    pass "All expected build artifacts present"
  fi
}

# ---------------------------------------------------------------------------
# CHECK: Mock Data Detection
# ---------------------------------------------------------------------------
check_mock_data() {
  header "🚫 Mock Data Detection"

  local MOCK_PATTERNS=(
    "TODO|FIXME|HACK|XXX"
    "MOCK|placeholder|dummy"
    "example\.com|test@example"
    "lorem ipsum"
    "xxx-xx-xxxx"         # SSN placeholder
    "555-\d{4}"           # Phone placeholder
    "DEADBEEF|CAFEBABE"   # Hex placeholder
  )

  local MOCK_FILES=""
  local PATTERN_COUNT=0

  for pattern in "${MOCK_PATTERNS[@]}"; do
    local MATCHES
    MATCHES=$(rg -l -i "$pattern" \
      --type ts --type tsx --type js \
      --glob "!*.test.*" \
      --glob "!*.spec.*" \
      --glob "!node_modules/**" \
      src/ 2>/dev/null || true)
    if [[ -n "$MATCHES" ]]; then
      MOCK_FILES+="${MATCHES}"$'\n'
      PATTERN_COUNT=$((PATTERN_COUNT + $(echo "$MATCHES" | wc -l)))
    fi
  done

  # Deduplicate
  MOCK_FILES=$(echo "$MOCK_FILES" | sort -u | sed '/^$/d')

  if [[ -z "$MOCK_FILES" ]]; then
    pass "No mock/placeholder data detected"
  else
    fail "Mock data found in ${PATTERN_COUNT} file(s)"
    if [[ "$VERBOSE" == true ]]; then
      echo -e "${DIM}$(echo "$MOCK_FILES" | head -20)${NC}"
    fi
  fi
}

# ---------------------------------------------------------------------------
# CHECK: Any Type Detection
# ---------------------------------------------------------------------------
check_any_types() {
  header "🚫 'any' Type Usage"

  if [[ ! -d "src" ]]; then
    warnmsg "src/ directory not found — skipping"
    return
  fi

  local ANY_MATCHES
  ANY_MATCHES=$(rg -n ": any" \
    --type ts --type tsx \
    --glob "!node_modules/**" \
    --glob "!*.test.*" \
    --glob "!*.spec.*" \
    src/ 2>/dev/null || true)

  if [[ -z "$ANY_MATCHES" ]]; then
    pass "No 'any' type usage detected"
  else
    local COUNT
    COUNT=$(echo "$ANY_MATCHES" | wc -l)
    fail "Found ${COUNT} instance(s) of 'any' type"
    if [[ "$VERBOSE" == true ]]; then
      echo -e "${DIM}$(echo "$ANY_MATCHES" | head -20)${NC}"
    fi
  fi
}

# ---------------------------------------------------------------------------
# CHECK: Hardcoded Secrets
# ---------------------------------------------------------------------------
check_secrets() {
  header "🔑 Hardcoded Secrets Detection"

  local SECRET_PATTERNS=(
    "api[_-]?key\s*[:=]\s*['\"][a-zA-Z0-9_\-]{16,}['\"]"
    "secret\s*[:=]\s*['\"][a-zA-Z0-9_\-]{16,}['\"]"
    "password\s*[:=]\s*['\"][^'\"]{8,}['\"]"
    "private[_-]?key\s*[:=]\s*['\"][a-zA-Z0-9_\-/+=]{20,}['\"]"
    "auth[_-]?token\s*[:=]\s*['\"][a-zA-Z0-9_\-]{20,}['\"]"
    "mongodb(\+srv)?://"
    "postgres(ql)?://"
    "mysql://"
    "redis://"
  )

  local SECRETS_FOUND=""
  for pattern in "${SECRET_PATTERNS[@]}"; do
    local MATCHES
    MATCHES=$(rg -i -n "$pattern" \
      --glob "!node_modules/**" \
      --glob "!package-lock.json" \
      --glob "!*.test.*" \
      --glob "!*.spec.*" \
      --glob "!*.snap" \
      . 2>/dev/null || true)
    if [[ -n "$MATCHES" ]]; then
      SECRETS_FOUND+="${MATCHES}"$'\n'
    fi
  done

  SECRETS_FOUND=$(echo "$SECRETS_FOUND" | sed '/^$/d' | head -30)

  if [[ -z "$SECRETS_FOUND" ]]; then
    pass "No hardcoded secrets detected"
  else
    local COUNT
    COUNT=$(echo "$SECRETS_FOUND" | wc -l)
    fail "Found ${COUNT} potential secret(s)"
    if [[ "$VERBOSE" == true ]]; then
      echo -e "${DIM}$(echo "$SECRETS_FOUND" | sed 's/\(['\''\"]\?[a-zA-Z0-9_]\{4\}\).*/\1***/g')${NC}"
    fi
  fi
}

# ---------------------------------------------------------------------------
# CHECK: npm Audit
# ---------------------------------------------------------------------------
check_npm_audit() {
  header "📦 npm Security Audit"

  if ! command -v npm &>/dev/null; then
    fail "npm not available"
    return
  fi

  local AUDIT_OUTPUT
  AUDIT_OUTPUT=$(npm audit --audit-level=high --json 2>&1) && local AUDIT_EXIT=0 || local AUDIT_EXIT=$?

  if [[ $AUDIT_EXIT -eq 0 ]]; then
    pass "npm audit — no high/critical vulnerabilities"
  else
    local VULN_COUNT
    VULN_COUNT=$(echo "$AUDIT_OUTPUT" | node -p "
      try {
        const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
        const v = d.metadata ? d.metadata.vulnerabilities : {};
        let t = 0; for (const c of Object.values(v)) t += c; t;
      } catch(e) { 'unknown'; }
    " 2>/dev/null || echo "unknown")
    fail "npm audit — ${VULN_COUNT} high/critical vulnerability(ies)"
    if [[ "$VERBOSE" == true ]]; then
      echo -e "${DIM}$(npm audit --audit-level=high 2>&1 | head -30)${NC}"
    fi
  fi
}

# ---------------------------------------------------------------------------
# CHECK: Insecure Code Patterns
# ---------------------------------------------------------------------------
check_code_patterns() {
  header "🐍 Insecure Code Patterns"

  local ISSUES=""

  # eval()
  local EVAL_MATCHES
  EVAL_MATCHES=$(rg -n "\beval\s*\(" --type ts --type js --glob "!node_modules/**" . 2>/dev/null || true)
  if [[ -n "$EVAL_MATCHES" ]]; then
    ISSUES+="❌ eval() usage:\n${EVAL_MATCHES}\n"
  fi

  # innerHTML
  local INNER_HTML
  INNER_HTML=$(rg -n "\.innerHTML\s*=" --type ts --type tsx --type js --glob "!node_modules/**" . 2>/dev/null || true)
  if [[ -n "$INNER_HTML" ]]; then
    ISSUES+="⚠️ innerHTML assignment (XSS risk):\n${INNER_HTML}\n"
  fi

  # dangerouslySetInnerHTML
  local DANGEROUS
  DANGEROUS=$(rg -n "dangerouslySetInnerHTML" --type ts --type tsx --glob "!node_modules/**" . 2>/dev/null || true)
  if [[ -n "$DANGEROUS" ]]; then
    ISSUES+="⚠️ dangerouslySetInnerHTML (XSS risk):\n${DANGEROUS}\n"
  fi

  # child_process
  local CHILD_PROC
  CHILD_PROC=$(rg -n "require.*child_process|from.*child_process" --type ts --type js --glob "!node_modules/**" . 2>/dev/null || true)
  if [[ -n "$CHILD_PROC" ]]; then
    ISSUES+="⚠️ child_process (review for injection):\n${CHILD_PROC}\n"
  fi

  if [[ -z "$ISSUES" ]]; then
    pass "No insecure code patterns detected"
  else
    local COUNT
    COUNT=$(echo "$ISSUES" | rg -c "^[❌⚠️]" 2>/dev/null || echo "1")
    fail "Found ${COUNT} insecure code pattern(s)"
    if [[ "$VERBOSE" == true ]]; then
      echo -e "${DIM}${ISSUES}${NC}"
    fi
  fi
}

# ---------------------------------------------------------------------------
# Report Generation
# ---------------------------------------------------------------------------
print_report() {
  echo ""
  echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}${BOLD}                    🦌 DEERFLOW VALIDATION REPORT                  ${NC}"
  echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  # Summary line
  echo -e "  Checks:  ${BOLD}${TOTAL_PASSED + TOTAL_FAILED}${NC} total"
  echo -e "  ${GREEN}✔ Passed:  ${TOTAL_PASSED}${NC}"
  echo -e "  ${RED}✖ Failed:  ${TOTAL_FAILED}${NC}"
  echo -e "  ${YELLOW}⚠ Warnings: ${TOTAL_WARNINGS}${NC}"
  echo ""

  # Failed details
  if [[ ${#FAILED_DETAILS[@]} -gt 0 ]]; then
    echo -e "  ${RED}${BOLD}Failed Checks:${NC}"
    for detail in "${FAILED_DETAILS[@]}"; do
      echo -e "    ${detail}"
    done
    echo ""
  fi

  # Verdict
  echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  if [[ $TOTAL_FAILED -eq 0 ]]; then
    echo -e "  ${GREEN}${BOLD}✅ ALL CHECKS PASSED — Deerflow quality gates satisfied${NC}"
    echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    return 0
  else
    echo -e "  ${RED}${BOLD}❌ QUALITY GATE FAILED — ${TOTAL_FAILED} check(s) need attention${NC}"
    echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${YELLOW}Fix suggestions:${NC}"
    echo -e "    • Run ${CYAN}bash scripts/validate.sh --all -v${NC} for details"
    echo -e "    • Run ${CYAN}npx eslint --fix .${NC} to auto-fix lint issues"
    echo -e "    • Run ${CYAN}npx tsc --noEmit${NC} to check types interactively"
    echo -e "    • Run ${CYAN}npm audit fix${NC} to resolve dependency vulnerabilities"
    echo ""
    return 1
  fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  echo -e "${CYAN}${BOLD}"
  echo "   ╦ ╦╔═╗╦  ╔═╗╔╦╗╔═╗╦ ╦╔═╗"
  echo "   ║║║║╣ ║  ║╣  ║ ║ ╦╠═╣║╣"
  echo "   ╚╩╝╚═╝╩═╝╚═╝ ╩ ╚═╝╩ ╩╚═╝"
  echo "      Validation Engine v1.0.0"
  echo -e "${NC}"

  info "Project: ${PROJECT_ROOT}"
  info "Mode: $( [[ "$RUN_QUALITY" == true && "$RUN_SECURITY" == true ]] && echo 'Full' || echo 'Partial' ) validation"
  info "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

  # Quality checks
  if [[ "$RUN_QUALITY" == true ]]; then
    echo -e "\n${BOLD}╔══ QUALITY GATES ═══════════════════════════════════╗${NC}"
    check_lint
    check_typescript
    check_tests
    check_build
    check_mock_data
    check_any_types
  fi

  # Security checks
  if [[ "$RUN_SECURITY" == true ]]; then
    echo -e "\n${BOLD}╔══ SECURITY CHECKS ══════════════════════════════════╗${NC}"
    check_secrets
    check_npm_audit
    check_code_patterns
  fi

  # Print report and exit
  print_report
  exit $?
}

main
