---
title: Harness checks
type: standard
status: active
owner: mkb
last_updated: 2025-10-12
tags: [standard, checks]
---

# Harness checks

The checks keep the harness internally consistent. All three run in `npm run check`.

| Check | Command | Fails when |
| --- | --- | --- |
| Docs | `node scripts/check-docs.mjs` | a relative Markdown link is broken, or a required harness file is missing |
| Parity | `node scripts/check-harness-parity.mjs` | a mode lacks a policy doc or command, or a configured subagent role lacks a role doc or agent file |
| Model sync | `node scripts/sync-agent-models.mjs --check` | an agent's `model:` differs from `.opencode/models.json` |

## Model sync

`.opencode/models.json` is the single source of truth for model routing. The agent files carry a `model:`
line so the runtime can pick it up; `--check` fails on drift, and `--write` re-syncs in place:

```sh
node scripts/sync-agent-models.mjs --check
node scripts/sync-agent-models.mjs --write
```

Every role listed under `agents` must appear in `models`, define an `opencode` model, and have an agent file.
A `subagent`-mode agent with no mapping is a parity error.

## Complexity budgets

`models.json` also holds the supervision windows:

- `complexity.<xs|s|m|l>` — the wall-clock budget per task size.
- `timeouts.defaultMs` — the budget when no complexity is given.
- `timeouts.stallMs` — how long without session progress counts as a stall.
- `timeouts.stopConfirmationMs` — how long to wait for a stop to confirm.

## Related

- [`modes.md`](modes.md)
- [`agent-standards.md`](agent-standards.md)
