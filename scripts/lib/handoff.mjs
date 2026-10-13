import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { currentBranch } from './git.mjs';
import { readMode } from './mode.mjs';
import { readLedger } from './supervision.mjs';

export const HANDOFF_FILE = 'working-docs/handoff.md';
export const CONTEXT_FILE = '.agentic/context.json';

// ---- sources --------------------------------------------------------------------------------------

function git(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
  return result.status === 0 ? result.stdout.trim() : null;
}

export function gitFacts(root = process.cwd()) {
  const branch = currentBranch(root);
  const head = git(root, ['rev-parse', '--short', 'HEAD']);
  const trunk = ['main', 'master', 'develop', 'trunk'].find((candidate) => git(root, ['rev-parse', '--verify', '--quiet', candidate]) !== null) ?? 'main';
  const trunkHead = git(root, ['rev-parse', '--short', trunk]);
  const counts = git(root, ['rev-list', '--left-right', '--count', `${trunk}...HEAD`]);
  let ahead = null;
  let behind = null;
  if (counts) {
    const [behindCount, aheadCount] = counts.split(/\s+/).map(Number);
    behind = behindCount;
    ahead = aheadCount;
  }
  const status = git(root, ['status', '--porcelain']);
  const dirty = status === null ? null : status.split('\n').filter(Boolean).length;
  const commits = (git(root, ['log', '--oneline', '-8']) ?? '').split('\n').filter(Boolean);
  return { branch, head, trunk, trunkHead, ahead, behind, dirty, commits };
}

export function readContext(root = process.cwd()) {
  const file = resolve(root, CONTEXT_FILE);
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, 'utf8'));
}

export function writeContext(root, patch) {
  const file = resolve(root, CONTEXT_FILE);
  const next = { ...readContext(root), ...patch };
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

export function readHandoff(root = process.cwd()) {
  const file = resolve(root, HANDOFF_FILE);
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

// Extract the body under a `## <heading>` up to the next `## ` heading (line-based, so blank lines
// inside a section are preserved).
export function extractSection(text, heading) {
  if (!text) return '';
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return '';
  const body = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^##\s/.test(lines[index])) break;
    body.push(lines[index]);
  }
  return body.join('\n').trim();
}

// ---- render ---------------------------------------------------------------------------------------

function workingTree(git) {
  if (git.dirty === null || git.dirty === undefined) return 'unknown';
  return git.dirty === 0 ? 'clean' : `${git.dirty} uncommitted`;
}

function position(git) {
  if (git.ahead === null || git.behind === null) return 'ahead/behind unknown';
  return `${git.behind} behind / ${git.ahead} ahead`;
}

export function renderHandoff({ mode, git, units = [], spec = 'none', issue = 'none', owner = '', next = '', notes = '', pr = 'not-submitted', date }) {
  const unitLines = units.length > 0
    ? units.map((unit) => `- ${unit.id} — ${unit.role}/${unit.complexity} state=${unit.state} attempt=${unit.attempt}`).join('\n')
    : '- none';

  return `---
title: Handoff — ${git.branch ?? 'detached'}
type: handoff
status: active
owner: ${owner}
last_updated: ${date}
tags: [handoff, memory]
---

# Handoff — ${git.branch ?? 'detached'} (${date})

> The developer's **local resume point for this checkout**. Gitignored and never committed. Generated facts
> are refreshed from Git/mode/spec sources; non-derivable context lives under \`## My notes\`.

- **Mode:** ${mode}
- **Trunk:** \`${git.trunk}\` @ ${git.trunkHead ?? 'unknown'}
- **Branch:** \`${git.branch ?? 'detached'}\` @ ${git.head ?? 'unknown'} (${position(git)})
- **Working tree:** ${workingTree(git)}
- **Active spec:** ${spec}
- **Tracker issue:** ${issue}

## Open units

${unitLines}

## Supervision ledger

Mirror of \`.agentic/supervision.json\`; ${units.length} unit(s) in flight.

## Current PR watch

${pr}

## Next actions

${next || '_(set the exact next action)_'}

## Recent commits

${git.commits.length > 0 ? git.commits.map((commit) => `- ${commit}`).join('\n') : '- none'}

## My notes

${notes || '<!-- Optional: a few short bullets of context not recoverable from linked sources. -->'}
`;
}

// ---- generate -------------------------------------------------------------------------------------

export function generateHandoff({ root = process.cwd(), git = gitFacts(root), now = new Date(), spec, issue, owner, next, pr } = {}) {
  const existing = readHandoff(root);
  const context = readContext(root);
  const mode = readMode(root).mode;
  const units = readLedger(root).units.filter((unit) => !['done', 'failed'].includes(unit.state));
  const date = now.toISOString().slice(0, 10);

  return renderHandoff({
    mode,
    git,
    units,
    spec: spec ?? context.spec ?? 'none',
    issue: issue ?? context.issue ?? 'none',
    owner: owner ?? context.owner ?? '',
    next: next ?? context.next ?? extractSection(existing, 'Next actions'),
    notes: extractSection(existing, 'My notes'),
    pr: pr ?? context.pr ?? 'not-submitted',
    date,
  });
}

export function writeHandoff(root = process.cwd(), options = {}) {
  const content = generateHandoff({ root, ...options });
  const file = resolve(root, HANDOFF_FILE);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  return content;
}
