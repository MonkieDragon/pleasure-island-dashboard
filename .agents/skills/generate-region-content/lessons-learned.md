# Lessons learned

Append-only global lessons from portfolio reviews and playtests. Newest at the bottom. Promote stable rules into `hard-filters.md` or `quality-rubric.md` when they stop being one-offs.

Format:

```markdown
## YYYY-MM-DD — <Region or trail>
- **Feedback:** …
- **Lesson:** …
- **Action:** (region file update / rubric / filter)
```

---

## 2026-09-19 — Doi Inthanon / trail variants
- **Feedback:** One mountain day has mutually exclusive long hikes (Kew Mae Pan vs Pha Dok Siew) plus many second-tier waterfalls/villages; a single forced itinerary overloads the day.
- **Lesson:** Use **separate named trails** for exclusive day packages (tour-leaflet style), e.g. `Doi Inthanon · Classic`. Use **`trail_stops.optional`** for skippable extras on the same package. Locations may appear on multiple trails (shared spine). Do not conflate trail optional with Explore `puzzle_chains.optional` (side find). Do **not** use trail groups.
- **Action:** Chiang Mai Doi Inthanon authored as three standalone trails (Classic / Kew Mae Pan / Pha Dok Siew). Sticky Falls and similar days should follow the same pattern when authored.

## 2026-09-19 — Drop trail groups
- **Feedback:** Trail groups added dual IDs (group carousel vs trail id) and catalog complexity with little payoff at current scale.
- **Lesson:** Prefer one catalog card per published trail. Related day packages share locations via multi-trail stops, not a group table.
- **Action:** Schema dropped `trail_groups` / variant columns; dashboard and player catalog flattened.

## 2026-09-19 — Puzzle adventures + Explore visibility
- **Feedback:** Day-trip / multi-concept pitch felt unfocused; Explore hid anything on a trail, which fought “discover puzzles on the map.”
- **Lesson:** Product is puzzle adventures + Explore. Shared pins use `explore_visible = true` (even when on trails). Trail-only narrative/exclusive beats use `explore_visible = false`. Same location+steps authoring; no second step system.
- **Action:** Schema + dashboard toggle + Explore filter updated; catalog meta shows stops/puzzles; authoring skill reframed around adventures.
