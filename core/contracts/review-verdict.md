---
name: Review verdict
description: The output contract for spec-reviewer and pr-reviewer. A stable shape so the reviewer slot stays swappable.
---

# Review verdict

Both review roles return this shape. The first line is parsed by the flow, so keep it exact.

```
VERDICT: approve | request-changes | comment
CHECKLIST: <item>=pass|fail|n-a, ...
FINDINGS:
- [severity] path:line — what is wrong and why; the fix if obvious
```

- **Severity:** `blocker` (must fix before merge), `major`, `minor`, `nit`.
- Cite `path:line` for every factual finding. Separate **verified** from **inference**.
- If there are no findings, write `FINDINGS: none`.
- The reviewer has **no** approval or merge authority; the verdict is input to the orchestrator.
- Record each verdict as its own artifact bound to the reviewed head SHA (`Reviewed head: <sha>`).

For a **spec** review, replace `CHECKLIST` with the spec checklist items and echo the `SPEC_ID`.
