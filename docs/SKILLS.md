# Deerflow Agent Framework — Skills

> **Version:** 1.0.0
> **Last Updated:** 2025
> **Status:** Active Development

---

## Table of Contents

1. [Overview](#overview)
2. [Skill Architecture](#skill-architecture)
3. [Code Quality Skill](#code-quality-skill)
4. [Testing Skill](#testing-skill)
5. [Security Skill](#security-skill)
6. [Architecture Skill](#architecture-skill)
7. [Registering Custom Skills](#registering-custom-skills)
8. [Skills & Workflow Integration](#skills--workflow-integration)
9. [Skill Reference Card](#skill-reference-card)

---

## Overview

The Deerflow Skills System is a modular, extensible framework that enforces domain-specific quality rules across the development workflow. Each **Skill** encapsulates a set of rules, automated checks, and fix strategies for a specific concern area.

### Design Goals

| Goal | Description |
|------|-------------|
| **Modular** | Skills are independent, composable units that can be enabled/disabled |
| **Extensible** | Custom skills can be registered for project-specific rules |
| **Automated** | Skills provide both check and fix capabilities |
| **Hierarchical** | Skills have priorities that determine evaluation order |
| **Transparent** | Every rule has a clear rationale and documentation |

### Skill Categories

```
┌─────────────────────────────────────────────────────────────────┐
│                      SKILL CATEGORIES                            │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  BUILT-IN SKILLS (Always Available)                        │  │
│  │                                                            │  │
│  │  Priority 1: Code Quality   — Type safety, style, limits   │  │
│  │  Priority 2: Testing        — Coverage, quality, patterns  │  │
│  │  Priority 3: Security       — Vulnerabilities, validation  │  │
│  │  Priority 4: Architecture   — SOLID, patterns, structure  │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  CUSTOM SKILLS (User-Registered)                           │  │
│  │                                                            │  │
│  │  Priority 5+: Domain-specific rules defined by the project │  │
│  │  Examples: API design, database access, logging, i18n      │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Skill Architecture

### Skill Interface

Every skill implements the following interface:

```typescript
interface Skill {
  /** Unique identifier for the skill */
  id: string;

  /** Human-readable name */
  name: string;

  /** Semver version */
  version: string;

  /** Priority — lower number = evaluated first */
  priority: number;

  /** The rules this skill enforces */
  rules: SkillRule[];

  /** Quality gate ID this skill maps to */
  gateId: string;

  /** Check the current state against all rules */
  check(context: SkillContext): SkillResult;

  /** Attempt to fix a specific issue */
  fix(context: SkillContext, issue: SkillIssue): FixResult;
}

interface SkillRule {
  /** Unique rule ID within the skill */
  id: string;

  /** Human-readable description */
  description: string;

  /** Severity: error | warn | info */
  severity: 'error' | 'warn' | 'info';

  /** Why this rule exists */
  rationale: string;

  /** How to check for violations */
  check: (context: SkillContext) => SkillIssue[];

  /** How to automatically fix violations (if possible) */
  fix?: (context: SkillContext, issue: SkillIssue) => FixResult;
}

interface SkillContext {
  files: ModifiedFile[];
  projectConfig: ProjectConfig;
  taskState: TaskState;
}

interface SkillResult {
  passed: boolean;
  issues: SkillIssue[];
  summary: string;
}

interface SkillIssue {
  ruleId: string;
  severity: 'error' | 'warn' | 'info';
  file: string;
  line?: number;
  column?: number;
  message: string;
  suggestion?: string;
  autoFixable: boolean;
}
```

### Skill Execution Lifecycle

```
┌──────────────────────────────────────────────────────────────────┐
│                   SKILL EXECUTION LIFECYCLE                      │
│                                                                   │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐           │
│  │  LOAD    │───▶│   SORT BY    │───▶│   EXECUTE    │           │
│  │  Skills  │    │  PRIORITY    │    │  CHECKS      │           │
│  └──────────┘    └──────────────┘    └──────┬───────┘           │
│                                            │                      │
│                                       ┌────┴────┐                │
│                                       │ Issues? │                │
│                                       └────┬────┘                │
│                                    YES  │   NO                  │
│                                    ┌────┴────┐                   │
│                                    ▼         ▼                   │
│                              ┌──────────┐ ┌──────────┐          │
│                              │ ATTEMPT  │ │  PASSED  │          │
│                              │  FIX     │ │          │          │
│                              └────┬─────┘ └──────────┘          │
│                                   │                               │
│                              ┌────┴────┐                        │
│                              │ Fixed?  │                        │
│                              └────┬────┘                        │
│                           YES  │   NO                           │
│                           ┌────┴────┐                           │
│                           ▼         ▼                            │
│                     ┌──────────┐ ┌──────────────┐              │
│                     │ RE-CHECK │ │  REPORT      │              │
│                     │          │ │  FAILURE     │              │
│                     └──────────┘ └──────────────┘              │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Code Quality Skill

**Skill ID:** `code-quality`
**Priority:** 1
**Gate:** G001 (Code Quality)

The Code Quality Skill enforces type safety, code style, and structural limits. It is the first skill evaluated and catches the most common issues.

### Rules

#### CQ-001: No `any` Type

| Property | Value |
|----------|-------|
| **Rule ID** | `CQ-001` |
| **Severity** | Error |
| **Description** | TypeScript's `any` type disables all type checking. It is never acceptable. |

**Rationale:** Using `any` defeats the entire purpose of TypeScript. It creates a hole in the type system that can lead to runtime errors that should have been caught at compile time. Every `any` is a potential bug.

**Allowed Alternative:**
```typescript
// FORBIDDEN
function process(data: any) { ... }

// REQUIRED: Use unknown + type narrowing
function process(data: unknown) {
  if (typeof data === 'string') {
    return data.toUpperCase();
  }
  throw new TypeError('Expected string');
}
```

#### CQ-002: Prefer `const` Over `let`

| Property | Value |
|----------|-------|
| **Rule ID** | `CQ-002` |
| **Severity** | Error |
| **Description** | Variables should be declared with `const`. Use `let` only when reassignment is required. |

**Rationale:** `const` signals intent — the value will not change. This makes code easier to reason about, prevents accidental reassignment, and enables compiler optimizations.

**Allowed Alternative:**
```typescript
// FORBIDDEN
let name = 'deerflow';
let items = [1, 2, 3];

// REQUIRED
const name = 'deerflow';
const items = [1, 2, 3];

// `let` is ONLY acceptable when reassignment is needed
for (let i = 0; i < items.length; i++) { ... }
```

#### CQ-003: No `var` Declarations

| Property | Value |
|----------|-------|
| **Rule ID** | `CQ-003` |
| **Severity** | Error |
| **Description** | `var` is function-scoped and hoisted. Always use `const` or `let`. |

**Rationale:** `var` has confusing scoping rules that lead to bugs. Block-scoped `const`/`let` are strictly safer and more predictable.

#### CQ-004: No Type Assertions (`as`)

| Property | Value |
|----------|-------|
| **Rule ID** | `CQ-004` |
| **Severity** | Error |
| **Description** | Type assertions (`as Type`, `<Type>`) bypass the type checker. Use proper type guards instead. |

**Rationale:** Type assertions tell the compiler "trust me, I know better." In practice, this trust is often misplaced. Use type guards to prove to the compiler (and to future readers) that the type is correct.

**Allowed Alternative:**
```typescript
// FORBIDDEN
const user = data as User;

// REQUIRED: Use type guards
function isUser(data: unknown): data is User {
  return typeof data === 'object' && data !== null && 'name' in data;
}

if (isUser(data)) {
  const user = data; // TypeScript knows this is User
}
```

#### CQ-005: No `eval` or `Function` Constructor

| Property | Value |
|----------|-------|
| **Rule ID** | `CQ-005` |
| **Severity** | Error |
| **Description** | `eval()`, `new Function()`, and implied eval patterns are forbidden. |

**Rationale:** Executing arbitrary code strings is the single most dangerous pattern in JavaScript. It opens the door to code injection, is impossible to type-check, and cannot be statically analyzed.

**Forbidden Patterns:**
```typescript
eval('console.log("bad")');
new Function('return "bad"');
setTimeout('console.log("bad")', 1000);
setInterval('console.log("bad")', 1000);
```

#### CQ-006: No Throw Literals

| Property | Value |
|----------|-------|
| **Rule ID** | `CQ-006` |
| **Severity** | Error |
| **Description** | Always throw Error instances, not strings, numbers, or other literals. |

**Rationale:** Throwing non-Error values loses the stack trace, makes error handling inconsistent, and prevents structured error catching.

**Allowed Alternative:**
```typescript
// FORBIDDEN
throw 'Invalid input';
throw 404;
throw null;

// REQUIRED
throw new Error('Invalid input');
throw new ValidationError('Email is required', { field: 'email' });
```

#### CQ-007: Strict Equality

| Property | Value |
|----------|-------|
| **Rule ID** | `CQ-007` |
| **Severity** | Error |
| **Description** | Always use `===` and `!==`. Loose equality (`==`) is forbidden except for null checks. |

**Rationale:** Loose equality performs type coercion which leads to unexpected results. `== null` is the one exception because it checks both `null` and `undefined`.

#### CQ-008: Function Complexity Limit

| Property | Value |
|----------|-------|
| **Rule ID** | `CQ-008` |
| **Severity** | Error |
| **Description** | Cyclomatic complexity must not exceed 15 per function. |

**Rationale:** High complexity functions are hard to understand, hard to test, and prone to bugs. If a function is too complex, it should be decomposed into smaller, focused functions.

#### CQ-009: Function Length Limit

| Property | Value |
|----------|-------|
| **Rule ID** | `CQ-009` |
| **Severity** | Warning |
| **Description** | Functions should not exceed 50 lines (excluding blanks and comments). |

**Rationale:** Long functions indicate too many responsibilities. A function that does one thing well is typically short and easy to understand.

#### CQ-010: No Nested Ternaries

| Property | Value |
|----------|-------|
| **Rule ID** | `CQ-010` |
| **Severity** | Error |
| **Description** | Nested ternary expressions are forbidden. Use early returns or if/else instead. |

**Rationale:** Nested ternaries are extremely difficult to read and debug. They sacrifice clarity for brevity.

**Allowed Alternative:**
```typescript
// FORBIDDEN
const result = a ? (b ? 'ab' : 'a') : (b ? 'b' : 'none');

// REQUIRED: Use early returns or if/else
function getResult(a: boolean, b: boolean): string {
  if (!a && !b) return 'none';
  if (a && b) return 'ab';
  if (a) return 'a';
  return 'b';
}
```

#### CQ-011: Consistent Type Imports

| Property | Value |
|----------|-------|
| **Rule ID** | `CQ-011` |
| **Severity** | Error |
| **Description** | Use `import type` for type-only imports. |

**Rationale:** `import type` makes the intent explicit and enables better tree-shaking. It prevents accidental use of types as runtime values.

```typescript
// FORBIDDEN
import { User, validateUser } from './user';

// REQUIRED
import type { User } from './user';
import { validateUser } from './user';
```

---

## Testing Skill

**Skill ID:** `testing`
**Priority:** 2
**Gate:** G002 (Testing)

The Testing Skill enforces comprehensive test coverage and high-quality test design.

### Rules

#### T-001: Tests Required for All New Code

| Property | Value |
|----------|-------|
| **Rule ID** | `T-001` |
| **Severity** | Error |
| **Description** | Every new function, class, component, or module must have corresponding tests. |

**Rationale:** Untested code is untrusted code. If it can break, it must have a test. The cost of writing tests is always less than the cost of debugging production issues.

**Test Generation Protocol:**

When implementing new code, follow this order:
1. Write the type/interface definition
2. Write the test file with test cases
3. Implement the function (tests will fail at first)
4. Run tests — they should pass
5. Add edge cases and error scenarios

**Test Structure (AAA Pattern):**
```typescript
describe('userService', () => {
  describe('createUser', () => {
    it('should create a user with valid input', () => {
      // Arrange
      const input = { name: 'John', email: 'john@example.com' };

      // Act
      const result = createUser(input);

      // Assert
      expect(result).toMatchObject({
        name: 'John',
        email: 'john@example.com',
        id: expect.any(string),
      });
    });

    it('should throw ValidationError when email is missing', () => {
      const input = { name: 'John', email: '' };

      expect(() => createUser(input)).toThrow(ValidationError);
    });

    it('should throw ValidationError when name is empty', () => {
      const input = { name: '', email: 'john@example.com' };

      expect(() => createUser(input)).toThrow(ValidationError);
    });
  });
});
```

#### T-002: Coverage Thresholds

| Property | Value |
|----------|-------|
| **Rule ID** | `T-002` |
| **Severity** | Error |
| **Description** | All coverage metrics must meet or exceed 80%. |

**Thresholds:**
| Metric | Minimum |
|--------|---------|
| Statements | 80% |
| Branches | 80% |
| Functions | 80% |
| Lines | 80% |

**Rationale:** 80% coverage is the minimum bar. It ensures that the vast majority of code paths are tested while allowing reasonable exceptions for truly untestable code (e.g., third-party adapters).

#### T-003: No Skipped Tests

| Property | Value |
|----------|-------|
| **Rule ID** | `T-003` |
| **Severity** | Error |
| **Description** | Tests must not be skipped (`.skip`, `xit`, `xdescribe`, `xtest`). |

**Rationale:** Skipped tests accumulate silently and create a false sense of coverage. If a test is broken, fix it. If a test is no longer relevant, remove it.

```typescript
// FORBIDDEN
it.skip('should handle edge case', () => { ... });
xit('should work', () => { ... });
xdescribe('module', () => { ... });

// REQUIRED: Either fix the test or remove it
it('should handle edge case', () => { /* fixed implementation */ });
```

#### T-004: No Empty Test Bodies

| Property | Value |
|----------|-------|
| **Rule ID** | `T-004` |
| **Severity** | Error |
| **Description** | Test cases must have at least one assertion. |

**Rationale:** A test without assertions passes by default but tests nothing. It provides zero value and creates a false sense of security.

```typescript
// FORBIDDEN
it('should work', () => {
  const result = doSomething();
  // No assertion — test always passes!
});

// REQUIRED
it('should return the correct value', () => {
  const result = doSomething();
  expect(result).toBe(expectedValue);
});
```

#### T-005: Descriptive Test Names

| Property | Value |
|----------|-------|
| **Rule ID** | `T-005` |
| **Severity** | Warn |
| **Description** | Test names must describe the expected behavior. |

**Pattern:** `"should [expected behavior] when [condition]"`

```typescript
// FORBIDDEN
it('works', () => { ... });
it('test 1', () => { ... });
it('checks the thing', () => { ... });

// REQUIRED
it('should return empty array when no items match filter', () => { ... });
it('should throw UnauthorizedError when token is expired', () => { ... });
it('should debounce the callback when called rapidly', () => { ... });
```

### Test Anti-Patterns

```
┌──────────────────────────────────────────────────────────────────┐
│                    TEST ANTI-PATTERNS                             │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  1. TESTING IMPLEMENTATION DETAILS                         │  │
│  │                                                             │  │
│  │  // FORBIDDEN: Tests internal state                        │  │
│  │  expect(userService._cache.size).toBe(1);                  │  │
│  │                                                             │  │
│  │  // REQUIRED: Tests observable behavior                     │  │
│  │  expect(userService.getUser('id')).toEqual(expectedUser);  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  2. OVER-MOCKING                                            │  │
│  │                                                             │  │
│  │  // FORBIDDEN: Mock everything including the system         │  │
│  │  vi.mock('./userService');                                  │  │
│  │  vi.mock('./validator');                                    │  │
│  │  vi.mock('./logger');                                       │  │
│  │  vi.mock('./cache');                                        │  │
│  │                                                             │  │
│  │  // REQUIRED: Mock only external boundaries                 │  │
│  │  vi.mock('./external-api');  // Real external service       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  3. SNAPSHOT ABUSE                                          │  │
│  │                                                             │  │
│  │  // FORBIDDEN: Snapshot for business logic                  │  │
│  │  expect(calculatePrice(cart)).toMatchSnapshot();           │  │
│  │                                                             │  │
│  │  // REQUIRED: Explicit assertions for logic                 │  │
│  │  expect(calculatePrice(cart)).toBe(99.99);                  │  │
│  │                                                             │  │
│  │  // ACCEPTABLE: Snapshot for stable UI output               │  │
│  │  expect(render(<Header />)).toMatchSnapshot();              │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  4. TEST INTERDEPENDENCE                                    │  │
│  │                                                             │  │
│  │  // FORBIDDEN: Tests depend on each other                  │  │
│  │  let sharedState = null;                                   │  │
│  │  it('step 1', () => { sharedState = createUser(); });      │  │
│  │  it('step 2', () => { expect(sharedState.name).toBe(..) });│  │
│  │                                                             │  │
│  │  // REQUIRED: Each test is independent                     │  │
│  │  it('creates user correctly', () => {                      │  │
│  │    const user = createUser();                              │  │
│  │    expect(user.name).toBe('expected');                     │  │
│  │  });                                                        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Security Skill

**Skill ID:** `security`
**Priority:** 3
**Gate:** G003 (Security)

The Security Skill enforces secure coding practices aligned with OWASP Top 10.

### Rules

#### S-001: No eval or Dynamic Code Execution

| Property | Value |
|----------|-------|
| **Rule ID** | `S-001` |
| **Severity** | Error |
| **OWASP** | A03:2021 — Injection |

**Rationale:** Executing arbitrary code is the most dangerous pattern. It enables Remote Code Execution (RCE), which is the most severe class of vulnerabilities.

#### S-002: No innerHTML or outerHTML Assignment

| Property | Value |
|----------|-------|
| **Rule ID** | `S-002` |
| **Severity** | Error |
| **OWASP** | A03:2021 — Cross-Site Scripting (XSS) |

**Rationale:** Direct DOM manipulation with innerHTML opens XSS vulnerabilities. User-provided content inserted via innerHTML can execute arbitrary scripts.

```typescript
// FORBIDDEN
element.innerHTML = userInput;
element.innerHTML = `<div>${userContent}</div>`;

// REQUIRED: Use textContent or a sanitizer library
element.textContent = userInput;
// Or use a sanitization library
element.innerHTML = sanitize(userContent);
```

#### S-003: Input Validation Required

| Property | Value |
|----------|-------|
| **Rule ID** | `S-003` |
| **Severity** | Error |
| **OWASP** | A03:2021 — Injection |

**Rationale:** All external input must be validated before use. This includes HTTP request parameters, environment variables, file uploads, and any data that crosses a trust boundary.

**Validation Checklist:**
```
For every public function/API endpoint, verify:
  □ Parameters are validated (type, format, range)
  □ Required fields are checked (not undefined, not empty)
  □ String inputs are length-limited
  □ Numeric inputs are range-bounded
  □ Enum inputs match allowed values
  □ File uploads have size and type restrictions
```

#### S-004: No Hardcoded Secrets

| Property | Value |
|----------|-------|
| **Rule ID** | `S-004` |
| **Severity** | Error |
| **OWASP** | A05:2021 — Security Misconfiguration |

**Rationale:** Secrets in source code are visible in version control, CI logs, and deployment artifacts. They should always come from environment variables or secret management systems.

```typescript
// FORBIDDEN
const API_KEY = 'sk-abc123secret';
const DB_PASSWORD = 'admin123';
const JWT_SECRET = 'super-secret-key';

// REQUIRED
const API_KEY = process.env.API_KEY!;
const DB_PASSWORD = process.env.DB_PASSWORD!;
const JWT_SECRET = process.env.JWT_SECRET!;
```

#### S-005: No Sensitive Data in Logs

| Property | Value |
|----------|-------|
| **Rule ID** | `S-005` |
| **Severity** | Error |
| **OWASP** | A09:2021 — Security Logging Failures |

**Rationale:** Logs often end up in monitoring systems with broader access than intended. Sensitive data in logs can leak to unauthorized parties.

```typescript
// FORBIDDEN
console.log('User login:', { email, password, token });

// REQUIRED
console.log('User login:', { email, tokenRedacted: '***' });
```

#### S-006: Use Parameterized Queries

| Property | Value |
|----------|-------|
| **Rule ID** | `S-006` |
| **Severity** | Error |
| **OWASP** | A03:2021 — Injection (SQL Injection) |

**Rationale:** String concatenation in SQL queries is the primary cause of SQL injection. Always use parameterized queries.

```typescript
// FORBIDDEN
const query = `SELECT * FROM users WHERE email = '${email}'`;

// REQUIRED
const query = 'SELECT * FROM users WHERE email = $1';
const result = await db.query(query, [email]);
```

#### S-007: Secure Error Handling

| Property | Value |
|----------|-------|
| **Rule ID** | `S-007` |
| **Severity** | Error |
| **OWASP** | A04:2021 — Insecure Design |

**Rationale:** Internal error details should never be exposed to end users. Stack traces, database errors, and internal paths in error responses reveal implementation details that attackers can exploit.

```typescript
// FORBIDDEN
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message, stack: err.stack });
});

// REQUIRED
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});
```

### Security Checklist

```
┌──────────────────────────────────────────────────────────────────┐
│                   SECURITY CHECKLIST                              │
│                                                                   │
│  INPUT VALIDATION                                                 │
│  □ All user inputs validated (type, format, length, range)       │
│  □ Server-side validation (never trust client-only validation)   │
│  □ File uploads restricted (size, type, content)                 │
│  □ URL parameters sanitized                                      │
│                                                                   │
│  OUTPUT ENCODING                                                  │
│  □ HTML output escaped (no innerHTML with user data)             │
│  □ SQL queries parameterized                                     │
│  □ Shell commands avoid string concatenation                     │
│  □ JSON responses sanitized                                      │
│                                                                   │
│  AUTHENTICATION & AUTHORIZATION                                   │
│  □ Passwords hashed (bcrypt, argon2)                             │
│  □ JWT tokens signed and validated                               │
│  □ Session tokens have expiry                                    │
│  □ Authorization checks on all endpoints                          │
│                                                                   │
│  DATA PROTECTION                                                  │
│  □ No secrets in source code                                     │
│  □ No sensitive data in logs                                     │
│  □ No sensitive data in URLs                                     │
│  □ Error messages don't leak internal details                    │
│  □ HTTPS enforced for all connections                            │
│                                                                   │
│  DEPENDENCY SECURITY                                              │
│  □ npm audit clean (no high/critical vulnerabilities)            │
│  □ Dependencies pinned with lockfile                             │
│  □ No known vulnerable packages                                  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Architecture Skill

**Skill ID:** `architecture`
**Priority:** 4
**Gate:** G004 (Architecture)

The Architecture Skill enforces structural quality, design principles, and maintainable patterns.

### Rules

#### A-001: Single Responsibility Principle (SRP)

| Property | Value |
|----------|-------|
| **Rule ID** | `A-001` |
| **Severity** | Error |
| **Description** | Each module, class, and function should have one reason to change. |

**Rationale:** When a module has multiple responsibilities, changes to one responsibility can break another. SRP keeps code focused, testable, and maintainable.

**Signs of SRP Violation:**
- A function does data fetching AND formatting AND rendering
- A class manages both business logic AND database access
- A module exports both types AND utility functions AND business logic

**Corrective Action:** Split into focused modules:
```typescript
// FORBIDDEN: One class doing too much
class UserService {
  async createUser(data) { /* validate + save + send email + log */ }
}

// REQUIRED: Separate concerns
class UserValidator { validate(data: CreateUserInput): ValidationResult; }
class UserRepository { save(data: ValidatedUser): Promise<User>; }
class WelcomeEmailService { send(user: User): Promise<void>; }
class UserService {
  constructor(
    private validator: UserValidator,
    private repo: UserRepository,
    private email: WelcomeEmailService,
  ) {}
  async createUser(data) {
    const validated = this.validator.validate(data);
    const user = await this.repo.save(validated);
    await this.email.send(user);
    return user;
  }
}
```

#### A-002: Open/Closed Principle (OCP)

| Property | Value |
|----------|-------|
| **Rule ID** | `A-002` |
| **Severity** | Warn |
| **Description** | Modules should be open for extension but closed for modification. |

**Rationale:** Adding new behavior should not require modifying existing, tested code. Use interfaces, strategy patterns, and dependency injection to extend behavior.

#### A-003: Dependency Inversion Principle (DIP)

| Property | Value |
|----------|-------|
| **Rule ID** | `A-003` |
| **Severity** | Error |
| **Description** | High-level modules should not depend on low-level modules. Both should depend on abstractions. |

**Rationale:** Direct dependencies on implementations create tight coupling. Depending on interfaces allows swapping implementations without modifying consumers.

```typescript
// FORBIDDEN: Direct dependency on implementation
class OrderService {
  constructor() {
    this.paymentGateway = new StripePaymentGateway();
  }
}

// REQUIRED: Depend on abstraction
interface PaymentGateway {
  processPayment(order: Order): Promise<PaymentResult>;
}

class OrderService {
  constructor(private paymentGateway: PaymentGateway) {}
}
```

#### A-004: No Circular Dependencies

| Property | Value |
|----------|-------|
| **Rule ID** | `A-004` |
| **Severity** | Error |
| **Description** | Module import graphs must be acyclic (DAG). |

**Rationale:** Circular dependencies cause initialization issues, make code hard to understand, and prevent tree-shaking. If module A imports B and B imports A, there is a design problem.

**Detection:** The dependency resolver algorithm builds the import graph and checks for cycles during the RESEARCH phase.

**Resolution Strategies:**
1. Extract shared code into a third module that both depend on
2. Use dependency injection to break the cycle at runtime
3. Use dynamic imports for one direction of the dependency
4. Reorganize the module structure

#### A-005: Clean Architecture Layering

| Property | Value |
|----------|-------|
| **Rule ID** | `A-005` |
| **Severity** | Warn |
| **Description** | Code should follow a layered architecture with clear dependency direction. |

**Layered Architecture:**
```
┌────────────────────────────────────────────────────┐
│                  PRESENTATION                       │
│              (Components, Pages, API)                │
│                        │                             │
│                        ▼                             │
│  ┌──────────────────────────────────────────────┐  │
│  │              APPLICATION                      │  │
│  │        (Use Cases, Services, Orchestrators)   │  │
│  └──────────────────────────────────────────────┘  │
│                        │                             │
│                        ▼                             │
│  ┌──────────────────────────────────────────────┐  │
│  │               DOMAIN                          │  │
│  │      (Entities, Value Objects, Interfaces)    │  │
│  └──────────────────────────────────────────────┘  │
│                        │                             │
│                        ▼                             │
│  ┌──────────────────────────────────────────────┐  │
│  │            INFRASTRUCTURE                     │  │
│  │     (Repositories, External Services, DB)     │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  Dependency direction: INWARD only                  │
│  Presentation → Application → Domain ← Infra       │
│                                                     │
└────────────────────────────────────────────────────┘
```

**Rules:**
- Domain layer has ZERO external dependencies
- Application layer depends only on Domain
- Infrastructure implements Domain interfaces
- Presentation depends on Application interfaces

#### A-006: Interface Segregation

| Property | Value |
|----------|-------|
| **Rule ID** | `A-006` |
| **Severity** | Warn |
| **Description** | Clients should not be forced to depend on methods they don't use. |

**Rationale:** Large interfaces force implementers to provide stub implementations for methods they don't need. Prefer small, focused interfaces.

```typescript
// FORBIDDEN: Fat interface
interface Repository<T> {
  findById(id: string): Promise<T>;
  findAll(): Promise<T[]>;
  create(data: T): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  search(query: string): Promise<T[]>;
  count(): Promise<number>;
}

// REQUIRED: Segregated interfaces
interface Readable<T> {
  findById(id: string): Promise<T>;
  findAll(): Promise<T[]>;
}

interface Writable<T> {
  create(data: T): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

interface Searchable<T> {
  search(query: string): Promise<T[]>;
  count(): Promise<number>;
}
```

### Architecture Anti-Patterns

```
┌──────────────────────────────────────────────────────────────────┐
│                 ARCHITECTURE ANTI-PATTERNS                        │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  GOD OBJECT                                                │  │
│  │  A class/module that knows too much, does too much,        │  │
│  │  and depends on everything.                                │  │
│  │                                                             │  │
│  │  Detection: > 500 lines, > 10 methods, > 5 dependencies    │  │
│  │  Fix: Extract responsibilities into focused classes         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  SPAGHETTI CODE                                            │  │
│  │  Tangled control flow with no clear structure.             │  │
│  │                                                             │  │
│  │  Detection: Deep nesting (> 4 levels), long functions      │  │
│  │  Fix: Extract methods, use early returns, simplify logic   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  COPY-PASTE PROGRAMMING                                    │  │
│  │  Duplicated code blocks instead of shared abstractions.    │  │
│  │                                                             │  │
│  │  Detection: Similar code in 3+ locations                   │  │
│  │  Fix: Extract shared functions/utilities/components         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  MAGIC NUMBERS                                             │  │
│  │  Unnamed numeric/string literals scattered in code.        │  │
│  │                                                             │  │
│  │  Detection: Numbers other than 0, 1, -1 in logic           │  │
│  │  Fix: Extract to named constants with descriptive names    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  PREMATURE OPTIMIZATION                                   │  │
│  │  Complex optimizations before measuring actual performance. │  │
│  │                                                             │  │
│  │  Detection: Caching, memoization, bit manipulation         │  │
│  │           without performance data                          │  │
│  │  Fix: Keep it simple, optimize only when measured          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Registering Custom Skills

Custom skills extend the Deerflow framework with project-specific rules. They follow the same `Skill` interface as built-in skills.

### Registration API

```typescript
import { Deerflow, type Skill, type SkillRule } from '@deerflow/core';

// Define your custom skill
const apiDesignSkill: Skill = {
  id: 'api-design',
  name: 'API Design Standards',
  version: '1.0.0',
  priority: 5,
  gateId: 'G001', // Attach to an existing gate, or create a custom one

  rules: [
    {
      id: 'API-001',
      description: 'All API endpoints must use consistent naming (kebab-case)',
      severity: 'error',
      rationale: 'Consistent API naming reduces cognitive load and prevents confusion.',

      check: (ctx) => {
        const issues: SkillIssue[] = [];
        // ... custom check logic
        return issues;
      },
    },
    {
      id: 'API-002',
      description: 'All responses must follow the standard envelope format',
      severity: 'error',
      rationale: 'Consistent response format simplifies client-side error handling.',
      check: (ctx) => { /* ... */ },
    },
  ],

  check: (ctx) => {
    const issues = ctx.files.flatMap((file) =>
      this.rules.flatMap((rule) => rule.check(ctx)),
    );
    return {
      passed: issues.filter((i) => i.severity === 'error').length === 0,
      issues,
      summary: `Found ${issues.length} issues (${issues.filter((i) => i.severity === 'error').length} errors)`,
    };
  },

  fix: (ctx, issue) => {
    // Implement auto-fix if possible
    return { fixed: false, reason: 'Manual fix required' };
  },
};

// Register the skill
const deerflow = new Deerflow();
deerflow.registerSkill(apiDesignSkill);
```

### Custom Skill Best Practices

1. **Use a unique ID prefix** — Follow the pattern `{DOMAIN}-{NUMBER}` (e.g., `API-001`, `DB-001`)
2. **Document every rule** — Every rule must have a clear `description` and `rationale`
3. **Start with warnings** — New rules should start at `warn` severity during the rollout phase
4. **Provide fix suggestions** — Even if auto-fix isn't possible, suggest how to fix the issue
5. **Write tests for your skill** — Custom skills should have their own test suite

### Skill Configuration

```typescript
const deerflow = new Deerflow({
  skills: {
    // Override built-in skill settings
    'code-quality': {
      enabled: true,
      rules: {
        'CQ-009': { severity: 'error' }, // Upgrade function length to error
      },
    },
    'testing': {
      enabled: true,
      rules: {
        'T-002': { thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 } },
      },
    },
    // Custom skills are auto-registered if provided
  },
});
```

---

## Skills & Workflow Integration

Skills are evaluated at specific points in the Deerflow workflow, mapped to quality gates.

```
┌──────────────────────────────────────────────────────────────────┐
│                SKILLS ↔ WORKFLOW INTEGRATION                     │
│                                                                   │
│  WORKFLOW STEP     │  SKILLS EVALUATED    │  GATE                │
│  ─────────────────┼──────────────────────┼──────────────────     │
│  BOOT             │  (none)              │  —                    │
│  ANALYZE          │  (none)              │  —                    │
│  RESEARCH         │  Architecture (scan) │  —                    │
│  PLAN             │  (none)              │  —                    │
│  IMPLEMENT        │  Code Quality (live) │  G001 (partial)       │
│  TEST             │  Testing (live)      │  G002 (partial)       │
│  VERIFY           │  ALL skills          │  G001-G004 (full)     │
│  DELIVER          │  (none)              │  —                    │
│                                                                   │
│  Legend:                                                           │
│  (none) = No skill evaluation at this step                        │
│  (live) = Skills provide real-time feedback during execution      │
│  (scan) = Skills perform analysis without enforcement             │
│  ALL    = Full evaluation of all registered skills               │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Integration Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    SKILL EVALUATION FLOW                          │
│                                                                   │
│  ┌──────────────┐                                                │
│  │  VERIFY step │                                                │
│  │  triggered   │                                                │
│  └──────┬───────┘                                                │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────┐                   │
│  │  Collect all enabled skills               │                   │
│  │  Sort by priority (1 = first)             │                   │
│  └──────────────┬───────────────────────────┘                   │
│                 │                                                │
│                 ▼                                                │
│  ┌──────────────────────────────────────────┐                   │
│  │  For each skill (in priority order):      │                   │
│  │                                            │                   │
│  │  ┌────────────┐  ┌────────────┐           │                   │
│  │  │  Execute   │  │  Collect   │           │                   │
│  │  │  check()   │──│  results   │           │                   │
│  │  └────────────┘  └─────┬──────┘           │                   │
│  │                        │                  │                   │
│  │                   ┌────┴────┐             │                   │
│  │                   │ Issues? │             │                   │
│  │                   └────┬────┘             │                   │
│  │                   YES  │  NO              │                   │
│  │                   ┌────┴────┐             │                   │
│  │                   ▼         ▼             │                   │
│  │             ┌──────────┐ ┌──────┐         │                   │
│  │             │ Attempt  │ │ PASS │         │                   │
│  │             │ fix()    │ └──────┘         │                   │
│  │             └────┬─────┘                  │                   │
│  └──────────────────┼────────────────────────┘                   │
│                     │                                             │
│                     ▼                                             │
│  ┌──────────────────────────────────────────┐                   │
│  │  Compile Gate Report                      │                   │
│  │                                            │                   │
│  │  Gate G001: Code Quality    │ ✅ PASS     │                   │
│  │  Gate G002: Testing         │ ✅ PASS     │                   │
│  │  Gate G003: Security        │ ✅ PASS     │                   │
│  │  Gate G004: Architecture    │ ✅ PASS     │                   │
│  │                                            │                   │
│  │  Overall: ALL GATES PASSED                 │                   │
│  └──────────────────────────────────────────┘                   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Skill Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                  SKILLS REFERENCE CARD                           │
│                                                                  │
│  CODE QUALITY (Priority 1)                                      │
│  ─────────────────────────                                      │
│  CQ-001 │ No `any` type          │ Error                        │
│  CQ-002 │ Prefer `const`         │ Error                        │
│  CQ-003 │ No `var`               │ Error                        │
│  CQ-004 │ No type assertions     │ Error                        │
│  CQ-005 │ No eval/Function       │ Error                        │
│  CQ-006 │ No throw literals      │ Error                        │
│  CQ-007 │ Strict equality        │ Error                        │
│  CQ-008 │ Complexity ≤ 15        │ Error                        │
│  CQ-009 │ Function ≤ 50 lines    │ Warn                         │
│  CQ-010 │ No nested ternaries    │ Error                        │
│  CQ-011 │ Consistent type imports│ Error                        │
│                                                                  │
│  TESTING (Priority 2)                                           │
│  ─────────────────────                                           │
│  T-001 │ Tests for all new code  │ Error                        │
│  T-002 │ Coverage ≥ 80%          │ Error                        │
│  T-003 │ No skipped tests        │ Error                        │
│  T-004 │ No empty test bodies    │ Error                        │
│  T-005 │ Descriptive test names  │ Warn                         │
│                                                                  │
│  SECURITY (Priority 3)                                          │
│  ──────────────────────                                          │
│  S-001 │ No eval/dynamic code   │ Error │ OWASP A03             │
│  S-002 │ No innerHTML           │ Error │ OWASP A03 (XSS)       │
│  S-003 │ Input validation req.  │ Error │ OWASP A03             │
│  S-004 │ No hardcoded secrets   │ Error │ OWASP A05             │
│  S-005 │ No sensitive data logs │ Error │ OWASP A09             │
│  S-006 │ Parameterized queries  │ Error │ OWASP A03 (SQLi)      │
│  S-007 │ Secure error handling  │ Error │ OWASP A04             │
│                                                                  │
│  ARCHITECTURE (Priority 4)                                      │
│  ─────────────────────────                                      │
│  A-001 │ Single Responsibility  │ Error │ SOLID                 │
│  A-002 │ Open/Closed Principle  │ Warn  │ SOLID                 │
│  A-003 │ Dependency Inversion   │ Error │ SOLID                 │
│  A-004 │ No circular deps       │ Error │ DAG                   │
│  A-005 │ Clean Architecture     │ Warn  │ Layering              │
│  A-006 │ Interface Segregation  │ Warn  │ SOLID                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

*This document is part of the Deerflow Agent Framework. For architecture details, see [ARCHITECTURE.md](./ARCHITECTURE.md). For workflow details, see [WORKFLOW.md](./WORKFLOW.md).*
