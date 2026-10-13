import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { browserCandidates, buildArgs, capture, findBrowser } from '../scripts/screenshot.mjs';

describe('screenshot', () => {
  it('lists Edge/Chrome candidates per platform', () => {
    assert.ok(browserCandidates('win32', {}).some((p) => /msedge\.exe$/i.test(p)));
    assert.ok(browserCandidates('linux', {}).includes('/usr/bin/google-chrome'));
    assert.ok(browserCandidates('darwin', {}).some((p) => /Google Chrome$/.test(p)));
  });

  it('honours a BROWSER override', () => {
    assert.deepEqual(browserCandidates('linux', { BROWSER: '/opt/chrome' }), ['/opt/chrome']);
  });

  it('findBrowser returns null when nothing exists', () => {
    assert.equal(findBrowser('linux', { BROWSER: '/nope/does-not-exist' }), null);
  });

  it('builds headless screenshot args', () => {
    const args = buildArgs({ url: 'http://x/', out: '/tmp/a.png', width: 800, height: 600, budgetMs: 1234 });
    assert.ok(args.includes('--headless=new'));
    assert.ok(args.includes('--screenshot=/tmp/a.png'));
    assert.ok(args.includes('--window-size=800,600'));
    assert.ok(args.includes('--virtual-time-budget=1234'));
    assert.equal(args.at(-1), 'http://x/');
  });

  it('fails closed without a url, out, or browser', () => {
    assert.throws(() => capture({ out: 'a.png', browser: 'x' }), /--url is required/);
    assert.throws(() => capture({ url: 'http://x/', browser: 'x' }), /--out is required/);
    assert.throws(() => capture({ url: 'http://x/', out: 'a.png', browser: null }), /No headless browser found/);
  });
});
