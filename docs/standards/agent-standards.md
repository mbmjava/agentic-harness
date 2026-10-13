---
title: Agent standards
type: standard
status: active
owner: mkb
last_updated: 2025-10-12
tags: [standard, agents]
---

# Agent standards

**Living document.** How agents work in this harness: the session protocol, the handoff, orchestration, and
worker collaboration. `AGENTS.md` points here; keep this current and delete anything that stops earning its
place.

## 1. Session protocol

- **Answer before act.** A statement or question is not a work order. Act on an explicit instruction. This
  governs *new or ambiguous* requests, not already-approved queue items.
- **Route before implementing.** State `route: delegate <slice> | inline because <reason>` before substantial
  work. Delegate whenever a bounded slice is safe to delegate; the user is never the trigger.
- **Work an ordered queue** until a stop condition: a needed decision, a scope change, a destructive action, a
  failed verification, or the end of the queue. End every turn with the next action or the blocker.
- **Visible narration every turn.** Announce each multi-minute step and its result; no silent tool-only turns.
- **Bound the loop.** Give every worker a complexity class and deadline; see §4.

## 2. Handoff

- `working-docs/handoff.md` is the developer's **local, per-checkout recovery card** — gitignored, never
  committed, retained after merge. Its source-derived facts (mode, branch, active spec/issue, in-flight units)
  are generated; `## My notes` is a few short non-derivable bullets at most.
- On an explicit "resume", read it and start from its exact next action; treat it as a recovery card, not a
  gate. Verify only the facts that affect that action.
- **A lasting decision never lives only in a handoff** — promote it into the spec, the backlog, or the code.

```sh
node scripts/handoff.mjs --issue KAN-1 --next "the exact next action"   # refresh in place
node scripts/handoff.mjs --print                                        # preview without writing
```

Generated facts (mode, branch, active spec/issue, in-flight units) come from `.agentic/`; `## Next actions`
and `## My notes` are preserved across refreshes. `--spec`, `--issue`, `--owner`, and `--next` persist into
`.agentic/context.json`.

## 3. Orchestrator and workers

- The **orchestrator** is the single primary agent. It owns intent translation, dispatch, integration, the
  verification gate, and git. It does not hand-implement except small integration glue.
- A **worker** gets a self-contained brief (goal, acceptance criteria, strict write scope, references,
  out-of-scope, exact verify commands) and a complexity class. It returns findings and a diff only, does not
  message the user, and never writes git.
- Parallelize only work with disjoint write scopes. Serialize build/verification — output, ports, and caches
  are shared.
- Match the cheapest tier that can hold quality: `worker-xs` (mechanical), `worker` (scoped), `analyst` (recon),
  `spec-reviewer`/`pr-reviewer`/`judge` (independent review on a different model family).

## 4. Supervision

- Assign each worker a complexity class; budgets come from `.opencode/models.json` (`complexity`).
- **Stall** = no session progress for `timeouts.stallMs`. Recover: resume the same child (`?resume=true`) with
  a short re-brief → re-dispatch a fresh worker from the checkpoint → escalate to the user.
- **Hang** = deadline reached. Stop the worker and reject its result.
- Accept a result only if it finished before its deadline and reported success.
- Record every in-flight unit in `.agentic/supervision.json` (unit → role, session, complexity, attempt, state)
  so a stalled or restarted session can recover.

```sh
node scripts/supervision.mjs --add --id u1 --role worker --complexity m   # open a unit
node scripts/supervision.mjs                                              # list in-flight units
node scripts/watch-opencode-session.mjs <child-id> worker --complexity m --unit u1
```

The watchdog exits `0` accepted, `4` rejected (hang or non-success), `5` re-dispatch, `6` escalate.

## 5. Verification

- Prefer repository wrappers over ad hoc foreground commands.
- Treat a green command as evidence only for what it actually checked.
- Reproduce before you fix; keep the failing test as the regression guard.

## 6. Harness is code

- Instructions, agents, skills, permissions, and scripts get the same review as code.
- An agent may propose a harness change but must never silently relax its own controls.
