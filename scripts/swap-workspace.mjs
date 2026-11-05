import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const allowedFiles = ['swap.md', 'proposals.csv', 'actions.csv'];
export const proposalHeader = 'proposal_id,created_at,mode,esp_counts,flagged_count,campaign_count,slack_thread,status,decision,decided_by,decided_at,excluded,reason,expires_at,executed_at';
export const actionHeader = 'action_key,proposal_id,at,mode,step,mailbox,esp,campaign,standby,result,detail';
const proposalStatuses = ['pending', 'needs_decision', 'approved', 'rejected', 'expired', 'executed', 'failed'];
const actionSteps = ['flag', 'set_ramp', 'attach', 'verify', 'detach', 'untag_campaign', 'untag_standby', 'tag_swapped_out', 'intake_tag', 'intake_warmup', 'refill', 'placement_start', 'placement_result'];
const actionResults = ['done', 'skipped', 'failed', 'dry_run'];
const requiredConfig = ['mode', 'sequencer', 'sequencer_workspace_id', 'approval_channel', 'approvers', 'standby_mode', 'standby_tag', 'swapped_out_tag', 'ready_days', 'bounce_window_days', 'bounce_rate_threshold', 'bounce_min_sends', 'pool_floor_share', 'proposal_expiry_hours', 'timezone', 'updated_at'];

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function template() {
  const now = new Date().toISOString();
  return {
    'swap.md': `---
mode: dry-run
demo: false
sequencer: null
sequencer_workspace_id: null
builders_account: null
approval_channel: null
approvers: []
standby_mode: tag
standby_tag: standby
swapped_out_tag: swapped-out
standby_exclusions: []
campaign_exclusions: []
campaign_include: []
intake_domains: []
ready_days: 15
bounce_window_days: 3
bounce_rate_threshold: 0.045
bounce_min_sends: 50
domain_bounce_rate_threshold: 0.05
domain_bounce_min_sends: 200
domain_flagged_mailboxes: 2
list_suspected_share: 0.5
placement_min_seeds: 1
placement_content: neutral
pool_floor_share: 0.10
ramp: { daily_limit: 30, rampup_daily_limit: 10, rampup_daily_inc: 2, interval_limit_in_min: 15 }
proposal_expiry_hours: 24
schedule: { scan: "07:00 daily", placement: "06:00 Mon,Thu", decide: "every 2h 08:00-20:00" }
timezone: null
demo_force_flag: []
updated_at: ${now}
---

# Swap dashboard

Status: not set up. Run the ac-swap setup.

## Last runs

| Mode | Finished | Result |
| --- | --- | --- |

## Open proposals

None.

## Pool

| ESP | Ready | Warming | Floor | Daily burn (30 d) | Runway | Refill recommendation |
| --- | --- | --- | --- | --- | --- | --- |

## Placement

No test in progress.

## Swapped-out mailboxes awaiting a retirement decision

None.

## Blocker

None.

## Next action

Run ac-swap setup.
`,
    'proposals.csv': `${proposalHeader}\n`,
    'actions.csv': `${actionHeader}\n`,
  };
}

function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { cells.push(cell); cell = ''; }
    else cell += char;
  }
  cells.push(cell);
  return cells;
}

function rows(text, header) {
  const lines = text.split(/\r?\n/).filter((line) => line.length);
  const columns = header.split(',');
  return lines.slice(1).map((line, index) => {
    const cells = parseCsvLine(line);
    if (cells.length !== columns.length) fail(`row ${index + 2} has ${cells.length} cells, expected ${columns.length}`);
    return Object.fromEntries(columns.map((name, i) => [name, cells[i] ?? '']));
  });
}

export async function check(directory) {
  const label = relative(root, directory) || '.';
  const entries = (await readdir(directory)).filter((entry) => entry !== '.DS_Store');
  const unexpected = entries.filter((entry) => !allowedFiles.includes(entry));
  const missing = allowedFiles.filter((entry) => !entries.includes(entry));
  if (unexpected.length) fail(`${label}: unexpected swap artifacts: ${unexpected.join(', ')}`);
  if (missing.length) fail(`${label}: missing swap artifacts: ${missing.join(', ')}`);
  if (missing.length) return;

  for (const entry of allowedFiles) {
    if (!(await lstat(resolve(directory, entry))).isFile()) fail(`${label}/${entry} must be a regular file`);
  }

  const dashboard = await readFile(resolve(directory, 'swap.md'), 'utf8');
  const frontmatter = dashboard.match(/^---\n([\s\S]+?)\n---\n/);
  if (!frontmatter) fail(`${label}/swap.md needs YAML frontmatter`);
  const keys = new Map((frontmatter?.[1] ?? '').split('\n')
    .map((line) => line.match(/^([a-z_]+):\s*(.*)$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].trim()]));
  for (const key of requiredConfig) {
    if (!keys.has(key)) fail(`${label}/swap.md is missing ${key}`);
  }
  if (keys.has('mode') && !['dry-run', 'live'].includes(keys.get('mode'))) fail(`${label}/swap.md mode must be dry-run or live`);
  if (keys.has('standby_mode') && !['tag', 'implicit'].includes(keys.get('standby_mode'))) fail(`${label}/swap.md standby_mode must be tag or implicit`);

  const proposals = await readFile(resolve(directory, 'proposals.csv'), 'utf8');
  if (proposals.split(/\r?\n/, 1)[0] !== proposalHeader) fail(`${label}/proposals.csv header does not match the swap contract`);
  for (const row of rows(proposals, proposalHeader)) {
    if (!proposalStatuses.includes(row.status)) fail(`${label}/proposals.csv ${row.proposal_id}: unknown status ${row.status}`);
  }

  const actions = await readFile(resolve(directory, 'actions.csv'), 'utf8');
  if (actions.split(/\r?\n/, 1)[0] !== actionHeader) fail(`${label}/actions.csv header does not match the swap contract`);
  const seen = new Set();
  for (const row of rows(actions, actionHeader)) {
    if (!actionSteps.includes(row.step)) fail(`${label}/actions.csv ${row.action_key}: unknown step ${row.step}`);
    if (!actionResults.includes(row.result)) fail(`${label}/actions.csv ${row.action_key}: unknown result ${row.result}`);
    if (seen.has(row.action_key)) fail(`${label}/actions.csv: duplicate action_key ${row.action_key}`);
    seen.add(row.action_key);
  }

  if (process.exitCode !== 1) console.log(`swap workspace is valid: ${label}`);
}

async function init(directory) {
  try {
    await mkdir(directory);
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    console.log(`swap workspace already exists; validating without overwriting: ${relative(root, directory)}`);
    await check(directory);
    return;
  }
  for (const [name, contents] of Object.entries(template())) {
    await writeFile(resolve(directory, name), contents, { flag: 'wx' });
  }
  console.log(`created swap workspace: ${relative(root, directory)}`);
  await check(directory);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [command, ...rest] = process.argv.slice(2);
  const dirFlag = rest.indexOf('--dir');
  const directory = resolve(root, dirFlag >= 0 ? rest[dirFlag + 1] ?? '' : 'swap');
  if (!['init', 'check'].includes(command) || (dirFlag >= 0 && !rest[dirFlag + 1])) {
    console.error('usage: node scripts/swap-workspace.mjs <init|check> [--dir <path>]');
    process.exit(2);
  }
  try {
    if (command === 'init') await init(directory);
    else await check(directory);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
