---
name: Cowboy mode
description: Default vibe-coding mode. Move fast, warn loudly, no formal gate. Reversible risk is crossed with a warning; irreversible or secret-exposing acts need an explicit acknowledgement.
---

# Cowboy mode (default)

The default mode. Vibe-code directly: implement, iterate, and keep the reins and the guardrails. Cowboy is
the **absence of a formal gate**, not the absence of judgment.

## Allowed

- Implement directly in the working tree, or on a scratch branch if you prefer.
- Dispatch bounded slices to `code-worker` / `worker-xs`; use `analyst` for recon.
- Use reviewers at will, but none are required.

## Not applicable

- No branch requirement, no spec, no required review, no PR.
- Work is "done" when the user accepts it.

## Risk handling — warn loudly, continue

Cowboy never silently blocks a change. When a change crosses a risk boundary — public wire contract,
schema/migration, authentication/authorization, tenancy/privacy, data integrity, external integration,
production/deploy — **say so plainly in the same turn and continue**.

One narrow exception: **irreversible or secret-exposing acts** require an explicit in-turn acknowledgement
before they run:

- history-rewriting or force operations (`push --force`, `reset --hard` over commits, `filter-branch`);
- destructive data operations (dropping a table, deleting data, `rm -rf` on tracked content);
- writing, echoing, or committing a credential.

These are not restrictions on the *work* — they preserve the *reins*.

## Always out of bounds

- Never silently edit the harness's own controls (agents, skills, permissions, checks). Propose the change
  and ask.
- Never push to a protected or shared default branch.
- Never commit secrets.

## Recording

Cowboy work is not formalized. If it turns out to matter, capture it deliberately — promote the intent into
a spec or the tracker rather than trusting the transcript. See [`standards.md`](../standards.md).
