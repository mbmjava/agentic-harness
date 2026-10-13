---
description: Vibe coding on a dedicated branch with a mandatory reviewer pass
agent: orchestrator
---

Read and follow `.opencode/skills/mode/SKILL.md` and `.agentic/core/modes/tracked.md`. Record the mode with
`node scripts/mode.mjs --set tracked`, announce it, and confirm the branch.

Run `node scripts/branch-guard.mjs`. If it reports the branch is not relevant, **ask the user to create one**
and, on approval, create the suggested `tracked/<slug>` branch before dispatching any write work. Use
`.agentic/core/modes/tracked.md` for the review requirement: every change gets one `pr-reviewer` pass, and a
change across a hard risk boundary also gets the `judge` pass. Record each verdict with the reviewed head SHA.
