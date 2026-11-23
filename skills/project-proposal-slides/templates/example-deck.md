# Worked Example — the texture to match

A fully filled 9-slide deck for a fictitious internal project (DocCopilot).
Match this concreteness: named tools, quantified ROI, phase durations, a spoken
pitch script on every slide, and a Q&A rehearsal appendix.

---

## Slide 1 — Title

- **Project:** DocCopilot
- **Pitch:** Internal search over docs and code that answers in seconds.
- **Stack:** Python · FastAPI · pgvector · LlamaIndex · Claude · React
- **Team:** Platform Team

### Speaker notes
This is DocCopilot — in one line, internal search over docs and code that
answers in seconds. I'll walk the problem, the plan, and the ask. We own it on
the Platform Team.

---

## Slide 2 — Executive Summary & Agenda

- **Problem:** Engineers lose ~3h/week finding and trusting internal answers.
- **Solution:** RAG assistant over docs + code, grounded with citations.
- **ROI:** -30% onboarding time; -40% support tickets in Q1 (assumed).
- **Timeline:** MVP in 6 weeks; rollout by week 10.
- **Agenda:** Scope → Features → Stack → Plan → Risks → Ask.

### Speaker notes
Engineers burn about three hours a week hunting for answers they still can't
trust. We fix that with a retrieval-augmented assistant that always cites its
source. Payback: down 30% on onboarding, down 40% on tickets next quarter —
flagged as assumptions to firm up. MVP in six weeks, rollout by ten.

---

## Slide 3 — Overview & Scope

- **Goal:** One grounded answer endpoint for internal docs + code.
- **In-scope:** docs wiki, code search, Slack bot, citations, re-indexing.
- **Out-of-scope:** external access, PII, voice, non-English, fine-tuning.

### Speaker notes
Why now: our docs are the source of truth but nobody can find them, so people
ask each other. We build exactly one thing — a grounded answer endpoint. In
scope: docs wiki, code search, Slack bot, citations, re-indexing. Deliberately
out: external access, PII, voice, non-English, fine-tuning, so we ship the core
fast.

---

## Slide 4 — Core Features

- **Grounded Q&A** over docs + code with citations — cuts search time.
- **Slack bot** answers inline with source links — builds trust.
- **Re-index pipeline** (webhook + nightly) — stops staleness.
- **Admin dashboard**: query log, hit/miss, stale flags — keeps it maintainable.

### Speaker notes
Four features, each tied to the three-hour problem. Grounded Q&A with citations
cuts search time. The Slack bot answers where the question already happened.
The re-index pipeline kills the staleness that makes people distrust search.
The dashboard is what keeps it maintainable after handoff.

---

## Slide 5 — UI Mockup & Workflow

- **Flow:** ask in Slack → router (docs vs code) → hybrid retriever → grounded LLM answer → top-3 source links.

```
[ Slack thread ]
@DocCopilot how do I reset a webhook?
  ✓ Step-by-step (3 steps)  ·  Sources: docs/ops/webhooks.md, api/wh.py:120

[ Web admin ]
Queries (7d): 4,210   Hit: 82%   Stale docs flagged: 7   [ Re-index ]
```

### Speaker notes
End to end: you ask in Slack, a tiny router picks docs or code, a hybrid
BM25-plus-vector retriever pulls the chunks, the LLM answers grounded in only
those chunks, and you get top-three source links. The discipline is that the
model can only answer from what it retrieved — that's what prevents
hallucination.

---

## Slide 6 — Technology Stack

- **Frontend:** React + internal design system; Slack Web API.
- **Backend:** Python 3.12, FastAPI, Celery for re-index.
- **Data & AI:** PostgreSQL + pgvector, LlamaIndex, Claude API, hybrid BM25+vector.
- **Infra:** Docker, Kubernetes, GitHub Actions CI/CD, S3 doc snapshots.

### Speaker notes
The stack is deliberately boring so it's easy to run. React on our design
system plus the Slack Web API on the front. Python 3.12 on FastAPI with Celery
for re-index jobs. PostgreSQL with pgvector, LlamaIndex for retrieval, Claude
for the model, hybrid BM25-plus-vector. Docker, Kubernetes, GitHub Actions,
S3 snapshots.

---

## Slide 7 — Execution Plan & Timeline

- **Phase 1 — Discovery & Setup (wk 1–2):** corpus audit, schema, CI. *80% of docs indexed in staging.*
- **Phase 2 — MVP Build (wk 3–6):** Q&A endpoint, Slack bot, citations. *<2s p50 answers.*
- **Phase 3 — Testing & Rollout (wk 7–10):** eval harness (50 gold Q&A), dashboard, 2-team pilot. *hit-rate ≥80%.*

### Speaker notes
Ten weeks, three phases. One: audit the corpus, define the schema, stand up
CI, get 80% of docs indexed in staging. Two: build the Q&A endpoint, Slack
bot, and citations, targeting sub-two-second p50. Three: the fifty-question
eval harness, the dashboard, and a two-team pilot at eighty percent hit rate.

---

## Slide 8 — Risk & Success Criteria

- **Stale docs → wrong answers.** Mitigate: timestamps + re-index + "no answer" fallback.
- **Hallucination erodes trust.** Mitigate: strict grounding + always-cite + miss log.
- **Cost at scale.** Mitigate: cache + small classifier model + budget alert.
- **Done:** ≥80% hit-rate on eval set; p50 <2s; ≥2 pilot teams active; ≥30% fewer tickets by wk 12.

### Speaker notes
Three risks, named upfront. Stale docs → wrong answers, so timestamps, the
re-index pipeline, and a no-answer fallback below the confidence threshold.
Hallucination erodes trust, so strict grounding, always-cite, and a miss log.
Cost at scale — cache, a small classifier model, and a monthly budget alert.
Done is 80% hit rate, sub-two-second p50, two pilot teams active, and 30%
fewer tickets by week twelve.

---

## Slide 9 — Closing & Next Steps

- **Ask (now):** approve 6-week MVP (2 engineers) + Claude API budget ($1k/mo, assumed).
- **Next review:** week-2 checkpoint; pilot sign-off at week 10.

### Speaker notes
What I need today is a yes on two things: a six-week MVP with two engineers,
and the Claude API budget, assumed at a thousand a month until we measure real
usage. Then I check in at week two and bring pilot sign-off at week ten. That's
the ask — thank you.

---

## Anticipated Q&A

- **Q: What if docs aren't kept up to date?**
  A: Freshness timestamps plus the re-index pipeline; answers below a confidence
  threshold say "I don't know" instead of guessing.
- **Q: How do you stop it making things up?**
  A: The model only answers from retrieved chunks and always cites; every miss
  is logged and reviewed.
- **Q: What's the real cost, not assumed?**
  A: We assume $1k/mo for the pilot; the eval harness and query log give us the
  actual number before we scale.
- **Q: Why not fine-tune a model instead of RAG?**
  A: RAG updates as docs change; fine-tuning would go stale and needs far more
  data. Out of scope deliberately.
- **Q: What's the failure mode if it's wrong in Slack?**
  A: Source links let anyone verify in seconds, and the miss log surfaces bad
  answers for the docs team.
- **Q: Can this run outside our teams?**
  A: No — out of scope. Internal-only, no PII, by design, for this pilot.

## Assumptions
- ROI, headcount (2 engineers), API budget, and timeline are assumed for this
  example — replace with real numbers when known.
