---
title: Modes
type: standard
status: active
owner: mkb
last_updated: 2025-10-12
tags: [standard, modes]
---

# Modes

A **mode** is a user-chosen rigor dial. It is not a different agent — the same orchestrator runs every mode —
and it is orthogonal to *risk*: a mode sets the **default** rigor, and the risk of a specific change can
still raise it.

The canonical policy for each mode lives in `core/modes/`; the commands in the OpenCode adapter are thin
bindings over them.

| Mode | Command | Branch | Spec | Review | Risk handling |
| --- | --- | --- | --- | --- | --- |
| cowboy | `/cowboy` | none | none | none | warn loudly, continue |
| tracked | `/tracked` | dedicated, created if absent | none required | `pr-reviewer`; `judge` across a boundary | warn + gated review |
| jira-issue | `/jira-issue` | references the issue key | typed spec + `approval_mode` | `spec-reviewer` + `pr-reviewer`; `judge` across a boundary | gated |

## Entry

1. Record the mode: `node scripts/mode.mjs --set <mode>` → `.agentic/mode.json` (per-checkout, gitignored).
2. `tracked` and `jira-issue` run `node scripts/branch-guard.mjs` and, if the branch is not relevant, **ask
   before creating one**.
3. Announce the mode at the top of the turn.

## Risk boundaries

A **hard** boundary is: public wire contract, schema/migration, authentication/authorization, tenancy/privacy,
data integrity or deletion, an external integration, or production/deploy. In `tracked` and `jira-issue` a
change across a boundary gets the gated treatment (add the `judge` pass and a focused review).

## Cowboy's one exception

Cowboy warns and continues across reversible risk. **Irreversible or secret-exposing** acts still require an
explicit in-turn acknowledgement: history rewriting or force operations, destructive data operations, and
writing/echoing/committing a credential. Never silently edit the harness's own controls; never push to a
protected branch.

## Related

- [`agent-standards.md`](agent-standards.md) — how work and recovery run.
- [`harness-checks.md`](harness-checks.md) — the checks that keep this consistent.
