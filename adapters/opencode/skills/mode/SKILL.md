---
name: Mode
description: The shared behavior every mode command loads. Records and reads the mode, enforces the branch guard, and applies the risk-handling rule.
metadata:
  opencode/autoinvoke: false
---

# Mode

Load this from `/cowboy`, `/tracked`, or `/jira-issue`. It is the shared behavior; the full policy for each
mode is in `.agentic/core/modes/<mode>.md`.

## 1. Record the mode

Set the mode at entry; the default is `cowboy` when no file exists:

```sh
node scripts/mode.mjs --set cowboy|tracked|jira-issue
node scripts/mode.mjs          # print the active mode
```

The mode lives in `.agentic/mode.json` (per-checkout, gitignored). Announce it in the first line of the turn.

## 2. Enforce the branch guard

`cowboy` has no branch requirement. `tracked` and `jira-issue` require a relevant (non-default) branch:

```sh
node scripts/branch-guard.mjs
node scripts/branch-guard.mjs --issue KAN-123
```

- Exit `0` — proceed.
- Exit `3` — not relevant; the script prints a **suggested** branch name. **Ask the user**, and on approval
  create it, then re-check. Never create a branch unasked.

## 3. Apply risk handling

- Reversible risk (wire contract, schema, auth, tenancy, data integrity, external integration, deploy):
  **warn loudly in the same turn and continue** (add the gated review in `tracked`/`jira-issue`).
- Irreversible or secret-exposing acts: require an explicit in-turn acknowledgement before acting.
- Never silently edit the harness's own controls; never push to a protected branch; never commit secrets.

## 4. Record

Keep the mode, the active issue/spec, and in-flight units recoverable in `working-docs/handoff.md`. Use
`.agentic/core/handoff/policy.md`.
