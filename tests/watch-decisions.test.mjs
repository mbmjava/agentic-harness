import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateWatch, planRecovery } from '../scripts/lib/supervision.mjs';

describe('watch decisions', () => {
  const base = { deadline: 1000, lastProgressAt: 0, stallMs: 100 };

  it('accepts a success and rejects non-success', () => {
    assert.deepEqual(evaluateWatch({ ...base, outcome: 'succeeded', now: 10 }), { kind: 'done' });
    assert.deepEqual(evaluateWatch({ ...base, outcome: 'failed', now: 10 }), { kind: 'failed', outcome: 'failed' });
  });

  it('classifies a deadline as a hang before a stall', () => {
    assert.equal(evaluateWatch({ ...base, now: 1000 }).kind, 'hang');
  });

  it('classifies idle progress as a stall', () => {
    assert.equal(evaluateWatch({ ...base, now: 150 }).kind, 'stall');
    assert.equal(evaluateWatch({ ...base, now: 50 }).kind, 'running');
  });

  it('never stalls without a finite window', () => {
    assert.equal(evaluateWatch({ deadline: 1e12, lastProgressAt: 0, stallMs: Infinity, now: 1e6 }).kind, 'running');
  });

  it('walks the resume -> redispatch -> escalate ladder', () => {
    assert.equal(planRecovery({ stalls: 0, attempt: 1 }).action, 'resume');
    assert.equal(planRecovery({ stalls: 1, attempt: 1 }).action, 'redispatch');
    assert.equal(planRecovery({ stalls: 1, attempt: 2 }).action, 'escalate');
  });
});
