import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const TRACKER_CONFIG_FILE = '.tracker/config.json';

// Owner-provided, non-secret tracker settings. This adapter is READ-ONLY: it never creates, edits,
// transitions, or deletes anything. Writes remain a separate, owner-approved operation.
export function readTrackerConfig(root = process.cwd()) {
  const file = resolve(root, TRACKER_CONFIG_FILE);
  if (!existsSync(file)) {
    return { provider: null, cloudId: '', projectKey: '', configured: false, reason: `no ${TRACKER_CONFIG_FILE}` };
  }
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  const configured = raw.provider === 'jira'
    ? Boolean(raw.projectKey && raw.cloudId)
    : Boolean(raw.provider && raw.projectKey);
  return { ...raw, configured, reason: configured ? null : 'projectKey/cloudId empty' };
}

export function buildSearchJql({ projectKey, statuses = ['In Progress'], assignee = null }) {
  const parts = [`project = "${projectKey}"`];
  if (statuses.length > 0) parts.push(`status in (${statuses.map((status) => `"${status}"`).join(', ')})`);
  if (assignee) parts.push(`assignee = "${assignee}"`);
  return `${parts.join(' AND ')} ORDER BY updated DESC`;
}

export function parseJiraIssues(payload) {
  return (payload?.issues ?? []).map((issue) => ({
    key: issue.key,
    summary: issue.fields?.summary ?? '',
    status: issue.fields?.status?.name ?? 'unknown',
    assignee: issue.fields?.assignee?.displayName ?? null,
  }));
}

export function parseJiraIssue(payload) {
  if (!payload?.key) return null;
  return {
    key: payload.key,
    summary: payload.fields?.summary ?? '',
    status: payload.fields?.status?.name ?? 'unknown',
    assignee: payload.fields?.assignee?.displayName ?? null,
  };
}

// Intake decision for /jira-issue: prefer an issue already in play (the handoff), else a search hit,
// else fall back to manual creation (this adapter never writes).
export function chooseIntake({ handoffIssue = null, issues = [] }) {
  if (handoffIssue) {
    return { action: 'offer', issue: handoffIssue, options: ['pickup', 'search', 'create'] };
  }
  if (issues.length > 0) return { action: 'pick', issues };
  return {
    action: 'create',
    note: 'read/search only — record the intent in the backlog or a spec and ask the owner to create the issue',
  };
}

export function handoffIssue(text) {
  if (!text) return null;
  const match = /- \*\*Tracker issue:\*\*\s*(\S+)/.exec(text);
  return match && match[1] !== 'none' ? match[1] : null;
}

export function issueUrl(config, key) {
  return `https://api.atlassian.com/ex/jira/${config.cloudId}/rest/api/3/issue/${key}`;
}

export function searchUrl(config, jql) {
  return `https://api.atlassian.com/ex/jira/${config.cloudId}/rest/api/3/search?jql=${encodeURIComponent(jql)}`;
}

async function jiraGet(url, token, fetchImpl) {
  if (!token) throw new Error('No runtime token (set JIRA_TOKEN); tokens are never committed');
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Tracker request failed: HTTP ${response.status}`);
  return response.json();
}

export async function fetchIssues({ config, token, jql, fetchImpl = fetch }) {
  if (!config.configured) throw new Error('Tracker is not configured (set projectKey/cloudId)');
  return parseJiraIssues(await jiraGet(searchUrl(config, jql), token, fetchImpl));
}

export async function fetchIssue({ config, token, key, fetchImpl = fetch }) {
  if (!config.configured) throw new Error('Tracker is not configured (set projectKey/cloudId)');
  return parseJiraIssue(await jiraGet(issueUrl(config, key), token, fetchImpl));
}
