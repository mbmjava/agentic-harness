import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  buildSearchJql,
  chooseIntake,
  fetchIssue,
  fetchIssues,
  handoffIssue,
  issueUrl,
  parseJiraIssue,
  parseJiraIssues,
  readTrackerConfig,
  searchUrl,
} from '../scripts/lib/tracker.mjs';
import { runTracker } from '../scripts/tracker.mjs';

const CONFIG = { provider: 'jira', cloudId: 'cloud-1', projectKey: 'KAN', configured: true, reason: null };

function tempRoot({ config = null, handoff = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'harness-tracker-'));
  if (config) {
    mkdirSync(join(root, '.tracker'), { recursive: true });
    writeFileSync(join(root, '.tracker', 'config.json'), JSON.stringify(config));
  }
  if (handoff) {
    mkdirSync(join(root, 'working-docs'), { recursive: true });
    writeFileSync(join(root, 'working-docs', 'handoff.md'), handoff);
  }
  return root;
}

async function capture(fn) {
  const original = process.stdout.write.bind(process.stdout);
  let out = '';
  process.stdout.write = (chunk) => { out += chunk; return true; };
  try {
    const code = await fn();
    return { code, out };
  } finally {
    process.stdout.write = original;
  }
}

describe('tracker config', () => {
  it('is not configured without a file', () => {
    const config = readTrackerConfig(tempRoot());
    assert.equal(config.configured, false);
    assert.match(config.reason, /no \.tracker\/config\.json/);
  });

  it('is not configured with an empty project key', () => {
    const config = readTrackerConfig(tempRoot({ config: { provider: 'jira', cloudId: 'x', projectKey: '' } }));
    assert.equal(config.configured, false);
  });

  it('is configured with a provider, cloud id, and project', () => {
    assert.equal(readTrackerConfig(tempRoot({ config: { provider: 'jira', cloudId: 'c', projectKey: 'KAN' } })).configured, true);
  });
});

describe('tracker queries', () => {
  it('builds a JQL string', () => {
    assert.equal(
      buildSearchJql({ projectKey: 'KAN', statuses: ['In Progress', 'To Do'], assignee: 'me' }),
      'project = "KAN" AND status in ("In Progress", "To Do") AND assignee = "me" ORDER BY updated DESC',
    );
  });

  it('builds cloud URLs', () => {
    assert.equal(issueUrl(CONFIG, 'KAN-1'), 'https://api.atlassian.com/ex/jira/cloud-1/rest/api/3/issue/KAN-1');
    assert.match(searchUrl(CONFIG, 'project = "KAN"'), /\/rest\/api\/3\/search\?jql=project%20%3D%20%22KAN%22/);
  });

  it('parses search and single-issue payloads', () => {
    const payload = { issues: [{ key: 'KAN-1', fields: { summary: 's', status: { name: 'In Progress' }, assignee: { displayName: 'Mike' } } }] };
    assert.deepEqual(parseJiraIssues(payload), [{ key: 'KAN-1', summary: 's', status: 'In Progress', assignee: 'Mike' }]);
    assert.equal(parseJiraIssue({ key: 'KAN-2', fields: { summary: 't' } }).status, 'unknown');
    assert.equal(parseJiraIssue({}), null);
  });
});

describe('intake decision', () => {
  it('offers pickup/search/create when the handoff names an issue', () => {
    const decision = chooseIntake({ handoffIssue: 'KAN-1' });
    assert.equal(decision.action, 'offer');
    assert.deepEqual(decision.options, ['pickup', 'search', 'create']);
  });

  it('picks from search hits', () => {
    assert.equal(chooseIntake({ issues: [{ key: 'KAN-2' }] }).action, 'pick');
  });

  it('falls back to manual create with no hits', () => {
    assert.match(chooseIntake({}).note, /read\/search only/);
  });

  it('reads the tracker issue from a handoff and ignores none', () => {
    assert.equal(handoffIssue('## x\n- **Tracker issue:** KAN-7\n- **Mode:** tracked'), 'KAN-7');
    assert.equal(handoffIssue('- **Tracker issue:** none'), null);
    assert.equal(handoffIssue(''), null);
  });
});

describe('tracker fetch', () => {
  const fake = (payload, ok = true, status = 200) => async () => ({ ok, status, json: async () => payload });

  it('fetches and parses issues', async () => {
    const issues = await fetchIssues({ config: CONFIG, token: 't', jql: 'x', fetchImpl: fake({ issues: [{ key: 'KAN-1', fields: {} }] }) });
    assert.equal(issues[0].key, 'KAN-1');
  });

  it('fails closed without a token or config', async () => {
    await assert.rejects(fetchIssues({ config: CONFIG, token: null, jql: 'x', fetchImpl: fake({}) }), /No runtime token/);
    await assert.rejects(fetchIssue({ config: { configured: false }, token: 't', key: 'KAN-1', fetchImpl: fake({}) }), /not configured/);
  });

  it('throws on a non-OK response', async () => {
    await assert.rejects(fetchIssues({ config: CONFIG, token: 't', jql: 'x', fetchImpl: fake({}, false, 403) }), /HTTP 403/);
  });
});

describe('tracker CLI', () => {
  it('--config returns 3 when unconfigured', async () => {
    const { code, out } = await capture(() => runTracker(['--config'], { root: tempRoot() }));
    assert.equal(code, 3);
    assert.match(out, /configured=false/);
  });

  it('--intake offers the handoff issue', async () => {
    const root = tempRoot({ handoff: '# h\n- **Tracker issue:** KAN-1\n' });
    const { code, out } = await capture(() => runTracker(['--intake'], { root, token: null }));
    assert.equal(code, 0);
    assert.match(out, /KAN-1 is in the handoff/);
  });

  it('--intake falls back to create with no issue and no config', async () => {
    const { code, out } = await capture(() => runTracker(['--intake'], { root: tempRoot(), token: null }));
    assert.equal(code, 0);
    assert.match(out, /nothing in play/);
  });

  it('--search returns 3 when unconfigured', async () => {
    assert.equal(await runTracker(['--search'], { root: tempRoot(), token: 't' }), 3);
  });
});
