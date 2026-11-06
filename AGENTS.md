# AGENTS.md — Repository-Wide Rules

These rules apply to **every agent and contributor** working in this repository (root, `apps/frontend`, `apps/backend`, `packages/*`). Nested `AGENTS.md` files extend these rules for their scope and never contradict them.

This is a **production-grade monorepo**, not a demo, tutorial, or school project. Every change must survive code review by a principal engineer.

---

## 1. Package Management — PNPM ONLY

1. **pnpm is the only allowed package manager.** Never run `npm`, `yarn`, `bun install`, or `npx` for dependency installation.
2. Never create `package-lock.json`, `yarn.lock`, or `bun.lockb`. Only `pnpm-lock.yaml` may exist, and it **must be committed**.
3. Install dependencies only via workspace-aware commands:
   - `pnpm install` (root, installs the whole workspace)
   - `pnpm add <pkg> --filter <workspace-name>` (scoped installs)
4. Pin dependency versions intentionally. Do not use floating ranges for critical dependencies without justification.
5. Before finishing any task that changed dependencies, verify exactly one lockfile exists and it is updated.
6. Do not add dependencies that duplicate functionality already available in the workspace (stdlib, existing packages, `packages/shared`).

## 2. Workspace Layout

Target layout (do not restructure without approval):

```
/
├── apps/
│   ├── frontend/        # Next.js (Vercel)
│   └── backend/         # Node.js API service (independently deployable)
├── packages/
│   ├── shared/          # Code used by BOTH apps (types, schemas, constants, utils)
│   └── config/          # Shared tooling config (tsconfig, eslint, prettier)
├── pnpm-workspace.yaml
└── AGENTS.md            # this file
```

**Placement rule (the "shared test"):**

- Used by frontend **and** backend → `packages/shared`
- Used by multiple packages → `packages/shared` or `packages/config`
- Used by only one app → that app's folder only
- Server-only secrets/business logic → `apps/backend` **never** `packages/shared`
- UI-only code → `apps/frontend` **never** `packages/shared`

Never duplicate a constant, type, enum, or validation schema across apps. If both apps need it, it belongs in `packages/shared`.

## 3. TypeScript — STRICT, ALWAYS

1. `"strict": true` everywhere. Never disable strictness per-file to make an error disappear.
2. No `any`. Use `unknown` + narrowing, or define a proper type.
3. No `@ts-ignore`. If unavoidable, `@ts-expect-error` with a comment explaining why.
4. No implicit `any` returns, no unchecked index access bypasses.
5. Prefer explicit interfaces/type aliases for all public APIs (functions, DTOs, events).
6. Type code must compile with zero errors before a task is considered done (`pnpm -r typecheck`).

## 4. Environment & Configuration

1. **Never commit `.env` files.** Only `.env.example` (placeholders only, no real values) is tracked.
2. Never hardcode credentials, API keys, tokens, database URLs, or connection strings — in any file, including tests and scripts.
3. All runtime configuration lives in environment variables read through a **single typed config module** per app:
   - `apps/backend`: one `config/` module that parses and validates env at boot (fail fast on missing/invalid vars).
   - `apps/frontend`: `NEXT_PUBLIC_*` vars are **public by definition** — never put secrets there. Server-side secrets are read only in Server Components / route handlers / server actions.
4. Every new env var must be added to `.env.example` with a placeholder and a comment describing purpose and format.
5. Logs must never contain secrets, passwords, access tokens, cookies, or full connection strings.
6. Environment-specific values (dev/staging/prod) are injected by the deployment platform, never branched on in code with hardcoded values.

## 5. Architecture Boundaries

1. Default to a **modular monolith**: clear module boundaries inside each app. Do not introduce microservices without an explicit, documented justification.
2. Dependency direction: `interface/adapters → application → domain`. Infrastructure depends on abstractions, not the reverse.
3. Frontend and backend communicate **only** through the documented REST API. The frontend never imports backend internals; the backend never imports frontend code.
4. Business logic never lives in controllers/routes, components, or page files.
5. No circular dependencies between modules or packages. Verify with your import graph before finishing.

## 6. Code Quality

