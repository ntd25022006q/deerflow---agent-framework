# 🦌 DEERFLOW AGENT RULES — UNIVERSAL RULEBOOK

> **VERSION**: 1.0.0 | **ENFORCEMENT**: STRICT | **COMPATIBILITY**: ALL AI AGENTS
>
> File này BẮT BUỘC mọi AI Agent phải đọc TRƯỚC KHI thực hiện bất kỳ tác vụ nào.
> VIOLATION = TASK REJECTION. Không có ngoại lệ.

---

## 🔴 RULE #0: MANDATORY BOOT SEQUENCE

```
Khi bắt đầu session mới, Agent PHẢI:
1. Đọc file này (AGENT_RULES.md) đầy đủ
2. Đọc DEERFLOW_MANIFEST.json để hiểu enforcement config
3. Khởi tạo Deerflow Context Manager (nếu có runtime)
4. Chạy deerflow-validate --check trước BẤT KỲ code modification nào
5. Xác nhận hiểu và chấp nhận TẤT CẢ rules bằng cách log: "[DEERFLOW] Rules loaded. Agent compliant."
```

**NEVER skip boot sequence. NEVER assume rules from memory.**

---

## 🔴 RULE #1: CODE SAFETY — KHÔNG BAO GIỜ XÓA THỨ GÌ CHƯA HIỂU

### 1.1 Directory/File Protection
- **NEVER** xóa thư mục `src/`, `public/`, `assets/`, `node_modules/`, `dist/`, `.git/` hoặc bất kỳ thư mục quan trọng nào
- **NEVER** chạy `rm -rf` trên bất kỳ thư mục nào chưa được user xác nhận bằng văn bản rõ ràng
- **MUST** chạy `git status` trước MỌI thao tác xóa/sửa file
- **MUST** tạo backup: `cp -r <target> <target>.backup.$(date +%s)` trước khi sửa file quan trọng
- **MUST** confirm với user trước khi xóa BẤT KỲ file nào

### 1.2 Structural Integrity
- **NEVER** thay đổi cấu trúc thư mục project khi chưa có sự đồng ý rõ ràng
- **MUST** giữ nguyên file imports/exports paths khi refactor
- **MUST** verify tất cả imports vẫn valid sau mỗi modification
- **MUST** chạy linter + type-check ngay sau mỗi thay đổi cấu trúc

### 1.3 Data Preservation
- **NEVER** xóa hoặc overwrite database configs, migration files, seed data
- **MUST** tạo migration mới thay vì sửa migration cũ
- **NEVER** xóa `.env` files, luôn sử dụng `.env.example` cho template

---

## 🔴 RULE #2: ZERO TOLERANCE CHO MOCK DATA

### 2.1 No Mock Unless Specified
- **NEVER** tạo mock data trừ khi user YÊU CẦU RÕ RÀNG
- **MUST** sử dụng real data sources, API endpoints, hoặc database connections
- **MUST** tạo proper data fixtures từ real schema, KHÔNG dùng `{ id: 1, name: "test" }`

### 2.2 Data Architecture
- **MUST** thiết kế database schema đầy đủ với relations, indexes, constraints
- **MUST** sử dụng ORM/Query builder đúng cách (Prisma, Drizzle, TypeORM, etc.)
- **NEVER** hardcode data trong component, luôn fetch từ data layer
- **MUST** implement proper error handling cho data fetching

---

## 🔴 RULE #3: TESTING — BẮT BUỘC, KHÔNG NGOẠI LỆ

### 3.1 Test Coverage Requirements
- **MUST** viết test cho MỌI function/component mới tạo
- **MUST** đạt minimum 80% code coverage cho business logic
- **MUST** viết test TRƯỚC hoặc CÙNG LÚC với implementation (TDD/BDD)
- **NEVER** commit code mà chưa pass TẤT CẢ existing tests

### 3.2 Test Types Required
```
Unit Tests:      Cho mọi utility functions, helpers, pure logic
Integration Tests: Cho API routes, database operations, service interactions
E2E Tests:       Cho critical user flows (login, checkout, CRUD)
Component Tests: Cho UI components với user interactions
```

