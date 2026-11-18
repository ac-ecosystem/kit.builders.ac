import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaults, generateReport, readConfig, validateSnapshot } from './swap-review.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const allowedFiles = ['swap.md', 'snapshot.json', 'runs.csv', 'actions.csv', 'report.md', 'report.html', 'dashboard.html'];
export const runHeader = 'run_id,observed_at,mode,mailboxes,attention_domains,mixed_domains,verified_standby_mailboxes';
export const actionHeader = 'action_key,run_id,at,mode,step,mailbox,esp,campaign,standby,result,detail';
const steps = ['flag', 'set_ramp', 'attach', 'verify', 'detach', 'verify_detach', 'untag_campaign', 'untag_standby', 'tag_swapped_out', 'refill'];
const results = ['planned', 'done', 'skipped', 'failed', 'dry_run'];

export function parseCsv(text) {
  const rows = [], cells = [];
  let value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (ch === ',' || ch === '\n')) {
      cells.push(value.replace(/\r$/, '')); value = '';
      if (ch === '\n') { if (cells.some((cell) => cell.length)) rows.push(cells.splice(0)); else cells.length = 0; }
    } else value += ch;
  }
  if (quoted) throw new Error('Unterminated CSV quote');
  if (value.length || cells.length) { cells.push(value); rows.push(cells); }
  return rows;
}

function assert(ok, message) { if (!ok) throw new Error(message); }

export async function check(directory) {
  const label = relative(root, directory);
  const entries = (await readdir(directory)).filter((name) => name !== '.DS_Store');
  if (entries.includes('proposals.csv')) throw new Error(label + ': legacy workspace; preserve it in .kit/ before migration, never overwrite its journal');
  assert(entries.every((entry) => allowedFiles.includes(entry)), label + ': unexpected swap artifact');
  for (const file of allowedFiles.filter((file) => !['report.md', 'dashboard.html'].includes(file))) assert(entries.includes(file) && (await lstat(resolve(directory, file))).isFile(), label + ': missing regular file ' + file);
  const { config } = readConfig(await readFile(resolve(directory, 'swap.md'), 'utf8'));
  const snapshot = JSON.parse(await readFile(resolve(directory, 'snapshot.json'), 'utf8'));
  if (snapshot !== null) {
    validateSnapshot(snapshot);
    assert(snapshot.workspace_id === config.sequencer_workspace_id, 'snapshot workspace mismatch');
  }
  const runIds = new Set();
  const runs = parseCsv(await readFile(resolve(directory, 'runs.csv'), 'utf8'));
  assert(runs[0]?.join(',') === runHeader, 'runs.csv header mismatch');
  for (const row of runs.slice(1)) {
    assert(row.length === runHeader.split(',').length, 'runs.csv column mismatch');
    assert(row[0] && !runIds.has(row[0]), 'duplicate or missing run ID');
    assert(Number.isFinite(Date.parse(row[1])) && ['dry-run', 'live'].includes(row[2]), 'invalid run timestamp or mode');
    assert(row.slice(3).every((cell) => /^\d+$/.test(cell)), 'invalid run counts');
    runIds.add(row[0]);
  }
  const actionKeys = new Set();
  const actions = parseCsv(await readFile(resolve(directory, 'actions.csv'), 'utf8'));
  assert(actions[0]?.join(',') === actionHeader, 'actions.csv header mismatch');
  for (const row of actions.slice(1)) {
    assert(row.length === actionHeader.split(',').length, 'actions.csv column mismatch');
    const [key, run, at, mode, step, , , , , result] = row;
    assert(key && !actionKeys.has(key), 'duplicate or missing action key');
    assert(runIds.has(run), 'action refers to unknown run');
    assert(Number.isFinite(Date.parse(at)), 'action timestamp invalid');
    assert(['dry-run', 'live'].includes(mode) && steps.includes(step) && results.includes(result), 'invalid action mode, step or result');
    assert(!(mode === 'dry-run' && result === 'done' && step !== 'flag'), 'dry-run must not claim an executed action');
    actionKeys.add(key);
  }
  assert((await readFile(resolve(directory, 'report.html'), 'utf8')).includes('<!doctype html>'), 'report.html must be standalone HTML');
  console.log('swap workspace is valid: ' + label);
}

export async function init(directory) {
  try { await mkdir(directory); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    await check(directory);
    return;
  }
  const config = {
    mode: defaults.mode, sequencer: 'plusvibe', sequencer_workspace_id: null,
    schedule: defaults.schedule, timezone: 'UTC', live_campaign_include: [],
    primary_domains: [], catchall_domains: [], standby_domains: [], catchall_history_domains: [],
    ready_days: defaults.ready_days, warmup_threshold: defaults.warmup_threshold,
    warmup_min_results: defaults.warmup_min_results, bounce_window_days: defaults.bounce_window_days,
    bounce_threshold: defaults.bounce_threshold, bounce_min_sends: defaults.bounce_min_sends,
  };
  const files = {
    'swap.md': '---\n' + Object.entries(config).map(([k, v]) => k + ': ' + JSON.stringify(v)).join('\n') + '\n---\n\n# Fleet review\n\nNot run yet. Collect a snapshot using ac-swap, then run the report command.\n',
    'dashboard.html': '<!doctype html><html lang="en"><title>Fleet Observatory</title><h1>Not synced yet</h1></html>\n',
    'report.md': '# Swap simulation\n\nNot run yet.\n',
    'snapshot.json': 'null\n', 'runs.csv': runHeader + '\n', 'actions.csv': actionHeader + '\n',
    'report.html': '<!doctype html><html lang="en"><meta charset="utf-8"><title>Fleet review</title><h1>Not run yet</h1><p>Collect evidence using ac-swap, then generate the report.</p></html>\n',
  };
  for (const [name, content] of Object.entries(files)) await writeFile(resolve(directory, name), content, { flag: 'wx' });
  await check(directory);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...args] = process.argv.slice(2);
  if (!['init', 'check', 'report'].includes(command) || (args.length && (args.length !== 2 || args[0] !== '--dir'))) {
    console.error('usage: node scripts/swap-workspace.mjs <init|check|report> [--dir <path>]');
    process.exit(2);
  }
  const directory = resolve(root, args[1] ?? 'swap');
  try {
    if (command === 'init') await init(directory);
    else if (command === 'check') await check(directory);
    else {
      await check(directory);
      const r = await generateReport(directory);
      await check(directory);
      console.log('Dashboard: ' + resolve(directory, 'dashboard.html'));
      console.log('Report: ' + resolve(directory, 'report.md'));
      console.log(r.totals.attention + ' domains need attention; no external changes performed');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
