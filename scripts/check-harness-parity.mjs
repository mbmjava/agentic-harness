#!/usr/bin/env node
// Verify the harness is internally consistent: every mode has a policy doc and a command, and every
// configured subagent role has a role doc and an agent file.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { MODES } from './lib/mode.mjs';
import { loadConfig } from './lib/config.mjs';
import { resolveAgentsDir, resolveCommandsDir, resolveCoreDir, resolveSkillsDir } from './lib/layout.mjs';

export function runCheckParity(root = process.cwd()) {
  const errors = [];
  const core = resolveCoreDir(root);
  const agents = resolveAgentsDir(root);
  const commands = resolveCommandsDir(root);
  const skills = resolveSkillsDir(root);

  for (const mode of MODES) {
    if (!existsSync(join(core, 'modes', `${mode}.md`))) errors.push(`missing mode policy: core/modes/${mode}.md`);
    if (!existsSync(join(commands, `${mode}.md`))) errors.push(`missing mode command: ${mode}.md`);
  }

  if (!existsSync(join(core, 'roles', 'orchestrator.md'))) errors.push('missing role doc: core/roles/orchestrator.md');
  if (!existsSync(join(agents, 'orchestrator.md'))) errors.push('missing primary agent: orchestrator.md');
  if (!existsSync(join(skills, 'mode', 'SKILL.md'))) errors.push('missing shared skill: mode/SKILL.md');

  const config = loadConfig(root);
  for (const role of Object.keys(config.agents)) {
    if (!existsSync(join(core, 'roles', `${role}.md`))) errors.push(`missing role doc: core/roles/${role}.md`);
    if (!existsSync(join(agents, `${role}.md`))) errors.push(`missing subagent: ${role}.md`);
  }

  return errors;
}

export function main() {
  const errors = runCheckParity(process.cwd());
  if (errors.length > 0) {
    console.error(`check-harness-parity: ${errors.length} problem(s)`);
    for (const error of errors) console.error(`  ${error}`);
    return 1;
  }
  console.log('check-harness-parity: ok');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