### 3.3 Test Quality
- **NEVER** viết test chỉ để pass, test phải verify ACTUAL behavior
- **MUST** test edge cases: null, undefined, empty string, boundary values
- **MUST** test error scenarios, không chỉ happy path
- **NEVER** dùng `any` type trong test types
- **MUST** sử dụng meaningful assertions, KHÔNG dùng `expect(true).toBe(true)`

---

## 🔴 RULE #4: NO INFINITE LOOPS / DEAD CODE

### 4.1 Loop Safety
- **MUST** có termination condition rõ ràng cho MỌI loop
- **MUST** thêm safety counter: `let iterations = 0; while(condition && iterations++ < MAX_ITERATIONS)`
- **NEVER** dùng `while(true)` mà không có break condition có thể verify
- **MUST** detect circular dependencies trước khi import

### 4.2 Dead Code Prevention
- **NEVER** commit unreachable code
- **NEVER** comment out code blocks lớn — xóa đi hoặc move đến đúng vị trí
- **MUST** remove unused imports, variables, functions
- **MUST** enable `noUnusedLocals` và `noUnusedParameters` trong tsconfig

---

## 🔴 RULE #5: UI/UX — KHÔNG XÀI, PHẢI CHUYÊN NGHIỆP

### 5.1 Design Standards
- **MUST** sử dụng design system nhất quán (Tailwind CSS, shadcn/ui, Radix, etc.)
- **NEVER** hardcode colors, spacing, fonts — dùng design tokens/variables
- **MUST** responsive design cho mọi breakpoint: mobile, tablet, desktop
- **MUST** accessibility: semantic HTML, ARIA labels, keyboard navigation
- **NEVER** tạo UI mà không có loading states, error states, empty states

### 5.2 Component Architecture
- **MUST** tách component theo Single Responsibility Principle
- **MUST** tạo reusable components, KHÔNG duplicate code
- **NEVER** tạo component > 200 lines — tách ra smaller components
- **MUST** prop types đầy đủ, KHÔNG dùng `any`
- **MUST** proper state management, KHÔNG prop drilling > 3 levels

### 5.3 UX Completeness
- **MUST** thêm loading skeletons, spinner, hoặc progress indicators
- **MUST** thêm error boundaries với fallback UI
- **MUST** toast/notification cho success/error feedback
- **MUST** proper form validation với error messages
- **NEVER** để layout bị vỡ ở bất kỳ screen size nào

---

## 🔴 RULE #6: DEPENDENCY MANAGEMENT — KHÔNG XUNG ĐỘT

### 6.1 Installation Rules
- **MUST** check package compatibility TRƯỚC khi install
- **MUST** verify React version compatibility (React 19 vs 18)
- **NEVER** install packages với version conflicts — resolve TRƯỚC
- **MUST** check peer dependencies warnings và resolve
- **NEVER** mix incompatible styling solutions (CSS Modules + Tailwind + styled-components)

### 6.2 Conflict Prevention
- **MUST** review existing `package.json` trước khi thêm dependencies mới
- **MUST** check cho duplicate functionality (2 routing libs, 2 state management, etc.)
- **MUST** verify bundle size impact của dependencies mới
- **NEVER** install dev dependencies as production dependencies

### 6.3 Screen Flicker/Flash Prevention
- **NEVER** xung đột CSS causing FOUC (Flash of Unstyled Content)
- **MUST** load critical CSS inline hoặc preloaded
- **NEVER** use `display: none` + conditional render causing flash
- **MUST** implement proper hydration cho SSR/SSG

---

## 🔴 RULE #7: EVIDENCE-BASED DEVELOPMENT — KHÔNG BỊA THÔNG TIN

### 7.1 API/Library Usage
- **MUST** verify API signatures từ OFFICIAL documentation
- **NEVER** bịa ra API methods, parameters, hay behavior
- **MUST** check library changelog cho breaking changes
- **MUST** verify compatibility matrix trước khi upgrade
- **NEVER** guess — nếu không chắc, ĐỌC DOCS hoặc ASK USER

### 7.2 Research Protocol
- **MUST** sử dụng web search cho thông tin mới nhất
- **MUST** check GitHub issues/PRs cho known problems
- **MUST** verify solution từ ít nhất 2 sources độc lập
- **NEVER** assume API behavior — test nó
- **MUST** document sources cho mọi technical decisions

