import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { DEFAULT_MODE, MODES, isMode, readMode, writeMode } from '../scripts/lib/mode.mjs';
import { runMode } from '../scripts/mode.mjs';

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'harness-mode-'));
}

describe('mode', () => {
  it('defaults to cowboy when no file exists', () => {
    const current = readMode(tempDir());
    assert.equal(current.mode, DEFAULT_MODE);
    assert.equal(current.source, 'default');
  });

  it('round-trips a written mode', () => {
    const root = tempDir();
    const record = writeMode(root, 'tracked', { branch: 'tracked/x', now: new Date('2025-01-01T00:00:00Z') });
    assert.equal(record.mode, 'tracked');
    const current = readMode(root);
    assert.equal(current.mode, 'tracked');
    assert.equal(current.source, 'file');
    assert.equal(current.branch, 'tracked/x');
    assert.equal(current.since, '2025-01-01T00:00:00.000Z');
  });

  it('rejects an unknown mode on write', () => {
    assert.throws(() => writeMode(tempDir(), 'yolo'), /Invalid mode/);
    assert.equal(isMode('jira-issue'), true);
    assert.deepEqual(MODES, ['cowboy', 'tracked', 'jira-issue']);
  });

  it('rejects a corrupt mode file', () => {
    const root = tempDir();
    mkdirSync(join(root, '.agentic'), { recursive: true });
    writeFileSync(join(root, '.agentic', 'mode.json'), '{"mode":"nope"}');
    assert.throws(() => readMode(root));
  });

  it('CLI --set writes and prints the mode', () => {
    const root = tempDir();
    let out = '';
    const original = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk) => {
      out += chunk;
      return true;
    };
    const code = runMode(['--set', 'jira-issue'], { root, branch: null });
    process.stdout.write = original;
    assert.equal(code, 0);
    assert.match(out, /mode: jira-issue/);
    assert.equal(readMode(root).mode, 'jira-issue');
  });

  it('CLI --set rejects an unknown mode', () => {
    assert.equal(runMode(['--set', 'nope'], { root: tempDir() }), 2);
  });
});
