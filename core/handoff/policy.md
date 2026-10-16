---
name: Handoff policy
description: The local, per-checkout recovery card. Generated facts plus a few non-derivable notes. Never committed.
---

# Handoff policy

A handoff is the developer's **local recovery card for this checkout**, not a shared document.

- **Where.** `working-docs/handoff.md` is one local, per-checkout file. It is **gitignored, never committed**,
  and retained after merge. Separate checkouts keep separate files, even on the same branch.
- **What it holds.** Source-derived facts are *generated*, not hand-written: trunk/branch/head, working tree,
  the active mode, the active spec/issue, and the next action.
  `## My notes` is an **optional** card: a few short bullets only when non-derivable context would otherwise
  be lost (a decision/uncertainty, a blocker, the exact next action). Empty beats duplicated.
- **Resume is automatic.** Read the handoff at the start of every session and continue from its exact next
  action; an explicit "resume" (or `/resume`) does the same thing. Treat it as a recovery card and source
  index, not a gate. Verify only the facts that affect that action.
- **A lasting decision never lives only in a handoff** — promote it into the spec, the tracker, or the code.
- **Export only when traveling.** The handoff does not leave this checkout on its own.

Template: [`template.md`](template.md).
