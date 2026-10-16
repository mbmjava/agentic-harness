---
description: Read the recovery card and continue from its exact next action
agent: orchestrator
---

Read `working-docs/handoff.md` — the local, per-checkout recovery card — together with the active mode from
`working-docs/agentic-state/mode.json` and the active spec/issue from `working-docs/agentic-state/context.json`.

Continue from the handoff's **exact next action**. Treat it as a recovery card and source index, not a gate:
verify only the facts that affect that action, announce them, and act. Keep its `Tracker issue:` line current.

If the handoff is absent (a fresh checkout — it is gitignored), fall back to the branch name `kan-<n>-<slug>`
as a weak signal and confirm it with the owner before acting.
