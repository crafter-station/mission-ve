# 🇻🇪 Reporte VE

**An open-source, privacy-first citizen platform for mapping service outages and
shortages across Venezuela** — electricity and water cuts, and shortages of
medicine, food, and fuel.

Inspired by [**Mission 4636**](https://www.mission4636.org/), the 2010 Haiti
earthquake effort where thousands of diaspora volunteers translated,
categorized, and geolocated SMS reports to direct aid. We adapt that same
pipeline to Venezuela's chronic service crisis:

> **Ingest → Categorize → Geolocate → Verify → Publish**

People report via **WhatsApp** (or an anonymous web form); a community of
volunteers structures and verifies each report; verified, **PII-scrubbed**
reports appear on a public, real-time map.

## Why privacy is the core requirement

Mission 4636's #1 documented lesson was that a public crisis map _exposed the
identities of at-risk people_. Under Venezuela's surveillance threat model that
is unacceptable, so this project is **private by default**:

- We **never store raw phone numbers** — only a salted HMAC hash.
- A reporter's **exact location is never published** — public pins are coarsened
  to a ~2 km grid (or the estado centroid).
- Reports are **invisible until a moderator verifies and publishes** them.
- Free-text is **auto-scrubbed of PII** (phones, emails, cédulas) before it can
  go public, and the Realtime layer **broadcasts only public fields** — raw rows
  never leave the server.
- Every state change is written to an **append-only audit log**.

## Architecture

```
 REPORTERS            INGEST                 STRUCTURING CROWD          OUTPUT
 WhatsApp ─webhook─▶ /api/webhooks/whatsapp ─┐                      ┌▶ Public map
 Web form ─POST───▶ /api/reports ───────────┼─▶ Moderation queue ──┤  (Realtime)
                                             │   • categorize       └▶ /api/reports
                    Supabase Postgres ◀──────┘   • geolocate           (PII-free feed)
                    (Drizzle ORM)                • verify (N agree)
                                                 • publish (scrub + coarsen)
```

## Tech stack

- **Next.js 16** (App Router; note: middleware is `proxy.ts` in v16) + React 19
- **Supabase** — Postgres + Realtime
- **Drizzle ORM** + **Zod** (typesafe schema ↔ validation, single source of truth)
- **Kapso** — WhatsApp Cloud API ([`@kapso/whatsapp-cloud-api`](https://www.npmjs.com/package/@kapso/whatsapp-cloud-api))
- **shadcn/ui** (new-york) + Tailwind v4
- **Mapbox GL JS v3** — maps (needs `NEXT_PUBLIC_MAPBOX_TOKEN`)
- **Biome** + **bun**

## Getting started

```bash
bun install
cp .env.local.example .env.local   # then fill in the values

# Push the Drizzle schema to your Supabase Cloud database (no migration files)
bun run db:push

bun run dev                         # http://localhost:3000
```

We use `drizzle-kit push` against the Supabase Cloud project (the
`DATABASE_URL` connection-pooler string) rather than committed migration files.
`bun run db:studio` opens Drizzle Studio against the same database.

Generate secrets with `openssl rand -hex 32` for `REPORTER_HASH_SECRET` and
`MODERATOR_SESSION_SECRET`, and set a `MODERATOR_PASSWORD`.

### Key routes

| Route                     | What                                              |
| ------------------------- | ------------------------------------------------- |
| `/`                       | Public real-time map of verified reports          |
| `/reportar`               | Anonymous web report form                          |
| `/moderation`             | Volunteer moderation queue (password-gated)       |
| `/api/reports`            | `GET` PII-free feed · `POST` web submission        |
| `/api/webhooks/whatsapp`  | Kapso/WhatsApp inbound webhook (signed)            |

### WhatsApp setup (Kapso)

1. Create a number at [kapso.ai](https://kapso.ai); copy the API key + phone id.
2. Set `KAPSO_API_KEY`, `KAPSO_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`,
   `WHATSAPP_VERIFY_TOKEN`.
3. Point the webhook at `https://<your-host>/api/webhooks/whatsapp` (the `GET`
   handler answers the verification challenge; `POST` verifies
   `X-Hub-Signature-256`).

Without WhatsApp configured, the web form path works end-to-end on its own.

## Status & roadmap

This is an MVP foundation. Working: WhatsApp + web ingest, moderation queue with
N-of-M verification, PII scrubbing + coarsened geo, real-time public map.

Next up: Supabase Auth for per-volunteer accounts (replacing the shared-password
gate), a parish-level gazetteer for sharper-but-safe geolocation, duplicate
clustering, NGO export feeds (CSV/RSS), and Telegram intake.

## Contributing

Issues and PRs welcome at
[crafter-station/mission-ve](https://github.com/crafter-station/mission-ve).
Run `bun run check` (Biome) and `bunx tsc --noEmit` before pushing.

## License

Open source. See `LICENSE` (to be added).
