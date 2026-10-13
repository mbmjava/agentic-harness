#!/usr/bin/env node
// Manage the supervision ledger (.agentic/supervision.json): the orchestrator's view of in-flight units.
// Usage:
//   node scripts/supervision.mjs --add --id u1 --role worker [--complexity m] [--goal "..."] [--session ses_...]
//   node scripts/supervision.mjs --update --id u1 [--state running|stalled|done|failed|escalated|redispatch] ...
//   node scripts/supervision.mjs --list [--json]
//   node scripts/supervision.mjs --remove --id u1
import { pathToFileURL } from 'node:url';
import { loadConfig, complexityBudgetMs } from './lib/config.mjs';
import { readLedger, startUnit, updateUnit, removeUnit } from './lib/supervision.mjs';

const STATES = ['running', 'stalled', 'resume-requested', 'redispatch', 'done', 'failed', 'escalated'];

export function runSupervision(argv, { root = process.cwd(), now = Date.now() } = {}) {
  const flag = (name) => {
    const index = argv.indexOf(name);
    return index === -1 ? null : argv[index + 1];
  };

  try {
    if (argv.includes('--add')) {
      const id = flag('--id');
      const role = flag('--role');
      const complexity = flag('--complexity') ?? 'm';
      const budgetMs = complexityBudgetMs(loadConfig(root), complexity);
      const unit = startUnit(root, {
        id,
        role,
        complexity,
        goal: flag('--goal'),
        sessionID: flag('--session'),
        budgetMs,
        now,
      });
      console.log(`added ${unit.id} (${unit.role}/${unit.complexity}) deadline in ${Math.round(budgetMs / 1000)}s`);
      return 0;
    }

    if (argv.includes('--update')) {
      const id = flag('--id');
      const patch = { now };
      if (flag('--state')) patch.state = flag('--state');
      if (flag('--note')) patch.note = flag('--note');
      if (flag('--session')) patch.sessionID = flag('--session');
      if (flag('--attempt')) patch.attempt = Number(flag('--attempt'));
      if (flag('--stalls')) patch.stalls = Number(flag('--stalls'));
      if (flag('--progress')) patch.lastProgressAt = now;
      const unit = updateUnit(root, id, patch);
      console.log(`updated ${unit.id} -> ${unit.state}`);
      return 0;
    }

    if (argv.includes('--remove')) {
      removeUnit(root, flag('--id'));
      console.log(`removed ${flag('--id')}`);
      return 0;
    }

    const ledger = readLedger(root);
    if (argv.includes('--json')) {
      console.log(JSON.stringify(ledger, null, 2));
      return 0;
    }
    if (ledger.units.length === 0) {
      console.log('supervision: no units');
      return 0;
    }
    for (const unit of ledger.units) {
      const remaining = unit.state === 'done' || unit.state === 'failed' ? 0 : Math.max(0, unit.deadline - now);
      console.log(`${unit.id} ${unit.role}/${unit.complexity} state=${unit.state} attempt=${unit.attempt} stalls=${unit.stalls} remaining=${Math.round(remaining / 1000)}s`);
    }
    return 0;
  } catch (error) {
    console.error(`supervision: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runSupervision(process.argv.slice(2));
}
