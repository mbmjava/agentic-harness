# agentic-harness

A standalone, tool-neutral agentic coding harness: **one orchestrator, three modes, a supervised pool
of low-cost workers.**

The harness is a *distributable*, not something each app re-invents. It is developed here, then
materialized into a target repository's `.opencode/`, `.agentic/`, and `docs/agentic/` by the installer.
Existing apps (`agentic-approach`, `tagwell-*`, `work-approach`) are **read-only sources** this repo
learns from — never edit targets.

## The idea

- **One primary agent — the orchestrator.** Its only job is to frame work, dispatch it, supervise it,
  integrate results, and record state. It keeps product judgment and integration; it does not hand-implement.
- **Three modes** — a user-chosen rigor dial, not three different agents:
  - `/cowboy` (default): move fast, warn loudly, no formal gate.
  - `/tracked`: cowboy plus a dedicated branch and a mandatory reviewer pass.
  - `/jira-issue`: a formal, tracker-linked flow with a spec and a human merge.
- **A supervised worker pool:** coders (`worker`, `worker-xs`), an `analyst` for recon, and independent
  `spec-reviewer` / `pr-reviewer` / `judge` roles on a different model family.
- **Complexity-tiered supervision:** budgets by task size, stalls caught and resumed, hangs killed.

## Start here

- [`AGENTS.md`](AGENTS.md) — the short entry an agent loads every session.
- [`core/roles/orchestrator.md`](core/roles/orchestrator.md) — what the orchestrator does (and refuses).
- [`docs/standards/modes.md`](docs/standards/modes.md) — the three modes in detail.
- [`docs/standards/agent-standards.md`](docs/standards/agent-standards.md) — how work and recovery are run.

## Develop

```sh
npm test                       # unit tests
npm run check                  # doc links, harness parity, model sync
node scripts/mode.mjs --set tracked
node scripts/branch-guard.mjs
```

## Install into an app

```sh
node installer/install.mjs --target ../my-app --dry-run
node installer/install.mjs --target ../my-app
```
