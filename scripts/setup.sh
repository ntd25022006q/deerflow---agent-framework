#!/usr/bin/env bash
# =============================================================================
# Deerflow Agent Framework — Project Setup Script
# =============================================================================
# Initializes a new or existing project with Deerflow quality standards.
# Checks prerequisites, installs dev dependencies, sets up git hooks,
# and copies configuration templates to the project root.
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Colors & Formatting
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}ℹ ${NC}$1"; }
success() { echo -e "${GREEN}✔ ${NC}$1"; }
warn()    { echo -e "${YELLOW}⚠ ${NC}$1"; }
error()   { echo -e "${RED}✖ ${NC}$1"; }
step()    { echo -e "\n${CYAN}${BOLD}▸ $1${NC}"; }

# ---------------------------------------------------------------------------
# Project root detection
# ---------------------------------------------------------------------------
DEERFLOW_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_ROOT="${DEERFLOW_DIR}"
SCRIPT_DIR="${DEERFLOW_DIR}/scripts"
TEMPLATE_DIR="${DEERFLOW_DIR}/templates"

# If the project root has a package.json, use its parent; otherwise stay here
if [ -f "${PROJECT_ROOT}/package.json" ]; then
  info "Detected project root: ${PROJECT_ROOT}"
else
  warn "No package.json found — will create one"
fi

# ---------------------------------------------------------------------------
# ASCII Art
# ---------------------------------------------------------------------------
print_banner() {
  echo -e "${CYAN}"
  cat <<'ART'
   ╦ ╦╔═╗╦  ╔═╗╔╦╗╔═╗╦ ╦╔═╗
   ║║║║╣ ║  ║╣  ║ ║ ╦╠═╣║╣
   ╚╩╝╚═╝╩═╝╚═╝ ╩ ╚═╝╩ ╩╚═╝
     Agent Framework Setup
ART
  echo -e "${NC}"
}

# ---------------------------------------------------------------------------
# Step 1: Prerequisite Checks
# ---------------------------------------------------------------------------
check_prerequisites() {
  step "Checking prerequisites..."

  # Node.js
  if command -v node &>/dev/null; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')
    if [ "$NODE_MAJOR" -ge 18 ]; then
      success "Node.js ${NODE_VERSION}"
    else
      error "Node.js >= 18 required (found ${NODE_VERSION})"
      exit 1
    fi
  else
    error "Node.js not found — install from https://nodejs.org or via nvm"
    exit 1
  fi

  # Bun (optional but recommended)
  if command -v bun &>/dev/null; then
    success "Bun $(bun --version)"
  else
    warn "Bun not found — install with: curl -fsSL https://bun.sh/install | bash"
  fi

  # npm
  if command -v npm &>/dev/null; then
    success "npm $(npm --version)"
  else
    error "npm not found"
    exit 1
  fi

  # Git
  if command -v git &>/dev/null; then
    success "Git $(git --version)"
  else
    error "Git not found — install from https://git-scm.com"
    exit 1
  fi

  # Check if inside a git repository
  if git rev-parse --is-inside-work-tree &>/dev/null; then
    success "Git repository detected"
  else
    warn "Not inside a git repository — git hooks will not be configured"
    SKIP_HOOKS=true
  fi
}

