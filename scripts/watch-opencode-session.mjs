#!/usr/bin/env node
// Supervise one native OpenCode subagent: complexity budget, stall detection, and the
// resume -> re-dispatch -> escalate ladder. Records nothing you must read.
// Usage: node scripts/watch-opencode-session.mjs <child-id> <role> [minutes] \
//          [--complexity xs|s|m|l] [--max-stalls n] [--max-attempts n]
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { loadConfig, resolveDeadlineMs, complexityBudgetMs } from './lib/config.mjs';
import { evaluateWatch, planRecovery } from './lib/supervision.mjs';

const SESSION_ID = /^ses[A-Za-z0-9_-]+$/;
const POLL_MS = 5_000;

function emit(event) {
  process.stdout.write(`${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`);
}

function invokeApi(method, apiPath) {
  if (!['get', 'post'].includes(method) || !/^\/api\/[A-Za-z0-9/_?=&.-]+$/.test(apiPath)) {
    throw new Error('Invalid OpenCode API request');
  }
  const result = process.platform === 'win32'
    ? spawnSync(`opencode.cmd api ${method} "${apiPath}"`, {
      cwd: process.cwd(), shell: true, windowsHide: true, encoding: 'utf8', timeout: 10_000, maxBuffer: 16 * 1024 * 1024,
    })
    : spawnSync('opencode', ['api', method, apiPath], {
      cwd: process.cwd(), encoding: 'utf8', timeout: 10_000, maxBuffer: 16 * 1024 * 1024,
    });
  if (result.error) throw new Error(`OpenCode API client failed: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`OpenCode API ${method} failed`);
  try {
    return JSON.parse(result.stdout.trim());
  } catch {
    throw new Error(`OpenCode API ${method} returned invalid JSON`);
  }
}

export const realIo = {
  pollMs: POLL_MS,
  now: () => Date.now(),
  sleep: (ms) => delay(ms),
  async getSession(id) {
    const response = invokeApi('get', `/api/session/${id}`);
    if (response.data?.id !== id) throw new Error('Child session not found');
    return response.data;
  },
  async interrupt(id, resume) {
    invokeApi('post', `/api/session/${id}/interrupt?resume=${resume ? 'true' : 'false'}`);
  },
};

// The supervision loop. All I/O goes through `io` so the decision logic is testable.
export async function supervise({ childId, role, complexity = null, minutes = null, maxStalls = 1, maxAttempts = 2, io = realIo, config = null, root = process.cwd() }) {
  if (!SESSION_ID.test(childId)) throw new Error('Invalid OpenCode child session ID');
  const policy = config ?? loadConfig(root);
  const deadlineMs = complexity && policy.complexity
    ? complexityBudgetMs(policy, complexity)
    : resolveDeadlineMs(policy, minutes);
  const stallMs = policy.timeouts.stallMs ?? Number.POSITIVE_INFINITY;

  let child = await io.getSession(childId);
  if (!child.parentID || child.agent !== role) {
    await io.interrupt(childId, false);
    throw new Error('Child session does not match the requested parent role');
  }
  const startedAt = Number(child.time?.created);
  if (!Number.isFinite(startedAt) || startedAt <= 0) throw new Error('Child launch time is unavailable');

  const deadline = startedAt + deadlineMs;
  let lastProgressAt = Number(child.time?.updated) || startedAt;
  let stalls = 0;
  emit({ event: 'watching', childId, role, complexity, deadline, stallMs });

  while (true) {
    child = await io.getSession(childId);
    const now = io.now();
    const progress = Number(child.time?.updated) || lastProgressAt;
    if (progress > lastProgressAt) lastProgressAt = progress;

    const decision = evaluateWatch({ outcome: child.outcome, now, deadline, lastProgressAt, stallMs });

    if (decision.kind === 'done') {
      emit({ event: 'accepted', childId, role, outcome: child.outcome });
      return { status: 'accepted', code: 0, outcome: child.outcome };
    }
    if (decision.kind === 'failed') {
      emit({ event: 'result-rejected', childId, role, reason: 'terminal-non-success', outcome: decision.outcome });
      return { status: 'rejected', code: 4, reason: 'terminal-non-success', outcome: decision.outcome };
    }
    if (decision.kind === 'hang') {
      await io.interrupt(childId, false);
      emit({ event: 'result-rejected', childId, role, reason: 'elapsed-deadline' });
      return { status: 'rejected', code: 4, reason: 'elapsed-deadline' };
    }
    if (decision.kind === 'stall') {
      const recovery = planRecovery({ stalls, attempt: child.attempt ?? 1, maxStalls, maxAttempts });
      if (recovery.action === 'resume') {
        stalls += 1;
        lastProgressAt = now;
        emit({ event: 'stall-resume', childId, role, idleMs: decision.idleMs, reason: recovery.reason });
        await io.interrupt(childId, true);
        continue;
      }
      emit({ event: recovery.action, childId, role, reason: recovery.reason });
      return { status: recovery.action, code: recovery.action === 'redispatch' ? 5 : 6, reason: recovery.reason };
    }

    emit({ event: 'status', childId, role, outcome: child.outcome ?? null, remainingMs: Math.max(0, deadline - now) });
    await io.sleep(Math.min(io.pollMs, Math.max(0, deadline - now)));
  }
}

export async function main(argv = process.argv.slice(2)) {
  const [childId, role, minutes] = argv;
  if (!childId || !role) {
    console.error('Usage: node scripts/watch-opencode-session.mjs <child-id> <role> [minutes] [--complexity c]');
    return 2;
  }
  const flag = (name) => {
    const index = argv.indexOf(name);
    return index === -1 ? null : argv[index + 1];
  };
  try {
    const result = await supervise({
      childId,
      role,
      minutes,
      complexity: flag('--complexity'),
      maxStalls: flag('--max-stalls') ? Number(flag('--max-stalls')) : 1,
      maxAttempts: flag('--max-attempts') ? Number(flag('--max-attempts')) : 2,
    });
    return result.code;
  } catch (error) {
    emit({ event: 'fail-closed', childId, role, reason: error.message });
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
