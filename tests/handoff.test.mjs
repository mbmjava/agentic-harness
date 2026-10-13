import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  HANDOFF_FILE,
  extractSection,
  generateHandoff,
  readContext,
  renderHandoff,
  writeHandoff,
} from '../scripts/lib/handoff.mjs';
import { runHandoff } from '../scripts/handoff.mjs';

const GIT = {
  branch: 'feature/x',
  head: 'abc1234',
  trunk: 'main',
  trunkHead: 'def5678',
  ahead: 2,
  behind: 0,
  dirty: 1,
  commits: ['abc1234 feat: x', 'def5678 chore: y'],
};

function tempRoot() {
  const root = mkdtempSync(join(tmpdir(), 'harness-handoff-'));
  mkdirSync(join(root, '.agentic'), { recursive: true });
  return root;
}

describe('extractSection', () => {
  it('captures a section without truncating at blank lines', () => {
    const text = '## A\n\n- one\n\n- two\n\n## B\nignored\n';
    assert.equal(extractSection(text, 'A'), '- one\n\n- two');
    assert.equal(extractSection(text, 'B'), 'ignored');
    assert.equal(extractSection(text, 'Z'), '');
  });
});

describe('renderHandoff', () => {
  it('renders generated facts', () => {
    const out = renderHandoff({ mode: 'tracked', git: GIT, spec: 'Thing (SPEC-1)', issue: 'KAN-1', date: '2025-10-12' });
    assert.match(out, /- \*\*Mode:\*\* tracked/);
    assert.match(out, /- \*\*Branch:\*\* `feature\/x` @ abc1234 \(0 behind \/ 2 ahead\)/);
    assert.match(out, /- \*\*Working tree:\*\* 1 uncommitted/);
    assert.match(out, /- \*\*Tracker issue:\*\* KAN-1/);
    assert.match(out, /- abc1234 feat: x/);
  });

  it('handles missing git facts', () => {
    const out = renderHandoff({ mode: 'cowboy', git: { branch: null, trunk: 'main', commits: [] }, date: '2025-10-12' });
    assert.match(out, /- \*\*Branch:\*\* `detached`/);
    assert.match(out, /- none/);
  });
});

describe('generateHandoff', () => {
  it('merges context and preserved sections', () => {
    const root = tempRoot();
    writeFileSync(join(root, '.agentic', 'mode.json'), JSON.stringify({ mode: 'tracked' }));
    writeFileSync(join(root, '.agentic', 'context.json'), JSON.stringify({ spec: 'Thing (SPEC-1)', issue: 'KAN-1' }));
    mkdirSync(join(root, 'working-docs'), { recursive: true });
    writeFileSync(join(root, HANDOFF_FILE), [
      '# old',
      '## Next actions',
      '',
      'Finish the widget.',
      '',
      '## My notes',
      '',
      '- blocked on the gate',
      '',
    ].join('\n'));

    const out = generateHandoff({ root, git: GIT, now: new Date('2025-10-12T00:00:00Z') });
    assert.match(out, /- \*\*Mode:\*\* tracked/);
    assert.match(out, /- \*\*Tracker issue:\*\* KAN-1/);
    assert.match(out, /Finish the widget\./);
    assert.match(out, /- blocked on the gate/);
  });
});

describe('handoff CLI', () => {
  it('--print does not write the file', () => {
    const root = tempRoot();
    assert.equal(runHandoff(['--print'], { root, now: new Date('2025-10-12T00:00:00Z') }), 0);
    assert.equal(existsSync(join(root, HANDOFF_FILE)), false);
  });

  it('persists context and writes the handoff', () => {
    const root = tempRoot();
    assert.equal(runHandoff(['--issue', 'KAN-9', '--spec', 'X (SPEC-2)', '--next', 'do the thing'], { root, now: new Date('2025-10-12T00:00:00Z') }), 0);
    assert.equal(readContext(root).issue, 'KAN-9');
    const written = readFileSync(join(root, HANDOFF_FILE), 'utf8');
    assert.match(written, /KAN-9/);
    assert.match(written, /do the thing/);
  });
});

describe('writeHandoff', () => {
  it('writes to working-docs/handoff.md', () => {
    const root = tempRoot();
    writeHandoff(root, { git: GIT, now: new Date('2025-10-12T00:00:00Z') });
    assert.ok(readFileSync(join(root, HANDOFF_FILE), 'utf8').includes('# Handoff'));
  });
});
