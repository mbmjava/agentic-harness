import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { runCheckParity } from '../scripts/check-harness-parity.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('check-harness-parity', () => {
  it('passes on the harness itself', () => {
    assert.deepEqual(runCheckParity(repoRoot), []);
  });
});
