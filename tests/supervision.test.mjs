import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  evaluateWatch,
  planRecovery,
  readLedger,
  removeUnit,
  startUnit,
  updateUnit,
} from '../scripts/lib/supervision.mjs';
import { runSupervision } from '../scripts/supervision.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function tempHarness() {
  const root = mkdtempSync(join(tmpdir(), 'harness-sup-'));
  mkdirSync(join(root, 'adapters', 'opencode'), { recursive: true });
  writeFileSync(
    join(root, 'adapters', 'opencode', 'models.json'),
    readFileSync(join(repoRoot, 'adapters', 'opencode', 'models.json')),
  );
  return root;
}

describe('supervision ledger', () => {
  it('is empty by default', () => {
    assert.deepEqual(readLedger(tempHarness()).units, []);
  });

  it('starts a unit with a complexity-derived deadline', () => {
    const root = tempHarness();
    const unit = startUnit(root, { id: 'u1', role: 'worker', complexity: 's', budgetMs: 480000, now: 1000 });
    assert.equal(unit.state, 'running');
    assert.equal(unit.deadline, 481000);
    assert.equal(unit.attempt, 1);
    assert.equal(readLedger(root).units.length, 1);
  });

  it('rejects a duplicate unit and a bad budget', () => {
    const root = tempHarness();
    startUnit(root, { id: 'u1', role: 'worker', budgetMs: 1000 });
    assert.throws(() => startUnit(root, { id: 'u1', role: 'worker', budgetMs: 1000 }), /already exists/);
    assert.throws(() => startUnit(root, { id: 'u2', role: 'worker', budgetMs: 0 }), /positive budgetMs/);
  });

  it('updates and removes a unit', () => {
    const root = tempHarness();
    startUnit(root, { id: 'u1', role: 'worker', budgetMs: 1000, now: 0 });
    assert.equal(updateUnit(root, 'u1', { state: 'done', now: 5 }).state, 'done');
    removeUnit(root, 'u1');
    assert.deepEqual(readLedger(root).units, []);
    assert.throws(() => removeUnit(root, 'u1'), /Unknown unit/);
  });
});

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

describe('supervision CLI', () => {
  it('adds, updates, and removes a unit', () => {
    const root = tempHarness();
    assert.equal(runSupervision(['--add', '--id', 'u1', '--role', 'worker', '--complexity', 's'], { root }), 0);
    assert.equal(readLedger(root).units[0].complexity, 's');
    assert.equal(runSupervision(['--update', '--id', 'u1', '--state', 'done'], { root }), 0);
    assert.equal(readLedger(root).units[0].state, 'done');
    assert.equal(runSupervision(['--remove', '--id', 'u1'], { root }), 0);
    assert.deepEqual(readLedger(root).units, []);
  });

  it('fails on an unknown complexity class', () => {
    const root = tempHarness();
    assert.equal(runSupervision(['--add', '--id', 'u1', '--role', 'worker', '--complexity', 'xxl'], { root }), 1);
  });
});
