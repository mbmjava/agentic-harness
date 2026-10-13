import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { runSync } from '../scripts/sync-agent-models.mjs';
import { parseFrontmatter, setFrontmatterValue } from '../scripts/lib/frontmatter.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function tempHarness() {
  const root = mkdtempSync(join(tmpdir(), 'harness-sync-'));
  mkdirSync(join(root, 'adapters', 'opencode', 'agents'), { recursive: true });
  writeFileSync(
    join(root, 'adapters', 'opencode', 'models.json'),
    readFileSync(join(repoRoot, 'adapters', 'opencode', 'models.json')),
  );
  return root;
}

describe('frontmatter', () => {
  it('parses flat keys and preserves the body', () => {
    const { data, body } = parseFrontmatter('---\ndescription: hi\nmodel: a/b\n---\nHello\n');
    assert.equal(data.description, 'hi');
    assert.equal(data.model, 'a/b');
    assert.equal(body, 'Hello\n');
  });

  it('replaces an existing model line', () => {
    const text = '---\ndescription: hi\nmodel: old/x\nmode: subagent\n---\nbody\n';
    const updated = setFrontmatterValue(text, 'model', 'new/y');
    assert.match(updated, /model: new\/y/);
    assert.doesNotMatch(updated, /old\/x/);
    assert.match(updated, /body/);
  });

  it('inserts a model line before permissions when absent', () => {
    const text = '---\ndescription: hi\nmode: subagent\npermissions:\n  - action: read\n---\nbody\n';
    const updated = setFrontmatterValue(text, 'model', 'new/y');
    assert.match(updated, /mode: subagent\nmodel: new\/y\npermissions:/);
  });
});

describe('sync-agent-models', () => {
  it('passes on the harness itself', () => {
    assert.deepEqual(runSync({ root: repoRoot }).problems, []);
  });

  it('detects drift and --write fixes it', () => {
    const root = tempHarness();
    const agentPath = join(root, 'adapters', 'opencode', 'agents', 'worker.md');
    writeFileSync(agentPath, '---\ndescription: x\nmode: subagent\nmodel: wrong/model\n---\nbody\n');

    const check = runSync({ root });
    assert.equal(check.problems.length, 1);
    assert.match(check.problems[0], /worker\.md/);

    const write = runSync({ root, write: true });
    assert.equal(write.problems.length, 0);
    assert.equal(write.changes.length, 1);
    assert.match(readFileSync(agentPath, 'utf8'), /model: openrouter\/poolside\/laguna-s-2\.1/);
  });
});
