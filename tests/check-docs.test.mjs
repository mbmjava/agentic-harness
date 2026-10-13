import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { runCheckDocs } from '../scripts/check-docs.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('check-docs', () => {
  it('passes on the harness itself', () => {
    const { errors, checked } = runCheckDocs(repoRoot);
    assert.deepEqual(errors, []);
    assert.ok(checked > 0);
  });

  it('reports a broken relative link', () => {
    const root = mkdtempSync(join(tmpdir(), 'harness-docs-'));
    writeFileSync(join(root, 'README.md'), '# x\n\n[gone](does-not-exist.md)\n');
    const { errors } = runCheckDocs(root);
    assert.ok(errors.some((error) => error.includes('broken link -> does-not-exist.md')));
  });

  it('ignores external links and anchors', () => {
    const root = mkdtempSync(join(tmpdir(), 'harness-docs-'));
    mkdirSync(join(root, 'sub'), { recursive: true });
    writeFileSync(join(root, 'a.md'), '[web](https://example.com) [mail](mailto:x@y.z) [self](#top)\n');
    const { errors } = runCheckDocs(root);
    assert.deepEqual(errors.filter((error) => error.includes('broken link')), []);
  });
});
