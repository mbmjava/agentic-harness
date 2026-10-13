#!/usr/bin/env node
// Enforce the mode's branch requirement before write work is dispatched.
// Exit 0 = ok, 3 = not on a relevant branch (a suggested name is printed), 2 = usage error.
// Usage: node scripts/branch-guard.mjs [--mode <m>] [--branch <b>] [--issue <KEY>] [--json]
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { readMode } from './lib/mode.mjs';
import { currentBranch } from './lib/git.mjs';
import { evaluateBranchGuard } from './lib/branch-guard.mjs';

export function runBranchGuard(argv, { root = process.cwd() } = {}) {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        mode: { type: 'string' },
        branch: { type: 'string' },
        issue: { type: 'string' },
        json: { type: 'boolean' },
      },
      allowPositionals: false,
    }));
  } catch (error) {
    console.error(`branch-guard: ${error.message}`);
    return 2;
  }

  const mode = values.mode ?? readMode(root).mode;
  const branch = values.branch ?? currentBranch(root);
  const issueKey = values.issue ?? null;
  const result = evaluateBranchGuard({ mode, branch, issueKey });

  if (values.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const tail = result.suggested ? ` — suggested: ${result.suggested}` : '';
    console.log(`${result.ok ? 'ok' : 'blocked'} [${mode}]: ${result.reason}${tail}`);
  }
  return result.code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runBranchGuard(process.argv.slice(2));
}
