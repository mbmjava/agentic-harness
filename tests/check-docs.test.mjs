import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { runCheckDocs } from '../scripts/check-docs.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function tempStandards(body) {
  const root = mkdtempSync(join(tmpdir(), 'harness-docs-'));
  mkdirSync(join(root, 'docs', 'standards'), { recursive: true });
  writeFileSync(join(root, 'docs', 'standards', 'sample.md'), body);
  return root;
}

describe('check-docs', () => {
  it('passes on the harness itself', () => {
    const { errors, checked } = runCheckDocs(repoRoot);
    assert.deepEqual(errors, []);
    assert.ok(checked > 0);
  });

  it('reports a broken relative link', () => {
    const { errors } = runCheckDocs(tempStandards('# x\n\n[gone](does-not-exist.md)\n'));
    assert.ok(errors.some((error) => error.includes('broken link -> does-not-exist.md')));
  });

  it('ignores external links and anchors', () => {
    const { errors } = runCheckDocs(tempStandards('[web](https://example.com) [mail](mailto:x@y.z) [self](#top)\n'));
    assert.deepEqual(errors.filter((error) => error.includes('broken link')), []);
  });

  it('reports missing structural directories', () => {
    const root = mkdtempSync(join(tmpdir(), 'harness-docs-'));
    const { errors } = runCheckDocs(root);
    assert.ok(errors.some((error) => error.includes('missing core directory')));
    assert.ok(errors.some((error) => error.includes('missing models.json')));
  });
});
