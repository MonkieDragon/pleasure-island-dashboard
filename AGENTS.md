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

Players use a mobile app to:

- select a region
- select a **trail** (ordered playlist of locations)
- travel to each location in order
- complete ordered steps (clues) at each location
- interact with real-world objects (QR codes, plaques, landmarks)

---

## CORE GAME LOOP

1. Player selects a region (e.g. Cebu, Siquijor)
2. Player selects a trail
3. For each location on the trail (in order):
   - Player travels to that location
   - Player completes that location’s ordered steps
4. Steps may involve:
   - reading instructions
   - scanning QR codes
   - physical observation tasks
   - answering questions
5. Completing the trail unlocks progression and future rewards

---

## DESIGN INTENT

This system is:

> A tool for designing real-world exploration gameplay experiences.

NOT:

- a CMS
- a generic map editor
- a blog/content system

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

---

# 3. DOMAIN TERMS (DO NOT RENAME)

- **region** — geographic grouping (island / city area)
- **chain** (`puzzle_chains`) — a **location**: a real-world map pin with ordered steps. UI says “location”.
- **step** — ordered gameplay clue inside a location
- **trail** (`trails` + `trail_stops`) — ordered playlist of locations. This is what players browse and play.
- **treasure** — optional reward system (not core gameplay)

Rules:

- A location may appear on **at most one** trail (or none).
- Locations not on a published trail stay in the dashboard atlas; players never see them.
- Trail metadata (description, duration, distance, transport, free/paid, cover image) lives on **trails**, not on locations.
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

When a trail is selected: edit trail details + reorder stops (locations).

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
