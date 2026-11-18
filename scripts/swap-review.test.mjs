import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaults, generateReport, htmlReport, readConfig, review, validateSnapshot } from './swap-review.mjs';
import { simulate, simulationMarkdown } from './swap-simulation.mjs';
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

test('standby readiness is counted per mailbox and requires complete individual evidence', () => {
  const s = clone(), id = 'mailbox-example-standby';
  const mailbox = (r) => r.mailboxes.find((m) => m.id === id);
  assert.equal(mailbox(review(s, config())).ready, true);
  assert.equal(find(review(s, config()), 'example-standby.net').ready, false);
  assert.equal(review(s, config()).totals.ready, 1);
  assert.equal(mailbox(review(s, config({ standby_domains: [] }))).ready, false);
  for (const change of [
    (s) => s.mailboxes[1].warmup_age_days = null,
    (s) => s.mailboxes[1].warmup_age_days = 14,
    (s) => s.mailboxes[1].membership_complete = false,
    (s) => s.coverage.complete = false,
    (s) => s.mailboxes[1].capacity_today = 0,
    (s) => s.mailboxes[1].ever_catchall = null,
    (s) => { s.domains.find((d) => d.domain === 'example-standby.net').memberships = ['campaign-example-next']; s.mailboxes[1].memberships = ['campaign-example-next']; },
  ]) {
    const other = clone(); change(other);
    assert.equal(mailbox(review(other, config())).ready, false);
  }
});

