---
name: project-proposal-slides
description: Write 9-slide investment-grade project proposal content.
version: 0.2.0
author: imdevs, Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [productivity, proposals, slides, presentations, business]
    related_skills: [powerpoint]
---

# Project Proposal Slides Skill

Turn a messy project brain-dump into a rigorous, investment-grade, 9-slide
proposal deck — with a spoken pitch script (speaker notes) on every slide and
a Q&A rehearsal appendix for practice. Aimed at technical teams and
decision-makers. Self-contained: the .pptx build uses only python-pptx, so the
skill drops into any agent (Hermes, OpenCode, etc.) with no other skills
required.

## When to Use
- The user asks to write/generate project proposal slides or deck content.
- The user dumps a messy idea and wants it turned into a structured proposal.
- You need investment-grade, technical proposal content in a fixed structure.
- Do NOT use for: marketing decks, non-technical VC pitch decks where
  polish-over-substance is expected, one-pagers, or status/retro decks.

## Intake (messy brain-dump)
The real input is usually an unstructured ramble — a paragraph, a bullet dump,
or a voice-to-text of "here's what I'm thinking." Your job is to figure out the
rest:
- Extract the 5 anchors: project name, core problem, solution, 3–4 features, and
  any timeline/budget/headcount hints.
- Infer everything else (scope, risks, stack, success criteria) from the anchors.
- Do not ask questions to fill gaps — assume and label. Ask at most ONE
  question, and only if the core subject itself is unknowable.

## Autonomy Rules (minimize human intervention)
- Generate the full deliverable in one pass: 9 slides + speaker notes + Q&A.
  Do not draft-then-wait.
- Fill every gap with an explicit, labeled assumption (e.g. `MVP 6 weeks
  (assumed)`, `2 engineers (assumed)`) — never a placeholder, never a stall.
- Every deliverable ends with a short `## Assumptions` block.

## Density Rules (hard caps)
- ≤ 6 bullets per slide; each bullet ≤ ~12 words / one line.
- No paragraph longer than two lines.
- ROI must be quantified (a number or bounded estimate) — "improve efficiency"
  alone is a fail.
- Timeline in phases with durations (weeks), never "ongoing" / "as needed".
- Tech stack: named and specific (versions where known), never "modern
  frameworks".
- If a number is assumed, mark it `(assumed)`.

## Speaker Notes (pitch scripts)
Each slide carries a `### Speaker notes` block: 2–4 sentences of *what to say*
out loud, in first person. It is a script, not a restatement of the bullets —
connect the dots, quantify, and hand off to the next slide. Example:
> "So the problem we're solving is that engineers burn about three hours a week
> hunting for answers. Here's how we cut that..."

## Anticipated Q&A (rehearsal)
After the deck, add a `## Anticipated Q&A` appendix: 6–10 hard questions the
audience is likely to ask, each with a tight 1–2 sentence answer. This is a
practice section, NOT a 10th slide — the slide count stays exactly 9.

## The 9-Slide Framework
Generate exactly these 9 slides, in this order — no additions or omissions.
(Every slide gets a Speaker notes block per the rules above.)

1. **Title** — project name; one-line pitch (≤12 words, value prop); tech-stack
   badges; author/team.
2. **Executive Summary & Agenda** — elevator pitch ≤4 bullets: Problem →
   Solution → ROI → Timeline; one-line agenda.
3. **Overview & Scope** — core goal (what + why now); in-scope (explicit);
   out-of-scope (explicit).
4. **Core Features** — 3–4 capabilities, each with one line of user value.
5. **UI Mockup & Workflow** — step-by-step flow; text wireframe of key screen(s).
6. **Technology Stack** — frontend/client; backend/services; data & AI/agents;
   infrastructure.
7. **Execution Plan & Timeline** — Phase 1 Discovery & Setup; Phase 2 MVP Build;
   Phase 3 Testing & Rollout; each with deliverables + durations.
8. **Risk & Success Criteria** — 2–3 risks with mitigations; measurable "done".
9. **Closing & Next Steps** — the decision/resource needed now; next review date.

## Output Format
- Default: markdown. `## Slide N — <Title>`, bullets, then `### Speaker notes`;
  slides separated by `---`. After slide 9: `## Anticipated Q&A`, then
  `## Assumptions`.
- For a real `.pptx`: write a `deck.json` (shape in `templates/deck-spec.json`)
  and run the bundled, self-contained builder:
  `python scripts/build_deck.py deck.json out.pptx`
  Requires `python-pptx` on the machine: `pip install python-pptx`. If a richer
  `powerpoint` skill is also available you may use it, but build_deck.py
  always works standalone.

## Procedure
1. Intake the brain-dump; extract the 5 anchors.
2. If the core subject is unknowable, ask exactly one question; else proceed.
3. Draft the 9 slides (Density Rules) + a Speaker notes block on each.
4. Draft the Anticipated Q&A appendix (6–10 questions).
5. Self-check the Verification list; fix failures before delivering.
6. Deliver: markdown deck (slides + notes) + Q&A + Assumptions.
7. If `.pptx` was requested: write `deck.json` (include each slide's notes as
   `speaker_notes`) and run `scripts/build_deck.py`; report the output path.
8. Stop. Do not ask follow-ups the assumptions already cover.

## Pitfalls
- Q&A is an appendix, not slide 10 — the slide count stays exactly 9.
- Speaker notes must be a script to *say*, not a copy of the bullets.
- A missing number never blocks the run — assume and label it.
- Don't pad a thin slide with filler bullets.
- "Modern framework" / "state-of-the-art" is a fail — name the actual tool.
- Assumptions are real guesses, never `[TBD]` / `[X]` / `TODO`.
- build_deck.py only needs python-pptx; if missing, say `pip install
  python-pptx` rather than faking a file.

## Verification (run before delivering)
- Exactly 9 slides, correct titles, correct order.
- ≤6 bullets/slide, each one line; no paragraph >2 lines.
- Every slide has a Speaker notes block (2–4 sentences, a script not a restatement).
- Anticipated Q&A present with 6–10 questions.
- ROI quantified; timeline has phase durations; every tech item named.
- No placeholders; every assumption labeled and listed in `## Assumptions`.
- If `.pptx` requested: build_deck.py ran cleanly and produced a file with the
  right slide count + notes.
- A worked example lives in `templates/example-deck.md`.