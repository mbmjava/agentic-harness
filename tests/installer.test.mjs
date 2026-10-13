import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { check, install, plan } from '../installer/install.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('installer', () => {
  it('plans files across every mapped subtree', () => {
    const entries = plan(repoRoot);
    const targets = entries.map((entry) => entry.target);
    assert.ok(targets.includes('.agentic/core/modes/cowboy.md'));
    assert.ok(targets.includes('.opencode/agents/orchestrator.md'));
    assert.ok(targets.includes('scripts/mode.mjs'));
    assert.ok(targets.includes('docs/standards/modes.md'));
  });

  it('installs into a target and reports a clean check', () => {
    const target = mkdtempSync(join(tmpdir(), 'harness-install-'));
    const { files } = install({ target, root: repoRoot });
    assert.ok(files.length > 0);
    assert.ok(existsSync(join(target, '.opencode', 'agents', 'orchestrator.md')));
    assert.ok(existsSync(join(target, '.agentic', 'core', 'modes', 'cowboy.md')));
    assert.ok(existsSync(join(target, 'scripts', 'branch-guard.mjs')));
    assert.ok(existsSync(join(target, '.agentic', 'install.json')));
    assert.deepEqual(check({ target }).drift, []);
  });

  it('detects drift after a file is edited', () => {
    const target = mkdtempSync(join(tmpdir(), 'harness-install-'));
    install({ target, root: repoRoot });
    const file = join(target, 'scripts', 'mode.mjs');
    writeFileSync(file, `${readFileSync(file, 'utf8')}\n// drift\n`);
    const { changed } = check({ target });
    assert.deepEqual(changed, ['scripts/mode.mjs']);
  });

  it('refuses to overwrite an existing install without --force', () => {
    const target = mkdtempSync(join(tmpdir(), 'harness-install-'));
    install({ target, root: repoRoot });
    assert.throws(() => install({ target, root: repoRoot }), /already exists/);
    assert.doesNotThrow(() => install({ target, root: repoRoot, force: true }));
  });
});
