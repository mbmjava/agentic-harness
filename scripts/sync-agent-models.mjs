#!/usr/bin/env node
// Keep agent front-matter `model:` in sync with the single source of truth (.opencode/models.json).
// Usage: node scripts/sync-agent-models.mjs [--check | --write]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig, resolveConfiguredModel, resolveProfile } from './lib/config.mjs';
import { resolveAgentsDir } from './lib/layout.mjs';
import { parseFrontmatter, setFrontmatterValue } from './lib/frontmatter.mjs';

export function runSync({ root = process.cwd(), write = false, profile = null } = {}) {
  const config = loadConfig(root);
  const selected = resolveProfile(config, profile);
  const map = config.profiles[selected];
  const agentsDir = resolveAgentsDir(root);
  const problems = [];
  const changes = [];

  const files = readdirSync(agentsDir).filter((name) => extname(name) === '.md');
  for (const name of files) {
    const role = basename(name, '.md');
    const path = join(agentsDir, name);
    const text = readFileSync(path, 'utf8');
    const { data } = parseFrontmatter(text);

    if (Object.hasOwn(map, role)) {
      const expected = resolveConfiguredModel(config, role, 'opencode', selected);
      if (data.model !== expected) {
        if (write) {
          writeFileSync(path, setFrontmatterValue(text, 'model', expected));
          changes.push(`${role}: ${data.model ?? '(none)'} -> ${expected}`);
        } else {
          problems.push(`${name}: model '${data.model ?? '(none)'}' != configured '${expected}'`);
        }
      }
    } else if (data.mode === 'subagent') {
      problems.push(`${name}: subagent with no mapping in profile '${selected}'`);
    }
  }

  return { problems, changes, profile: selected };
}

export function main(argv = process.argv.slice(2)) {
  const write = argv.includes('--write');
  const profileFlag = argv.indexOf('--profile');
  const profile = profileFlag === -1 ? null : argv[profileFlag + 1];
  const { problems, changes, profile: selected } = runSync({ root: process.cwd(), write, profile });

  if (write && changes.length > 0) {
    console.log(`sync-agent-models: updated ${changes.length} (profile: ${selected})`);
    for (const change of changes) console.log(`  ${change}`);
  }

  if (problems.length > 0) {
    console.error(`sync-agent-models: ${problems.length} mismatch(es) in profile '${selected}'`);
    for (const problem of problems) console.error(`  ${problem}`);
    return 1;
  }
  if (!write) console.log(`sync-agent-models: ok (profile: ${selected})`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
