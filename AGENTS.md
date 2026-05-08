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

# 🧭 1. PRODUCT OVERVIEW (WHAT THIS SYSTEM IS)

This project is a **dashboard for a mobile real-world treasure hunting game**.

It is NOT a CMS or generic content editor.

It is a **game authoring and operational tool** used to design physical-location-based gameplay experiences.

---

## 🎮 GAME CONCEPT

Players use a mobile app to:

- travel to real-world locations
- complete structured puzzle chains
- follow sequential clues
- interact with real-world objects (QR codes, plaques, landmarks)

---

## 🧩 CORE GAME LOOP

1. Player selects a region (e.g. Cebu, Siquijor)
2. Player selects a chain (a real-world location)
3. Player travels to that location
4. Player completes ordered steps (clues)
5. Steps may involve:
   - reading instructions
   - scanning QR codes
   - physical observation tasks
   - answering questions
6. Completion unlocks progression and future rewards

---

## 🧠 DESIGN INTENT

This system is:

> A tool for designing real-world exploration gameplay experiences.

NOT:

- a CMS
- a generic map editor
- a blog/content system

---


# 🧠 3. FRONTEND ARCHITECTURE

---

## 🧠 DASHBOARD (ROOT ORCHESTRATOR)

The ONLY place allowed to:

- fetch data from Supabase
- hold global state
- coordinate updates between components

### State owned by Dashboard:

- regions[]
- chains[]
- steps[]
- treasures[]

- selectedRegionId
- selectedChainId
- selectedStepId

### FORBIDDEN:

- UI rendering logic
- filtering logic inside child components
- Supabase calls inside child components

---

## 🧭 SIDEBAR

Responsibilities:
- reorder steps

---

## 🗺 MAPVIEW (VISUAL LAYER ONLY)

Responsibilities:


### FORBIDDEN:

- fetching data
- database access
- filtering logic
- business logic

---

## ✏️ STEPEditor (STEPS ONLY)

Responsibilities:

- edit step content/type


### Props:

- steps[]
- selectedStepId
- onSelectStep
- onUpdateStep

### FORBIDDEN:

- chain logic
- map logic
- region logic

---

# 🗺 4. MAP BEHAVIOUR RULES

## CHAINS



## STEPS

- only visible if:
  - belong to selected chain
  - AND have latitude + longitude
  - draggable

## TRAILS

- derived from ordered steps
- only shown when valid coordinates exist

---

# 🔄 5. DATA FLOW RULE

```txt
Supabase → Dashboard → Props → Components
```
