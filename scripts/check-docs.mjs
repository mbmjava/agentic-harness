#!/usr/bin/env node
// Verify every relative Markdown link resolves and the required harness files exist.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SKIP_DIRS = new Set(['node_modules', '.git', '.agentic', 'target', 'dist']);

const REQUIRED = [
  'AGENTS.md',
  'README.md',
  'WORKING-AGREEMENT.md',
  'core/modes/cowboy.md',
  'core/modes/tracked.md',
  'core/modes/jira-issue.md',
  'core/roles/orchestrator.md',
  'adapters/opencode/agents/orchestrator.md',
  'adapters/opencode/models.json',
  'docs/standards/modes.md',
  'docs/standards/agent-standards.md',
  'docs/standards/harness-checks.md',
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (extname(name).toLowerCase() === '.md') out.push(path);
  }
  return out;
}

function stripCode(text) {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
}

function linkTargets(text) {
  const targets = [];
  const re = /!?\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = re.exec(text)) !== null) targets.push(match[1].trim());
  return targets;
}

function isExternal(target) {
  return /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#') || target.startsWith('//');
}

export function runCheckDocs(root = process.cwd()) {
  const errors = [];
  let checked = 0;

  for (const file of walk(root)) {
    const text = stripCode(readFileSync(file, 'utf8'));
    for (const raw of linkTargets(text)) {
      const target = raw.replace(/^<|>$/g, '').split('#')[0].split('?')[0];
      if (!target || isExternal(target)) continue;
      const decoded = target.replace(/%20/g, ' ');
      const resolved = decoded.startsWith('/')
        ? resolve(root, decoded.slice(1))
        : resolve(dirname(file), decoded);
      checked += 1;
      if (!existsSync(resolved)) {
        errors.push(`${file.replace(root, '').replace(/^[\\/]/, '')}: broken link -> ${raw}`);
      }
    }
  }

  for (const required of REQUIRED) {
    if (!existsSync(resolve(root, required))) errors.push(`missing required file: ${required}`);
  }

  return { errors, checked };
}

export function main(argv = process.argv.slice(2)) {
  const { errors, checked } = runCheckDocs(process.cwd());
  if (errors.length > 0) {
    console.error(`check-docs: ${errors.length} problem(s)`);
    for (const error of errors) console.error(`  ${error}`);
    return 1;
  }
  console.log(`check-docs: ok (${checked} links, ${REQUIRED.length} required files)`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
