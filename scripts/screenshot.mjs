#!/usr/bin/env node
// Capture a headless-browser screenshot of a URL to a PNG, so an agent can LOOK at a page or canvas
// instead of claiming to have seen it. Uses Edge/Chrome headless; no dependencies.
// Usage: node scripts/screenshot.mjs --url <url> --out <png> [--size 1000x900] [--budget 5000]
import { existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function browserCandidates(platform = process.platform, env = process.env) {
  if (env.BROWSER) return [env.BROWSER];
  if (platform === 'win32') {
    return [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];
  }
  if (platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ];
  }
  return ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'];
}

export function findBrowser(platform = process.platform, env = process.env) {
  return browserCandidates(platform, env).find((candidate) => existsSync(candidate)) ?? null;
}

export function buildArgs({ url, out, width = 1000, height = 900, budgetMs = 5000 }) {
  return [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--window-size=${width},${height}`,
    `--virtual-time-budget=${budgetMs}`,
    `--screenshot=${out}`,
    url,
  ];
}

export function capture({ url, out, width, height, budgetMs, platform = process.platform, env = process.env, browser = findBrowser(platform, env) }) {
  if (!url) throw new Error('--url is required');
  if (!out) throw new Error('--out is required');
  if (!browser) throw new Error('No headless browser found (set BROWSER to a Chrome/Edge path)');
  const outPath = resolve(out);
  mkdirSync(dirname(outPath), { recursive: true });
  const budget = budgetMs ?? 5000;
  const result = spawnSync(browser, buildArgs({ url, out: outPath, width, height, budgetMs: budget }), {
    encoding: 'utf8',
    timeout: budget + 30000,
    windowsHide: true,
  });
  if (result.error) throw new Error(`browser failed: ${result.error.message}`);
  if (!existsSync(outPath)) throw new Error('screenshot was not written');
  return outPath;
}

function flag(argv, name) {
  const index = argv.indexOf(name);
  return index === -1 ? null : argv[index + 1];
}

export function main(argv = process.argv.slice(2)) {
  const url = flag(argv, '--url');
  const out = flag(argv, '--out');
  const size = flag(argv, '--size');
  const budget = flag(argv, '--budget');
  if (!url || !out) {
    console.error('Usage: node scripts/screenshot.mjs --url <url> --out <png> [--size 1000x900] [--budget 5000]');
    return 2;
  }
  const [width, height] = size ? size.split('x').map(Number) : [1000, 900];
  try {
    const path = capture({ url, out, width, height, budgetMs: budget ? Number(budget) : undefined });
    console.log(`screenshot: ${path}`);
    return 0;
  } catch (error) {
    console.error(`screenshot: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
