import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const MODES = ['cowboy', 'tracked', 'jira-issue'];
export const DEFAULT_MODE = 'cowboy';
export const MODE_FILE = 'working-docs/agentic-state/mode.json';

export function isMode(value) {
  return MODES.includes(value);
}

// Reads the active mode. Missing file is not an error: cowboy is the default.
export function readMode(root = process.cwd()) {
  const file = resolve(root, MODE_FILE);
  if (!existsSync(file)) {
    return { mode: DEFAULT_MODE, source: 'default', since: null, branch: null };
  }
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  if (!isMode(raw.mode)) {
    throw new Error(`${MODE_FILE}: invalid mode '${raw.mode}' (expected: ${MODES.join(', ')})`);
  }
  return { mode: raw.mode, source: 'file', since: raw.since ?? null, branch: raw.branch ?? null };
}

export function writeMode(root, mode, { branch = null, now = new Date() } = {}) {
  if (!isMode(mode)) {
    throw new Error(`Invalid mode '${mode}' (expected: ${MODES.join(', ')})`);
  }
  const file = resolve(root, MODE_FILE);
  mkdirSync(dirname(file), { recursive: true });
  const record = { mode, since: now.toISOString(), branch };
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  return record;
}
