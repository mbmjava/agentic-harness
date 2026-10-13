import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { supervise } from '../scripts/watch-opencode-session.mjs';

const config = {
  models: {},
  agents: {},
  complexity: { xs: 1000, s: 1000, m: 100000, l: 100000 },
  timeouts: { defaultMs: 100000, stopConfirmationMs: 1, stallMs: 10 },
};

function session({ outcome = null, updated = 1, agent = 'worker', created = 1 } = {}) {
  return { parentID: 'ses_parent', agent, outcome, time: { created, updated } };
}

function fakeIo({ sessions, times }) {
  let sessionIndex = 0;
  let timeIndex = 0;
  const interrupts = [];
  return {
    pollMs: 1,
    now: () => times[Math.min(timeIndex++, times.length - 1)],
    sleep: async () => {},
    getSession: async () => sessions[Math.min(sessionIndex++, sessions.length - 1)],
    interrupt: async (_id, resume) => { interrupts.push(resume); },
    interrupts,
  };
}

async function quiet(fn) {
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = () => true;
  try {
    return await fn();
  } finally {
    process.stdout.write = original;
  }
}

describe('supervise', () => {
  it('accepts a worker that succeeds within budget', async () => {
    const io = fakeIo({ sessions: [session({ outcome: 'succeeded' })], times: [5] });
    const result = await quiet(() => supervise({ childId: 'ses_child', role: 'worker', complexity: 'm', io, config }));
    assert.equal(result.status, 'accepted');
    assert.equal(result.code, 0);
  });

  it('stops and rejects a hang at the deadline', async () => {
    const io = fakeIo({ sessions: [session()], times: [200000] });
    const result = await quiet(() => supervise({ childId: 'ses_child', role: 'worker', complexity: 'm', io, config }));
    assert.equal(result.status, 'rejected');
    assert.equal(result.reason, 'elapsed-deadline');
    assert.deepEqual(io.interrupts, [false]);
  });

  it('reports a stall but does NOT interrupt by default', async () => {
    const idle = session();
    const done = session({ outcome: 'succeeded', updated: 400 });
    const io = fakeIo({ sessions: [idle, idle, done], times: [150, 300, 400] });
    const result = await quiet(() => supervise({ childId: 'ses_child', role: 'worker', complexity: 'm', io, config }));
    assert.equal(result.status, 'accepted');
    assert.deepEqual(io.interrupts, []);
  });

  it('resumes a stall (opt-in) and then accepts success', async () => {
    const idle = session();
    const done = session({ outcome: 'succeeded', updated: 101 });
    const io = fakeIo({ sessions: [idle, idle, done], times: [100, 200, 300] });
    const result = await quiet(() => supervise({ childId: 'ses_child', role: 'worker', complexity: 'm', resumeOnStall: true, io, config }));
    assert.equal(result.status, 'accepted');
    assert.deepEqual(io.interrupts, [true]);
  });

  it('redispatches after a second stall (opt-in)', async () => {
    const io = fakeIo({ sessions: [session()], times: [100, 200] });
    const result = await quiet(() => supervise({ childId: 'ses_child', role: 'worker', complexity: 'm', resumeOnStall: true, io, config }));
    assert.equal(result.status, 'redispatch');
    assert.equal(result.code, 5);
    assert.deepEqual(io.interrupts, [true]);
  });

  it('escalates when resume and redispatch are exhausted (opt-in)', async () => {
    const io = fakeIo({ sessions: [session()], times: [100, 200] });
    const result = await quiet(() =>
      supervise({ childId: 'ses_child', role: 'worker', complexity: 'm', resumeOnStall: true, maxAttempts: 1, io, config }));
    assert.equal(result.status, 'escalate');
    assert.equal(result.code, 6);
  });

  it('fails closed on a role mismatch', async () => {
    const io = fakeIo({ sessions: [session({ agent: 'analyst' })], times: [5] });
    await assert.rejects(
      quiet(() => supervise({ childId: 'ses_child', role: 'worker', complexity: 'm', io, config })),
      /does not match/,
    );
    assert.deepEqual(io.interrupts, [false]);
  });

  it('rejects an invalid child id', async () => {
    const io = fakeIo({ sessions: [session()], times: [5] });
    await assert.rejects(supervise({ childId: 'bad', role: 'worker', io, config }), /Invalid OpenCode child session ID/);
  });
});
