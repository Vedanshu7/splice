# Splice

A self-hosted snippet manager: save, search, and share code snippets, with a web app, a mobile app, and AI-assisted tagging/search/explain.

## Features

- **Auth** — Supabase Auth (email/password + GitHub OAuth)
- **Snippet CRUD** — create, read, update, delete, with tags and language metadata
- **Full-text search** — Postgres `tsvector`, ranked with `ts_rank`
- **Natural-language search** — `pgvector` embeddings + cosine similarity, so you can search by describing what you want instead of matching exact text
- **AI auto-tag + summary** — every snippet gets tags and a one-line summary generated on save
- **AI chat/explain panel** — ask questions about a saved snippet, get an explanation or a suggested refactor
- **Public sharing** — generate a shareable slug link for any snippet (`/s/:slug`)
- **Workspaces** — public or invite-only (invite-only is a Stripe-gated Pro feature), admin/member roles
- **Live board** — real-time snippet activity per workspace via Supabase Realtime, plus Redis-backed presence ("who's here right now")
- **Mobile app** — React Native/Expo: browse, search, view (with lightweight syntax highlighting), and save snippets from the same backend

## Stack

| Layer | Tech |
|---|---|
| Web | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Mobile | React Native, Expo Router |
| API | NestJS — shared by both web and mobile |
| Database | Supabase (Postgres, RLS, `pgvector`, Realtime) |
| Cache / rate limiting / presence | Redis (Upstash) |
| Payments | Stripe (Checkout + webhook) |
| LLM | Provider-agnostic layer (OpenAI / Anthropic / Gemini), swappable via env var |
| Product analytics | PostHog (web + mobile) |
| Observability (API) | OpenTelemetry (traces, metrics, logs+errors) → APM, SigNoz by default |

### Why a separate NestJS API instead of Next.js API routes

Both the web app and the Expo app call the same NestJS service. It owns snippet CRUD, search, the LLM features, Stripe, and Redis; Supabase Auth still issues the session, NestJS just verifies the JWT rather than re-implementing auth. Supabase Realtime (the live board) is the one thing clients talk to directly, that's how Realtime is meant to be consumed.

### The LLM layer

`apps/api/src/llm/providers/` is a small provider-agnostic interface (`generate()` / `embed()`) with adapters for OpenAI, Anthropic, and Gemini selected by `LLM_PROVIDER` env var, no call site changes needed to swap providers. It's the same idea as [`llmbridge`](https://github.com/Vedanshu7/llmbridge) (a Go project of mine), ported to TypeScript. Anthropic has no embeddings endpoint, so embedding calls fall back to `LLM_EMBEDDING_PROVIDER` (or OpenAI) automatically rather than failing.

## Project structure

```
splice/
  apps/web/       Next.js app
  apps/api/       NestJS API (shared by web + mobile)
  apps/mobile/    Expo app
  packages/shared/  Shared TypeScript types
  supabase/migrations/  SQL schema, RLS policies, search functions
```

See [`docs/CODE_STYLE.md`](docs/CODE_STYLE.md) for conventions and why each library (zod, zustand, iron-session, CASL, PostHog, OpenTelemetry) is used where it is, and [`docs/OBSERVABILITY.md`](docs/OBSERVABILITY.md) for the analytics/APM setup specifically.

## Setup

1. **Supabase**: create a project, run the migrations in `supabase/migrations/` in order (via the Supabase CLI or SQL editor), and enable the `vector` and `moddatetime` extensions if the migrations don't do it for you automatically on your plan.
2. **Redis**: create an Upstash Redis database, grab the REST URL + token.
3. **Stripe**: create a product/price for "Pro", grab the secret key, set up a webhook pointed at `<api url>/api/stripe/webhook` for `checkout.session.completed` and `customer.subscription.deleted`.
4. **LLM provider**: get an API key for at least one of OpenAI / Anthropic / Gemini.
5. **Observability** (optional): PostHog project for analytics, SigNoz (or any OTLP-compatible APM) for the API — see [`docs/OBSERVABILITY.md`](docs/OBSERVABILITY.md). Both apps run fine with these unset.
6. Copy `.env.example` to `.env` in the root and fill in the values (all three apps read from the same set of vars, prefixed appropriately for each runtime — `NEXT_PUBLIC_*` for web, `EXPO_PUBLIC_*` for mobile).

```bash
pnpm install

# API
pnpm dev:api

# Web (in another terminal)
pnpm dev:web

# Mobile (in another terminal)
pnpm dev:mobile
```

## Verifying it works

- Sign up/log in through the web app
- Create a snippet, confirm AI tags/summary appear a moment later
- Search by natural language ("the auth middleware one") and by exact keyword
- Open the generated share link in an incognito window
- Create a workspace, open it in two browser tabs, confirm the live board updates in one when you edit a snippet in the other
- Go through Stripe Checkout in test mode, confirm private workspace creation unlocks after the webhook fires
- Run the Expo app against the same API, confirm the snippet list matches the web app