# ---------------------------------------------------------------------------
# Step 2: Install Dev Dependencies
# ---------------------------------------------------------------------------
install_dev_dependencies() {
  step "Installing Deerflow dev dependencies..."

  local DEPS=(
    "eslint"
    "@eslint/js"
    "typescript-eslint"
    "eslint-plugin-import"
    "eslint-plugin-jsdoc"
    "prettier"
    "typescript"
    "vitest"
    "@vitest/coverage-v8"
    "husky"
    "lint-staged"
    "@types/node"
  )

  # Check which deps are already installed
  local TO_INSTALL=()
  for dep in "${DEPS[@]}"; do
    if ! node -e "try { require.resolve('${dep}'); process.exit(0); } catch { process.exit(1); }" 2>/dev/null; then
      TO_INSTALL+=("$dep")
    fi
  done

  if [ ${#TO_INSTALL[@]} -eq 0 ]; then
    success "All dev dependencies already installed"
    return
  fi

  info "Installing ${#TO_INSTALL[@]} missing dependencies..."
  npm install --save-dev "${TO_INSTALL[@]}" 2>&1 | tail -5
  success "Dev dependencies installed"
}

# ---------------------------------------------------------------------------
# Step 3: Copy Configuration Templates
# ---------------------------------------------------------------------------
copy_templates() {
  step "Copying Deerflow configuration templates..."

  mkdir -p "${PROJECT_ROOT}/.husky"
  mkdir -p "${PROJECT_ROOT}/.vscode"
  mkdir -p "${PROJECT_ROOT}/.deerflow/cache"
  mkdir -p "${PROJECT_ROOT}/.deerflow/reports"

  # --- .editorconfig ---
  cat > "${PROJECT_ROOT}/.editorconfig" <<'EOF'
# Deerflow EditorConfig
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false

[*.{json,yml,yaml}]
indent_size = 2

[Makefile]
indent_style = tab
EOF
  success ".editorconfig"

  # --- .prettierrc ---
  cat > "${PROJECT_ROOT}/.prettierrc" <<'EOF'
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": []
}
EOF
  success ".prettierrc"

  # --- .prettierignore ---
  cat > "${PROJECT_ROOT}/.prettierignore" <<'EOF'
node_modules
dist
.next
coverage
*.min.js
package-lock.json
bun.lockb
.deerflow
EOF

  # --- tsconfig.strict.json ---
  cat > "${PROJECT_ROOT}/tsconfig.strict.json" <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": false,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "force": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "jsx": "react-jsx",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist", ".next", "coverage", "**/*.test.ts", "**/*.spec.ts"]
}
EOF
  success "tsconfig.strict.json"

  # --- .eslintrc.json ---
  cat > "${PROJECT_ROOT}/.eslintrc.json" <<'EOF'
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "plugins": ["@typescript-eslint", "import", "jsdoc"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:import/recommended",
    "plugin:import/typescript"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-non-null-assertion": "error",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "no-console": ["error", { "allow": ["warn", "error"] }],
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "no-script-url": "error",
    "import/no-cycle": "error",
    "import/no-self-import": "error",
    "import/no-duplicates": "error",
    "import/order": ["warn", {
      "groups": ["builtin", "external", "internal", "parent", "sibling", "index", "type"],
      "newlines-between": "never",
      "alphabetize": { "order": "asc" }
    }]
  },
  "env": {
    "node": true,
    "es2022": true
  },
  "settings": {
    "import/resolver": {
      "typescript": true,
      "node": true
    }
  },
  "ignorePatterns": ["node_modules/", "dist/", ".next/", "coverage/"]
}
EOF
  success ".eslintrc.json"

  # --- .vscode/extensions.json ---
  cat > "${PROJECT_ROOT}/.vscode/extensions.json" <<'EOF'
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "vitest.explorer",
    "EditorConfig.EditorConfig"
  ]
}
EOF
  success ".vscode/extensions.json"

  # --- .vscode/settings.json ---
  cat > "${PROJECT_ROOT}/.vscode/settings.json" <<'EOF'
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact"],
  "files.eol": "\n",
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true
}
EOF
  success ".vscode/settings.json"
}

# ---------------------------------------------------------------------------
# Step 4: Setup Git Hooks
# ---------------------------------------------------------------------------
setup_git_hooks() {
  if [ "${SKIP_HOOKS:-false}" = "true" ]; then
    warn "Skipping git hook setup (not in a git repository)"
    return
  fi

  step "Setting up git hooks..."

  # Initialize husky
  if [ -d "${PROJECT_ROOT}/.husky" ]; then
    npx husky init 2>/dev/null || true
  else
    mkdir -p "${PROJECT_ROOT}/.husky"
    git config core.hooksPath .husky
  fi

  # Pre-commit hook
  cat > "${PROJECT_ROOT}/.husky/pre-commit" <<'HOOK'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🦌 Running Deerflow pre-commit checks..."

# Get staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx|json|md)$' || true)

if [ -z "$STAGED_FILES" ]; then
  echo "  No relevant files staged — skipping"
  exit 0
fi

# Run lint-staged
npx lint-staged --concurrent false

# Run Deerflow enforcement check
if [ -f "./scripts/enforce.sh" ]; then
  bash ./scripts/enforce.sh --pre-commit
fi

echo "🦌 Pre-commit checks complete"
HOOK
  chmod +x "${PROJECT_ROOT}/.husky/pre-commit"
  success "Pre-commit hook configured"

  # Commit-msg hook (optional: check conventional commits)
  cat > "${PROJECT_ROOT}/.husky/commit-msg" <<'HOOK'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

COMMIT_MSG=$(cat "$1")

if ! echo "$COMMIT_MSG" | grep -qE "^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?: .+"; then
  echo "❌ Invalid commit message format."
  echo "   Expected: type(scope): description"
  echo "   Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert"
  echo "   Example: feat(auth): add OAuth2 PKCE flow"
  exit 1
fi
HOOK
  chmod +x "${PROJECT_ROOT}/.husky/commit-msg"
  success "Commit-msg hook configured (conventional commits)"

  # --- lint-staged config in package.json ---
  info "Configuring lint-staged in package.json..."
  if [ -f "${PROJECT_ROOT}/package.json" ]; then
    # Use node to safely add lint-staged config
    node -e "
      const fs = require('fs');
      const pkg = JSON.parse(fs.readFileSync('${PROJECT_ROOT}/package.json}', 'utf8'));
      pkg['lint-staged'] = {
        '*.{ts,tsx,js,jsx}': [
          'eslint --fix --max-warnings 0',
          'prettier --write'
        ],
        '*.{json,md,yml,yaml}': [
          'prettier --write'
        ],
        'package.json': [
          'npx sort-package-json'
        ]
      };
      fs.writeFileSync('${PROJECT_ROOT}/package.json}', JSON.stringify(pkg, null, 2) + '\n');
    "
    success "lint-staged configuration added to package.json"
  fi
}

