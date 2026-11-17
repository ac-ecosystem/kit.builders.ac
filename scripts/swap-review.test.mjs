import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaults, generateReport, htmlReport, readConfig, review, validateSnapshot } from './swap-review.mjs';
import { forecast, reportStamp } from './swap-scenarios.mjs';
import { check, init, parseCsv } from './swap-workspace.mjs';

const fixture = JSON.parse(await readFile(new URL('../examples/swap/snapshot.json', import.meta.url), 'utf8'));
const clone = () => structuredClone(fixture);
const config = (extra = {}) => ({ ...defaults, sequencer_workspace_id: fixture.workspace_id, standby_domains: ['example-standby.net'], ...extra });
const find = (r, name) => r.domains.find((d) => d.domain === name);

test('warmup catches deterioration with zero sender bounces and passing DNS', () => {
  const d = find(review(clone(), config()), 'example-decline.com');
  assert.equal(d.health, 'recovery');
  assert.equal(d.senderRate, 0);
  assert.equal(d.warmupRate, 2690 / 3500);
});

test('configuration issues are distinct from warmup recovery', () => {
  const d = find(review(clone(), config()), 'example-config.com');
  assert.equal(d.health, 'configuration review');
  assert.match(d.reasons.join(' '), /dmarc/);
});

test('provisional allocation excludes unhealthy or unverified domains', () => {
  const r = review(clone(), config());
  for (const name of ['example-decline.com', 'example-config.com', 'example-unknown.com']) assert.equal(find(r, name).proposedPool, 'hold');
  assert.equal(r.domains.reduce((n, d) => n + d.mailboxes, 0), fixture.domains.reduce((n, d) => n + d.mailboxes, 0));
});

test('explicit roles cannot hide a current lane conflict', () => {
  const r = review(clone(), config({ primary_domains: ['example-decline.com'] }));
  assert.equal(find(r, 'example-decline.com').laneConflict, true);
  assert.equal(r.totals.mixed, 2);
});

test('stale or missing DNS cannot qualify a standby', () => {
  for (const checked_at of [null, '2026-11-14T00:00:00Z', '2026-11-18T00:00:00Z']) {
    const s = clone(); s.domains.find((d) => d.domain === 'example-standby.net').dns.checked_at = checked_at;
    assert.equal(find(review(s, config()), 'example-standby.net').ready, false);
  }
});

test('unknown warmup and insufficient samples remain unverified', () => {
  const s = clone(); const d = s.domains.find((x) => x.domain === 'example-standby.net');
  d.warmup = { inbox: 10, spam: 0, promotion: 0, sent: 10 };
  assert.equal(find(review(s, config()), d.domain).health, 'unverified');
  d.warmup = null;
  assert.equal(find(review(s, config()), d.domain).warmupRate, null);
});

test('retrospective windows cannot trigger a three-day bounce rule', () => {
  const s = clone(); s.windows.sending.start = '2026-11-04';
  const d = s.domains.find((x) => x.domain === 'example-primary.com');
  d.sent = 500; d.sender_bounces = 100;
  assert.equal(find(review(s, config()), d.domain).health, 'healthy');
  s.windows.sending.start = '2026-11-14';
  assert.equal(find(review(s, config()), d.domain).health, 'recovery');
});

test('recipient-side bounces alone do not trigger sender recovery', () => {
  const s = clone(); const d = s.domains.find((x) => x.domain === 'example-primary.com');
  d.sent = 500; d.recipient_bounces = 100;
  assert.equal(find(review(s, config()), d.domain).health, 'healthy');
});

test('standby needs designation, age, complete coverage and no draft commitment', () => {
  const s = clone(); const name = 'example-standby.net';
  assert.equal(find(review(s, config()), name).ready, true);
  assert.equal(find(review(s, config({ standby_domains: [] })), name).ready, false);
  for (const update of [{ warmup_age_days: null }, { warmup_age_days: 14 }, { membership_complete: false }, { memberships: ['campaign-example-next'] }]) {
    const c = clone(); Object.assign(c.domains.find((d) => d.domain === name), update);
    assert.equal(find(review(c, config()), name).ready, false);
  }
  s.coverage.complete = false;
  assert.equal(find(review(s, config()), name).ready, false);
});

