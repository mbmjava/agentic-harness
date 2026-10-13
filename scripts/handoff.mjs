#!/usr/bin/env node
// Refresh the local, per-checkout handoff: generated facts (mode, git, supervision) plus the preserved
// non-derivable sections (`## Next actions`, `## My notes`). Per-checkout and gitignored.
// Usage: node scripts/handoff.mjs [--print] [--spec "..."] [--issue KEY] [--owner NAME] [--next "..."] [--pr "..."]
import { pathToFileURL } from 'node:url';
import { generateHandoff, writeHandoff, writeContext, HANDOFF_FILE } from './lib/handoff.mjs';

export function runHandoff(argv, { root = process.cwd(), now = new Date() } = {}) {
  const flag = (name) => {
    const index = argv.indexOf(name);
    return index === -1 ? null : argv[index + 1];
  };

  try {
    const patch = {};
    for (const [name, key] of [['--spec', 'spec'], ['--issue', 'issue'], ['--owner', 'owner'], ['--next', 'next'], ['--pr', 'pr']]) {
      const value = flag(name);
      if (value !== null) patch[key] = value;
    }
    if (Object.keys(patch).length > 0) writeContext(root, patch);

    if (argv.includes('--print')) {
      process.stdout.write(generateHandoff({ root, now }));
      return 0;
    }

    writeHandoff(root, { now });
    console.log(`handoff: wrote ${HANDOFF_FILE}`);
    return 0;
  } catch (error) {
    console.error(`handoff: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runHandoff(process.argv.slice(2));
}
