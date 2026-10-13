import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const LEDGER_FILE = '.agentic/supervision.json';
export const TERMINAL_OUTCOMES = ['succeeded', 'failed', 'interrupted'];

// ---- ledger ---------------------------------------------------------------------------------------

export function readLedger(root = process.cwd()) {
  const file = resolve(root, LEDGER_FILE);
  if (!existsSync(file)) return { units: [] };
  const data = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(data.units)) throw new Error(`${LEDGER_FILE}: 'units' must be an array`);
  return data;
}

export function writeLedger(root, ledger) {
  const file = resolve(root, LEDGER_FILE);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(ledger, null, 2)}\n`);
  return ledger;
}

export function getUnit(root, id) {
  return readLedger(root).units.find((unit) => unit.id === id) ?? null;
}

// Start a unit: the deadline is derived from its complexity budget, so a worker that never
// progresses is caught even if it never emits a terminal outcome.
export function startUnit(root, { id, role, goal = null, complexity = 'm', sessionID = null, budgetMs, now = Date.now() }) {
  if (!id || !role) throw new Error('startUnit requires id and role');
  if (!Number.isSafeInteger(budgetMs) || budgetMs <= 0) throw new Error('startUnit requires a positive budgetMs');
  const ledger = readLedger(root);
  if (ledger.units.some((unit) => unit.id === id)) throw new Error(`Unit '${id}' already exists`);
  const unit = {
    id,
    role,
    goal,
    sessionID,
    complexity,
    attempt: 1,
    stalls: 0,
    state: 'running',
    startedAt: now,
    deadline: now + budgetMs,
    lastProgressAt: now,
    updatedAt: now,
    note: null,
  };
  ledger.units.push(unit);
  writeLedger(root, ledger);
  return unit;
}

export function updateUnit(root, id, patch = {}) {
  const ledger = readLedger(root);
  const unit = ledger.units.find((candidate) => candidate.id === id);
  if (!unit) throw new Error(`Unknown unit '${id}'`);
  const { now = Date.now(), ...fields } = patch;
  Object.assign(unit, fields, { updatedAt: now });
  writeLedger(root, ledger);
  return unit;
}

export function removeUnit(root, id) {
  const ledger = readLedger(root);
  const before = ledger.units.length;
  ledger.units = ledger.units.filter((unit) => unit.id !== id);
  if (ledger.units.length === before) throw new Error(`Unknown unit '${id}'`);
  writeLedger(root, ledger);
}

// ---- decisions (pure) -----------------------------------------------------------------------------

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
