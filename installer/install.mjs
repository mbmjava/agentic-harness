#!/usr/bin/env node
// Materialize this harness into a target repository: core policy, the OpenCode adapter, the scripts,
// and the standards docs. A manifest tracks exactly which files are owned, so `--check` detects drift.
// Usage: node installer/install.mjs --target <dir> [--dry-run | --check] [--force]
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = '.agentic/install.json';

const MAPS = [
  { from: 'core', to: '.agentic/core' },
  { from: 'adapters/opencode', to: '.opencode' },
  { from: 'scripts', to: 'scripts' },
];

const SKIP = new Set(['__pycache__', '.DS_Store']);

// Per-checkout state is ignored in the target, but the copied policy under `.agentic/core` is not.
const GENERATED = {
  '.agentic/.gitignore': ['# Per-checkout state (never committed)', 'mode.json', 'context.json', 'install.json', ''].join('\n'),
  'working-docs/.gitignore': ['# Local per-checkout recovery card (never committed)', 'handoff.md', ''].join('\n'),
};

// Merge (never clobber) a small block into a root config file, so adopting apps get line-ending and secrets
// hygiene without overwriting their own settings.
function ensureBlock(file, header, lines) {
  const existing = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const present = new Set(existing.split(/\r?\n/));
  const missing = lines.filter((line) => !present.has(line));
  if (missing.length === 0) return false;
  const prefix = existing.trimEnd();
  writeFileSync(file, `${prefix ? `${prefix}\n\n` : ''}${header}\n${missing.join('\n')}\n`);
  return true;
}

function hashFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function walk(dir, base = dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, base, out);
    else out.push(relative(base, path).split('\\').join('/'));
  }
  return out;
}

export function plan(root = ROOT) {
  const entries = [];
  for (const map of MAPS) {
    const sourceRoot = resolve(root, map.from);
    if (!existsSync(sourceRoot)) throw new Error(`Missing source directory: ${map.from}`);
    for (const rel of walk(sourceRoot)) {
      entries.push({ source: resolve(sourceRoot, rel), target: `${map.to}/${rel}` });
    }
  }
  return entries;
}

export function install({ target, root = ROOT, force = false, dryRun = false } = {}) {
  if (!target) throw new Error('--target is required');
  const targetRoot = resolve(target);
  const manifestPath = join(targetRoot, MANIFEST);

  if (existsSync(manifestPath) && !force && !dryRun) {
    throw new Error(`${MANIFEST} already exists — pass --force to overwrite an existing install`);
  }

  const entries = plan(root);
  const files = [];
  for (const entry of entries) {
    const destination = join(targetRoot, entry.target);
    if (!dryRun) {
      mkdirSync(dirname(destination), { recursive: true });
      copyFileSync(entry.source, destination);
    }
    files.push({ path: entry.target, sha256: hashFile(entry.source) });
  }

  if (!dryRun) {
    const manifest = { version: version(root), installedAt: new Date().toISOString(), files };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    for (const [relPath, content] of Object.entries(GENERATED)) {
      const path = join(targetRoot, relPath);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content);
    }
    ensureBlock(join(targetRoot, '.gitattributes'), '# agentic-harness: normalize line endings', ['* text=auto eol=lf']);
    ensureBlock(join(targetRoot, '.gitignore'), '# agentic-harness: local secrets (configtree parity — never commit)', ['local-secrets/', '.env.local', '.env.prod']);
  }
  return { files, targetRoot, dryRun };
}

export function check({ target } = {}) {
  if (!target) throw new Error('--target is required');
  const targetRoot = resolve(target);
  const manifestPath = join(targetRoot, MANIFEST);
  if (!existsSync(manifestPath)) return { drift: [`${MANIFEST} not found`], missing: [], changed: [] };

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const missing = [];
  const changed = [];
  for (const file of manifest.files) {
    const path = join(targetRoot, file.path);
    if (!existsSync(path)) missing.push(file.path);
    else if (hashFile(path) !== file.sha256) changed.push(file.path);
  }
  return { drift: [...missing, ...changed], missing, changed };
}

function version(root) {
  try {
    return JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;
  } catch {
    return '0.0.0';
  }
}

export function main(argv = process.argv.slice(2)) {
  const targetIndex = argv.indexOf('--target');
  const target = targetIndex === -1 ? null : argv[targetIndex + 1];
  const dryRun = argv.includes('--dry-run');
  const force = argv.includes('--force');
  const shouldCheck = argv.includes('--check');

  if (!target) {
    console.error('Usage: node installer/install.mjs --target <dir> [--dry-run | --check] [--force]');
    return 2;
  }

  try {
    if (shouldCheck) {
      const { drift, missing, changed } = check({ target });
      if (drift.length > 0) {
        console.error(`install --check: ${drift.length} drifted file(s)`);
        for (const file of drift) console.error(`  ${missing.includes(file) ? 'missing' : 'changed'} ${file}`);
        return 1;
      }
      console.log('install --check: ok');
      return 0;
    }

    const { files, targetRoot } = install({ target, force, dryRun });
    console.log(`install${dryRun ? ' (dry-run)' : ''}: ${files.length} file(s) -> ${targetRoot}`);
    return 0;
  } catch (error) {
    console.error(`install: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
