# Code style

Conventions for this repo. Enforced where possible by ESLint/Prettier (see `.eslintrc.*` per app and the root `.prettierrc`); documented here where a lint rule can't capture the reasoning.

## TSDoc on exported symbols

Every exported class, function, interface, and type gets a `/** ... */` TSDoc comment: one line summarizing what it does, plus `@param`/`@returns` only when the parameter/return name doesn't already say it.

Internal, non-exported logic stays comment-free unless the *why* is non-obvious (a workaround, a subtle invariant, a deliberate tradeoff). Don't narrate what well-named code already shows.

```ts
/** Verifies a Supabase session JWT and attaches the decoded user to the request. */
export class SupabaseAuthGuard implements CanActivate { ... }

// not documented — self-evident from the name and one-line body
private isPro(userId: string) { ... }
```

## Naming

- Files: kebab-case (`snippets.service.ts`, `with-require-auth.tsx`).
- Types/interfaces/classes: PascalCase. Functions/variables: camelCase.
- NestJS: standard `*.module.ts` / `*.service.ts` / `*.controller.ts` / `*.guard.ts` suffixes.
- React components: PascalCase file matching the default export (`ChatPanel` in `chat-panel.tsx`, `CodeBlock` in `CodeBlock.tsx` on mobile — mobile keeps PascalCase filenames for components to match Expo/React Native convention, web uses kebab-case for everything).

## Where each library is used, and why

| Library | Scope | Why here specifically |
|---|---|---|
| `class-validator`/`class-transformer` | API HTTP request DTOs | Validates client input at the controller boundary — the idiomatic NestJS pattern. |
| `zod` | API env vars (`src/config/env.schema.ts`), LLM JSON output (`LlmService.tagAndSummarize`), web's `NEXT_PUBLIC_*` env accessor | Validates things that are **not** HTTP request bodies: process env at boot, and untrusted model output that class-validator has no reason to touch. Zod and class-validator aren't doing the same job here, they don't overlap. |
| `zustand` | Web + mobile client state (`lib/stores/*`) | Auth/session state and dashboard search state that multiple components need to read without prop-drilling or re-fetching. |
| `iron-session` | Web only, `lib/app-session.ts` | A small **sealed cookie for app context** (active workspace, UI prefs) — explicitly not an auth mechanism. Supabase Auth remains the only source of identity truth; this never stores anything security-sensitive. |
| `@casl/ability` | API, `src/casl/` | Authorization for the multi-tenant boundary (workspaces): admin vs. member role, Pro-gated private workspace creation, snippet ownership. Replaces scattered `if (role === 'admin')` checks with one declarative ability definition. |
| HOCs (`components/hoc/*`) | Web only, two call sites | `withRequireAuth` and `withProGate` wrap whole-page redirect behavior that's identical across several pages. Everywhere else, prefer plain composition/hooks — App Router favors that, and a HOC that isn't reused at least a few times isn't earning its abstraction. |
| NativeWind | Mobile styling | Tailwind classes on React Native views, matching the web app's styling language instead of maintaining two different systems. |
| `posthog-js` / `posthog-react-native` | Web + mobile, `components/*posthog*` | Product analytics (pageviews/screens, custom events, identity) — a frontend/UX concern, deliberately separate from the API's OpenTelemetry pipeline below, which is a backend-operations concern. Different questions, different tools. |
| OpenTelemetry SDK (`@opentelemetry/sdk-node`, etc.) | API only, `src/observability/` | Traces, metrics, and logs+errors, exported via OTLP to an APM (SigNoz by default, swappable). `tracing.ts` must be the first import in `main.ts` — auto-instrumentation patches modules at `require()` time. |

## NestJS exceptions

Throw Nest's built-in HTTP exceptions (`NotFoundException`, `ForbiddenException`, etc.) from services, not generic `Error`. Let Nest's exception filter turn them into the right status code; don't catch-and-rewrap unless you're adding context.

## Import order

1. Node/external packages
2. `@splice/shared` and other workspace packages
3. Relative imports, closest-to-furthest

ESLint's `import/order` (where configured) enforces this; fix or disable per-line only with a comment explaining why.
