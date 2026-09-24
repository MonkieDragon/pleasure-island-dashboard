# Phase 2 output

Expand **approved** Phase 1 trails into location + step drafts. Align with dashboard schema (`trails`, `trail_stops`, `puzzle_chains`, `puzzle_steps`). Do not insert into Supabase unless asked.

Domain: **trail** → ordered **locations** (chains) → ordered **steps**.

## Draft shape (per trail)

```markdown
# Phase 2 — <Trail title>
**Mode:** walk | scooter
**Region:** <name>

## Trail metadata (draft)
- title
- description
- transport_mode: walk | scooter
- duration_minutes (estimate)
- distance_km (estimate, optional)
- is_free: true | false (entry fees at stops may still apply; flag in notes)

## Locations (trail order)

### Stop 1 — <Location title>
- latitude / longitude (best effort; mark `verify_on_site` if unsure)
- notes (access, tickets, scooter parking)
- steps (order_index from 0):

#### Step 0
- type: info | text | number | multiple_choice | qr | interactive
- content: …
- answer: … (if question type; canonical single-token where applicable)
- multiple_choice_options: […] (if multiple_choice)
- hints: [{ "text": "…", "delaySeconds": 30 }] (question types)
- interactive config: only if type is interactive (see subtypes below)
- latitude / longitude: optional per-step pin
- verify_on_site: true | false

#### Step 1
- …
```

## Step types (from dashboard)

- `info` — content only
- `text` — content + `answer` (+ hints)
- `number` — content + `answer` (+ hints)
- `multiple_choice` — content + options + correct answer (+ hints)
- `qr` — content + qr payload string (only if real or planned)
- `interactive` — content + config subtype:
  - `camera_overlay`
  - `symbol_codex` (each `symbols` entry is an uploaded image path or a `#rrggbb` hex colour, shown as a coloured circle)
  - `code_wheel`
  - `jigsaw`

Prefer simpler types unless assets exist or the user requests interactive.

## Constraints

- Every Phase 1 location for the trail appears once as a stop
- No location reused from another trail
- Prefer on-site observation over trivia
- If the user attaches photos, rewrite steps to match visible detail

## Delivery

Default: markdown drafts for review. Offer JSON only if asked for import. Keep region file Phase 1 status `approved` when Phase 2 starts.
