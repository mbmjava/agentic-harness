---
name: Jira-issue mode
description: The formal, tracker-linked flow. Reads or searches an existing issue, links it to a typed spec, and runs a simplified approval spine ending in a human merge.
---

# Jira-issue mode

The formal flow, entered when work should be tied to a tracked issue. It uses a **simplified approval
spine**: a typed spec, one spec review, a dedicated branch tied to the issue, one PR review, and a human
merge. There is **no** forge-status automation in v1.

## Intake — check, then ask

On entry, look for an issue already in play, in this order:

1. **Handoff.** Read `working-docs/handoff.md`. If it names an in-progress issue key, offer to **pick up**
   (default), **search**, or **create**.
2. **Search.** Otherwise query the tracker (read-only) for issues assigned to the orchestrator in an
   in-progress state, and present them.
3. **Create.** Intake is **read/search only** in v1: do not write to the tracker. If nothing matches,
   capture the intent in the backlog or a spec and **ask the owner to create the issue**, then pick it up.

The tracker is a mirror: the repository stays the source of truth, and tracker edits never sync back. See
[`docs/standards/agent-standards.md`](../../docs/standards/agent-standards.md).

## Formalize

- Route the intent through a typed formalizer that records a canonical `spec_id` and an
  `approval_mode: human | judge` chosen by the owner.
- **Human is final; the judge advises.** Under `human`, a person approves the head and merges; the judge's
  verdict is advisory feedback bound to the reviewed head SHA.

## Branch

- The branch must reference the issue key, e.g. `kan-123-<slug>`.
- Enforced by `node scripts/branch-guard.mjs --issue <KEY>`; create it from the default branch if absent.

## Review — simplified spine

1. One **`spec-reviewer`** pass before implementation. Batch findings, freeze intent, re-review only on a
   material intent change.
2. Implementation on the issue branch.
3. One **`pr-reviewer`** pass; add the **`judge`** pass across a hard risk boundary.
4. **Human merge.** No forge status gates, no automatic sync.

## Lifecycle

Move the issue only at a real event, using an offered transition: To Do → Ready (frozen/preflight-ready) →
In Progress (implementation started) → In Review (PR/review pending) → Done (merged and owner-accepted).
Log no time and edit no issue content without approval.

## Done when

- The spec review and PR review are clean, CI is green, the human merges, and the owner accepts.
