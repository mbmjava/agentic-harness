---
title: Standards
type: standard
status: active
owner: <you>
last_updated: 2025-10-12
tags: [standard]
---

# Standards

The single policy doc: modes, how agents work, supervision, verification, and the checks. The load-bearing
rules are in [`principles.md`](principles.md).

## 1. Modes

A **mode** is a user-chosen rigor dial, not a different agent — the same orchestrator runs every mode — and
it is orthogonal to *risk*: a mode sets the **default** rigor, and a specific change can still raise it.

| Mode | Command | Branch | Spec | Review | Risk |
| --- | --- | --- | --- | --- | --- |
| cowboy | `/cowboy` | none | none | none | warn loudly, continue |
| tracked | `/tracked` | dedicated (created if absent) | none | `pr-reviewer`; `judge` across a boundary | warn + gated review |
| jira-issue | `/jira-issue` | references the issue key | typed spec | `spec-reviewer` + `pr-reviewer` | gated |

Full policy per mode: [`modes/cowboy.md`](modes/cowboy.md), [`modes/tracked.md`](modes/tracked.md),
[`modes/jira-issue.md`](modes/jira-issue.md).

**Entry.** Record the mode (`node scripts/mode.mjs --set <mode>` → `.agentic/mode.json`); `tracked` and
`jira-issue` run `node scripts/branch-guard.mjs` and, if the branch is not relevant, **ask before creating
one**; announce the mode at the top of the turn.

**Risk boundaries.** A hard boundary is: public wire contract, schema/migration, authn/authz, tenancy/privacy,
data integrity or deletion, an external integration, or prod/deploy. In `tracked`/`jira-issue` a change across
one gets the gated treatment (add the `judge` pass and a focused review).

**Cowboy's one exception.** Cowboy warns and continues across reversible risk; **irreversible or
secret-exposing** acts still need an explicit in-turn acknowledgement: history rewriting or force operations,
destructive data operations, and writing/echoing/committing a credential. Never silently edit the harness's own
controls; never push to a protected branch.

## 2. Session protocol

- **Answer before act.** A statement or question is not a work order; act on an explicit instruction. This
  governs *new or ambiguous* requests, not already-approved queue items.
- **Route before implementing.** State `route: delegate <slice> | inline because <reason>`. Delegation is the
  default for a safe, bounded slice; the user is never the trigger, and inline needs a reason.
- **Work an ordered queue** until a stop condition: a needed decision, a scope change, a destructive or
  irreversible action, an unfixable verification failure, or the end of the queue. End every turn with the
  next action or the blocker.
- **One driver per checkout.** Never let two primary sessions write the same worktree.
- **Visible narration every turn.** Announce each multi-minute step and its result; no silent tool-only turns.
- **No clock-based session rotation.** A stall is triaged, not a reason to rotate sessions or refresh state.

## 3. Handoff

`working-docs/handoff.md` is the developer's **local, per-checkout recovery card** — gitignored, never
committed, retained after merge. Its source-derived facts (mode, branch, active spec/issue) are generated;
`## Next actions` and `## My notes` are the few non-derivable bullets, preserved across refreshes.

On an explicit "resume", read it and start from its exact next action; treat it as a recovery card, not a
gate. A lasting decision never lives only in a handoff — promote it into the code, the spec, or the tracker.

```sh
node scripts/handoff.mjs --issue KAN-1 --next "the exact next action"   # refresh in place
node scripts/handoff.mjs --print                                        # preview without writing
```

Template: [`handoff/template.md`](handoff/template.md).

## 4. Orchestrator and workers

- The **orchestrator** is the single primary agent. It owns intent, dispatch, integration, the verification
  gate, and git. It does not hand-implement except small integration glue. See [`roles/orchestrator.md`](roles/orchestrator.md).
- A **worker** gets a self-contained brief (goal, acceptance criteria, strict write scope, references,
  out-of-scope, exact verify commands) and a complexity class. It returns findings and a diff only, does not
  message the user, and never writes git. See [`roles/worker.md`](roles/worker.md) and
  [`contracts/worker-brief.md`](contracts/worker-brief.md).
- Parallelize only work with disjoint write scopes. Serialize builds — output, ports, and caches are shared.
- Match the cheapest tier that can hold quality: `worker-xs` (mechanical), `worker` (scoped), `analyst`
  (read-only recon), `spec-reviewer`/`pr-reviewer`/`judge` (independent review on a different model family).

## 5. Supervision

Complexity budgets and the stall window live in `.opencode/models.json` (`complexity`, `timeouts.stallMs`).

- **Stall** = no session progress for `timeouts.stallMs`. Recover: resume the same child (`?resume=true`) with
  a short re-brief → re-dispatch a fresh worker → escalate to the user.
- **Hang** = deadline reached. Stop the worker and reject its result.
- Accept a result only if it finished before its deadline and reported success.

The watchdog runs in the same turn as every background dispatch and **records nothing you must read** — no
ledger, no artifact. See the `## Supervise` section of `AGENTS.md` for the command.

## 6. Verification

- Prefer bounded wrappers over ad hoc foreground commands; a raw foreground server/build is the hang bug.
- Treat a green command as evidence only for what it actually checked.
- Reproduce before you fix; keep the failing test as the regression guard.

## 7. Harness is code

Instructions, agents, skills, permissions, and scripts get the same review as code. An agent may propose a
harness change but must never silently relax its own controls.

## 8. Checks

All three run in `npm run check`.

| Check | Command | Fails when |
| --- | --- | --- |
| Docs | `node scripts/check-docs.mjs` | a relative link is broken, or a required harness file is missing |
| Parity | `node scripts/check-harness-parity.mjs` | a mode lacks a policy doc or command, or a role lacks a doc or agent file |
| Model sync | `node scripts/sync-agent-models.mjs --check` | an agent's `model:` differs from `.opencode/models.json` |

`.opencode/models.json` is the single source of truth for model routing; `--write` re-syncs agent files in
place. Every role under `agents` must appear in `models` and have an agent file.