1. Follow SOLID where it earns its keep. DRY without over-abstraction — every abstraction must have a concrete purpose today, not a hypothetical tomorrow.
2. Small, focused modules. No god classes, god components, or 500-line service files.
3. Consistent error handling: no silently swallowed errors, no empty `catch` blocks, no ignored promise rejections.
4. Never invent functionality. Never leave fake/mock/placeholder data in production code paths.
5. No dead code, no commented-out blocks, no unused exports "for later".
6. Clear naming. Consistent style (enforced by ESLint + Prettier — run them before finishing).
7. Comments explain **why**, not what. Delete stale comments with the code they describe.

## 7. Security (Non-Negotiable)

1. Never trust the client. Validate and authorize every request on the server.
2. Validate **all** external input (body, query, params, headers) at the boundary with runtime schemas.
3. Prevent mass assignment: never pass raw request bodies into persistence layers.
4. Prevent IDOR: every object access must be authorized against the authenticated principal.
5. Use parameterized queries / the ORM query builder always. String-concatenated SQL is forbidden.
6. Never expose internal error details, stack traces, or framework metadata to clients.
7. Never log or transmit secrets. Never commit them. Rotate on suspected exposure.
8. Passwords: Argon2id (or a documented equivalent). Never plaintext, never reversible storage.
9. Cookies: `HttpOnly`, `Secure`, appropriate `SameSite`.
10. Check dependencies for known vulnerabilities before adding/upgrade (`pnpm audit` in CI).

## 8. Database (Non-Negotiable)

1. Never create a table casually. Identify entities, relationships, cardinality, access patterns and ownership first.
2. Enforce integrity with `NOT NULL`, `UNIQUE`, `CHECK`, and foreign keys — application code is not the integrity layer.
3. `NUMERIC` for money. `TIMESTAMPTZ` for point-in-time timestamps. No floating-point financial values.
4. Every index must be justified by a documented query pattern (WHERE / JOIN / ORDER BY / pagination). No speculative indexes.
5. All schema changes go through **reversible migrations**. Never edit applied migrations. Never run destructive migrations automatically.
6. Wrap multi-statement writes in transactions. Define transaction boundaries explicitly.
7. Design pagination for large datasets; prefer cursor-based pagination when offset becomes inefficient.

## 9. Testing

1. Unit tests for business logic; integration tests for API + database + auth; E2E for critical user flows.
2. **Never claim a test passed unless it was actually executed** and the output was observed.
3. Never hide failing tests, skip them silently, or weaken assertions to get green.
4. Use realistic test data. Tests must not depend on external production systems.
5. A change to business logic without a corresponding test change is incomplete.

## 10. Git & Hygiene

1. Never commit: `.env*` (except `.env.example`), `node_modules/`, build outputs (`.next/`, `dist/`), lockfiles other than `pnpm-lock.yaml`.
2. Inspect `git status` before committing. Commit only intended files.
3. Do not delete or overwrite existing files/structure without understanding their purpose — and without approval for anything destructive.
4. Commit messages: what changed and why, not a filename dump.

## 11. Documentation

1. Update documentation in the same change as the behavior it describes.
2. Document every important technical decision **with its reason and trade-offs**.
3. Keep `.env.example`, API docs, and README in sync with reality.
4. Never document features that do not exist yet.

## 12. Engineering Rules (Summary)

1. Never sacrifice data integrity for convenience.
2. Never invent completed functionality or fake API responses.
3. Never silently ignore errors.
4. Never introduce unnecessary dependencies.
5. Never create indexes without a reason.
6. Never modify working functionality without understanding its dependencies.
7. Never delete user data or migrations without explicit approval.
8. Never expose secrets.
9. Never claim production readiness without evidence.
10. Always inspect the existing structure before modifying this repository.
11. Prefer the simplest architecture that satisfies the requirements.
12. Explain trade-offs in understandable language.
13. Ask approval before irreversible operations.
14. Correctness, maintainability, security and measurable performance beat code-generation speed — always.

---

*Scope note: frontend-specific rules live in `frontend/AGENTS.md`; backend-specific rules live in `backend/AGENTS.md`. Read the relevant nested file before working in that area.*
