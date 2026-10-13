import { readFileSync } from 'node:fs';
import { resolveConfigPath } from './layout.mjs';

function positiveInteger(value, name) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

// Shared config: a set of named models, per-environment profiles (role -> model), complexity budgets,
// and the deadline/stall windows. Models and roles are separate axes, so an environment promotion is a
// profile change, not a role rename.
export function loadConfig(root = process.cwd()) {
  const file = resolveConfigPath(root);
  const config = JSON.parse(readFileSync(file, 'utf8'));
  if (!config.models || !config.profiles || !config.defaultProfile) {
    throw new Error(`${file}: models, profiles, and defaultProfile are required`);
  }
  if (!config.timeouts) throw new Error(`${file}: timeouts are required`);
  positiveInteger(config.timeouts.defaultMs, 'timeouts.defaultMs');
  positiveInteger(config.timeouts.stopConfirmationMs, 'timeouts.stopConfirmationMs');
  if (config.timeouts.stallMs != null) positiveInteger(config.timeouts.stallMs, 'timeouts.stallMs');
  if (config.complexity != null) {
    for (const [klass, ms] of Object.entries(config.complexity)) {
      positiveInteger(ms, `complexity.${klass}`);
    }
  }
  if (!Object.hasOwn(config.profiles, config.defaultProfile)) {
    throw new Error(`${file}: defaultProfile '${config.defaultProfile}' is not a defined profile`);
  }
  for (const [name, profile] of Object.entries(config.profiles)) {
    for (const [role, modelKey] of Object.entries(profile)) {
      if (!Object.hasOwn(config.models, modelKey)) {
        throw new Error(`${file}: profile '${name}' role '${role}' -> unknown model '${modelKey}'`);
      }
    }
  }
  return config;
}

export function resolveProfile(config, requested = null) {
  const profile = requested ?? config.defaultProfile;
  if (!Object.hasOwn(config.profiles, profile)) {
    throw new Error(`Unknown profile '${profile}'. Expected one of: ${Object.keys(config.profiles).join(', ')}`);
  }
  return profile;
}

export function profileRoles(config, profile = config.defaultProfile) {
  return Object.keys(config.profiles[resolveProfile(config, profile)]);
}

export function resolveConfiguredModel(config, role, harness = 'opencode', profile = config.defaultProfile) {
  const map = config.profiles[resolveProfile(config, profile)];
  const modelKey = map[role];
  if (!modelKey || !Object.hasOwn(config.models, modelKey)) {
    throw new Error(`No configured model mapping for role '${role}' in profile '${profile}'`);
  }
  const entry = config.models[modelKey];
  const model = typeof entry === 'string' ? entry : entry[harness];
  if (typeof model !== 'string' || model.length === 0) {
    throw new Error(`No ${harness} model configured for role '${role}' (profile '${profile}')`);
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
