# Deerflow Agent Framework — Architecture

> **Version:** 1.0.0
> **Last Updated:** 2025
> **Status:** Active Development

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Core Modules](#core-modules)
4. [Skills System](#skills-system)
5. [Algorithm Suite](#algorithm-suite)
6. [MCP Integration](#mcp-integration)
7. [Rule Enforcement Flow](#rule-enforcement-flow)
8. [Agent Compatibility Matrix](#agent-compatibility-matrix)
9. [Data Flow](#data-flow)
10. [Design Principles](#design-principles)

---

## Overview

The Deerflow Agent Framework is a quality-first, rule-enforced AI agent orchestration system. It is designed to ensure that every code change produced by an AI agent meets the highest standards of code quality, test coverage, security, and architectural integrity.

### Key Design Goals

| Goal | Description |
|------|-------------|
| **Zero-Compromise Quality** | Every output must pass all quality gates before delivery |
| **Deterministic Workflows** | Agents follow mandatory, sequential steps — no shortcuts |
| **Skill-Based Enforcement** | Modular skill system that can be extended for domain-specific rules |
| **Deep Research First** | Agents must understand before they act |
| **Self-Healing** | Built-in fix protocols for when quality gates fail |

### Philosophy

```
┌─────────────────────────────────────────────────────────┐
│                    DEERFLOW PHILOSOPHY                   │
│                                                         │
│   "An AI agent that skips understanding produces        │
│    code that skips correctness."                         │
│                                                         │
│   1. UNDERSTAND before you write                        │
│   2. RESEARCH before you plan                           │
│   3. PLAN before you implement                          │
│   4. TEST before you deliver                            │
│   5. VERIFY before you claim done                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        DEERFLOW AGENT FRAMEWORK                         │
│                                                                          │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐   │
│  │   BOOT     │───▶│  ANALYZE   │───▶│  RESEARCH   │───▶│   PLAN     │   │
│  │  Module    │    │  Module    │    │  Engine     │    │  Module    │   │
│  └────────────┘    └────────────┘    └────────────┘    └────────────┘   │
│        │                  │                 │                  │          │
│        ▼                  ▼                 ▼                  ▼          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    CONTEXT MANAGER                              │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │    │
│  │  │ Project  │  │  Codebase│  │  Task    │  │  Constraint  │   │    │
│  │  │ Context  │  │  Model   │  │  State   │  │  Registry    │   │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐   │
│  │ IMPLEMENT  │───▶│    TEST    │───▶│   VERIFY    │───▶│  DELIVER   │   │
│  │  Module    │    │  Module    │    │  Module     │    │  Module    │   │
│  └────────────┘    └────────────┘    └────────────┘    └────────────┘   │
│        │                  │                 │                  │          │
│        ▼                  ▼                 ▼                  ▼          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      QUALITY GATES                             │    │
│  │  ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌──────────────┐  │    │
│  │  │    Code    │ │  Testing   │ │ Security │ │ Architecture │  │    │
│  │  │  Quality   │ │ Coverage   │ │ Scanner  │ │   Validator  │  │    │
│  │  └────────────┘ └────────────┘ └──────────┘ └──────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                       SKILLS LAYER                              │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │    │
│  │  │  Code    │ │  Test     │ │ Security │ │ Architecture  │   │    │
│  │  │ Quality  │ │ Engine    │ │ Scanner  │ │  Enforcer     │   │    │
│  │  │  Skill   │ │  Skill    │ │  Skill   │ │   Skill       │   │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                   ALGORITHM SUITE                               │    │
│  │  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐  │    │
│  │  │    Deep      │  │    Iterative     │  │   Dependency     │  │    │
│  │  │  Research    │  │   Refinement     │  │    Resolver      │  │    │
│  │  │  Algorithm   │  │   Algorithm      │  │   Algorithm      │  │    │
│  │  └──────────────┘  └──────────────────┘  └──────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     MCP INTEGRATION                             │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │    │
│  │  │  File System │  │   Context    │  │    External Tool     │ │    │
│  │  │   Provider   │  │   Provider   │  │    Providers         │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Core Modules

### 1. Workflow Engine

The Workflow Engine is the central orchestrator. It enforces the mandatory Deerflow pipeline and ensures no step is skipped.

```
┌─────────────────────────────────────────────────────┐
│                 WORKFLOW ENGINE                      │
│                                                      │
│   States: BOOT → ANALYZE → RESEARCH → PLAN →        │
│           IMPLEMENT → TEST → VERIFY → DELIVER        │
│                                                      │
│   ┌─────────────────────────────────────────┐        │
│   │  State Machine                          │        │
│   │  - Tracks current workflow step         │        │
│   │  - Enforces sequential progression      │        │
│   │  - Handles backtracking on failures     │        │
│   │  - Manages retry/fix loops              │        │
│   └─────────────────────────────────────────┘        │
│                                                      │
│   ┌─────────────────────────────────────────┐        │
│   │  Quality Gate Controller                │        │
│   │  - Triggers gate evaluation             │        │
│   │  - Collects gate results                │        │
│   │  - Routes to fix protocol on failure    │        │
│   │  - Allows max 3 fix iterations          │        │
│   └─────────────────────────────────────────┘        │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Responsibilities:**

- Maintain the workflow state machine
- Enforce mandatory step ordering
- Coordinate between Context Manager, Skills, and Quality Gates
- Handle error recovery and fix loops
- Track agent progress and report status

### 2. Context Manager

The Context Manager builds and maintains a rich understanding of the project.

```
┌─────────────────────────────────────────────────────┐
│                CONTEXT MANAGER                       │
│                                                      │
│   ┌──────────────┐  ┌────────────────────────┐     │
│   │ Project Scan │  │  Codebase Model        │     │
│   │              │  │                        │     │
│   │ - Structure  │  │  - File tree           │     │
│   │ - Config     │  │  - Import graph        │     │
│   │ - Deps       │  │  - Type dependencies   │     │
│   │ - Stack      │  │  - Call graph          │     │
│   └──────────────┘  └────────────────────────┘     │
│                                                      │
│   ┌──────────────┐  ┌────────────────────────┐     │
│   │ Task Context │  │  Constraint Registry   │     │
│   │              │  │                        │     │
│   │ - Requirements│ │  - ESLint rules        │     │
│   │ - Constraints │ │  - TypeScript config   │     │
│   │ - Acceptance  │ │  - Test config         │     │
│   │ - Scope       │ │  - Custom rules        │     │
│   └──────────────┘  └────────────────────────┘     │
│                                                      │
│   ┌──────────────────────────────────────────┐      │
│   │  Task State                              │      │
│   │  - Current step                          │      │
│   │  - Files modified                        │      │
│   │  - Gates passed/failed                   │      │
│   │  - Fix iteration count                   │      │
│   └──────────────────────────────────────────┘      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 3. Quality Gates

Quality Gates are pass/fail checkpoints between workflow stages. Every gate must pass before the agent can proceed.

```
┌──────────────────────────────────────────────────────────────┐
│                     QUALITY GATES                             │
│                                                               │
│   Gate ID     │ Trigger    │ Pass Criteria                    │
│   ────────────┼────────────┼───────────────────────────────── │
│   G001        │ After      │ No TypeScript/ESLint errors      │
│               │ IMPLEMENT  │ No any types (strict)            │
│               │            │ Max complexity: 15               │
│               │            │ Max function length: 50 lines    │
│   ────────────┼────────────┼───────────────────────────────── │
│   G002        │ After      │ All new code has tests           │
│               │ TEST       │ Coverage ≥ 80% (all metrics)     │
│               │            │ No flaky/skipped tests           │
│   ────────────┼────────────┼───────────────────────────────── │
│   G003        │ After      │ No known vulnerability patterns  │
│               │ VERIFY     │ No eval/innerHTML/Function       │
│               │            │ Input validation present          │
│               │            │ No hardcoded secrets              │
│   ────────────┼────────────┼───────────────────────────────── │
│   G004        │ After      │ SOLID principles followed        │
│               │ VERIFY     │ No circular dependencies         │
│               │            │ Clean separation of concerns      │
│               │            │ No anti-patterns detected         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 4. Task Validator

The Task Validator ensures that the task itself is well-defined before work begins.

```
┌─────────────────────────────────────────────────────┐
│                TASK VALIDATOR                        │
│                                                      │
│   ┌─────────────────────────────────────────┐        │
│   │  Input Validation                        │        │
│   │  - Task description is complete          │        │
│   │  - Acceptance criteria are defined       │        │
│   │  - Scope is bounded                      │        │
│   │  - Dependencies are identified           │        │
│   └─────────────────────────────────────────┘        │
│                                                      │
│   ┌─────────────────────────────────────────┐        │
│   │  Task Classification                    │        │
│   │                                         │        │
│   │  ┌─────────┐ ┌─────────┐ ┌──────────┐  │        │
│   │  │ Feature │ │   Bug   │ │ refactor │  │        │
│   │  │   Add   │ │   Fix   │ │ Improve  │  │        │
│   │  └─────────┘ └─────────┘ └──────────┘  │        │
│   │  ┌─────────┐ ┌─────────┐ ┌──────────┐  │        │
│   │  │ Config  │ │  Docs   │ │  perf    │  │        │
│   │  │ Change  │ │ Update  │ │optimize  │  │        │
│   │  └─────────┘ └─────────┘ └──────────┘  │        │
│   └─────────────────────────────────────────┘        │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## Skills System

The Skills System is a modular, extensible framework for enforcing domain-specific rules. Each skill encapsulates a set of rules, checks, and automated enforcement mechanisms.

```
┌─────────────────────────────────────────────────────────────────┐
│                      SKILLS LAYER                                │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Skill Interface                           ││
│  │                                                              ││
│  │  interface Skill {                                           ││
│  │    id: string;                                               ││
│  │    name: string;                                             ││
│  │    version: string;                                          ││
│  │    rules: Rule[];                                            ││
│  │    check(ctx: Context): Result;                              ││
│  │    fix(ctx: Context, issue: Issue): FixResult;               ││
│  │    priority: number;                                         ││
│  │  }                                                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐ │
│  │   CODE     │  │   TEST     │  │  SECURITY  │  │ ARCHITECT │ │
│  │  QUALITY   │  │   ENGINE   │  │  SCANNER   │  │  ENFORCER │ │
│  │            │  │            │  │            │  │           │ │
│  │ • No any   │  │ • Tests    │  │ • OWASP    │  │ • SOLID   │ │
│  │ • Const    │  │   required │  │ • No eval  │  │ • Clean   │ │
│  │ • Immutab. │  │ • Coverage │  │ • Validate │  │   Arch.   │ │
│  │ • No dupes │  │ • No flaky│  │ • Sanitize │  │ • DDD      │ │
│  │ • Errors   │  │ • Mocking  │  │ • Secrets  │  │ • KISS     │ │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Custom Skill Registration                       ││
│  │                                                              ││
│  │   deerflow.registerSkill({                                  ││
│  │     id: 'my-custom-skill',                                  ││
│  │     name: 'My Custom Rules',                                ││
│  │     rules: [...],                                           ││
│  │     check: (ctx) => { ... },                                ││
│  │     fix: (ctx, issue) => { ... },                           ││
│  │   });                                                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Built-In Skills

| Skill | Priority | Gate Trigger | Description |
|-------|----------|-------------|-------------|
| **Code Quality** | 1 | G001 | ESLint strict rules, TypeScript strict mode, complexity limits |
| **Testing** | 2 | G002 | Test generation, coverage enforcement, anti-pattern detection |
| **Security** | 3 | G003 | OWASP alignment, vulnerability scanning, input validation |
| **Architecture** | 4 | G004 | SOLID enforcement, Clean Architecture, dependency management |

---

## Algorithm Suite

### Deep Research Algorithm

The Deep Research algorithm ensures agents have comprehensive understanding before taking action.

```
┌──────────────────────────────────────────────────────────────┐
│                DEEP RESEARCH ALGORITHM                        │
│                                                               │
│  Input: Task description                                      │
│  Output: Comprehensive research report                        │
│                                                               │
│  Step 1: SURFACE SCAN                                         │
│  ├── Identify relevant files (glob, grep)                     │
│  ├── Parse configuration (tsconfig, eslint, etc.)            │
│  └── Detect tech stack and patterns                           │
│                                                               │
│  Step 2: DEEP ANALYSIS                                        │
│  ├── Read and parse all relevant source files                  │
│  ├── Build import/dependency graph                            │
│  ├── Identify shared types and interfaces                     │
│  └── Map call chains and data flow                            │
│                                                               │
│  Step 3: IMPACT ASSESSMENT                                    │
│  ├── Identify files that will be modified                     │
│  ├── Predict downstream effects                               │
│  ├── Check for breaking changes                               │
│  └── Identify test files to update                            │
│                                                               │
│  Step 4: PATTERN RECOGNITION                                   │
│  ├── Match existing code style and conventions                │
│  ├── Identify naming patterns                                 │
│  ├── Detect architectural patterns in use                     │
│  └── Catalog reusable utilities and helpers                   │
│                                                               │
│  Step 5: KNOWLEDGE SYNTHESIS                                  │
│  ├── Compile findings into structured report                  │
│  ├── List constraints and requirements                        │
│  └── Identify risks and mitigations                           │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Iterative Refinement Algorithm

```
┌──────────────────────────────────────────────────────────────┐
│              ITERATIVE REFINEMENT ALGORITHM                   │
│                                                               │
│  while (quality_gate_failed && iterations < MAX_ITERATIONS): │
│                                                               │
│    1. ANALYZE failure                                         │
│       ├── Parse error/lint output                             │
│       ├── Classify failure type                               │
│       └── Rank by severity                                    │
│                                                               │
│    2. GENERATE fix plan                                       │
│       ├── Map failures to rules                               │
│       ├── Determine fix strategy                              │
│       └── Predict side effects                                │
│                                                               │
│    3. APPLY fixes                                             │
│       ├── Execute targeted modifications                      │
│       ├── Preserve unrelated code                             │
│       └── Track changes made                                  │
│                                                               │
│    4. RE-VALIDATE                                             │
│       ├── Re-run quality gates                                │
│       ├── Check for regressions                               │
│       └── Update iteration count                              │
│                                                               │
│  if (iterations >= MAX_ITERATIONS):                           │
│    → ESCALATE to human review                                 │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Dependency Resolver Algorithm

```
┌──────────────────────────────────────────────────────────────┐
│              DEPENDENCY RESOLVER ALGORITHM                    │
│                                                               │
│  1. SCAN     → Build file dependency graph                    │
│  2. TOPO     → Topological sort for execution order           │
│  3. CYCLE    → Detect and report circular dependencies        │
│  4. IMPACT   → Map change impact radius                      │
│  5. PLAN     → Determine optimal modification order          │
│  6. VALIDATE → Ensure no orphaned dependencies               │
│                                                               │
│  Example:                                                     │
│                                                               │
│    A.ts → B.ts → C.ts                                        │
│      ↘         ↗                                             │
│       D.ts ────                                               │
│                                                               │
│  Execution order: C → B → D → A                               │
│  Impact of changing B: {A, D}                                 │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## MCP Integration

The Model Context Protocol (MCP) integration enables Deerflow agents to interact with external tools and services through a standardized interface.

```
┌──────────────────────────────────────────────────────────────────┐
│                      MCP INTEGRATION                             │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    MCP Host Layer                          │  │
│  │                                                            │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐  │  │
│  │  │   Tool      │  │   Resource   │  │    Prompt       │  │  │
│  │  │  Registry   │  │   Registry   │  │   Templates     │  │  │
│  │  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘  │  │
│  │         │                │                    │           │  │
│  │         └────────────────┼────────────────────┘           │  │
│  │                          │                                │  │
│  │                          ▼                                │  │
│  │              ┌───────────────────────┐                    │  │
│  │              │    Transport Layer    │                    │  │
│  │              │  (stdio / HTTP / SSE) │                    │  │
│  │              └───────────────────────┘                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    MCP Servers                             │  │
│  │                                                            │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌───────────────────┐ │  │
│  │  │ File System  │ │   Context    │ │   External APIs    │ │  │
│  │  │   Server     │ │   Server     │ │   (GitHub, etc.)   │ │  │
│  │  │              │ │              │ │                    │ │  │
│  │  │ • read_file  │ │ • store_ctx  │ │ • search_code     │ │  │
│  │  │ • write_file │ │ • query_ctx  │ │ • fetch_docs      │ │  │
│  │  │ • glob       │ │ • update_ctx │ │ • check_vulns     │ │  │
│  │  │ • grep       │ │ • clear_ctx  │ │ • get_metrics     │ │  │
│  │  └──────────────┘ └──────────────┘ └───────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### MCP Tool Categories

| Category | Tools | Purpose |
|----------|-------|---------|
| **File System** | read, write, glob, grep, stat | Source file manipulation |
| **Context** | store, query, update, clear | Persistent context management |
| **Code Analysis** | parse, lint, typecheck, metrics | Static analysis |
| **Testing** | run, coverage, snapshot | Test execution and reporting |
| **Security** | scan, audit, dependency-check | Vulnerability detection |
| **External** | search, fetch, api-call | Third-party integrations |

---

## Rule Enforcement Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   RULE ENFORCEMENT FLOW                         │
│                                                                  │
│  Task Received                                                   │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────┐     NO     ┌───────────────────┐                  │
│  │  Valid   │───────────▶│  ASK CLARIFICATION │                  │
│  │  Task?   │            │  (Do NOT proceed)  │                  │
│  └────┬─────┘            └───────────────────┘                  │
│       │ YES                                                     │
│       ▼                                                          │
│  ┌──────────┐                                                   │
│  │  CLASSIFY│  → Feature / Bug / Refactor / Config / Docs       │
│  └────┬─────┘                                                   │
│       ▼                                                          │
│  ┌──────────┐                                                   │
│  │   BOOT   │  → Load project context, configure skills         │
│  └────┬─────┘                                                   │
│       ▼                                                          │
│  ┌──────────┐     NO     ┌──────────────┐                       │
│  │ ANALYZE  │───────────▶│  ESCALATE    │                       │
│  │ Complete?│            │  (Ask human) │                       │
│  └────┬─────┘            └──────────────┘                       │
│       │ YES                                                     │
│       ▼                                                          │
│  ┌──────────┐                                                   │
│  │ RESEARCH │  → Deep Research Algorithm                         │
│  └────┬─────┘                                                   │
│       ▼                                                          │
│  ┌──────────┐                                                   │
│  │   PLAN   │  → Create implementation plan with steps          │
│  └────┬─────┘                                                   │
│       ▼                                                          │
│  ┌──────────┐     FAIL   ┌──────────────┐                       │
│  │IMPLEMENT │───────────▶│ FIX PROTOCOL │──┐                    │
│  │ + TEST   │  ◀────────│  (max 3x)    │  │                    │
│  └────┬─────┘   PASS     └──────────────┘  │                    │
│       │               ▲                    │                    │
│       │               │    MAX RETRIES     │                    │
│       │               └────────────────────┤                    │
│       │                                     ▼                    │
│       │                            ┌──────────────┐             │
│       │                            │  ESCALATE    │             │
│       │                            │  (Ask human) │             │
│       │                            └──────────────┘             │
│       ▼                                                          │
│  ┌──────────┐                                                   │
│  │  VERIFY  │  → All gates pass                                 │
│  └────┬─────┘                                                   │
│       ▼                                                          │
│  ┌──────────┐                                                   │
│  │ DELIVER  │  → Report changes, update context                 │
│  └──────────┘                                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Compatibility Matrix

Deerflow is designed to work with multiple AI agent platforms. The compatibility matrix below shows the level of support for each platform.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AGENT COMPATIBILITY MATRIX                       │
│                                                                      │
│  Platform         │ Workflow │ Skills │ MCP   │ Quality Gates │      │
│  ─────────────────┼──────────┼────────┼───────┼───────────────│      │
│  Claude Code      │   ✅     │  ✅    │  ✅   │     ✅        │      │
│  Cursor           │   ✅     │  ✅    │  ⚠️   │     ✅        │      │
│  Windsurf         │   ✅     │  ✅    │  ⚠️   │     ✅        │      │
│  GitHub Copilot   │   ⚠️     │  ✅    │  ❌   │     ✅        │      │
│  Aider            │   ⚠️     │  ✅    │  ❌   │     ⚠️        │      │
│  Custom Agent     │   ✅     │  ✅    │  ✅   │     ✅        │      │
│                                                                      │
│  ✅ = Full support    ⚠️ = Partial support    ❌ = Not supported    │
│                                                                      │
│  Implementation Requirements:                                        │
│  ─────────────────────────                                           │
│  Claude Code     │ Full Claude Code MCP + CLAUDE.md support         │
│  Cursor          │ .cursorrules + MCP adapter                        │
│  Windsurf        │ .windsurfrules + rule system                     │
│  GitHub Copilot  │ .github/copilot-instructions.md                  │
│  Custom Agent    │ Configurable via deerflow.config.ts              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          DATA FLOW DIAGRAM                               │
│                                                                           │
│  ┌──────────┐                                                            │
│  │  USER    │  Task Description, Constraints, Acceptance Criteria         │
│  │  INPUT   │                                                            │
│  └────┬─────┘                                                            │
│       │                                                                   │
│       ▼                                                                   │
│  ┌──────────────────────────────────────────────────────────┐            │
│  │                    DEERFLOW ENGINE                        │            │
│  │                                                           │            │
│  │  ┌──────────┐    ┌──────────────┐    ┌───────────────┐  │            │
│  │  │  TASK    │───▶│   CONTEXT    │───▶│  RESEARCH     │  │            │
│  │  │  INPUT   │    │  BUILDER     │    │  REPORT       │  │            │
│  │  └──────────┘    └──────────────┘    └───────┬───────┘  │            │
│  │                                             │          │            │
│  │                                             ▼          │            │
│  │  ┌──────────┐    ┌──────────────┐    ┌───────────────┐  │            │
│  │  │  PLAN    │◀───│  DEPENDENCY  │◀───│  IMPACT       │  │            │
│  │  │  OUTPUT  │    │  GRAPH       │    │  ANALYSIS     │  │            │
│  │  └────┬─────┘    └──────────────┘    └───────────────┘  │            │
│  │       │                                                      │            │
│  │       ▼                                                      │            │
│  │  ┌──────────┐    ┌──────────────┐    ┌───────────────┐  │            │
│  │  │   CODE   │───▶│  QUALITY     │───▶│  FIX LOG      │  │            │
│  │  │  OUTPUT  │    │  GATE        │    │  (if any)     │  │            │
│  │  └──────────┘    └──────┬───────┘    └───────────────┘  │            │
│  │                         │                                  │            │
│  │                    ┌────┴────┐                              │            │
│  │                    │ PASS?   │                              │            │
│  │                    └────┬────┘                              │            │
│  │                    YES  │  NO ──▶ FIX PROTOCOL              │            │
│  │                         ▼                                    │            │
│  │  ┌──────────┐    ┌──────────────┐    ┌───────────────┐  │            │
│  │  │   TEST   │───▶│  COVERAGE    │───▶│  TEST REPORT  │  │            │
│  │  │  OUTPUT  │    │  ANALYSIS    │    │               │  │            │
│  │  └──────────┘    └──────────────┘    └───────────────┘  │            │
│  │                                                           │            │
│  └───────────────────────────┬──────────────────────────────┘            │
│                              │                                           │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────┐            │
│  │                   DELIVERY PACKAGE                         │            │
│  │                                                           │            │
│  │  • Modified files (with diffs)                            │            │
│  │  • New test files                                         │            │
│  │  • Quality gate reports                                   │            │
│  │  • Coverage report                                        │            │
│  │  • Summary of changes                                     │            │
│  │  • Risk assessment                                        │            │
│  │                                                           │            │
│  └──────────────────────────────────────────────────────────┘            │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Design Principles

1. **Fail Fast, Fail Loud** — Catch issues at the earliest possible stage. Prefer compiler errors over runtime errors. Prefer lint errors over manual review.

2. **No Shortcuts** — The 8-step workflow is mandatory. Skipping steps introduces risk. Every step adds value and protects against downstream failures.

3. **Research Before Code** — An agent that writes code without understanding the codebase will produce code that doesn't fit. Deep Research is not optional.

4. **Tests Are Non-Negotiable** — If it can break, it must have a test. Coverage below 80% is a failure. Untested code is untrusted code.

5. **Security by Default** — Every piece of user input must be validated. Every external call must be handled. No eval, no innerHTML, no shortcuts.

6. **Architecture Matters** — A quick hack that works today but breaks tomorrow is worse than no change at all. SOLID principles exist for a reason.

7. **Transparency** — Every decision, every change, every tradeoff must be documented and explainable. The agent should always be able to justify its choices.

8. **Escalation Over Guessing** — When uncertain, ask. An agent that guesses wrong wastes more time than one that asks a clarifying question.

---

*This document is part of the Deerflow Agent Framework. For implementation details, see [WORKFLOW.md](./WORKFLOW.md) and [SKILLS.md](./SKILLS.md).*
