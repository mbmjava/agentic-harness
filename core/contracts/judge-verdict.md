---
name: Judge verdict
description: The output contract for the adversarial judge. Fail-closed; advisory under human approval.
---

# Judge verdict

Keep this shape.

```
VERDICT: approve | request-changes | escalate
CI: pass | fail | pending
REVIEWER: <the reviewer's verdict, or 'none'>
REASONS:
- <one line per reason; cite path:line where relevant>
```

- **Approve** only when all hold: reported CI is green; no unresolved `blocker`/`major` finding (each fixed
  or shown to be a false positive with `path:line` rationale); acceptance criteria met or explicitly out of
  scope; no uncertainty remains.
- Otherwise `request-changes` (specific, cited gaps) or `escalate` (product intent, risk, scope, or a policy
  decision belongs to the owner; or inputs are unavailable — **fail closed**).
- The judge has **no merge authority**; its verdict is input to the loop.
