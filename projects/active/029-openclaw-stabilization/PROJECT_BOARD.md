# Project 029 — OpenClaw Stabilization

## Purpose

Get OpenClaw back to a trustworthy, useful operating system for Alan.

The goal is not to rebuild the whole multi-agent architecture immediately. The goal is to make the system reliable enough that Alan can use it weekly and daily without creating more cognitive load.

## Current Diagnosis

OpenClaw has strong raw material:

- persistent memory and workspace instructions
- prior Discord-based agent coordination that Alan liked
- project register and agent action board artifacts
- useful specialist-agent concepts
- existing automation and cron-style infrastructure

The weak point is operational simplicity. There are many artifacts, backups, trial documents, and overlapping project ideas, but no small current control surface that answers:

- What should OpenClaw do for Alan this week?
- What is active right now?
- What can be safely automated?
- What should wait until the foundation is stable?

## Guiding Principle

Foundation before architecture.

OpenClaw should first help Alan use the systems he already depends on: TickTick, calendar, email, projects, and weekly review. More agents, dashboards, and coordination layers only come after the operating rhythm is working.

## Phase 1 — Stabilize The Operating Rhythm

Status: Active

Outcomes:

- weekly review ritual is clear and repeatable
- active projects are reduced to a small visible queue
- OpenClaw knows when to challenge over-building
- future sessions start from a simple source of truth

Candidate first actions:

- run TickTick triage before building new automation
- define a weekly review prompt/checklist
- update project register/index so active work is visible
- identify which existing automations are alive, broken, or obsolete

## Phase 2 — Recover Useful OpenClaw Capabilities

Status: Pending

Outcomes:

- restore the useful parts of the old Discord/Joe workflow
- define what Joe should do daily or weekly
- keep specialist agents as bounded helpers, not a sprawling system
- document safe handoff rules and done gates

Likely inputs:

- `/Users/alangewerc/.openclaw/workspace/OPENCLAW_OPTIMIZATION_PLAN.md`
- `/Users/alangewerc/.openclaw/workspace/projects/active/012-agent-action-board/TRIAL_1_WRAP_UP/README.md`
- Trial 2 operating rules from Project 012

## Phase 3 — Automate Progressively

Status: Pending

Candidate automations, in order:

1. Weekly review assistant
2. TickTick inbox processor
3. Weekly market briefing
4. Garmin insight review
5. Lightweight project coordinator

Do not start with:

- full agent action board rebuild
- complex runtime activation layer
- many simultaneous specialist agents
- broad autonomous external actions

## Open Questions

- What is the smallest weekly review that Alan will actually do every Sunday?
- Which current OpenClaw cron jobs are still running and useful?
- Is Discord still the desired coordination layer, or should Codex/Cowork be the primary interface for now?
- What one automation would reduce Alan's cognitive load the most this month?

## Next Concrete Step

Run a foundation review:

1. inspect current active projects and automations
2. mark stale/obsolete items
3. produce a one-page "OpenClaw Now" operating view
4. choose the first weekly-review workflow before adding new features

