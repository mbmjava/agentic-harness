import { readFileSync } from 'node:fs';
import { resolveConfigPath } from './layout.mjs';

function positiveInteger(value, name) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

// Shared config for bounded, visible subagents: model routing, complexity budgets, and the
// deadline/stall windows. No token accounting.
export function loadConfig(root = process.cwd()) {
  const file = resolveConfigPath(root);
  const config = JSON.parse(readFileSync(file, 'utf8'));
  if (!config.models || !config.agents || !config.timeouts) {
    throw new Error(`${file}: models, agents, and timeouts are required`);
  }
  positiveInteger(config.timeouts.defaultMs, 'timeouts.defaultMs');
  positiveInteger(config.timeouts.stopConfirmationMs, 'timeouts.stopConfirmationMs');
  if (config.timeouts.stallMs != null) positiveInteger(config.timeouts.stallMs, 'timeouts.stallMs');
  if (config.complexity != null) {
    for (const [klass, ms] of Object.entries(config.complexity)) {
      positiveInteger(ms, `complexity.${klass}`);
    }
  }
  return config;
}

export function resolveConfiguredModel(config, role, harness = 'opencode') {
  const modelKey = config.agents[role];
  if (!modelKey || !Object.hasOwn(config.models, modelKey)) {
    throw new Error(`No configured model mapping for subagent role '${role}'`);
  }
  const entry = config.models[modelKey];
  const model = typeof entry === 'string' ? entry : entry[harness];
  if (typeof model !== 'string' || model.length === 0) {
    throw new Error(`No ${harness} model configured for subagent role '${role}'`);
  }
  return model;
}

export function resolveDeadlineMs(config, minutes) {
  if (minutes == null || minutes === '') return config.timeouts.defaultMs;
  const parsed = Number(minutes);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`Invalid deadline minutes: ${minutes}`);
  return Math.round(parsed * 60_000);
}

export function complexityBudgetMs(config, complexity) {
  if (!config.complexity) throw new Error('No complexity budgets configured');
  const ms = config.complexity[complexity];
  if (!Number.isSafeInteger(ms) || ms <= 0) throw new Error(`Unknown complexity class '${complexity}'`);
  return ms;
}
