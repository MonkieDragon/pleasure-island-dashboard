---
name: generate-region-content
description: >-
  Generates Pleasure Island region content via a gated two-phase pipeline:
  Phase 1 adventure portfolio (no puzzles), then Phase 2 locations and steps.
  Use when planning or generating trails, puzzle adventures, region catalogs,
  Chiang Mai (or other) itineraries, locations/chains, or puzzles/steps; or when
  capturing playtest feedback into content lessons.
---

# Generate region content

Reusable authoring workflow for any region. Domain terms (do not rename):
**region**, **chain** (UI: location), **step**, **trail**, **treasure**.

Read supporting docs as needed:
- [product-brief.md](product-brief.md)
- [hard-filters.md](hard-filters.md)
- [quality-rubric.md](quality-rubric.md)
- [phase1-output.md](phase1-output.md)
- [phase2-output.md](phase2-output.md)
- [lessons-learned.md](lessons-learned.md)
- Region memory under [regions/](regions/) (create `regions/<slug>.md` if missing)

## Hard rules

1. **Phase gate**: Always run Phase 1 first unless the user explicitly says Phase 1 for that region is already approved.
2. **No puzzles in Phase 1**: No step text, answers, coords, or puzzle types.
3. **Shared locations OK**: A location may appear on multiple trails (shared spine). At most once per trail.
4. **Day-or-less**: Each trail is a self-guided adventure of a day or less.
5. **Modes**: Assign `walk` or `scooter` per trail; both are in scope for a region.
6. **Explore vs trail-only**: Default new locations to `explore_visible = true` (shared puzzle pins). Use `explore_visible = false` only for narrative glue or exclusive mystery beats that must not appear on the Explore map.
7. **Do not invent DB rows** unless the user asks to insert/import; drafts stay in chat / region files until then.

## Phase 1 — adventure portfolio

Research order:

1. Classic place clusters and must-see geography (primary inspiration — not a tourist-package catalog)
2. Classify each adventure as `walk` or `scooter`
3. Apply [hard-filters.md](hard-filters.md); reject tour-operator-only / not independently doable
4. Assign must-sees to adventures; reuse shared spine locations across related variants when needed
5. Optionally refine with Reddit / travel blogs (reorder, swap weak stops, add local favorites)
6. Load [lessons-learned.md](lessons-learned.md) and the region file; honor prior keep/maybe/never

Output using [phase1-output.md](phase1-output.md). Then **stop for human review**.

Update the region file: set Phase 1 status to `draft`, fill draft adventure shapes and location lists.

## Human review (between phases)

Accept edit requests: add/remove/swap stops, rename trails, change mode, fit a popular place into an adventure.

After edits, re-emit the portfolio and keep the region file in sync.

Only enter Phase 2 when the user clearly approves Phase 1 (e.g. “Phase 1 approved”, “proceed to Phase 2”).

## Phase 2 — locations and steps

For approved trails only:

1. Expand each stop into a location (chain) draft + ordered steps (puzzle play, not checklist copy)
2. Prefer photo-grounded puzzles when the user provides images
3. Follow [phase2-output.md](phase2-output.md) and [quality-rubric.md](quality-rubric.md)
4. Mark Phase 1 status `approved` on the region file if not already
5. Note which locations are Explore-shared vs trail-only

Do not skip ahead to Phase 2 for unapproved trails.

## Learning loop

When the user shares playtest or portfolio feedback:

1. Append a dated entry to [lessons-learned.md](lessons-learned.md)
2. Update the region file (keep / maybe / never, access notes, rejected shapes)
3. Promote stable, reusable rules into `hard-filters.md` or `quality-rubric.md` (ask before large rewrites of those files)

## New region

1. Create `regions/<slug>.md` from the Chiang Mai template structure
2. Run Phase 1 (portfolio only)
3. Wait for approval before Phase 2
