import { MODES } from './mode.mjs';

export const DEFAULT_BRANCHES = ['main', 'master', 'develop', 'trunk'];

export function isDefaultBranch(branch, defaults = DEFAULT_BRANCHES) {
  return defaults.includes(branch);
}

export function suggestBranch(mode, issueKey, slug = 'work') {
  if (mode === 'jira-issue' && issueKey) return `${issueKey.toLowerCase()}-${slug}`;
  return `${mode}/${slug}`;
}

// Pure decision: is the current branch acceptable for the active mode?
// - cowboy: always ok (no branch requirement).
// - tracked: any dedicated (non-default) branch.
// - jira-issue: a dedicated branch that references the issue key, when one is known.
export function evaluateBranchGuard({ mode, branch, issueKey = null, defaults = DEFAULT_BRANCHES }) {
  if (!MODES.includes(mode)) return { ok: false, code: 2, reason: `invalid mode '${mode}'` };
  if (mode === 'cowboy') return { ok: true, code: 0, reason: 'cowboy: no branch requirement' };
  if (!branch || branch === 'HEAD') {
    return { ok: false, code: 3, reason: 'detached or unknown branch', suggested: suggestBranch(mode, issueKey) };
  }
  if (isDefaultBranch(branch, defaults)) {
    return { ok: false, code: 3, reason: `on default branch '${branch}'`, suggested: suggestBranch(mode, issueKey) };
  }
  if (mode === 'jira-issue' && issueKey && !branch.toLowerCase().includes(issueKey.toLowerCase())) {
    return {
      ok: false,
      code: 3,
      reason: `branch '${branch}' does not reference issue ${issueKey}`,
      suggested: suggestBranch(mode, issueKey),
    };
  }
  return { ok: true, code: 0, reason: `on dedicated branch '${branch}'` };
}
