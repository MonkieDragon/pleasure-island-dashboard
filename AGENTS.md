<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Puzzle Dashboard System (FINAL SPEC)

This file defines the complete system architecture, data model, and rules for any AI agent working in this repository.

The goal is:

- no architectural drift
- no mixed abstractions
- no guessing schema or intent
- no repeated refactors

---

# 1. PRODUCT OVERVIEW (WHAT THIS SYSTEM IS)

This project is a **dashboard for a mobile real-world treasure hunting game**.

It is NOT a CMS or generic content editor.

It is a **game authoring and operational tool** used to design physical-location-based gameplay experiences.

---

## GAME CONCEPT

This is a **game for exploring real places** through puzzles — not a day-trip itinerary app.

Players:

- select a region
- **pick an adventure (trail)** and follow ordered puzzle locations, **or**
- **Explore** the map and discover puzzle pins wherever they go
- complete ordered steps (clues) at each location
- interact with real-world objects (QR codes, plaques, landmarks)

---

## CORE GAME LOOP

1. Player selects a region (e.g. Chiang Mai, Cebu)
2. Player either:
   - selects a **trail** (curated puzzle adventure), or
   - opens **Explore** and picks a published map pin
3. On a trail, for each location (in order):
   - Player travels to that location
   - Player completes that location’s ordered steps
4. Steps may involve:
   - reading instructions / narrative
   - scanning QR codes
   - physical observation tasks
   - answering questions
5. Completing the trail unlocks progression and future rewards

---

## DESIGN INTENT

This system is:

> A tool for designing real-world **puzzle** exploration experiences.

NOT:

- a CMS
- a generic map editor
- a blog/content system
- a tourist day-trip planner (routes without puzzles)

---

# 2. SIBLING APP & DATABASE OWNERSHIP

The player-facing mobile app lives in a **separate repo**: `pleasure-island` (often opened together in a multi-root Cursor workspace).

| Concern | Owner |
| --- | --- |
| Supabase migrations / schema SQL | **This repo** (`supabase/migrations/`, `supabase/schema.sql`) |
| Generated TS types (dashboard) | This repo — `npm run db:types` → `supabase/types.ts` |
| Generated TS types (player) | `pleasure-island` — `npm run supabase:types` → `types/supabase.ts` |

Both apps link to the **same hosted Supabase project**. Do not invent a second schema or add migrations under `pleasure-island`.

After any schema change:

1. Apply / pull migrations in this repo as usual (`db:pull` / `db:sync` when needed)
2. Regenerate types here (`npm run db:types`)
3. Regenerate types in `pleasure-island` (`npm run supabase:types`)

Domain terms must stay aligned with the player app. Do not rename or reinterpret them for either codebase.

## Live Supabase data

Assume the Supabase CLI is available and this repo is linked to the hosted Pleasure Island project. Do **not** ask the user to confirm install, login, or link.

- Run CLI work from this repo (`puzzle-dashboard`). Prefer `npx supabase` or existing npm scripts (`db:types`, `db:pull`, `db:sync`).
- When a task depends on real content (what regions/trails/locations/steps exist, counts, publish state, sample rows), **query the linked project** (e.g. `npx supabase inspect db table-stats --linked`, targeted dumps, or existing scripts using `.env.local`) instead of guessing from migrations or generated types alone.
- Docker is required for `db:pull` / shadow DB diffs; it is **not** required for live reads against the linked hosted project.

## Images (Storage)

- Public bucket: `images`
- Tables store `image_path` (object key), not full URLs

## Region content generation

For generating region / trail / location / step content, follow `.agents/skills/generate-region-content/`.

---

# 3. DOMAIN TERMS (DO NOT RENAME)

- **region** — geographic grouping (island / city area)
- **chain** (`puzzle_chains`) — a **location**: a real-world map pin with ordered steps. UI says “location”.
- **step** — ordered gameplay clue inside a location
- **trail** (`trails` + `trail_stops`) — ordered playlist of locations; a curated **puzzle adventure**. This is what players browse and play.
- **treasure** — optional reward system (not core gameplay)

Rules:

- A location may appear on **multiple trails** (shared spine across related adventures). A location may appear at most once per trail.
- `trail_stops.optional` marks skippable stops inside a trail (distinct from `puzzle_chains.optional`, which is Explore “side find”).
- `puzzle_chains.explore_visible` controls Explore: when true, a published location appears on the Explore map (including locations that are also on trails). When false, the location is **trail-only** (narrative glue / exclusive mystery beats).
- Progress / purchase keys use **trail id**.
- `ready_to_publish` exists on trails, locations (`puzzle_chains`), and steps. The player catalog is published trails only; unpublished locations stay dashboard-side.
- Trail metadata (description, duration, distance, transport, free/paid, cover image) lives on **trails**, not on locations. Frame trails as adventures (puzzle play), not day-trip itineraries.
- Never merge trail into chain or replace chain/step with “puzzle”.

---

# 4. FRONTEND ARCHITECTURE

---

## DASHBOARD (ROOT ORCHESTRATOR)

The ONLY place allowed to:

- fetch data from Supabase
- hold global state
- coordinate updates between components

### State owned by Dashboard:

- regions[]
- chains[] (locations)
- steps[]
- treasures[]
- trails[]
- trailStops[]

- selectedRegionId
- selectedChainId
- selectedStepId
- selectedTreasureId
- selectedTrailId

### FORBIDDEN:

- UI rendering logic
- filtering logic inside child components
- Supabase calls inside child components

---

## SIDEBAR

Region view sections:

- Locations (add location)
- Treasures (add treasure)
- Trails (add trail)

When a trail is selected: edit trail details + reorder stops (locations); mark stops optional.

When a location is selected: edit location + reorder steps.

---

## MAPVIEW (VISUAL LAYER ONLY)

Responsibilities:

- region / location markers
- step markers + step polyline when a location is selected
- trail stop markers + trail polyline when a trail is selected

### FORBIDDEN:

- fetching data
- database access
- filtering logic
- business logic

---

## STEP EDITOR (STEPS ONLY)

Responsibilities:

- edit step content/type

### Props:

- steps[]
- selectedStepId
- onSelectStep
- onUpdateStep

### FORBIDDEN:

- chain logic
- trail logic
- map logic
- region logic

---

# 5. MAP BEHAVIOUR RULES

## LOCATIONS (CHAINS)

- markers at location lat/lng when browsing the region atlas

## STEPS

- only visible if:
  - belong to selected chain
  - AND have latitude + longitude
  - draggable

## TRAILS (PLAYER PLAYLIST)

- when a trail is selected: markers for that trail’s locations + polyline in stop order

## STEP TRAILS (WITHIN A LOCATION)

- derived from ordered steps with coordinates
- only shown when a location is selected and valid coordinates exist

---

# 6. DATA FLOW RULE

```txt
Supabase → Dashboard → Props → Components
```
