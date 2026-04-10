# Deerflow Agent Framework — Workflow

> **Version:** 1.0.0
> **Last Updated:** 2025
> **Status:** Active Development

---

## Table of Contents

1. [Overview](#overview)
2. [The Mandatory 8-Step Workflow](#the-mandatory-8-step-workflow)
3. [Step 1: BOOT](#step-1-boot)
4. [Step 2: ANALYZE](#step-2-analyze)
5. [Step 3: RESEARCH](#step-3-research)
6. [Step 4: PLAN](#step-4-plan)
7. [Step 5: IMPLEMENT](#step-5-implement)
8. [Step 6: TEST](#step-6-test)
9. [Step 7: VERIFY](#step-7-verify)
10. [Step 8: DELIVER](#step-8-deliver)
11. [Quality Gate Process](#quality-gate-process)
12. [Fix Protocol](#fix-protocol)
13. [Error Recovery](#error-recovery)
14. [Task Classification & Routing](#task-classification--routing)
15. [ASK vs ACT](#ask-vs-act)
16. [Workflow Reference Card](#workflow-reference-card)

---

## Overview

The Deerflow Workflow is a mandatory, sequential 8-step process that every agent MUST follow for every task. It is designed to ensure quality, correctness, and traceability. **No step may be skipped, reordered, or executed in parallel unless explicitly stated.**

### The Golden Rule

> **"If you haven't understood the problem, researched the codebase, and planned your changes, you are not ready to write code."**

### Workflow Pipeline

```
┌────────┐   ┌─────────┐   ┌──────────┐   ┌──────┐   ┌───────────┐   ┌──────┐   ┌────────┐   ┌─────────┐
│  BOOT  │──▶│ ANALYZE │──▶│ RESEARCH │──▶│ PLAN │──▶│ IMPLEMENT │──▶│ TEST │──▶│ VERIFY │──▶│ DELIVER │
└────────┘   └─────────┘   └──────────┘   └──────┘   └───────────┘   └──────┘   └────────┘   └─────────┘
     1           2            3             4          5              6          7            8
```

---

## The Mandatory 8-Step Workflow

Each step has defined inputs, outputs, and exit criteria. An agent MUST NOT proceed to the next step until all exit criteria for the current step are met.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        WORKFLOW GATE MODEL                               │
│                                                                           │
│   Step ──▶ Exit Criteria Met? ──┬── YES ──▶ Next Step                    │
│                                  │                                       │
│                                  └── NO ───▶ Fix/Retry ──▶ Re-evaluate   │
│                                                                    │     │
│                                                              Max 3x ──┤
│                                                                    │     │
│                                                              ESCALATE ─┤
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: BOOT

**Goal:** Initialize the agent environment and load project context.

### What the Agent MUST Do

1. **Read the project instructions**
   - Load CLAUDE.md, .cursorrules, or equivalent agent configuration
   - Identify the project's coding standards, conventions, and constraints

2. **Scan the project structure**
   - Identify the tech stack (language, framework, build tool)
   - Locate configuration files (tsconfig, eslint, prettier, vitest, etc.)
   - Determine the project's directory organization

3. **Load the Deerflow configuration**
   - Parse `deerflow.config.ts` if present
   - Identify enabled skills and their configurations
   - Load custom rules and constraints

4. **Initialize the Context Manager**
   - Set up the project context (stack, dependencies, structure)
   - Register available MCP tools
   - Prepare the task state tracker

### Exit Criteria

- [ ] Project structure understood
- [ ] Tech stack identified
- [ ] Configuration files read and parsed
- [ ] Deerflow skills loaded
- [ ] Context Manager initialized

### Output

```
Context:
  - project: { name, stack, framework, version }
  - config: { eslint, typescript, prettier, test }
  - skills: [loaded skill IDs]
  - constraints: [extracted rules]
```

---

## Step 2: ANALYZE

**Goal:** Understand the task and determine if it is well-defined.

### What the Agent MUST Do

1. **Parse the task description**
   - Extract the primary objective
   - Identify explicit constraints and requirements
   - List acceptance criteria (if not provided, ASK)

2. **Classify the task**
   - Determine the task type (see [Task Classification](#task-classification--routing))
   - Assess complexity (simple / moderate / complex)
   - Estimate the scope (files affected, lines changed)

3. **Validate completeness**
   - Are the requirements unambiguous?
   - Are the acceptance criteria testable?
   - Is the scope bounded?
   - Are dependencies identified?

4. **Raise clarifications**
   - If ANY requirement is ambiguous → ASK
   - If acceptance criteria are missing → ASK
   - If scope is unbounded → ASK
   - If multiple valid interpretations exist → ASK

> **CRITICAL:** Do NOT guess. If you are unsure about ANY aspect of the task, ASK the user for clarification before proceeding.

### Exit Criteria

- [ ] Task fully understood
- [ ] Task type classified
- [ ] Scope assessed
- [ ] All ambiguities resolved (or escalated)
- [ ] Acceptance criteria defined

### Output

```
Analysis:
  - type: feature | bugfix | refactor | config | docs | perf
  - complexity: simple | moderate | complex
  - scope: { filesEstimated, modulesAffected }
  - requirements: [list]
  - acceptanceCriteria: [list]
  - risks: [list]
  - ambiguities: [] (must be empty)
```

---

## Step 3: RESEARCH

**Goal:** Deeply understand the codebase before making any changes.

### What the Agent MUST Do

1. **Execute the Deep Research Algorithm**
   - Find ALL files related to the task
   - Read and understand the existing code
   - Map the dependency graph for affected modules

2. **Identify existing patterns**
   - How does the codebase handle similar functionality?
   - What naming conventions are used?
   - What architectural patterns are followed?
   - What utilities and helpers already exist?

3. **Assess impact**
   - Which files will be modified?
   - Which files will be created?
   - Which imports/exports will change?
   - What are the downstream effects?
   - Could any existing tests break?

4. **Check for constraints**
   - Are there type constraints that affect the implementation?
   - Are there existing interfaces that must be extended?
   - Are there configuration files that need updating?
   - Are there migration considerations?

5. **Document findings**
   - Write a structured research report
   - List all files to modify with reasons
   - Identify reusable components
   - Note risks and mitigations

### Exit Criteria

- [ ] All relevant files read and understood
- [ ] Existing patterns identified
- [ ] Dependency graph mapped
- [ ] Impact assessment complete
- [ ] Research report written

### Output

```
Research:
  - filesToModify: [path with reasons]
  - filesToCreate: [path with purposes]
  - existingPatterns: [pattern descriptions]
  - dependencies: [import graph]
  - reusableComponents: [component paths]
  - risks: [risk → mitigation pairs]
  - constraints: [identified constraints]
```

---

## Step 4: PLAN

**Goal:** Create a detailed, step-by-step implementation plan.

### What the Agent MUST Do

1. **Break down the implementation**
   - Divide the task into atomic, ordered steps
   - Each step should be independently testable
   - Steps should be ordered by dependency (fundamental changes first)

2. **For each step, specify**
   - The file(s) to modify
   - The nature of the change (add, modify, delete)
   - The expected outcome
   - How to verify correctness

3. **Plan tests upfront**
   - Identify which test files need to be created or modified
   - List the test cases for each change
   - Plan for edge cases and error scenarios

4. **Present the plan**
   - Write the plan in clear, numbered format
   - Include rationale for major decisions
   - Flag any tradeoffs or alternatives considered

### Exit Criteria

- [ ] Implementation broken into ordered steps
- [ ] Each step is atomic and testable
- [ ] Test plan created
- [ ] Plan reviewed against research findings

### Output

```
Plan:
  steps:
    - step: 1
      action: "Add new type definition"
      files: ["src/types/user.ts"]
      rationale: "Required by steps 2 and 4"
    - step: 2
      action: "Implement service method"
      files: ["src/services/userService.ts"]
      rationale: "Core business logic"
    ...
  testPlan:
    - file: "src/services/userService.test.ts"
      cases: ["should create user", "should validate input", ...]
  tradeoffs: []
```

---

## Step 5: IMPLEMENT

**Goal:** Write the code according to the plan, following all Deerflow quality rules.

### What the Agent MUST Do

1. **Follow the plan exactly**
   - Implement steps in the planned order
   - Do not deviate from the plan without documenting the reason
   - Each step should be a single, focused change

2. **Apply Deerflow quality rules**
   - No `any` types (use `unknown` and narrow)
   - Use `const` exclusively; `let` only when reassignment is required
   - No `var`, no implicit any, no type assertions (`as`)
   - Use proper error handling (typed errors, not throw strings)
   - Follow the project's naming conventions
   - Keep functions under 50 lines
   - Keep cyclomatic complexity under 15
   - Use immutable patterns

3. **Write tests alongside code**
   - For each new function or component, write its tests immediately
   - Do NOT batch tests for later — write them now
   - Use descriptive test names: "should [expected behavior] when [condition]"
   - Cover happy paths, edge cases, and error cases

4. **Self-review each change**
   - Before moving to the next step, review what was just written
   - Check for type safety, naming consistency, and architectural alignment
   - Ensure the change doesn't break existing code

### Exit Criteria

- [ ] All planned steps implemented
- [ ] All new code has corresponding tests
- [ ] No TypeScript errors
- [ ] No ESLint errors (at error level)
- [ ] Self-review complete

### Quality Rules Quick Reference

```
FORBIDDEN                        REQUIRED
────────────────────────────     ────────────────────────────
any                              unknown + type narrowing
var                              const (or let if needed)
as Type                          proper type guards
throw "string"                   throw new ErrorClass(msg)
eval()                           parsed/validated input
innerHTML                        textContent / sanitizer
console.log (in prod)            proper logging library
```

---

## Step 6: TEST

**Goal:** Execute the full test suite and verify all tests pass.

### What the Agent MUST Do

1. **Run the full test suite**
   - Execute: `npx vitest run --coverage` (or project equivalent)
   - Ensure ALL existing tests still pass (no regressions)

2. **Verify coverage thresholds**
   - Statements: ≥ 80%
   - Branches: ≥ 80%
   - Functions: ≥ 80%
   - Lines: ≥ 80%

3. **Analyze test quality**
   - Are there any skipped tests? (Fix or justify)
   - Are there any flaky tests? (Investigate and fix)
   - Are there any tests with empty bodies? (Remove or implement)
   - Are there any TODO tests? (Implement or create follow-up task)

4. **Review test anti-patterns**
   - No testing implementation details (test behavior, not internals)
   - No overly mocked tests (mock at boundaries, not everywhere)
   - No snapshot abuse (snapshots for stable UI, not logic)
   - No test interdependencies (each test must be independent)

### Exit Criteria

- [ ] All tests pass (0 failures)
- [ ] Coverage meets thresholds (≥ 80% all metrics)
- [ ] No skipped or TODO tests (unless justified)
- [ ] No test anti-patterns detected

### Output

```
TestResults:
  - total: 42
  - passed: 42
  - failed: 0
  - skipped: 0
  - coverage:
      statements: 87%
      branches: 82%
      functions: 91%
      lines: 87%
```

---

## Step 7: VERIFY

**Goal:** Run all quality gates and confirm the deliverable is production-ready.

### What the Agent MUST Do

1. **Run Quality Gate G001 — Code Quality**
   - TypeScript compilation: `npx tsc --noEmit`
   - ESLint check: `npx eslint src/ --max-warnings 0`
   - Complexity check: no function exceeding complexity 15
   - Function length check: no function exceeding 50 lines

2. **Run Quality Gate G002 — Test Coverage**
   - Verify coverage thresholds met
   - Verify no regression in overall coverage

3. **Run Quality Gate G003 — Security**
   - Check for forbidden patterns: eval, innerHTML, Function constructor
   - Verify input validation on all public APIs
   - Check for hardcoded secrets or credentials
   - Verify dependency security: `npm audit` or equivalent

4. **Run Quality Gate G004 — Architecture**
   - Verify SOLID principles in new code
   - Check for circular dependencies
   - Verify clean separation of concerns
   - Check that new code follows existing patterns

### Exit Criteria

- [ ] G001 (Code Quality): PASSED
- [ ] G002 (Testing): PASSED
- [ ] G003 (Security): PASSED
- [ ] G004 (Architecture): PASSED

---

## Step 8: DELIVER

**Goal:** Present the completed work with full documentation.

### What the Agent MUST Do

1. **Compile the delivery package**
   - List all files modified (with purpose)
   - List all files created (with purpose)
   - List all files deleted (with reason)

2. **Provide a change summary**
   - What was the task?
   - What was done?
   - What are the key decisions?
   - What are the tradeoffs (if any)?

3. **Include test results**
   - Final test counts and coverage
   - Evidence that all gates passed

4. **Note any follow-ups**
   - Outstanding items not in scope
   - Recommended future improvements
   - Known limitations

### Output Format

```markdown
## Delivery Report

### Task: [task description]

### Changes Made
| File | Action | Purpose |
|------|--------|---------|
| src/foo.ts | Modified | Added new function bar() |
| src/foo.test.ts | Created | Tests for bar() |

### Quality Gates
- G001 Code Quality: ✅ PASSED
- G002 Testing: ✅ PASSED (87% coverage)
- G003 Security: ✅ PASSED
- G004 Architecture: ✅ PASSED

### Test Results
- 42 passed, 0 failed

### Follow-ups
- Consider adding rate limiting to bar() in future iteration
```

---

## Quality Gate Process

Quality gates are evaluated after specific workflow steps. Each gate produces a PASS or FAIL result.

```
┌───────────────────────────────────────────────────────────────┐
│                   QUALITY GATE PROCESS                         │
│                                                                │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────┐       │
│  │  Run     │────▶│  Evaluate    │────▶│   Report     │       │
│  │  Checks  │     │  Results     │     │   Status     │       │
│  └──────────┘     └──────┬───────┘     └──────────────┘       │
│                          │                                     │
│                   ┌──────┴──────┐                              │
│                   │   Result?   │                              │
│                   └──────┬──────┘                              │
│                     PASS │ FAIL                               │
│                    ┌─────┴─────┐                              │
│                    ▼           ▼                               │
│              ┌──────────┐ ┌────────────┐                       │
│              │ CONTINUE │ │   FIX      │                       │
│              │ to next  │ │  PROTOCOL  │                       │
│              │   step   │ │            │                       │
│              └──────────┘ └────────────┘                       │
│                                                                │
│  Gate Evaluation Order:                                        │
│  1. G001 Code Quality  (after IMPLEMENT)                      │
│  2. G002 Testing       (after TEST)                           │
│  3. G003 Security      (after TEST)                           │
│  4. G004 Architecture (after TEST)                            │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

### Gate Failure Severity

| Severity | Description | Action |
|----------|-------------|--------|
| **Critical** | TypeScript error, test failure, security vulnerability | Must fix immediately |
| **Major** | ESLint error, complexity violation, missing tests | Must fix before delivery |
| **Minor** | Naming inconsistency, missing comment, style issue | Should fix, can defer |

---

## Fix Protocol

The Fix Protocol is invoked when a quality gate fails. It follows a structured approach to resolve issues efficiently.

```
┌──────────────────────────────────────────────────────────────────┐
│                      FIX PROTOCOL                                │
│                                                                   │
│  MAX_ITERATIONS = 3                                              │
│  iteration = 0                                                   │
│                                                                   │
│  while (gate_failed && iteration < MAX_ITERATIONS):              │
│                                                                   │
│    iteration++                                                   │
│    LOG "[Fix Protocol] Iteration {iteration}/{MAX_ITERATIONS}"   │
│                                                                   │
│    1. COLLECT failures                                          │
│       ├── Parse gate output                                     │
│       ├── Group by type (type error, lint error, test failure)  │
│       └── Prioritize (critical > major > minor)                 │
│                                                                   │
│    2. ANALYZE root cause                                        │
│       ├── What caused the failure?                              │
│       ├── Is it a direct effect of the change?                  │
│       ├── Is it an indirect side effect?                        │
│       └── Could the fix cause regressions?                      │
│                                                                   │
│    3. GENERATE fix strategy                                     │
│       ├── Minimal change that fixes the issue                   │
│       ├── Must not break previously passing gates               │
│       └── Must not introduce new issues                         │
│                                                                   │
│    4. APPLY fix                                                  │
│       ├── Implement the minimal fix                             │
│       ├── Verify the fix compiles                               │
│       └── Document what was changed and why                     │
│                                                                   │
│    5. RE-RUN all gates                                          │
│       ├── Must re-run ALL gates, not just the failed one        │
│       ├── Check for regressions                                 │
│       └── If all pass → CONTINUE                                │
│                                                                   │
│  if (iteration >= MAX_ITERATIONS):                              │
│    ESCALATE "Unable to resolve issues after {MAX_ITERATIONS}"   │
│    ASK_HUMAN for guidance                                       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Fix Protocol Rules

1. **Minimal changes only** — Do not refactor during fixes. Fix the specific issue and nothing else.
2. **Re-run everything** — After a fix, re-run ALL quality gates, not just the one that failed.
3. **Track iterations** — Log each fix attempt. If it takes more than 3 attempts, escalate.
4. **Never introduce new issues** — A fix that passes one gate but breaks another is not a fix.
5. **Document the fix** — Explain what went wrong and why the fix works.

---

## Error Recovery

### Types of Errors

```
┌──────────────────────────────────────────────────────────────┐
│                     ERROR TYPES                               │
│                                                               │
│  ┌─────────────────────┐  ┌─────────────────────────────┐   │
│  │   RECOVERABLE       │  │      UNRECOVERABLE          │   │
│  │                     │  │                             │   │
│  │  • Lint error       │  │  • Circular dependency     │   │
│  │  • Type error       │  │    that can't be resolved  │   │
│  │  • Test failure     │  │  • Fundamental design      │   │
│  │  • Coverage gap     │  │    conflict                │   │
│  │  • Style violation  │  │  • Missing dependencies    │   │
│  │                     │  │    that can't be installed │   │
│  │  ACTION: Fix        │  │  • Scope too large for     │   │
│  │  Protocol           │  │    single task             │   │
│  │                     │  │                             │   │
│  │                     │  │  ACTION: ESCALATE to human │   │
│  └─────────────────────┘  └─────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │                  AMBIGUOUS                          │     │
│  │                                                     │     │
│  │  • Multiple valid approaches                        │     │
│  │  • Conflicting requirements                         │     │
│  │  • Unclear expected behavior                        │     │
│  │  • Missing context                                  │     │
│  │                                                     │     │
│  │  ACTION: ASK user for clarification                 │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Recovery Strategies

| Situation | Strategy |
|-----------|----------|
| **Lint/type error** | Fix Protocol (max 3 iterations) |
| **Test failure** | Analyze failure → Fix → Re-run all tests |
| **Coverage below threshold** | Identify untested paths → Write targeted tests |
| **Circular dependency** | Refactor to break cycle → Update imports → Re-test |
| **Breaking change detected** | Assess impact → Plan migration → Implement |
| **Scope creep detected** | Stop → Re-scope → Get confirmation → Resume |
| **Unresolvable conflict** | ESCALATE immediately with full context |

---

## Task Classification & Routing

Tasks are classified at the ANALYZE step and routed through the appropriate workflow variant.

```
┌──────────────────────────────────────────────────────────────────┐
│                  TASK CLASSIFICATION                              │
│                                                                   │
│  ┌────────────┐                                                   │
│  │   INPUT    │                                                   │
│  │   TASK     │                                                   │
│  └─────┬──────┘                                                   │
│        │                                                          │
│        ▼                                                          │
│  ┌───────────────────────────────────────────────────┐           │
│  │              CLASSIFICATION QUESTIONS               │           │
│  │                                                    │           │
│  │  Q1: Is this adding NEW functionality?             │           │
│  │      YES → FEATURE                                │           │
│  │      NO  → Q2                                     │           │
│  │                                                    │           │
│  │  Q2: Is this fixing a KNOWN defect?                │           │
│  │      YES → BUGFIX                                 │           │
│  │      NO  → Q3                                     │           │
│  │                                                    │           │
│  │  Q3: Is this changing code WITHOUT new behavior?   │           │
│  │      YES → REFACTOR                               │           │
│  │      NO  → Q4                                     │           │
│  │                                                    │           │
│  │  Q4: Is this a config, build, or infra change?     │           │
│  │      YES → CONFIG                                 │           │
│  │      NO  → Q5                                     │           │
│  │                                                    │           │
│  │  Q5: Is this documentation or comments only?       │           │
│  │      YES → DOCS                                   │           │
│  │      NO  → Q6                                     │           │
│  │                                                    │           │
│  │  Q6: Is this about performance optimization?       │           │
│  │      YES → PERF                                  │           │
│  │      NO  → UNKNOWN → ASK                         │           │
│  │                                                    │           │
│  └───────────────────────────────────────────────────┘           │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │              WORKFLOW VARIANTS                             │   │
│  │                                                            │   │
│  │  FEATURE:  Full 8-step workflow                           │   │
│  │  BUGFIX:   Full 8-step workflow (RESEARCH is critical)    │   │
│  │  REFACTOR: Full 8-step workflow (extra ARCHITECTURE gate) │   │
│  │  CONFIG:   BOOT → ANALYZE → PLAN → IMPLEMENT → VERIFY     │   │
│  │  DOCS:     BOOT → ANALYZE → IMPLEMENT → DELIVER           │   │
│  │  PERF:     Full 8-step + benchmark comparison             │   │
│  │                                                            │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Routing Rules

- **FEATURE** and **BUGFIX** always require the full workflow — no exceptions
- **REFACTOR** tasks require additional architecture validation due to structural changes
- **CONFIG** tasks can skip RESEARCH and TEST if no runtime code is affected
- **DOCS** tasks follow a streamlined workflow (no quality gates for markdown)
- **PERF** tasks require before/after benchmarking as part of VERIFY

---

## ASK vs ACT

One of the most important decisions an agent makes is whether to ASK the user for clarification or to ACT on its best understanding. This decision framework guides that choice.

### Decision Tree

```
┌──────────────────────────────────────────────────────────────────┐
│                     ASK vs ACT DECISION                          │
│                                                                   │
│  Am I confident I understand the requirement?                     │
│  ├── YES → Is there only ONE valid interpretation?                │
│  │          ├── YES → Is the scope clear and bounded?             │
│  │          │          ├── YES → ACT                             │
│  │          │          └── NO  → ASK (clarify scope)             │
│  │          └── NO  → ASK (multiple valid approaches)            │
│  └── NO → ASK (always ask when uncertain)                        │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### When to ASK

You MUST ASK when:

- The task description has **any ambiguity**
- Multiple **valid implementations** exist and you're not sure which to choose
- The **scope is unbounded** (could keep adding features forever)
- A change might have **breaking effects** on other parts of the system
- You need to make a **design decision** that affects the project's architecture
- You've **exceeded the fix protocol** limit (3 iterations)
- You discover **additional requirements** that weren't in the original task
- The **research phase** reveals information that contradicts the task description

### When to ACT

You SHOULD ACT when:

- The requirement is **unambiguous and clear**
- There is **only one reasonable implementation**
- The **scope is well-defined and bounded**
- You have **complete context** from the research phase
- The change is **local and isolated** (doesn't affect other modules)
- It's a **mechanical change** (rename, reformat, add logging, etc.)
- The **pattern already exists** in the codebase and you're replicating it

### ASK Template

When you need to ask, structure your question clearly:

```markdown
I need clarification before proceeding:

**Question:** [clear, specific question]

**Context:** [what you've learned from research]

**Options I'm considering:**
1. [Option A] — pros: ..., cons: ...
2. [Option B] — pros: ..., cons: ...

**My recommendation:** Option [X] because [rationale]

Please confirm or provide additional guidance.
```

---

## Workflow Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                DEERFLOW WORKFLOW REFERENCE CARD                 │
│                                                                  │
│  Step    │ Action         │ Key Question                        │
│  ────────┼────────────────┼────────────────────────────────────  │
│  BOOT    │ Load context   │ "What am I working with?"           │
│  ANALYZE │ Understand     │ "What am I being asked to do?"      │
│  RESEARCH│ Deep dive      │ "How does the codebase work?"       │
│  PLAN    │ Design         │ "How will I implement this?"        │
│  IMPLEMENT│ Code          │ "Am I following the plan & rules?"  │
│  TEST    │ Verify tests   │ "Does everything work?"             │
│  VERIFY  │ Quality gates  │ "Is it production-ready?"           │
│  DELIVER │ Report         │ "What did I do?"                    │
│                                                                  │
│  QUALITY GATES:                                                 │
│  G001 Code Quality  │ tsc + eslint + complexity                 │
│  G002 Testing       │ coverage ≥ 80% all metrics                │
│  G003 Security      │ no forbidden patterns, audit clean        │
│  G004 Architecture  │ SOLID, no cycles, clean separation        │
│                                                                  │
│  FIX PROTOCOL:                                                  │
│  Max 3 iterations → ESCALATE on failure                         │
│  Re-run ALL gates after each fix                                │
│                                                                  │
│  GOLDEN RULES:                                                  │
│  • Never skip a workflow step                                   │
│  • Never use `any` type                                         │
│  • Never guess — ASK when uncertain                             │
│  • Always write tests with new code                              │
│  • Never deliver with failing gates                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

*This document is part of the Deerflow Agent Framework. For architecture details, see [ARCHITECTURE.md](./ARCHITECTURE.md). For skills documentation, see [SKILLS.md](./SKILLS.md).*