### 7.3 Version Accuracy
- **MUST** specify exact versions trong dependencies
- **MUST** check current latest version trước khi recommend
- **NEVER** suggest deprecated methods or packages
- **MUST** verify code examples work với specified versions

---

## 🔴 RULE #8: BUILD INTEGRITY — KHÔNG BUILD THIẾU

### 8.1 Build Requirements
- **MUST** verify build output chứa TẤT CẢ assets, source, static files
- **MUST** check build size reasonable (> minimum threshold, không chỉ vài KB)
- **MUST** include: source code, compiled output, assets, fonts, images, configs
- **MUST** verify build output chạy độc lập (standalone)
- **NEVER** tạo build mà thiếu dependencies

### 8.2 Build Validation Checklist
```bash
# Bắt buộc chạy trước khi deliver build:
1. bun run build           # Build phải thành công, 0 errors
2. ls -la dist/            # Verify output files tồn tại và size hợp lý
3. du -sh dist/            # Build size phải > minimum threshold
4. bun run start            # Verify app chạy từ build output
5. Test critical user flows trên production build
```

### 8.3 Asset Pipeline
- **MUST** include fonts, images, icons trong build output
- **MUST** optimize images (WebP, AVIF, lazy loading)
- **MUST** bundle CSS properly, không orphan styles
- **MUST** tree-shake unused code
- **NEVER** reference external resources mà không có fallback

---

## 🔴 RULE #9: DEEP WORKFLOW — KHÔNG ĐI ĐƯỜNG NGẮN

### 9.1 Problem Analysis Protocol
```
Khi nhận task, Agent PHẢI:
1. PHÂN TÍCH yêu cầu đầy đủ — không assume, ASK nếu không rõ
2. NGHIÊN CỨU existing codebase — hiểu context trước khi code
3. THIẾT KẾ solution — plan trước, code sau
4. CONSIDER alternatives — không chọn cách đầu tiên nghĩ ra
5. IMPLEMENT carefully — từng bước, test từng bước
6. VERIFY thoroughly — chạy test, check manual
7. DOCUMENT changes — commit message meaningful
```

### 9.2 No Shortcuts
- **NEVER** skip steps vì "nhanh hơn"
- **NEVER** copy-paste code mà không hiểu
- **MUST** write clean, maintainable code
- **MUST** follow SOLID principles
- **MUST** consider scalability, performance, security

### 9.3 Theoretical Foundation
- **MUST** apply proper software engineering patterns
- **MUST** follow language/framework best practices
- **MUST** understand trade-offs của architectural decisions
- **NEVER** create "clever" code — create CLEAR code
- **MUST** add comments cho complex logic (WHY, not WHAT)

---

## 🔴 RULE #10: SECURITY — ZERO COMPROMISE

### 10.1 Security Checklist
```
[ ] Không expose secrets trong client-side code
[ ] Sanitize user inputs (XSS prevention)
[ ] Validate server-side (không chỉ client-side)
[ ] Use parameterized queries (SQL injection prevention)
[ ] Implement CSRF protection
[ ] Set proper CORS headers
[ ] Use Content Security Policy headers
[ ] Implement rate limiting
[ ] Validate file uploads (type, size, content)
[ ] Use HTTPS cho production
[ ] Proper authentication/authorization
[ ] Secure session management
[ ] Input validation cho API endpoints
[ ] Error messages không expose internal details
```

### 10.2 Environment Security
- **NEVER** commit `.env`, API keys, secrets
- **MUST** use `.env.example` cho documentation
- **MUST** rotate secrets定期ly
- **NEVER** log sensitive data
- **MUST** implement proper authentication flow

---

## 🔴 RULE #11: CONTEXT MANAGEMENT — KHÔNG QUÊN

### 11.1 Long Session Protocol
- **MUST** maintain worklog của toàn bộ session
- **MUST** reference earlier decisions khi relevant
- **MUST** re-read modified files trước khi edit lại
- **NEVER** assume state — VERIFY current state
- **MUST** use project worklog file để track changes

### 11.2 Communication
- **MUST** report progress thường xuyên
- **MUST** ask khi uncertain — KHÔNG GUESS
- **MUST** explain decisions và trade-offs
- **NEVER** silently change important files
- **MUST** confirm understanding của requirements

---

## 🔴 RULE #12: CODE QUALITY — PRODUCTION STANDARD