test('forecast arithmetic is explicit and does not consume observed inventory', () => {
  const r = review(clone(), config()); const f = forecast(r);
  assert.equal(f.replacements, 50);
  assert.equal(f.assumedStandbys, 100);
  assert.equal(f.remaining, 50);
  assert.equal(f.refill, Math.max(0, r.totals.target - 50));
  assert.equal(r.totals.ready, 50);
  assert.match(f.assumptions, /illustrative/);
});

test('snapshot validation rejects duplicate domains, missing counts and invalid data', () => {
  for (const change of [
    (s) => s.domains.push(s.domains[0]),
    (s) => delete s.domains[0].sent,
    (s) => { s.domains[0].warmup.inbox = 999999; },
    (s) => { s.domains[0].memberships = ['missing-campaign']; },
    (s) => s.daily_warmup.push(s.daily_warmup[0]),
  ]) { const s = clone(); change(s); assert.throws(() => validateSnapshot(s)); }
  assert.throws(() => review(clone(), config({ sequencer_workspace_id: 'wrong-workspace' })), /workspace/);
});

test('configuration rejects overlapping pools and undesignated live scope', () => {
  assert.throws(() => readConfig('---\nprimary_domains: ["example-primary.com"]\nstandby_domains: ["example-primary.com"]\n---\n'), /multiple pools/);
  assert.throws(() => readConfig('---\nmode: live\n---\n'), /include list/);
});

test('HTML escapes evidence and has no script or external assets', () => {
  const s = clone(); s.domains[0].notes = '<script>alert("x")</script>';
  const html = htmlReport(review(s, config()));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('src="http'));
  assert.ok(!html.includes('href="http'));
});

test('report header formats the requested ICT timestamp', () => {
  assert.equal(reportStamp(fixture), '17 November 2026, 9:36 AM ICT');
});

test('CSV journal parser preserves quoted commas and multiline details', () => {
  assert.deepEqual(parseCsv('a,b\n"one,two","line one\nline two"\n'), [['a', 'b'], ['one,two', 'line one\nline two']]);
  assert.throws(() => parseCsv('a,"unterminated'), /Unterminated/);
});

test('repeated rendering is idempotent and does not modify evidence or action journal', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'swap-review-'));
  const dir = join(parent, 'workspace');
  try {
    await init(dir);
    const before = await readFile(join(dir, 'actions.csv'), 'utf8');
    const md = (await readFile(join(dir, 'swap.md'), 'utf8')).replace('sequencer_workspace_id: null', 'sequencer_workspace_id: "' + fixture.workspace_id + '"');
    await writeFile(join(dir, 'swap.md'), md);
    const input = JSON.stringify(fixture);
    await writeFile(join(dir, 'snapshot.json'), input);
    await generateReport(dir); const first = await readFile(join(dir, 'report.html'), 'utf8');
    await generateReport(dir);
    await check(dir);
    assert.equal(await readFile(join(dir, 'report.html'), 'utf8'), first);
    assert.equal(parseCsv(await readFile(join(dir, 'runs.csv'), 'utf8')).length, 2);
    assert.equal(await readFile(join(dir, 'snapshot.json'), 'utf8'), input);
    assert.equal(await readFile(join(dir, 'actions.csv'), 'utf8'), before);
  } finally { await rm(parent, { recursive: true, force: true }); }
});

test('legacy journals are not overwritten by init', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'swap-legacy-'));
  try {
    await writeFile(join(dir, 'proposals.csv'), 'old journal');
    await assert.rejects(init(dir), /legacy/);
    assert.equal(await readFile(join(dir, 'proposals.csv'), 'utf8'), 'old journal');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
