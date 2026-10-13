import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { evaluateBranchGuard, suggestBranch } from '../scripts/lib/branch-guard.mjs';
import { runBranchGuard } from '../scripts/branch-guard.mjs';

describe('branch-guard', () => {
  it('cowboy has no branch requirement', () => {
    assert.equal(evaluateBranchGuard({ mode: 'cowboy', branch: 'main' }).ok, true);
  });

  it('tracked blocks on a default branch and suggests one', () => {
    const result = evaluateBranchGuard({ mode: 'tracked', branch: 'main' });
    assert.equal(result.ok, false);
    assert.equal(result.code, 3);
    assert.equal(result.suggested, 'tracked/work');
  });

  it('tracked allows any dedicated branch', () => {
    assert.equal(evaluateBranchGuard({ mode: 'tracked', branch: 'feature/x' }).ok, true);
  });

  it('jira-issue blocks on a default branch', () => {
    assert.equal(evaluateBranchGuard({ mode: 'jira-issue', branch: 'develop' }).ok, false);
  });

  it('jira-issue requires the issue key in the branch when known', () => {
    assert.equal(evaluateBranchGuard({ mode: 'jira-issue', branch: 'feature/KAN-1', issueKey: 'KAN-1' }).ok, true);
    const blocked = evaluateBranchGuard({ mode: 'jira-issue', branch: 'feature/KAN-1', issueKey: 'KAN-2' });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.suggested, 'kan-2-work');
  });

  it('treats a detached HEAD as unknown', () => {
    assert.equal(evaluateBranchGuard({ mode: 'tracked', branch: null }).ok, false);
  });

  it('rejects an unknown mode', () => {
    assert.equal(evaluateBranchGuard({ mode: 'yolo', branch: 'x' }).code, 2);
  });

  it('suggests a mode slug for tracked and an issue slug for jira', () => {
    assert.equal(suggestBranch('tracked', null), 'tracked/work');
    assert.equal(suggestBranch('jira-issue', 'KAN-9'), 'kan-9-work');
  });

  it('CLI honours overrides and returns the decision code', () => {
    const root = mkdtempSync(join(tmpdir(), 'harness-guard-'));
    mkdirSync(join(root, 'working-docs', 'agentic-state'), { recursive: true });
    writeFileSync(join(root, 'working-docs', 'agentic-state', 'mode.json'), JSON.stringify({ mode: 'tracked' }));
    assert.equal(runBranchGuard(['--branch', 'main'], { root }), 3);
    assert.equal(runBranchGuard(['--branch', 'feature/x'], { root }), 0);
    assert.equal(runBranchGuard(['--mode', 'cowboy', '--branch', 'main'], { root }), 0);
  });

  it('CLI fails on an unknown flag', () => {
    assert.equal(runBranchGuard(['--nope'], { root: process.cwd() }), 2);
  });
});
