#!/usr/bin/env node
// Read or set the active harness mode (per-checkout, gitignored).
// Usage: node scripts/mode.mjs [--set cowboy|tracked|jira-issue] [--json]
import { pathToFileURL } from 'node:url';
import { MODES, isMode, readMode, writeMode } from './lib/mode.mjs';
import { currentBranch } from './lib/git.mjs';

export function runMode(argv, { root = process.cwd(), branch = currentBranch(root) } = {}) {
  const setIndex = argv.indexOf('--set');
  if (setIndex !== -1) {
    const mode = argv[setIndex + 1];
    if (!mode) {
      console.error(`--set requires a mode (${MODES.join(', ')})`);
      return 2;
    }
    if (!isMode(mode)) {
      console.error(`Invalid mode '${mode}' (expected: ${MODES.join(', ')})`);
      return 2;
    }
    const record = writeMode(root, mode, { branch });
    console.log(`mode: ${record.mode}${branch ? ` (branch ${branch})` : ''}`);
    return 0;
  }

  const current = readMode(root);
  if (argv.includes('--json')) {
    console.log(JSON.stringify(current, null, 2));
    return 0;
  }
  console.log(current.mode);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runMode(process.argv.slice(2));
}
