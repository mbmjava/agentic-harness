# Working agreement

Owner: <you> · Last reviewed: 2025-10-12

The living agreement for maintaining this harness. It is policy for maintainers and agents, not part of
any product; [`AGENTS.md`](AGENTS.md) points here.

## Scope

- **Owned:** this harness — its policy (`core/`), adapters (`adapters/`), scripts, and installer.
- **Source of truth:** the code, the scripts, and the checks.
- **Out of bounds for now:** a provider-specific approval loop, tracker writes, and multi-CLI parity beyond
  the OpenCode adapter.

## Roles

- The maintainer owns intent, this agreement, and acceptance.
- A contributing agent works from [`AGENTS.md`](AGENTS.md) + this agreement, keeps changes bounded and
  reviewable, and reports what changed, what was verified, and what was not.

## Non-negotiables

1. **Experience-first.** Add concrete lessons (failure modes, contracts, specifics) over restated consensus.
2. **Anti-ceremony.** Process is automatic or absent; documentation is a byproduct, never a deliverable. A
   need becomes a capability or nothing. If it isn't faster or safer on a real task, it's ceremony.
3. **Anti-bloat.** One canonical home per subject; link instead of duplicating. Capabilities scale; process compounds.
4. **Tool-neutral core.** Shared policy stays CLI-independent; CLI specifics stay in adapters.
5. **Harness is code.** Instructions, agents, skills, permissions, and scripts get the same scrutiny as code.
6. **Evidence with limits.** Results are labelled verified vs assumed.
7. **Checks stay green.** Doc links, harness parity, model sync, and tests pass before a change lands.
8. **Change log updated** when meaning changes.

## Definition of done

- `npm run check` and `npm test` are green.
- Claims carry evidence and limits; no secret values anywhere.

## Change log

- 2025-10-12 — Created.
