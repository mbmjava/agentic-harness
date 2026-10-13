---
name: Worker report
description: The compact return shape from a worker or analyst. Findings and a diff, not a transcript.
---

# Worker report

A worker returns this shape and nothing larger. No whole files, no raw logs, no restated prompts.

```
STATUS:      done | blocked | question
COMPLEXITY:  xs | s | m | l
CHANGED:     <path — one line each, or "none" for analyst>
DIFF:        <unified diff, or exact old/new snippets>
EVIDENCE:    <what was run and what it actually proved; "none" if nothing ran>
FINDINGS:    <analyst: verified facts with path:line; coder: what matters>
UNCERTAINTY: <open questions, ambiguous matches, unverified API/signature; never a guess>
```

For an **analyst**, omit `DIFF`, set `CHANGED: none`, and lead with `FINDINGS` (verified vs inference).
