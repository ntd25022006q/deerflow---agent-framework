#!/usr/bin/env bash
# =============================================================================
# Deerflow Agent Framework — Pre-Commit Enforcement Script
# =============================================================================
# Validates staged files against Deerflow quality rules before allowing a
# git commit. Designed to be called from a git pre-commit hook or manually.
# Rejects the commit if any violations are found.
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

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------
VIOLATIONS=0
VIOLATION_DETAILS=()
FIX_SUGGESTIONS=()
PRE_COMMIT=false
STAGED_FILES=()
PROJECT_ROOT=""

# ---------------------------------------------------------------------------
# Argument Parsing
# ---------------------------------------------------------------------------
usage() {
  cat <<USAGE
🦌 Deerflow Enforcement Script

Usage: $0 [OPTIONS]

Options:
  --pre-commit    Run in pre-commit mode (analyzes only staged files)
  --help, -h      Show this help message

Exit Codes:
  0  No violations found
  1  Violations detected — commit blocked
USAGE
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pre-commit) PRE_COMMIT=true; shift ;;
    --help|-h)    usage ;;
    *)            error "Unknown argument: $1"; usage ;;
  esac
done

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
# Detect project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "$PROJECT_ROOT"

# Get staged files (only in pre-commit mode)
if [[ "$PRE_COMMIT" == true ]]; then
  while IFS= read -r file; do
    STAGED_FILES+=("$file")
  done < <(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx|json|md)$' || true)

  if [[ ${#STAGED_FILES[@]} -eq 0 ]]; then
    info "No relevant staged files — skipping enforcement"
    exit 0
  fi

  echo -e "\n${CYAN}${BOLD}🦌 Deerflow Pre-Commit Enforcement${NC}"
  echo -e "${DIM}   Analyzing ${#STAGED_FILES[@]} staged file(s)...${NC}\n"
else
  echo -e "\n${CYAN}${BOLD}🦌 Deerflow Enforcement Scan${NC}"
  echo -e "${DIM}   Scanning all source files...${NC}\n"
fi

# ---------------------------------------------------------------------------
# Helper: Record a violation
# ---------------------------------------------------------------------------
record_violation() {
  local file="$1"
  local rule="$2"
  local message="$3"
  local suggestion="$4"

  VIOLATIONS=$((VIOLATIONS + 1))
  VIOLATION_DETAILS+=("  ${RED}✖${NC} ${BOLD}${file}${NC}:${DIM} ${rule}${NC}")
  VIOLATION_DETAILS+=("    ${message}")
  if [[ -n "$suggestion" ]]; then
    FIX_SUGGESTIONS+=("  💡 ${file}: ${suggestion}")
  fi
}

# ---------------------------------------------------------------------------
# CHECK: Mock/Placeholder Data
# ---------------------------------------------------------------------------
check_mock_data() {
  echo -e "${BOLD}[1/6]${NC} Checking for mock/placeholder data..."

  local MOCK_PATTERNS=(
    "TODO|FIXME|HACK|XXX"
    "MOCK|placeholder|dummy data"
    "example\.com|test@example\.com"
    "lorem ipsum"
    "xxx-xx-xxxx"
  )

  local FILES_TO_CHECK=()
  if [[ "$PRE_COMMIT" == true ]]; then
    FILES_TO_CHECK=("${STAGED_FILES[@]}")
  else
    while IFS= read -r file; do
      FILES_TO_CHECK+=("$file")
    done < <(find src/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
      ! -name "*.test.*" ! -name "*.spec.*" 2>/dev/null || true)
  fi

  for file in "${FILES_TO_CHECK[@]}"; do
    [[ ! -f "$file" ]] && continue
    [[ "$file" == *.test.* || "$file" == *.spec.* ]] && continue

    for pattern in "${MOCK_PATTERNS[@]}"; do
      if rg -q -i "$pattern" "$file" 2>/dev/null; then
        local MATCH_LINE
        MATCH_LINE=$(rg -n -i "$pattern" "$file" 2>/dev/null | head -1)
        record_violation "$file" "no-mock-data" \
          "Mock/placeholder pattern found: ${MATCH_LINE}" \
          "Replace placeholder data with real implementation or environment configuration"
        break  # One violation per file is enough
      fi
    done
  done

  if [[ $VIOLATIONS -eq 0 ]]; then
    success "No mock data violations"
  else
    error "Mock data violations found"
  fi
}

# ---------------------------------------------------------------------------
# CHECK: 'any' Type Usage
# ---------------------------------------------------------------------------
check_any_types() {
  echo -e "${BOLD}[2/6]${NC} Checking for 'any' type usage..."

  local FILES_TO_CHECK=()
  if [[ "$PRE_COMMIT" == true ]]; then
    for f in "${STAGED_FILES[@]}"; do
      [[ "$f" == *.ts || "$f" == *.tsx ]] && FILES_TO_CHECK+=("$f")
    done
  else
    while IFS= read -r file; do
      FILES_TO_CHECK+=("$file")
    done < <(find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) \
      ! -name "*.test.*" ! -name "*.spec.*" 2>/dev/null || true)
  fi

  for file in "${FILES_TO_CHECK[@]}"; do
    [[ ! -f "$file" ]] && continue

    local MATCHES
    MATCHES=$(rg -n ": any" "$file" 2>/dev/null || true)
    if [[ -n "$MATCHES" ]]; then
      local FIRST_LINE
      FIRST_LINE=$(echo "$MATCHES" | head -1)
      record_violation "$file" "no-any-type" \
        "'any' type usage at: ${FIRST_LINE}" \
        "Replace 'any' with a proper TypeScript type or use 'unknown' and narrow with type guards"
    fi
  done

  if [[ $VIOLATIONS -eq 0 ]]; then
    success "No 'any' type violations"
  fi
}

# ---------------------------------------------------------------------------
# CHECK: console.log Usage
# ---------------------------------------------------------------------------
check_console_log() {
  echo -e "${BOLD}[3/6]${NC} Checking for console.log usage..."

  local FILES_TO_CHECK=()
  if [[ "$PRE_COMMIT" == true ]]; then
    for f in "${STAGED_FILES[@]}"; do
      [[ "$f" == *.ts || "$f" == *.tsx || "$f" == *.js || "$f" == *.jsx ]] && FILES_TO_CHECK+=("$f")
    done
  else
    while IFS= read -r file; do
      FILES_TO_CHECK+=("$file")
    done < <(find src/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
      ! -name "*.test.*" ! -name "*.spec.*" 2>/dev/null || true)
  fi

  for file in "${FILES_TO_CHECK[@]}"; do
    [[ ! -f "$file" ]] && continue

    # Allow console.warn and console.error
    local MATCHES
    MATCHES=$(rg -n "console\.log\(|console\.debug\(|console\.info\(" "$file" 2>/dev/null || true)
    if [[ -n "$MATCHES" ]]; then
      local FIRST_LINE
      FIRST_LINE=$(echo "$MATCHES" | head -1)
      record_violation "$file" "no-console-log" \
        "console.log/debug/info at: ${FIRST_LINE}" \
        "Remove console.log or replace with proper logging library (console.warn/error are allowed)"
    fi
  done

  if [[ $VIOLATIONS -eq 0 ]]; then
    success "No console.log violations"
  fi
}

# ---------------------------------------------------------------------------
# CHECK: Hardcoded Secrets
# ---------------------------------------------------------------------------
check_secrets() {
  echo -e "${BOLD}[4/6]${NC} Checking for hardcoded secrets..."

  local SECRET_PATTERNS=(
    "api[_-]?key\s*[:=]\s*['\"][a-zA-Z0-9_\-]{16,}['\"]"
    "password\s*[:=]\s*['\"][^'\"]{8,}['\"]"
    "secret\s*[:=]\s*['\"][a-zA-Z0-9_\-]{16,}['\"]"
    "private[_-]?key\s*[:=]"
    "auth[_-]?token\s*[:=]\s*['\"][a-zA-Z0-9_\-]{16,}['\"]"
    "mongodb(\+srv)?://[^\s'\"]+"
    "postgres(ql)?://[^\s'\"]+"
  )

  local FILES_TO_CHECK=()
  if [[ "$PRE_COMMIT" == true ]]; then
    FILES_TO_CHECK=("${STAGED_FILES[@]}")
  else
    while IFS= read -r file; do
      FILES_TO_CHECK+=("$file")
    done < <(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.env*" \) \
      ! -path "*/node_modules/*" ! -name "package-lock.json" ! -name "*.test.*" ! -name "*.spec.*" ! -name "*.snap" 2>/dev/null || true)
  fi

  for file in "${FILES_TO_CHECK[@]}"; do
    [[ ! -f "$file" ]] && continue

    for pattern in "${SECRET_PATTERNS[@]}"; do
      if rg -q -i "$pattern" "$file" 2>/dev/null; then
        local MATCH_LINE
        MATCH_LINE=$(rg -n -i "$pattern" "$file" 2>/dev/null | head -1 | sed 's/=\(['\''\"]\?[a-zA-Z0-9_]\{4\}\).*/=\1***/g')
        record_violation "$file" "no-hardcoded-secrets" \
          "Potential secret at: ${MATCH_LINE}" \
          "Use environment variables (process.env) instead of hardcoded secrets"
        break
      fi
    done
  done

  if [[ $VIOLATIONS -eq 0 ]]; then
    success "No hardcoded secret violations"
  fi
}

# ---------------------------------------------------------------------------
# CHECK: Missing Error Handling
# ---------------------------------------------------------------------------
check_error_handling() {
  echo -e "${BOLD}[5/6]${NC} Checking for missing error handling..."

  local FILES_TO_CHECK=()
  if [[ "$PRE_COMMIT" == true ]]; then
    for f in "${STAGED_FILES[@]}"; do
      [[ "$f" == *.ts || "$f" == *.tsx ]] && FILES_TO_CHECK+=("$f")
    done
  else
    while IFS= read -r file; do
      FILES_TO_CHECK+=("$file")
    done < <(find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) \
      ! -name "*.test.*" ! -name "*.spec.*" ! -name "*.d.ts" 2>/dev/null || true)
  fi

  for file in "${FILES_TO_CHECK[@]}"; do
    [[ ! -f "$file" ]] && continue

    # Check for uncaught promise chains (.then without .catch)
    local UNCAUGHT
    UNCAUGHT=$(rg -n "\.then\(" "$file" 2>/dev/null \
      | rg -v "\.catch\(" 2>/dev/null || true)
    if [[ -n "$UNCAUGHT" ]]; then
      local FIRST_LINE
      FIRST_LINE=$(echo "$UNCAUGHT" | head -1)
      record_violation "$file" "require-error-handling" \
        "Unhandled promise at: ${FIRST_LINE}" \
        "Add .catch() or wrap in try/catch, or use async/await"
    fi

    # Check for bare throws without try/catch in async functions
    local BARE_THROW
    BARE_THROW=$(rg -n "throw new" "$file" 2>/dev/null \
      | rg -v "(catch|ErrorBoundary)" 2>/dev/null || true)
    # Only flag if there are many (more than 2) as some are intentional
    local THROW_COUNT
    THROW_COUNT=$(echo "$BARE_THROW" | wc -l)
    if [[ "$THROW_COUNT" -gt 5 ]]; then
      warn "$(basename "$file"): $THROW_COUNT throw statements — consider error boundaries"
    fi
  done

  if [[ $VIOLATIONS -eq 0 ]]; then
    success "Error handling looks good"
  fi
}

# ---------------------------------------------------------------------------
# CHECK: File Size / Complexity
# ---------------------------------------------------------------------------
check_file_complexity() {
  echo -e "${BOLD}[6/6]${NC} Checking file size and complexity..."

  local MAX_LINES=300
  local MAX_FUNCTIONS=15

  local FILES_TO_CHECK=()
  if [[ "$PRE_COMMIT" == true ]]; then
    for f in "${STAGED_FILES[@]}"; do
      [[ "$f" == *.ts || "$f" == *.tsx || "$f" == *.js || "$f" == *.jsx ]] && FILES_TO_CHECK+=("$f")
    done
  else
    while IFS= read -r file; do
      FILES_TO_CHECK+=("$file")
    done < <(find src/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
      ! -name "*.test.*" ! -name "*.spec.*" ! -name "*.d.ts" 2>/dev/null || true)
  fi

  for file in "${FILES_TO_CHECK[@]}"; do
    [[ ! -f "$file" ]] && continue

    # Line count
    local LINE_COUNT
    LINE_COUNT=$(wc -l < "$file" | tr -d ' ')
    if [[ "$LINE_COUNT" -gt "$MAX_LINES" ]]; then
      record_violation "$file" "max-file-lines" \
        "File has ${LINE_COUNT} lines (max: ${MAX_LINES})" \
        "Split into smaller modules — extract related functionality into separate files"
    fi

    # Function count (rough heuristic)
    local FUNC_COUNT
    FUNC_COUNT=$(rg -c "(function |=>|(const|let|var) \w+ = \()" "$file" 2>/dev/null || echo "0")
    if [[ "$FUNC_COUNT" -gt "$MAX_FUNCTIONS" ]]; then
      record_violation "$file" "max-functions" \
        "File has ~${FUNC_COUNT} functions (max: ${MAX_FUNCTIONS})" \
        "Consider splitting into smaller, focused modules"
    fi
  done

  if [[ $VIOLATIONS -eq 0 ]]; then
    success "File complexity within limits"
  fi
}

# ---------------------------------------------------------------------------
# Report & Exit
# ---------------------------------------------------------------------------
print_enforcement_report() {
  echo ""
  echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}${BOLD}                  🦌 DEERFLOW ENFORCEMENT REPORT                ${NC}"
  echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  if [[ $VIOLATIONS -eq 0 ]]; then
    echo -e "  ${GREEN}${BOLD}✅ No violations detected${NC}"
    echo -e "  ${DIM}   All staged files comply with Deerflow standards${NC}"
    echo ""
    echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    return 0
  else
    echo -e "  ${RED}${BOLD}❌ ${VIOLATIONS} violation(s) detected — COMMIT BLOCKED${NC}"
    echo ""
    echo -e "  ${BOLD}Violations:${NC}"
    for detail in "${VIOLATION_DETAILS[@]}"; do
      echo -e "    $detail"
    done
    echo ""

    if [[ ${#FIX_SUGGESTIONS[@]} -gt 0 ]]; then
      echo -e "  ${BOLD}Fix Suggestions:${NC}"
      for suggestion in "${FIX_SUGGESTIONS[@]}"; do
        echo -e "    $suggestion"
      done
      echo ""
    fi

    echo -e "  ${BOLD}Quick Fixes:${NC}"
    echo -e "    • ${CYAN}npx eslint --fix <file>${NC}          — auto-fix lint issues"
    echo -e "    • ${CYAN}npx prettier --write <file>${NC}      — auto-format code"
    echo -e "    • ${CYAN}npx tsc --noEmit${NC}                 — check types"
    echo -e "    • ${CYAN}bash scripts/validate.sh --all -v${NC} — full validation"
    echo ""

    if [[ "$PRE_COMMIT" == true ]]; then
      echo -e "  ${YELLOW}${BOLD}To bypass (NOT recommended):${NC}"
      echo -e "    git commit --no-verify -m \"your message\""
      echo ""
    fi

    echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    return 1
  fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  check_mock_data
  check_any_types
  check_console_log
  check_secrets
  check_error_handling
  check_file_complexity
  print_enforcement_report
  exit $?
}

main
