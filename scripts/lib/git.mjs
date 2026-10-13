import { spawnSync } from 'node:child_process';

// Current branch, or null when git is unavailable or HEAD is detached.
export function currentBranch(root = process.cwd()) {
  const result = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) return null;
  const branch = result.stdout.trim();
  return branch && branch !== 'HEAD' ? branch : null;
}
