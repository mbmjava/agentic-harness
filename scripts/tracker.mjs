#!/usr/bin/env node
// Read-only tracker intake for /jira-issue. Never writes to the tracker.
// Usage:
//   node scripts/tracker.mjs --config
//   node scripts/tracker.mjs --intake [--json]
//   node scripts/tracker.mjs --search [--status "In Progress"] [--assignee NAME] [--json]
//   node scripts/tracker.mjs --issue KEY [--json]
// Token comes from the runtime env (JIRA_TOKEN); it is never read from the repository.
import { pathToFileURL } from 'node:url';
import { readHandoff } from './lib/handoff.mjs';
import {
  buildSearchJql,
  chooseIntake,
  fetchIssue,
  fetchIssues,
  handoffIssue,
  readTrackerConfig,
} from './lib/tracker.mjs';

function printIssues(issues) {
  if (issues.length === 0) {
    console.log('tracker: no issues');
    return;
  }
  for (const issue of issues) {
    console.log(`${issue.key} [${issue.status}] ${issue.summary}${issue.assignee ? ` (${issue.assignee})` : ''}`);
  }
}

export async function runTracker(argv, { root = process.cwd(), token = process.env.JIRA_TOKEN, fetchImpl = fetch } = {}) {
  const flag = (name) => {
    const index = argv.indexOf(name);
    return index === -1 ? null : argv[index + 1];
  };
  const json = argv.includes('--json');
  const config = readTrackerConfig(root);

  try {
    if (argv.includes('--config')) {
      if (json) console.log(JSON.stringify(config, null, 2));
      else console.log(`tracker: provider=${config.provider ?? 'none'} project=${config.projectKey || '(unset)'} configured=${config.configured}`);
      return config.configured ? 0 : 3;
    }

    if (argv.includes('--intake')) {
      const issue = handoffIssue(readHandoff(root));
      let issues = [];
      if (!issue && config.configured && token) {
        issues = await fetchIssues({ config, token, jql: buildSearchJql(config), fetchImpl });
      }
      const decision = chooseIntake({ handoffIssue: issue, issues });
      if (json) console.log(JSON.stringify(decision, null, 2));
      else if (decision.action === 'offer') console.log(`intake: ${decision.issue} is in the handoff — pick up | search | create`);
      else if (decision.action === 'pick') printIssues(decision.issues);
      else console.log(`intake: nothing in play — ${decision.note}`);
      return 0;
    }

    if (argv.includes('--search')) {
      if (!config.configured) {
        console.error(`tracker: not configured (${config.reason})`);
        return 3;
      }
      const statuses = flag('--status') ? flag('--status').split(',').map((status) => status.trim()) : ['In Progress'];
      const jql = buildSearchJql({ projectKey: config.projectKey, statuses, assignee: flag('--assignee') });
      const issues = await fetchIssues({ config, token, jql, fetchImpl });
      if (json) console.log(JSON.stringify(issues, null, 2));
      else printIssues(issues);
      return 0;
    }

    if (argv.includes('--issue')) {
      const key = flag('--issue');
      if (!key) {
        console.error('tracker: --issue requires a key');
        return 2;
      }
      if (!config.configured) {
        console.error(`tracker: not configured (${config.reason})`);
        return 3;
      }
      const issue = await fetchIssue({ config, token, key, fetchImpl });
      if (json) console.log(JSON.stringify(issue, null, 2));
      else if (issue) printIssues([issue]);
      return 0;
    }
  } catch (error) {
    console.error(`tracker: ${error.message}`);
    return 1;
  }

  console.error('Usage: node scripts/tracker.mjs --config | --intake | --search | --issue KEY');
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runTracker(process.argv.slice(2));
}
