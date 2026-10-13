---
description: Formal, tracker-linked flow — intake, typed spec, one spec review, human merge
agent: orchestrator
---

Read and follow `.opencode/skills/mode/SKILL.md` and `.agentic/core/modes/jira-issue.md`. Record the mode with
`node scripts/mode.mjs --set jira-issue`, announce it, and run intake.

**Intake (read/search only — never write to the tracker):**
1. Read `working-docs/handoff.md`. If it names an in-progress issue key, offer to **pick up** (default),
   **search**, or **create**.
2. Otherwise query the tracker read-only for in-progress issues assigned to the orchestrator, and present them.
3. If nothing matches, capture the intent in the backlog/spec and **ask the owner to create the issue**, then
   pick it up.

Then formalize (typed spec with `spec_id` and owner-chosen `approval_mode`), check the branch with
`node scripts/branch-guard.mjs --issue <KEY>` (create `kan-123-<slug>` if absent), and run the simplified
spine: one `spec-reviewer` pass, implement, one `pr-reviewer` pass (plus `judge` across a hard boundary),
then human merge. Move the issue only at real events.
