---
title: Work tracker
type: standard
status: active
owner: mkb
last_updated: 2025-10-12
tags: [standard, tracker]
---

# Work tracker

**The repository is the source of truth; the tracker is a mirror.** This adapter is **read-only** — it reads
and searches issues for `/jira-issue` intake. It never creates, edits, transitions, or deletes anything;
writes remain a separate, owner-approved operation.

## Configuration

Non-secret settings live in a committed file, `.tracker/config.json`:

```json
{ "provider": "jira", "cloudId": "", "projectKey": "" }
```

An empty `projectKey` or `cloudId` means **not configured**; the adapter says so and stops. The token is
**runtime-only**: read from `JIRA_TOKEN`, never committed, never printed.

## Intake

`node scripts/tracker.mjs --intake` decides what `/jira-issue` should do, in this order:

1. **Handoff.** If `working-docs/handoff.md` names a `Tracker issue:`, offer **pick up** (default), **search**,
   or **create**.
2. **Search.** Otherwise search the tracker read-only for in-progress issues in the project and present them.
3. **Create.** If nothing matches, do **not** write: record the intent in the backlog or a spec and ask the
   owner to create the issue, then pick it up.

## Commands

```sh
node scripts/tracker.mjs --config
node scripts/tracker.mjs --intake [--json]
node scripts/tracker.mjs --search [--status "In Progress"] [--assignee NAME] [--json]
node scripts/tracker.mjs --issue KEY [--json]
```

## Jira Cloud

Reach Jira Cloud through the API gateway URL
`https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/...`, authenticating with a least-privilege token.
For read/search, the narrowest scopes are enough (`read:jira-work`, `read:project:jira`). The `cloudId` is
not a secret and stays in the config file.

## Lifecycle (manual, real events only)

Move an issue only at a real event, using an offered transition: To Do → Ready (frozen/preflight-ready) →
In Progress (implementation started) → In Review (PR/review pending) → Done (merged and owner-accepted). No
time logging, no automatic sync, no editing issue content without approval.

## Related

- [`modes.md`](modes.md) — where intake runs.
- [`agent-standards.md`](agent-standards.md) — how work and recovery run.
