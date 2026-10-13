import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// The harness runs unchanged in two shapes: as this source repo (`adapters/opencode`, `core`)
// and as an installed copy inside an app (`.opencode`, `.agentic/core`). Resolve to whichever exists.
const CANDIDATES = {
  config: ['adapters/opencode/models.json', '.opencode/models.json'],
  agents: ['adapters/opencode/agents', '.opencode/agents'],
  commands: ['adapters/opencode/commands', '.opencode/commands'],
  skills: ['adapters/opencode/skills', '.opencode/skills'],
  core: ['core', '.agentic/core'],
};

export function firstExisting(root, candidates) {
  for (const candidate of candidates) {
    const path = resolve(root, candidate);
    if (existsSync(path)) return path;
  }
  return null;
}

function resolveOrThrow(root, key, label) {
  const path = firstExisting(root, CANDIDATES[key]);
  if (!path) throw new Error(`${label} not found (looked in: ${CANDIDATES[key].join(', ')})`);
  return path;
}

export const resolveConfigPath = (root = process.cwd()) => resolveOrThrow(root, 'config', 'models.json');
export const resolveAgentsDir = (root = process.cwd()) => resolveOrThrow(root, 'agents', 'agents directory');
export const resolveCommandsDir = (root = process.cwd()) => resolveOrThrow(root, 'commands', 'commands directory');
export const resolveSkillsDir = (root = process.cwd()) => resolveOrThrow(root, 'skills', 'skills directory');
export const resolveCoreDir = (root = process.cwd()) => resolveOrThrow(root, 'core', 'core directory');
