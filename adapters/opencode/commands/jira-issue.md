---
description: Formal, tracker-linked flow — intake, typed spec, one spec review, human merge
agent: orchestrator
---

Read and follow `.opencode/skills/mode/SKILL.md` and `.agentic/core/modes/jira-issue.md`. Record the mode with
`node scripts/mode.mjs --set jira-issue`, announce it, and run intake.

**Intake (never write to the tracker):**
1. Read `working-docs/handoff.md`. If it names an in-progress issue key, offer to **pick up** (default).
2. If nothing matches, **ask the owner to name or create the issue**, then pick it up.

Then formalize (typed spec with `spec_id` and owner-chosen `approval_mode`), check the branch with
`node scripts/branch-guard.mjs --issue <KEY>` (create `kan-123-<slug>` if absent), and run the simplified
spine: one `spec-reviewer` pass, implement, one `pr-reviewer` pass (plus `code-judge` across a hard boundary),
then human merge. Move the issue only at real events.