# ---------------------------------------------------------------------------
# Step 5: Initialize husky properly
# ---------------------------------------------------------------------------
init_husky() {
  if [ "${SKIP_HOOKS:-false}" = "true" ]; then
    return
  fi

  step "Initializing husky..."
  npx husky 2>/dev/null || true
  success "Husky initialized"
}

# ---------------------------------------------------------------------------
# Step 6: Create Deerflow config directory
# ---------------------------------------------------------------------------
create_deerflow_config() {
  step "Creating Deerflow configuration..."

  mkdir -p "${PROJECT_ROOT}/.deerflow/cache"
  mkdir -p "${PROJECT_ROOT}/.deerflow/reports"

  cat > "${PROJECT_ROOT}/.deerflow/config.json" <<'EOF'
{
  "version": "1.0.0",
  "strictMode": true,
  "qualityGates": {
    "lint": { "enabled": true, "maxWarnings": 0 },
    "typecheck": { "enabled": true, "strict": true },
    "test": { "enabled": true, "minCoverage": 80 },
    "build": { "enabled": true, "maxSizeKB": 500 },
    "security": { "enabled": true, "auditLevel": "high" }
  },
  "enforcement": {
    "preCommit": true,
    "prePush": true,
    "blockMerge": true
  },
  "allowedLicenses": ["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "0BSD", "CC0-1.0"],
  "excludedPaths": ["node_modules", "dist", ".next", "coverage", ".deerflow"]
}
EOF
  success ".deerflow/config.json created"

  # Add .deerflow to .gitignore
  if [ -f "${PROJECT_ROOT}/.gitignore" ]; then
    if ! rg -q "^\.deerflow/" "${PROJECT_ROOT}/.gitignore" 2>/dev/null; then
      echo "" >> "${PROJECT_ROOT}/.gitignore"
      echo "# Deerflow cache and reports" >> "${PROJECT_ROOT}/.gitignore"
      echo ".deerflow/cache/" >> "${PROJECT_ROOT}/.gitignore"
      echo ".deerflow/reports/" >> "${PROJECT_ROOT}/.gitignore"
    fi
  else
    cat > "${PROJECT_ROOT}/.gitignore" <<'EOF'
# Dependencies
node_modules/

# Build output
dist/
.next/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Coverage
coverage/

# Deerflow cache and reports
.deerflow/cache/
.deerflow/reports/
EOF
    success ".gitignore created"
  fi
}

# ---------------------------------------------------------------------------
# Step 7: Verify Setup
# ---------------------------------------------------------------------------
verify_setup() {
  step "Verifying Deerflow setup..."

  local ERRORS=0

  # Check configs exist
  for file in .editorconfig .prettierrc .eslintrc.json tsconfig.strict.json .deerflow/config.json; do
    if [ -f "${PROJECT_ROOT}/${file}" ]; then
      success "${file} ✓"
    else
      error "${file} missing"
      ERRORS=$((ERRORS + 1))
    fi
  done

  # Check husky
  if [ -f "${PROJECT_ROOT}/.husky/pre-commit" ]; then
    success ".husky/pre-commit ✓"
  else
    warn ".husky/pre-commit not created (may need manual setup)"
  fi

  # Verify eslint can run
  if npx eslint --version &>/dev/null; then
    success "ESLint operational"
  else
    error "ESLint not operational"
    ERRORS=$((ERRORS + 1))
  fi

  # Verify typescript can run
  if npx tsc --version &>/dev/null; then
    success "TypeScript operational"
  else
    error "TypeScript not operational"
    ERRORS=$((ERRORS + 1))
  fi

  return $ERRORS
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  print_banner

  info "Deerflow Agent Framework Setup"
  info "Project root: ${PROJECT_ROOT}"
  echo ""

  check_prerequisites
  install_dev_dependencies
  copy_templates
  setup_git_hooks
  init_husky
  create_deerflow_config
  verify_setup

  echo ""
  echo -e "${GREEN}${BOLD}"
  echo "  ╔══════════════════════════════════════════╗"
  echo "  ║  🦌 Deerflow Setup Complete!             ║"
  echo "  ╠══════════════════════════════════════════╣"
  echo "  ║                                          ║"
  echo "  ║  Quality gates:  ACTIVE                  ║"
  echo "  ║  Git hooks:      CONFIGURED              ║"
  echo "  ║  Strict mode:    ENABLED                 ║"
  echo "  ║                                          ║"
  echo "  ║  Next steps:                            ║"
  echo "  ║  → Run: bash scripts/validate.sh --all  ║"
  echo "  ║  → Commit: deerflow gates will enforce  ║"
  echo "  ║  → CI/CD: workflows auto-run on push    ║"
  echo "  ║                                          ║"
  echo "  ╚══════════════════════════════════════════╝"
  echo -e "${NC}"
}

main "$@"
