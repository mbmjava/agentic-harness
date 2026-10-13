#!/usr/bin/env node
// Keep agent front-matter `model:` in sync with the single source of truth (.opencode/models.json).
// Usage: node scripts/sync-agent-models.mjs [--check | --write]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig, resolveConfiguredModel } from './lib/config.mjs';
import { resolveAgentsDir } from './lib/layout.mjs';
import { parseFrontmatter, setFrontmatterValue } from './lib/frontmatter.mjs';

export function runSync({ root = process.cwd(), write = false } = {}) {
  const config = loadConfig(root);
  const agentsDir = resolveAgentsDir(root);
  const problems = [];
  const changes = [];

  const files = readdirSync(agentsDir).filter((name) => extname(name) === '.md');
  for (const name of files) {
    const role = basename(name, '.md');
    const path = join(agentsDir, name);
    const text = readFileSync(path, 'utf8');
    const { data } = parseFrontmatter(text);

    if (Object.hasOwn(config.agents, role)) {
      const expected = resolveConfiguredModel(config, role, 'opencode');
      if (data.model !== expected) {
        if (write) {
          writeFileSync(path, setFrontmatterValue(text, 'model', expected));
          changes.push(`${role}: ${data.model ?? '(none)'} -> ${expected}`);
        } else {
          problems.push(`${name}: model '${data.model ?? '(none)'}' != configured '${expected}'`);
        }
      }
    } else if (data.mode === 'subagent') {
      problems.push(`${name}: subagent with no model mapping in models.json`);
    }
  }

  return { problems, changes };
}

export function main(argv = process.argv.slice(2)) {
  const write = argv.includes('--write');
  const { problems, changes } = runSync({ root: process.cwd(), write });

  if (write && changes.length > 0) {
    console.log(`sync-agent-models: updated ${changes.length}`);
    for (const change of changes) console.log(`  ${change}`);
  }

  if (problems.length > 0) {
    console.error(`sync-agent-models: ${problems.length} mismatch(es)`);
    for (const problem of problems) console.error(`  ${problem}`);
    return 1;
  }
  if (!write) console.log('sync-agent-models: ok');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