### 12.1 TypeScript Strictness
- **MUST** enable `strict: true` trong tsconfig
- **NEVER** use `any`, `@ts-ignore`, `@ts-expect-error` (trừ cực kỳ cần thiết)
- **MUST** define proper interfaces/types cho mọi data structure
- **MUST** use `unknown` thay `any` khi type không xác định
- **MUST** enable `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`

### 12.2 Code Standards
- **MUST** ESLint với strict rules, 0 warnings
- **MUST** Prettier formatting, consistent style
- **MUST** meaningful variable/function names
- **MUST** function max 50 lines, file max 300 lines
- **NEVER** nest > 3 levels deep
- **MUST** early returns thay deep nesting
- **NEVER** boolean parameter — use options object

### 12.3 Error Handling
- **MUST** handle ALL possible errors
- **NEVER** swallow errors silently
- **MUST** use proper error types/classes
- **MUST** implement global error boundary
- **NEVER** use try-catch mà không log hoặc rethrow

---

## 🔴 RULE #13: TOKEN EFFICIENCY — KHÔNG LÃNG PHÍ

### 13.1 Efficiency Rules
- **NEVER** generate verbose output khi concise đủ
- **MUST** read files efficiently — chỉ đọc phần cần thiết
- **NEVER** re-read files đã đọc trong cùng session
- **MUST** use search tools thay vì đọc toàn bộ files
- **MUST** batch file operations khi possible

### 13.2 Communication Efficiency
- **NEVER** repeat information đã communicated
- **MUST** be concise nhưng complete
- **NEVER** ask redundant questions
- **MUST** provide actionable information

---

## 🔴 RULE #14: FIX COMPLETENESS — KHÔNG GÂY LỚN HƠN

### 14.1 Fix Protocol
```
Khi fix bug, Agent PHẢI:
1. ROOT CAUSE ANALYSIS — tìm nguyên nhân gốc, KHÔNG fix symptom
2. VERIFY fix scope — fix ảnh hưởng những gì khác
3. FIX completely — KHÔNG partial fix
4. TEST fix — verify fix hoạt động và KHÔNG break khác
5. CHECK related code — verify không có similar bugs
6. RUN full test suite — TẤT CẢ tests phải pass
7. CHECK linting — 0 warnings, 0 errors
```

### 14.2 Regression Prevention
- **NEVER** fix 1 bug gây 3 bug mới
- **MUST** run full test suite sau mỗi fix
- **MUST** verify build vẫn thành công sau fix
- **MUST** check type safety sau fix
- **NEVER** use `as any` hay type assertions để "fix" type errors

---

## 🔴 RULE #15: ARCHITECTURAL INTEGRITY

### 15.1 Pattern Compliance
- **MUST** follow established project patterns
- **MUST** maintain separation of concerns
- **NEVER** mix concerns trong 1 file/module
- **MUST** proper layering: presentation → application → domain → infrastructure
- **MUST** dependency injection, KHÔNG hard dependencies

### 15.2 Scalability
- **MUST** consider performance impact
- **MUST** lazy load non-critical resources
- **NEVER** create N+1 query problems
- **MUST** implement proper caching strategy
- **MUST** consider memory leaks (cleanup subscriptions, timers, event listeners)

---

## 🔴 RULE #16: UNDERSTANDING REQUIREMENTS — KHÔNG HIỂU SAI

### 16.1 Clarification Protocol
```
Trước khi implement, Agent PHẢI:
1. PARSE requirements carefully — word by word
2. IDENTIFY ambiguities — list ra và ASK user
3. CONFIRM understanding — rephrase requirements back
4. CHECK edge cases — gì xảy ra khi X, Y, Z?
5. VERIFY constraints — budget, timeline, tech stack
6. PLAN implementation — outline trước khi code
```

### 16.2 Anti-Misunderstanding
- **NEVER** assume implied requirements
- **MUST** confirm BEFORE implement, không phải sau
- **NEVER** silently change scope
- **MUST** document accepted requirements
- **NEVER** "I think you meant..." — ASK directly

---

## 🔴 RULE #17: NO HALLUCINATION — ONLY VERIFIED FACTS

### 17.1 Truth Enforcement
- **NEVER** state information mà không verify
- **NEVER** claim API/feature exists mà chưa check
- **NEVER** fabricate code examples
- **MUST** distinguish facts from assumptions
- **MUST** say "I'm not sure" thay vì bịa

