export const TERMINAL_OUTCOMES = ['succeeded', 'failed', 'interrupted'];

// One poll of a supervised child. `outcome` is the session outcome if any.
export function evaluateWatch({ outcome = null, now, deadline, lastProgressAt, stallMs }) {
  if (outcome && TERMINAL_OUTCOMES.includes(outcome)) {
    return outcome === 'succeeded' ? { kind: 'done' } : { kind: 'failed', outcome };
  }
  if (now >= deadline) return { kind: 'hang' };
  if (Number.isFinite(stallMs) && now - lastProgressAt >= stallMs) return { kind: 'stall', idleMs: now - lastProgressAt };
  return { kind: 'running' };
}

// Escalation ladder for a stalled unit: resume the same child, then re-dispatch fresh, then escalate.
export function planRecovery({ stalls, attempt, maxStalls = 1, maxAttempts = 2 }) {
  if (stalls < maxStalls) return { action: 'resume', reason: `resume ${stalls + 1}/${maxStalls}` };
  if (attempt < maxAttempts) return { action: 'redispatch', reason: `redispatch ${attempt + 1}/${maxAttempts}` };
  return { action: 'escalate', reason: 'resume and redispatch exhausted' };
}
