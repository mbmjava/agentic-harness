#!/usr/bin/env node
// Verify every relative Markdown link resolves and the required harness files exist. Works in both
// shapes: this source repo (`core`, `adapters/opencode`) and an installed app (`.agentic/core`, `.opencode`).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { firstExisting } from './lib/layout.mjs';

const SKIP_DIRS = new Set(['node_modules', '.git', '.agentic', 'target', 'dist']);
const CORE_FILES = ['principles.md', 'standards.md', 'modes/cowboy.md', 'modes/tracked.md', 'modes/jira-issue.md', 'roles/orchestrator.md', 'handoff/template.md', 'contracts/worker-brief.md'];
const MODE_COMMANDS = ['cowboy.md', 'tracked.md', 'jira-issue.md'];
const TARGETS = {
  core: ['core', '.agentic/core'],
  agents: ['adapters/opencode/agents', '.opencode/agents'],
  commands: ['adapters/opencode/commands', '.opencode/commands'],
  skills: ['adapters/opencode/skills', '.opencode/skills'],
  config: ['adapters/opencode/models.json', '.opencode/models.json'],
};

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (extname(name).toLowerCase() === '.md') out.add(path);
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
  const rel = (path) => relative(root, path).split('\\').join('/');

  const core = firstExisting(root, TARGETS.core);
  const agents = firstExisting(root, TARGETS.agents);
  const commands = firstExisting(root, TARGETS.commands);
  const skills = firstExisting(root, TARGETS.skills);
  const config = firstExisting(root, TARGETS.config);
  const isSource = existsSync(resolve(root, 'adapters/opencode'));

  if (!core) errors.push('missing core directory (core/ or .agentic/core/)');
  if (!agents) errors.push('missing agents directory (.opencode/agents)');
  if (!commands) errors.push('missing commands directory (.opencode/commands)');
  if (!config) errors.push('missing models.json');

  const required = [];
  if (core) for (const file of CORE_FILES) required.push(rel(resolve(core, file)));
  if (agents) required.push(rel(resolve(agents, 'orchestrator.md')));
  if (commands) for (const file of MODE_COMMANDS) required.push(rel(resolve(commands, file)));
  if (isSource) required.push('AGENTS.md', 'README.md', 'WORKING-AGREEMENT.md');
  for (const file of required) {
    if (!existsSync(resolve(root, file))) errors.push(`missing required file: ${file}`);
  }

  const files = new Set();
  for (const dir of [core, agents, commands, skills]) {
    if (dir && existsSync(dir)) walk(dir, files);
  }
  if (isSource) {
    for (const name of ['AGENTS.md', 'README.md', 'WORKING-AGREEMENT.md']) {
      const path = resolve(root, name);
      if (existsSync(path)) files.add(path);
    }
  }

  for (const file of files) {
    const text = stripCode(readFileSync(file, 'utf8'));
    for (const raw of linkTargets(text)) {
      const target = raw.replace(/^<|>$/g, '').split('#')[0].split('?')[0];
      if (!target || isExternal(target)) continue;
      const decoded = target.replace(/%20/g, ' ');
      const resolved = decoded.startsWith('/') ? resolve(root, decoded.slice(1)) : resolve(dirname(file), decoded);
      checked += 1;
      if (!existsSync(resolved)) errors.push(`${rel(file)}: broken link -> ${raw}`);
    }
  }

  return { errors, checked };
}

export function main() {
  const { errors, checked } = runCheckDocs(process.cwd());
  if (errors.length > 0) {
    console.error(`check-docs: ${errors.length} problem(s)`);
    for (const error of errors) console.error(`  ${error}`);
    return 1;
  }
  console.log(`check-docs: ok (${checked} links)`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
