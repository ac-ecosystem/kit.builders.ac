import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runsRoot = resolve(root, 'runs');
const allowedFiles = [
  'brief.md',
  'campaign.md',
  'campaign.csv',
  'infrastructure.md',
  'prospecting.md',
  'prospects.csv',
  'run.md',
];
const prospectHeader = 'company,website,first_name,last_name,title,email,source,source_checked_at,verification_status,verified_at,eligible,rejection_reason';
const campaignHeader = 'email,first_name,last_name,company,website,title,subject_angle,personalization';

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function runPath(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug ?? '')) {
    throw new Error('run name must be a lowercase hyphenated slug, for example acme-founders');
  }
  return resolve(runsRoot, slug);
}

function templates(slug) {
  const now = new Date().toISOString();
  return {
    'run.md': `---\nrun_id: ${slug}\ncompany: null\nwebsite: null\nstatus: planned\ncurrent_phase: getting-started\nupdated_at: ${now}\n---\n\n# Campaign run\n\n- [ ] Offer and ICP confirmed\n- [ ] Prospect sample approved\n- [ ] Leads sourced and verified\n- [ ] Infrastructure ready\n- [ ] Campaign handoff ready\n- [ ] Imported and launched by user\n\n## Current decision\n\nNot decided.\n\n## Blocker\n\nNone.\n\n## Next action\n\nConfirm the company website and offer.\n\n## Artifacts\n\n- [Targeting brief](brief.md)\n- [Prospecting log](prospecting.md)\n- [Prospects](prospects.csv)\n- [Infrastructure checkpoint](infrastructure.md)\n- [Campaign plan](campaign.md)\n- [Campaign import](campaign.csv)\n`,
    'brief.md': '# Targeting brief\n\nStatus: not started\n',
    'prospecting.md': '# Prospecting\n\nStatus: not started\n',
    'prospects.csv': `${prospectHeader}\n`,
    'infrastructure.md': '# Infrastructure\n\nStatus: not started\n',
    'campaign.md': '# Campaign\n\nStatus: not started\n',
    'campaign.csv': `${campaignHeader}\n`,
  };
}

async function check(slug) {
  const directory = runPath(slug);
  const entries = await readdir(directory);
  const unexpected = entries.filter((entry) => !allowedFiles.includes(entry));
  const missing = allowedFiles.filter((entry) => !entries.includes(entry));
  if (unexpected.length) fail(`unexpected run artifacts: ${unexpected.join(', ')}`);
  if (missing.length) fail(`missing run artifacts: ${missing.join(', ')}`);

  for (const entry of entries.filter((name) => allowedFiles.includes(name))) {
    const stat = await lstat(resolve(directory, entry));
    if (!stat.isFile()) fail(`${entry} must be a regular file`);
  }

  const dashboard = await readFile(resolve(directory, 'run.md'), 'utf8');
  for (const field of ['run_id:', 'status:', 'current_phase:', 'updated_at:']) {
    if (!dashboard.includes(`\n${field}`) && !dashboard.startsWith(`${field}`)) {
      fail(`run.md is missing ${field.slice(0, -1)} frontmatter`);
    }
  }
  if (!dashboard.includes(`run_id: ${slug}`)) fail('run.md run_id must match its directory name');

  const csv = await readFile(resolve(directory, 'prospects.csv'), 'utf8');
  if (csv.split(/\r?\n/, 1)[0] !== prospectHeader) fail('prospects.csv header does not match the run artifact contract');

  const campaign = await readFile(resolve(directory, 'campaign.csv'), 'utf8');
  if (campaign.split(/\r?\n/, 1)[0] !== campaignHeader) fail('campaign.csv header does not match the campaign handoff contract');

  if (process.exitCode !== 1) console.log(`run workspace is valid: runs/${slug}`);
}

async function init(slug) {
  const directory = runPath(slug);
  await mkdir(runsRoot, { recursive: true });
  try {
    await mkdir(directory);
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    console.log(`run already exists; validating without overwriting: runs/${slug}`);
    await check(slug);
    return;
  }

  for (const [name, contents] of Object.entries(templates(slug))) {
    await writeFile(resolve(directory, name), contents, { flag: 'wx' });
  }
  console.log(`created run workspace: runs/${slug}`);
  await check(slug);
}

const [command, slug, ...extra] = process.argv.slice(2);
if (!['init', 'check'].includes(command) || !slug || extra.length) {
  console.error('usage: node scripts/run-workspace.mjs <init|check> <run-name>');
  process.exit(2);
}

try {
  if (command === 'init') await init(slug);
  else await check(slug);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
