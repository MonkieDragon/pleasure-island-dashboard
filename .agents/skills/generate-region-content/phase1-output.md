# Phase 1 output

Emit a **region adventure portfolio** only. No coordinates, step text, answers, or puzzle types.

## Markdown shape (default for review)

```markdown
# Phase 1 portfolio — <Region Name>

**Status:** draft
**Sources consulted:** (place clusters / geography; optional Reddit/blogs)
**Assumptions:** (defaults for duration, pace, visitor type)

## Summary
- N walk adventures, M scooter adventures
- Must-sees covered; note shared spines across variants; list notable omissions and why

## Trails

### 1. <Trail title>
- **Mode:** walk | scooter
- **Duration (rough):** e.g. half day / 3–4 hours
- **Description:** 1–2 sentences (puzzle adventure framing, not a tour leaflet)
- **Locations (ordered):**
  1. <Name>
  2. <Name>
- **Why this adventure:** (geography / must-see cluster)
- **Open questions:** (optional)

### 2. …

## Rejected shapes
| Candidate | Reason |
| --- | --- |
| … | tour-only / unsafe scooter / etc. |

## Unassigned maybes
- <Place> — why not fitted yet

## Overlap check
List locations shared across trails (expected for variant spines). Flag accidental duplicates within a single trail.
```

## Optional JSON (same content)

```json
{
  "region": "Chiang Mai",
  "status": "draft",
  "trails": [
    {
      "title": "string",
      "transport_mode": "walk",
      "duration_note": "string",
      "description": "string",
      "locations": ["string"]
    }
  ],
  "rejected_shapes": [{ "name": "string", "reason": "string" }],
  "unassigned_maybes": [{ "name": "string", "note": "string" }]
}
```

## After emitting

1. Stop and ask for review (add / remove / swap / approve).
2. Sync `regions/<slug>.md` draft sections to match.