test('one-mailbox forecast is illustrative and never consumes observed standby evidence', () => {
  const r = review(clone(), config()), f = forecast(r);
  assert.equal(f.replacements, 1);
  assert.equal(f.assumedStandbys, 2);
  assert.equal(f.remaining, 1);
  assert.equal(f.refill, 1);
  assert.equal(r.totals.ready, 1);
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

test('simulation verifies all replacements before removing the source', () => {
  const r = review(clone(), config()); const result = simulate(r);
  const verified = result.steps.findIndex((x) => x.event === 'Verify all replacement attachments');
  const detached = result.steps.findIndex((x) => x.event === 'Remove source; verify final membership');
  assert.ok(verified < detached);
  assert.equal(result.steps[verified].sourceAssigned, result.replacements);
  assert.equal(result.steps[verified].assigned, result.baseline + result.replacements);
  assert.equal(result.state.assigned, result.baseline);
  assert.equal(result.state.sourceAssigned, 0);
  assert.equal(result.state.recovery, result.replacements);
  assert.equal(result.state.ready, result.remaining + result.refill);
});

test('failed verification keeps the source and exposes an unverified attachment', () => {
  const result = simulate(review(clone(), config()), { failVerification: true });
  assert.equal(result.success, false);
  assert.equal(result.state.sourceAssigned, result.replacements);
  assert.equal(result.state.replacementAssigned, result.replacements);
  assert.equal(result.state.assigned, result.baseline + result.state.replacementAssigned);
  assert.equal(result.state.recovery, 0);
  assert.equal(result.state.warming, 0);
  assert.equal(result.state.requested, 0);
});

test('simulation is deterministic and never changes the observed snapshot', () => {
  const s = clone(), before = JSON.stringify(s), r = review(s, config());
  assert.deepEqual(simulate(r), simulate(r));
  assert.equal(JSON.stringify(s), before);
});

test('domain-only evidence cannot select or replace a mailbox', () => {
  const s = clone(); delete s.mailboxes;
  const r = review(s, config());
  assert.equal(simulate(r), null);
  assert.equal(r.totals.ready, 0);
  assert.match(simulationMarkdown(r), /Individual mailbox evidence/);
});

test('dashboard exports observed pools without private fields or hypothetical stock', async () => {
  const { dashboardData, dashboardHtml } = await import('./swap-dashboard.mjs');
  const s = clone();
  s.domains[0].notes = 'PRIVATE-NOTE password=secret';
  s.domains[0].mailbox_addresses = ['private@example.com'];
  s.campaigns[0].name = 'Example $& </script> contact private@example.com';
  s.campaigns[0].sent_count = 123;
  const r = review(s, config({ standby_domains: [] }));
  const d = dashboardData(r);
  assert.equal(d.pools.primary.mailboxes, 900);
  assert.equal(d.pools.catchall.mailboxes, 150);
  assert.equal(d.totals.overlap, 100);
  assert.equal(d.pools.standby.mailboxes, 0);
  assert.equal(d.campaigns[0].sent, 123);
  assert.equal(d.campaigns[1].sent, null);
  assert.equal(d.domains.find((x) => x.name === 'example-unknown.com').sent, null);
  const html = await dashboardHtml(r);
  for (const secret of [s.workspace_id, s.campaigns[0].id, ...s.mailboxes.flatMap((m) => [m.id, m.email]), 'PRIVATE-NOTE', 'private@example.com', 'password=secret']) assert.ok(!html.includes(secret));
  const json = html.match(/window.FLEET_DATA=(.*?);<\/script>/s)[1];
  assert.equal(json.includes('</script>'), false);
  assert.match(JSON.parse(json).campaigns[0].name, /\$&/);
  assert.deepEqual(dashboardData(r), JSON.parse(json));
});

test('each report refreshes dashboard and configured Site while retaining run idempotency', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'fleet-dashboard-'));
  const dir = join(temp, 'workspace');
  try {
    await init(dir);
    const { mkdir } = await import('node:fs/promises');
    const site = join(dir, 'site');
    await mkdir(join(site, '.openai'), { recursive: true });
    await writeFile(join(site, '.openai/hosting.json'), JSON.stringify({ project_id: 'site-example', static: { directory: 'dist' } }));
    await writeFile(join(dir, 'snapshot.json'), JSON.stringify(clone()));
    let md = await readFile(join(dir, 'swap.md'), 'utf8');
    md = md.replace('---\n', '---\ndashboard_project_id: "site-example"\ndashboard_site_directory: '+JSON.stringify(site)+'\n');
    md = md.replace(/sequencer_workspace_id:.*\n/, 'sequencer_workspace_id: '+JSON.stringify(fixture.workspace_id)+'\n');
    await writeFile(join(dir, 'swap.md'), md);
    await generateReport(dir);
    const before = await readFile(join(dir, 'dashboard.html'), 'utf8');
    assert.equal(before, await readFile(join(site, 'dist/index.html'), 'utf8'));
    const changed = clone(); changed.campaigns[0].sent_count = 9876;
    await writeFile(join(dir, 'snapshot.json'), JSON.stringify(changed));
    await generateReport(dir);
    const after = await readFile(join(dir, 'dashboard.html'), 'utf8');
    assert.notEqual(after, before);
    assert.equal(after, await readFile(join(site, 'dist/index.html'), 'utf8'));
    assert.equal((await readFile(join(dir, 'runs.csv'), 'utf8')).trim().split('\n').length, 2);
    assert.deepEqual(JSON.parse(await readFile(join(dir, 'snapshot.json'), 'utf8')), changed);
    await writeFile(join(site, '.openai/hosting.json'), JSON.stringify({ project_id: 'other-site', static: { directory: 'dist' } }));
    await assert.rejects(generateReport(dir), /identity/);
    assert.equal(await readFile(join(site, 'dist/index.html'), 'utf8'), after);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test('explicit and observed roles are preserved without percentage-based reassignment', () => {
  const r = review(clone(), config());
  assert.equal(find(r, 'example-primary.com').proposedPool, 'primary');
  assert.equal(find(r, 'example-catchall.com').proposedPool, 'catchall');
  assert.equal(find(r, 'example-unknown.com').proposedPool, 'hold');
});

test('stale DNS, warmup and sending breaches stay historical and cannot select a source', () => {
  const s = clone(); s.observed_at = '2026-11-21T02:36:00Z';
  s.mailboxes[0].sent = 200; s.mailboxes[0].sender_bounces = 10;
  const r = review(s, config());
  assert.equal(find(r, 'example-decline.com').health, 'unverified');
  assert.equal(r.mailboxes[0].health, 'unverified');
  assert.equal(r.mailboxes[0].replaceCandidate, false);
  assert.ok(r.mailboxes[0].historicalFindings.length > 0);
  assert.equal(simulate(r), null);
});

test('catch-all history permanently blocks Primary across sibling mailboxes and cleared memberships', () => {
  for (const history of [true, null]) {
    const s = clone(); s.mailboxes[1].ever_catchall = history;
    assert.equal(review(s, config()).mailboxes[1].ready, false);
  }
  const s = clone();
  assert.equal(review(s, config({ catchall_history_domains: ['example-standby.net'] })).mailboxes[1].ready, false);
  const sibling = structuredClone(s.mailboxes[1]); sibling.id = 'mailbox-example-sibling'; sibling.email = 'other@example-standby.net'; sibling.ever_catchall = true;
  s.mailboxes.push(sibling);
  assert.equal(review(s, config()).mailboxes[1].primaryEligible, false);
  s.mailboxes[1].standby_for = 'catchall';
  assert.equal(review(s, config()).mailboxes[1].ready, true);
});

test('completed cross-lane assignments cannot qualify a standby', () => {
  const s = clone();
  s.domains.find((d) => d.domain === 'example-standby.net').memberships = ['campaign-example-primary', 'campaign-example-catchall'];
  const r = review(s, config());
  assert.equal(r.mailboxes[1].ready, false);
  assert.equal(find(r, 'example-standby.net').ready, false);
});

test('3% applies inclusively to sender-side bounces with the sample guard', () => {
  for (const [sent, bounces, expected] of [[200, 6, true], [200, 5, false], [60, 2, true], [49, 2, false]]) {
    const s = clone(), m = s.mailboxes[0];
    m.warmup = { inbox: 250, spam: 0, promotion: 0, sent: 250 };
    m.sent = sent; m.sender_bounces = bounces;
    const checked = review(s, config()).mailboxes[0];
    assert.equal(checked.replaceCandidate, expected);
  }
});

test('a poor mailbox does not cause selection of its healthy domain peers', () => {
  const s = clone(), sibling = structuredClone(s.mailboxes[0]);
  sibling.id = 'mailbox-example-healthy'; sibling.email = 'healthy@example-primary.com';
  sibling.warmup = { inbox: 250, spam: 0, promotion: 0, sent: 250 };
  s.mailboxes.push(sibling);
  assert.deepEqual(review(s, config()).mailboxes.filter((m) => m.replaceCandidate).map((m) => m.id), ['mailbox-example-source']);
  assert.equal(simulate(review(s, config())).replacements, 1);
});

test('Catch-all history persists after the source assignments disappear', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'swap-history-')), dir = join(parent, 'workspace');
  try {
    await init(dir);
    const md = (await readFile(join(dir, 'swap.md'), 'utf8')).replace('sequencer_workspace_id: null', 'sequencer_workspace_id: '+JSON.stringify(fixture.workspace_id));
    await writeFile(join(dir, 'swap.md'), md);
    const first = clone(); await writeFile(join(dir, 'snapshot.json'), JSON.stringify(first));
    await generateReport(dir);
    const next = clone(); next.domains.find((d) => d.domain === 'example-catchall.com').memberships = [];
    await writeFile(join(dir, 'snapshot.json'), JSON.stringify(next));
    const result = await generateReport(dir);
    assert.ok(result.catchallHistory.includes('example-catchall.com'));
    const saved = readConfig(await readFile(join(dir, 'swap.md'), 'utf8')).config;
    assert.ok(saved.catchall_history_domains.includes('example-catchall.com'));
  } finally { await rm(parent, { recursive: true, force: true }); }
});

test('campaign membership baseline must be observed, not inferred from domain unions', () => {
  const s = clone(); delete s.campaigns.find((c) => c.status === 'DRAFT').assigned_mailboxes;
  assert.equal(simulate(review(s, config())), null);
});

test('a Catch-all standby cannot hide a Primary replacement shortage', () => {
  const s = clone(); s.mailboxes[1].standby_for = 'catchall';
  const r = review(s, config());
  assert.equal(r.totals.ready, 1);
  assert.equal(r.totals.shortage, 1);
  assert.deepEqual(r.replacementNeeds, [{esp:'microsoft', lane:'primary', required:1, available:0, shortage:1}]);
});

test('using one standby does not disqualify unused same-lane sibling mailboxes', () => {
  const s = clone(); s.domains.find((d) => d.domain === 'example-standby.net').memberships = ['campaign-example-next'];
  assert.equal(review(s, config()).mailboxes[1].ready, true);
});
