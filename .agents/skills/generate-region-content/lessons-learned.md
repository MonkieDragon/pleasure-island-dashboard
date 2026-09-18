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
- **Lesson:** Use **trail groups + 1–3 variants** for exclusive day packages (tour-leaflet style). Use **`trail_stops.optional`** for skippable extras on the same package. Locations may appear on multiple variant trails. Do not conflate trail optional with Explore `puzzle_chains.optional` (side find).
- **Action:** Schema + dashboard + player support shipped; Chiang Mai Doi Inthanon rebuilt as Classic / Kew Mae Pan / Pha Dok Siew. Sticky Falls and similar days should follow the same pattern when authored.
