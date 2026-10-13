---
name: Worker brief
description: The self-contained shape of a delegated assignment. A worker gets everything it needs and nothing it must guess.
---

# Worker brief

A worker gets a **self-contained** assignment. If it must guess, the brief failed.

```
ROLE:        code-worker | worker-xs | analyst
COMPLEXITY:  xs | s | m | l
GOAL:        <one sentence: what "done" produces>
ACCEPTANCE:  <bulleted, testable criteria>
WRITE SCOPE: <exact files/dirs the worker may write; "none" for analyst>
REFERENCES:  <files to read first; surrounding patterns to match>
OUT OF SCOPE:<what must NOT be touched>
VERIFY WITH: <the exact bounded command(s) the worker may run>
```

Rules:

- **Disjoint scopes.** Parallel workers never share a writable file.
- **Exact commands.** `VERIFY WITH` names exact commands, not globs or ad hoc shell.
- **No git writes.** A worker never commits, pushes, or checks out.
- **The scope is a fence.** Write ONLY the files in `WRITE SCOPE`; never touch the harness (`AGENTS.md`,
  `.agentic/`, `.opencode/`, `scripts/`, `docs/`) or any other file.
- **Return contract.** The worker returns a diff plus the [worker report](worker-report.md) shape — as its
  message, never written into a file.
