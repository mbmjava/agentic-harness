---
name: Tracked mode
description: Vibe coding with a dedicated branch and a mandatory reviewer pass. No spec required. Risk boundaries get a loud warning and a gated review.
---

# Tracked mode

Cowboy with a seatbelt: the same directness, plus a **dedicated git branch** and **independent review**
before the work counts as done. It does not require a spec.

## On entry

1. Read the current branch. If it is not a relevant branch, **ask to create one** and, on approval, create
   `tracked/<slug>` from the current head.
   - Relevant = a dedicated (non-default) branch. `main`, `master`, `develop`, and `trunk` are not relevant.
   - Enforced by `node scripts/branch-guard.mjs`; it prints the suggested name when the branch is not relevant.
2. Record the mode (`node scripts/mode.mjs --set tracked`).

## Work

- Dispatch bounded slices to `code-worker` / `worker-xs` on the dedicated branch.
- The orchestrator owns git and makes the commits.

## Review — required

- Every change gets one **`pr-reviewer`** pass before it is considered done.
- Add the **`code-judge`** pass when the change is large or the review is contested.
- Record the verdict with the reviewed head SHA.

## Risk handling

- Reversible risk: warn loudly, continue (same as cowboy).
- A change across a hard boundary (public wire contract, schema/migration, auth, tenancy/privacy, data
  integrity, external integration, production/deploy) gets the **gated** treatment: add the `code-judge` pass and
  a focused security review before the reviewer verdict is accepted. When a boundary is arguable, treat it
  as gated.

## Done when

- The reviewer verdict is `approve` (or findings are fixed and re-verified once), and the user accepts.

## Graduation

- When the work turns out to need a tracker issue, **graduate to jira-issue** — attach the issue and add the
  spec — rather than restarting the work.

## Out of bounds

- Never silently edit the harness's own controls.
- Never force-push or rewrite shared history.
