# CreatorOps — Project Status

Local-first Next.js dashboard for AI music artist operations, campaigns, YouTube, commerce, and artist IP management.

## Core stack

- **Framework:** Next.js App Router
- **Database:** Prisma + SQLite (`dev.db` at project root by default)
- **Auth / integrations:** Local OAuth for YouTube and Google Drive; tokens encrypted at rest

## Setup

```bash
npm install
cp .env.example .env
# Set CREATOROPS_TOKEN_ENCRYPTION_KEY and OAuth credentials as needed
npm run db:migrate
npm run dev
```

## Environment variables

See `.env.example`. Placeholders only — never commit real keys.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLite path |
| `NEXT_PUBLIC_APP_URL` | OAuth redirect base |
| `CREATOROPS_TOKEN_ENCRYPTION_KEY` | Encrypts YouTube/Drive tokens |
| `YOUTUBE_CLIENT_ID` / `SECRET` | YouTube OAuth |
| `GOOGLE_DRIVE_CLIENT_ID` / `SECRET` | Drive OAuth (optional; can fall back to YouTube creds) |
| OpenAI / other AI keys | Server-side only via Settings workspace config |

## Major modules

### Campaign Command
Campaigns, board, tasks, calendar, copilot, automation, data health

### YouTube Studio
Video Intelligence, packaging, thumbnails, release planner, YouTube API integration

### AI Studio
Creator AI Agents, prompt library/runner, workflows, presets, playbooks

### Artist Ops / Music IP
Artist CRM, **Artist Bible**, **Lore**, **Song Vault**, **Story Arcs**, **Visual Identity**, release planner

### Product Factory & Commerce
Product factory, research, merch, listings, mockups, collections, revenue

### Analytics & Learnings
Analytics, pattern detection, quality vs performance, feedback loop, experiments, quality reviews, learnings

### Assets & Integrations
Asset library, external links, YouTube/Drive sync, backup center

### Admin
Settings, global search, activity, backups, data health, automation, **Operating Guide** (`/operating-guide`)

## Operating Guide

In-app onboarding and weekly rhythms for the full platform. Mirrors markdown doc:

- **Route:** `/operating-guide`
- **Markdown:** [CREATOROPS_OPERATING_GUIDE.md](./CREATOROPS_OPERATING_GUIDE.md)
- **PrettyWise setup:** tab `?tab=prettywise` — seeds first artist project (Bible, lore, songs, campaign, products)
- **Command palette:** Open Operating Guide, Start PrettyWise Setup, Weekly Review, Troubleshooting

## Migrations

```bash
npx prisma migrate dev    # development
npx prisma migrate deploy # production-style apply
npx prisma generate
```

Do not reset the dev database unless intentionally clearing local data.

## Backup & restore

- **Backup Center** exports all major SQLite models as JSON
- **Excluded from backups:** OAuth access/refresh tokens, API keys, `.env` values
- **Included:** connection metadata (channel name, email) for reconnect guidance
- Restore uses merge (upsert) or replace mode; integrations require reconnect after restore

## Integration safety

- YouTube and Drive tokens stored encrypted; never exported
- API failures surface user-friendly messages; pages should not crash when disconnected
- AI features degrade gracefully when provider is not configured

## Demo data

- Marker: `DEMO_DATA_CREATOROPS` in notes fields
- PrettyWise / Dorsyth Records demo bundle
- Delete demo removes only marked/demo-ID records — not real imported videos, assets, or campaigns

## Data Health & Automation

- Read-only scans with per-module `safeLoad` fallbacks
- Optional tables (commerce, artist universe) must not break the full report
- Automation suggestions require explicit user apply — no background destructive changes

## Known limitations

- Local-first single-user SQLite; not multi-tenant
- Agent runs stored as prompt runs where applicable; not all agent sessions are persisted separately
- Some deep links open list modules with `?recordId=` — invalid IDs show “not found” empty states
- TypeScript strict validation may be skipped in build (`next build`); run `npx tsc --noEmit` for full type check

## Roadmap ideas

- Prompt Runner “Include Artist Universe Context” toggle
- Release Planner / YouTube packaging inline artist context banners
- Automation suggestions for artist universe gaps
- Pattern detection for artist-specific visual/lyrical motifs
- Campaign bundle export including artist universe summaries
