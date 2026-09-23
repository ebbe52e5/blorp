# Blorp

The role of this file is to describe common mistakes and confusion points that agents might encounter as they work in this project. If you ever encounter something in the project that surprises you, please alert the developer working with you and indicate that this is the case in the CLAUDE.md file to help prevent future agents from having the same issue.

## Plans

When creating plans, prepend the date and use a short descriptive name based on the task content (e.g., "2026-03-09-refactor-auth-flow", "2026-03-09-fix-notification-badge").

## Verification

After making changes, always run these checks before considering work complete:

```
pnpm test:ts
pnpm test
pnpm lint
```

## ESLint

- Do not add `eslint-disable` comments without explicit developer approval. Many of our lint rules exist specifically to require a human decision — disabling them silently defeats the purpose.
- In particular, `local/no-query-hooks-in-components` exists to force a conscious choice when a query hook is used in a component. If you encounter a violation, ask the developer whether it should be fixed or suppressed, and if suppressed, ask them what justification note to put in the comment.

## TypeScript

- Prefer satisfies over as when writing TypeScript
- Do not silently change `||` to `??` when fixing type errors — they are not the same. If you are certain it should be ?? you can ask the developer to confirm.

## Commands

- `pnpm dev` — Vite dev server
- `pnpm build` — production build (Vite + Capacitor sync)
- `pnpm test` — Vitest unit tests (jsdom); `pnpm test path/to/file.test.ts` runs a single file, `pnpm test -t "name"` filters by test name; `pnpm test:watch` for watch mode
- `pnpm test:ts` — TypeScript type check (`tsc --noEmit`)
- `pnpm lint` / `pnpm lint:fix` — ESLint
- `pnpm test:e2e` — Playwright e2e (run `pnpm build` first); specs are split per backend, e.g. `*.lemmy.spec.ts` / `*.piefed.spec.ts`
- `pnpm test:visual` — Playwright visual regression (`--update-snapshots` to refresh baselines)
- `pnpm storybook` — component Storybook
- `pnpm dev:tauri` / `pnpm dev:ios` — run the desktop (Tauri) or iOS (Capacitor) targets; iOS requires `bundle install && bundle exec pod install --repo-update` first and Xcode opened via `ios/App/App.xcworkspace`

## Architecture

Blorp is a single React codebase that ships to three targets: web (Vite), mobile (Capacitor, `android/` + `ios/`), and desktop (Tauri, `src-tauri/`). Platform detection (`isWeb`/`isCapacitor`/`isTauri`) lives in `src/lib/device.ts`; platform-specific APIs are wrapped in `src/lib/capacitor.ts` and `src/lib/tauri.ts`.

**Multi-backend API layer.** Blorp talks to both Lemmy and PieFed instances, across multiple Lemmy API versions. `src/apis/api-blueprint.ts` defines the normalized Zod schemas and the `ApiBlueprint` interface every backend must implement; `src/apis/lemmy-v3.ts`, `lemmy-v4.ts`, and `piefed.ts` are the concrete implementations. `src/apis/client.ts` probes `/nodeinfo/2.1` to detect the backend/version and returns the right implementation, memoized by `instance + jwt`. Add new API calls to `ApiBlueprint` first, then implement in each backend.

**Multi-account, cache-prefixed state.** `src/stores/auth.ts` supports multiple logged-in accounts at once. `getCachePrefixer(account)` namespaces every cached entity (posts, comments, communities, profiles, etc.) by account/instance so switching the active account can't leak another account's cached data. Never `import { getCachePrefixer } from "../stores/auth"` directly — use `useAuth((s) => s.getCachePrefixer)`, which is scoped to the selected account automatically. This is enforced by a local ESLint rule (`eslint/restricted-imports.js`); the only sanctioned exception is code that explicitly iterates multiple accounts (e.g. `useRefreshAuth`), with an `eslint-disable-next-line` explaining why.

**Query/store split.** `src/queries/` holds hooks that fetch data and normalize it into per-entity Zustand stores under `src/stores/` (`posts.ts`, `comments.ts`, `communities.ts`, `profiles.ts`, ...). Components should read entities via selector hooks (e.g. `usePostFromStore()`) rather than indexing store maps directly — also enforced by a local ESLint rule (`eslint/restricted-syntax.js`).

**Custom ESLint rules encode real invariants** (`eslint/rules.js`, `zustand.js`, `restricted-imports.js`, `restricted-syntax.js`) — worth reading before a large refactor touching queries, stores, or auth:

- `query-hook-naming` / `mutation-hook-naming` / `no-query-hooks-in-components` — `useQuery`/`useMutation` may only be called inside a hook named `useXQuery`/`useXMutation`, and components can't import hooks ending in `Query`. This keeps "does this touch the network" visible in the hook name and keeps data-fetching out of `src/components`.
- `zustand-persist-migrate` — every Zustand `persist` store must define `migrate`, so state written by a newer app version isn't silently discarded if a user downgrades.
- Direct access to `auth` store's `selectedUuid`/`accountIndex`, or indexing into `usePostsStore`'s `posts` map, is banned in favor of `getSelectedAccount()` / `usePostFromStore()`.

**Typed routing.** `src/routing/routes.tsx` defines each route's path plus a Zod schema for its params; `src/routing/index.tsx` derives a typed `useHistory()`/`Link` from that map, so route params are typechecked at the call site.

**Runtime-configurable self-hosting.** `src/env.ts` resolves `REACT_APP_*` config from (in order of precedence) URL params on `deploy.blorpblorp.xyz`, Docker-injected `window` globals, then Vite env vars — see the env var table in `README.md` and `docs/dev/2026-04-04-adding-env-vars.md` before adding a new one.

**Docs worth checking before changing related code:**

- `docs/decisions/` — why non-obvious choices were made (auth multi-tab sync, NSFW blur, persist migration, etc.)
- `docs/dev/testing.md` — shared API schema factories live in `test-utils/api.ts`; use them instead of inline fixtures
- `docs/dev/deprecated-patterns.md` — patterns to avoid in favor of newer helpers (e.g. `useConfirmationAlert` instead of a manual `Deferred` + `useIonAlert`)
