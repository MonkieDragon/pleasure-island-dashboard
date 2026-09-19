# Product brief

Pleasure Island is a **game for exploring real places** through puzzles.

> Pick an adventure and follow it, or explore the map and discover puzzles wherever you go.

## Intent

- Curate **puzzle locations** worth experiencing in a region — not list everything, and not sell generic day-trip routes
- One trail = one **puzzle adventure** (walk or scooter; usually a day or less)
- Player flow: region → trail (ordered locations → steps) **or** Explore (map pins with `explore_visible`)
- Trails may reuse shared Explore pins; trail-only locations (`explore_visible = false`) hold narrative glue or exclusive mystery beats

## What we are building

Curated **puzzle adventures** grounded in real places:

1. Start from classic place clusters (old city, mountain day, waterfall outing) as geography hints
2. Turn each stop into a location with gameplay steps — destinations are puzzles, not checklist pins
3. Compose trails that stitch shared pins and (when needed) trail-only narrative stops
4. Allow locations on multiple related adventures (e.g. Doi Inthanon · Classic / Kew Mae Pan)

## Transport

| Mode | Typical use |
| --- | --- |
| `walk` | Dense cores (old city, compact neighborhoods) |
| `scooter` | Spread-out viewpoints, temples, countryside loops |

A region usually needs **both**.

## Out of product scope

- Multi-day treks packaged as one trail
- Experiences that require booking a tour operator / guide to access the core gameplay (seasonal guided ridge walks may still appear as a variant when playable)
- A separate “routes only / no puzzles” product inside this app
- Treasure rewards (optional system; not part of this content pipeline)

## Domain terms (fixed)

- **region** — geographic grouping
- **chain** — location (map pin); UI says “location”
- **step** — ordered clue/puzzle inside a location
- **trail** — ordered playlist of locations (the adventure players browse and play)
- **explore_visible** — when true, published location appears in Explore (may also be on trails)
