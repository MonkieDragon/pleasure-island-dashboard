# Phase 1 output

Emit a **region trail portfolio** only. No coordinates, step text, answers, or puzzle types.

## Markdown shape (default for review)

```markdown
# Phase 1 portfolio — <Region Name>

**Status:** draft
**Sources consulted:** (packages / itineraries; optional Reddit/blogs)
**Assumptions:** (defaults for duration, pace, visitor type)

## Summary
- N walk trails, M scooter trails
- Must-sees covered once; list any notable omissions and why

## Trails

### 1. <Trail title>
- **Mode:** walk | scooter
- **Duration (rough):** e.g. half day / 3–4 hours
- **Description:** 1–2 sentences
- **Locations (ordered):**
  1. <Name>
  2. <Name>
- **Why this day-shape:** (package signal / geography)
- **Open questions:** (optional)

### 2. …

## Rejected day shapes
| Candidate | Reason |
| --- | --- |
| … | tour-only / unsafe scooter / etc. |

## Unassigned maybes
- <Place> — why not fitted yet

## Overlap check
Confirm no location name appears on more than one trail.
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
  "rejected_day_shapes": [{ "name": "string", "reason": "string" }],
  "unassigned_maybes": [{ "name": "string", "note": "string" }]
}
```

## After emitting

1. Stop and ask for review (add / remove / swap / approve).
2. Sync `regions/<slug>.md` draft sections to match.