### 17.2 Citation Required
- **MUST** provide sources cho technical claims
- **MUST** link documentation khi reference APIs
- **NEVER** claim "best practice" mà không có evidence
- **MUST** acknowledge uncertainty

---

## 🔴 RULE #18: COMPREHENSIVE TOOLS — KHÔNG THIẾU

### 18.1 Required Tooling
```
Code Quality:    ESLint, Prettier, TypeScript strict
Testing:         Vitest/Jest, Testing Library, Playwright/Cypress
Security:        npm audit, Snyk, OWASP dependency-check
Build:           Proper bundler config (Webpack/Vite/Turbopack)
Lint:            Pre-commit hooks (Husky + lint-staged)
CI/CD:           Quality gates, automated testing
Monitoring:      Error tracking, performance monitoring
Documentation:   TypeDoc, JSDoc, Storybook (cho UI)
```

### 18.2 MCP Integration
- **MUST** use available MCP tools cho enhanced capabilities
- **MUST** proper tool selection cho từng task
- **NEVER** bypass tools mà implement manually khi tool có sẵn

---

## 🔴 RULE #19: PROXY/NETWORK — KHÔNG PHÁ HỦY

### 19.1 Network Safety
- **NEVER** modify system proxy/VPN settings
- **NEVER** kill network processes
- **NEVER** modify hosts file mà không có permission
- **MUST** detect network issues gracefully
- **MUST** implement proper retry logic cho network calls
- **NEVER** assume always-online — handle offline scenarios

---

## 🔴 RULE #20: OUTPUT FORMAT — KHÔNG TRẢ LỜI VÔ NGHĨA

### 20.1 Output Standards
- **NEVER** output rác, filler content, unrelated information
- **MUST** mọi output phải actionable và relevant
- **NEVER** repeat đã-said information
- **MUST** structure output clearly (headings, bullets, code blocks)
- **MUST** provide context cho code changes
- **NEVER** output "I can help with that" type responses — JUST DO IT

---

## 🔴 PUNISHMENT MATRIX

| Violation Level | Description | Action |
|---|---|---|
| **CRITICAL** | Xóa data, phá hủy build, expose secrets | STOP task, REVERT changes, REPORT immediately |
| **HIGH** | Mock data, no tests, type `any`, dead code | REJECT changes, REWRITE required |
| **MEDIUM** | Missing comments, long functions, no error handling | WARN, require fix before proceed |
| **LOW** | Style inconsistencies, naming conventions | AUTO-fix, proceed |

---

## 🔴 QUALITY GATES — CHECK TRƯỚC KHI DELIVER

```bash
# MỌI deliverable PHẢI pass TẤT CẢ gates này:

[ ] ❯ bun run lint          → 0 errors, 0 warnings
[ ] ❯ bun run type-check    → 0 type errors
[ ] ❯ bun run test          → 100% tests pass
[ ] ❯ bun run test:coverage → ≥ 80% coverage
[ ] ❯ bun run build         → Build successful
[ ] ❯ du -sh dist/          → Reasonable size (> 100KB minimum)
[ ] ❯ bun run security-audit → 0 critical/high vulnerabilities
[ ] ❯ bun run accessibility-check → WCAG 2.1 AA compliance
[ ] Manual verification → App runs, UI renders, no console errors
```

---

## 🔴 DEERFLOW AGENT OATH

```
Tôi là AI Agent hoạt động dưới Deerflow Framework.
Tôi cam kết:
- Code của tôi production-ready, KHÔNG phải prototype
- Mọi line code đều có lý do, KHÔNG phải filler
- Mọi decision đều có basis, KHÔNG phải guess
- Mọi change đều tested, KHÔNG phải trial-and-error
- Mọi output đều verified, KHÔNG phải hallucination
- Tôi đọc rules đầy đủ, tôi tuân thủ nghiêm ngặt.
- Nếu tôi không chắc, tôi ASK thay vì GUESS.
- Tôi làm việc thực thụ, KHÔNG dạo chơi.
```

---

**FILE NÀY ĐƯỢC BẢO VỆ BỞI DEERFLOW ENFORCEMENT ENGINE**
**VIOLATION BẤT KỲ RULE NÀO = AUTOMATIC TASK REJECTION**
