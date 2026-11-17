import { readFile, writeFile } from 'node:fs/promises';
import { reportStamp, systemHtml, systemMarkdown } from './swap-scenarios.mjs';

const DAY = 86400000;
const checks = ['spf', 'dkim', 'dmarc', 'mx'];
const roles = ['primary', 'catchall', 'standby'];
const esc = (v) => String(v ?? 'unknown').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const md = (v) => String(v ?? 'unknown').replace(/[|\r\n]/g, ' ');
const pct = (n) => n === null ? 'unknown' : (n * 100).toFixed(1) + '%';
const count = (n) => Number(n).toLocaleString('en-US');
const validTime = (v) => typeof v === 'string' && Number.isFinite(Date.parse(v));
const days = (a, b) => (Date.parse(b) - Date.parse(a)) / DAY + 1;
function requireThat(ok, message) { if (!ok) throw new Error(message); }

export const defaults = {
  mode: 'dry-run', schedule: 'manual', ready_days: 15, warmup_threshold: 0.9,
  warmup_min_results: 200, bounce_window_days: 3, bounce_threshold: 0.05,
  bounce_min_sends: 200, standby_share: 0.1, catchall_share: 0.2,
  primary_domains: [], catchall_domains: [], standby_domains: [], live_campaign_include: [],
};

export function readConfig(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  requireThat(match, 'swap.md needs YAML frontmatter');
  const config = { ...defaults };
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!m) continue;
    const value = m[2].trim();
    try { config[m[1]] = JSON.parse(value); } catch { config[m[1]] = value; }
  }
  requireThat(['dry-run', 'live'].includes(config.mode), 'mode must be dry-run or live');
  for (const key of ['warmup_threshold', 'bounce_threshold', 'standby_share', 'catchall_share']) {
    requireThat(Number.isFinite(config[key]) && config[key] >= 0 && config[key] <= 1, key + ' must be between 0 and 1');
  }
  requireThat(config.standby_share + config.catchall_share < 1, 'pool shares must leave primary capacity');
  for (const key of ['ready_days', 'warmup_min_results', 'bounce_window_days', 'bounce_min_sends']) {
    requireThat(Number.isInteger(config[key]) && config[key] > 0, key + ' must be a positive integer');
  }
  const assigned = new Set();
  for (const role of roles) {
    requireThat(Array.isArray(config[role + '_domains']), role + '_domains must be a JSON array');
    for (const domain of config[role + '_domains']) {
      requireThat(typeof domain === 'string' && domain === domain.toLowerCase(), 'pool domains must be lowercase strings');
      requireThat(!assigned.has(domain), 'domain assigned to multiple pools: ' + domain);
      assigned.add(domain);
    }
  }
  requireThat(Array.isArray(config.live_campaign_include), 'live_campaign_include must be a JSON array');
  if (config.mode === 'live') {
    requireThat(config.live_campaign_include.length > 0, 'live mode needs an explicit campaign include list');
    requireThat(config.standby_domains.length > 0, 'live mode needs designated standby domains');
  }
  return { config, frontmatter: match[0] };
}

export function validateSnapshot(s) {
  requireThat(s && typeof s === 'object', 'No snapshot yet; collect evidence with ac-swap before generating a report');
  requireThat(s.version === 1 && typeof s.run_id === 'string' && /^[a-zA-Z0-9_-]+$/.test(s.run_id), 'invalid snapshot version or run_id');
  requireThat(typeof s.workspace_id === 'string' && s.workspace_id.length > 0, 'snapshot needs workspace_id');
  requireThat(validTime(s.observed_at), 'snapshot needs observed_at timestamp');
  requireThat(s.report_at === undefined || validTime(s.report_at), 'invalid report timestamp');
  requireThat(s.coverage && typeof s.coverage.description === 'string' && typeof s.coverage.complete === 'boolean', 'snapshot needs explicit coverage');
  for (const window of ['sending', 'warmup']) {
    const w = s.windows?.[window];
    requireThat(w && /^\d{4}-\d{2}-\d{2}$/.test(w.start) && /^\d{4}-\d{2}-\d{2}$/.test(w.end) && validTime(w.start) && validTime(w.end) && days(w.start, w.end) >= 1, 'invalid ' + window + ' window');
    requireThat(Date.parse(w.end) + DAY <= Date.parse(s.observed_at), window + ' window must contain complete UTC dates');
  }
  requireThat(days(s.windows.warmup.start, s.windows.warmup.end) === 7, 'warmup window must be seven complete UTC dates');
  requireThat(Array.isArray(s.campaigns) && Array.isArray(s.domains), 'snapshot needs campaign and domain arrays');
  const campaignIds = new Set();
  for (const c of s.campaigns) {
    requireThat(typeof c.id === 'string' && !campaignIds.has(c.id), 'duplicate or invalid campaign');
    campaignIds.add(c.id);
    requireThat(typeof c.name === 'string' && ['primary', 'catchall', 'unknown'].includes(c.lane), 'invalid campaign name or lane');
    requireThat(['ACTIVE', 'DRAFT', 'COMPLETED', 'PAUSED'].includes(c.status), 'invalid campaign status');
  }
  const domainNames = new Set();
  for (const d of s.domains) {
    requireThat(typeof d.domain === 'string' && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d.domain) && !domainNames.has(d.domain), 'duplicate or invalid domain');
    domainNames.add(d.domain);
    requireThat(['microsoft', 'google', 'unknown'].includes(d.esp), 'invalid ESP');
    requireThat(Number.isInteger(d.mailboxes) && d.mailboxes > 0, 'mailbox count must be positive');
    requireThat(Array.isArray(d.memberships) && new Set(d.memberships).size === d.memberships.length && d.memberships.every((id) => campaignIds.has(id)), 'unknown or duplicate campaign membership');
    for (const key of ['sent', 'sender_bounces', 'recipient_bounces', 'warmup_age_days', 'capacity_today']) {
      requireThat(d[key] === null || (Number.isInteger(d[key]) && d[key] >= 0), 'invalid or missing ' + key + ' for ' + d.domain);
    }
    requireThat(typeof d.membership_complete === 'boolean', 'membership completeness must be explicit');
    if (d.warmup !== null) {
      requireThat(d.warmup && ['inbox', 'spam', 'promotion', 'sent'].every((key) => Number.isInteger(d.warmup[key]) && d.warmup[key] >= 0), 'invalid warmup counts');
      requireThat(d.warmup.inbox + d.warmup.spam + d.warmup.promotion <= d.warmup.sent, 'classified warmup exceeds sent');
    }
    requireThat(d.dns && checks.every((key) => [true, false, null].includes(d.dns[key])), 'DNS checks must be true, false or null');
    requireThat(d.dns.checked_at === null || validTime(d.dns.checked_at), 'invalid DNS timestamp');
    requireThat(typeof d.dns.source === 'string', 'DNS source must be explicit');
    if (d.sent !== null && d.sender_bounces !== null && d.recipient_bounces !== null) {
      requireThat(d.sender_bounces + d.recipient_bounces <= d.sent, 'bounce count exceeds sends');
    }
  }
  const dailyKeys = new Set();
  for (const row of s.daily_warmup ?? []) {
    const key = row.domain + ':' + row.date;
    requireThat(domainNames.has(row.domain) && /^\d{4}-\d{2}-\d{2}$/.test(row.date) && validTime(row.date) && !dailyKeys.has(key), 'invalid or duplicate daily observation');
    dailyKeys.add(key);
    requireThat(['inbox', 'spam', 'promotion', 'sent'].every((k) => Number.isInteger(row[k]) && row[k] >= 0), 'invalid daily counts');
    requireThat(row.inbox + row.spam + row.promotion <= row.sent, 'invalid daily classifications');
    requireThat(Date.parse(row.date) + DAY <= Date.parse(s.observed_at), 'daily timeline must use complete UTC dates');
  }
  return s;
}

export function review(snapshot, config = defaults) {
  validateSnapshot(snapshot);
  requireThat(config.sequencer_workspace_id === snapshot.workspace_id, 'snapshot workspace does not match swap.md');
  const domains = snapshot.domains.map((d) => {
    const campaigns = snapshot.campaigns.filter((c) => d.memberships.includes(c.id));
    const lanes = [...new Set(campaigns.map((c) => c.lane).filter((l) => l !== 'unknown'))];
    const explicit = roles.find((role) => config[role + '_domains'].includes(d.domain));
    const classified = d.warmup ? d.warmup.inbox + d.warmup.spam + d.warmup.promotion : 0;
    const warmupRate = classified ? d.warmup.inbox / classified : null;
    const dnsAge = d.dns.checked_at ? (Date.parse(snapshot.observed_at) - Date.parse(d.dns.checked_at)) / DAY : null;
    const dnsFresh = dnsAge !== null && dnsAge >= 0 && dnsAge <= 1;
    const warmupFresh = Date.parse(snapshot.observed_at) - (Date.parse(snapshot.windows.warmup.end) + DAY) < DAY;
    const failedChecks = checks.filter((key) => d.dns[key] === false);
    const reasons = [];
    if (failedChecks.length) reasons.push('Provider DNS check failed: ' + failedChecks.join(', ') + '; investigate configuration');
    if (warmupRate !== null && classified >= config.warmup_min_results && warmupRate < config.warmup_threshold) reasons.push('Warmup below ' + pct(config.warmup_threshold));
    const senderRate = d.sent && d.sender_bounces !== null ? d.sender_bounces / d.sent : null;
    const bounceWindowMatches = days(snapshot.windows.sending.start, snapshot.windows.sending.end) === config.bounce_window_days;
    if (bounceWindowMatches && d.sent >= config.bounce_min_sends && senderRate !== null && senderRate >= config.bounce_threshold) reasons.push('Sender-side bounce threshold reached');
    const missing = !dnsFresh || !warmupFresh || checks.some((key) => d.dns[key] === null) || warmupRate === null || classified < config.warmup_min_results || d.esp === 'unknown';
    const health = failedChecks.length ? 'configuration review' : reasons.length ? 'recovery' : missing ? 'unverified' : 'healthy';
    const observedPool = explicit ?? (lanes.length > 1 ? 'mixed lanes' : lanes[0] ?? 'unassigned');
    const occupied = campaigns.some((c) => ['ACTIVE', 'DRAFT'].includes(c.status));
    const ready = explicit === 'standby' && health === 'healthy' && d.warmup_age_days !== null && d.warmup_age_days >= config.ready_days && d.membership_complete && !occupied && snapshot.coverage.complete;
    return { ...d, campaigns, warmupRate, classified, senderRate, bounceWindowMatches, dnsFresh, warmupFresh, health, reasons, observedPool, laneConflict: lanes.length > 1, explicit, ready, proposedPool: explicit ?? 'hold' };
  });
  // This is a domain-level planning scenario, never a live assignment or a ready pool.
  for (const esp of ['google', 'microsoft']) {
    const eligible = domains.filter((d) => d.esp === esp && d.health === 'healthy' && !d.explicit).sort((a, b) => a.domain.localeCompare(b.domain, 'en'));
    const spareCount = Math.ceil(eligible.length * config.standby_share);
    const catchallCount = Math.min(Math.ceil(eligible.length * config.catchall_share), eligible.length - spareCount);
    eligible.forEach((d, i) => { d.proposedPool = i < spareCount ? 'standby' : i < spareCount + catchallCount ? 'catchall' : 'primary'; });
  }
  const exposure = domains.filter((d) => d.memberships.length);
  const ready = domains.filter((d) => d.ready).reduce((n, d) => n + d.mailboxes, 0);
  const target = Math.ceil(exposure.reduce((n, d) => n + d.mailboxes, 0) * config.standby_share);
  return {
    snapshot, config, domains,
    totals: {
      mailboxes: domains.reduce((n, d) => n + d.mailboxes, 0),
      attention: domains.filter((d) => d.reasons.length).length,
      mixed: domains.filter((d) => d.laneConflict).length,
      ready, target, shortage: Math.max(0, target - ready),
    },
  };
}

function rows(r) {
  return r.domains.slice().sort((a, b) => (a.health === 'healthy') - (b.health === 'healthy') || a.domain.localeCompare(b.domain, 'en')).map((d) => [
    d.domain, d.mailboxes, d.health, checks.map((k) => k.toUpperCase() + ': ' + (d.dns[k] === null ? '?' : d.dns[k] ? 'pass' : 'fail')).join(' / '),
    pct(d.warmupRate), d.sent ?? 'unknown', d.sender_bounces ?? 'unknown', d.recipient_bounces ?? 'unknown', d.observedPool, d.proposedPool,
  ]);
}
const headers = ['Domain', 'Mailboxes', 'Health', 'DNS checks', 'Warmup inbox', 'Campaign sends', 'Sender bounces', 'Recipient bounces', 'Observed pool', 'Proposed pool'];

export function markdownReport(r) {
  const s = r.snapshot, t = r.totals;
  return [
    '# Fleet review', '',
    'Run: ' + s.run_id + ' · ' + reportStamp(s) + ' · ' + r.config.mode + ' · report only, no execution by this helper.', '',
    'Coverage: ' + s.coverage.description + ' (' + (s.coverage.complete ? 'complete' : 'partial; no verified fleet-wide standby count') + ').', '',
    'Warmup: ' + s.windows.warmup.start + ' to ' + s.windows.warmup.end + '. Sending: ' + s.windows.sending.start + ' to ' + s.windows.sending.end + '. All dates UTC.', '',
    t.mailboxes + ' mailboxes inspected · ' + t.attention + ' domains need attention · ' + t.mixed + ' domains shared between lanes.', '',
    systemMarkdown(r), '## Observed evidence and provisional mapping', '',
    '| ' + headers.join(' | ') + ' |', '| ' + headers.map(() => '---').join(' | ') + ' |',
    ...rows(r).map((row) => '| ' + row.map(md).join(' | ') + ' |'), '',
    '## Replacement rehearsal', '',
    'Verified standby mailboxes in inspected data: ' + t.ready + '. Covered-inventory reserve target: ' + t.target + '. Gap: ' + t.shortage + '.', '',
    'Proposed pools are a domain-count planning split, not deployed tags or verified standby capacity. Unknown warmup age, incomplete membership, or occupied drafts prevent readiness. No mailbox has been moved.', '',
    ...r.domains.filter((d) => d.reasons.length || d.notes).map((d) => '- ' + md(d.domain) + ': ' + md([...d.reasons, d.notes].filter(Boolean).join('. '))), '',
    '## Limits', '',
    'Current membership does not prove historical lane isolation. Warmup results do not prove campaign placement or causality. DNS checks are current configuration evidence, not historical message authentication. Counts apply only to this inspected subset.', '',
    'No order is placed. Refill numbers are a recommendation; unknown inventory can contain additional standbys. Pool targets are configurable planning assumptions.', '',
  ].join('\n');
}

function chart(s, threshold) {
  const grouped = new Map();
  for (const d of s.daily_warmup ?? []) {
    if (!grouped.has(d.domain)) grouped.set(d.domain, []);
    grouped.get(d.domain).push(d);
  }
  if (!grouped.size) return '<p>No daily observations supplied.</p>';
  return [...grouped].map(([domain, raw]) => {
    const data = raw.sort((a, b) => a.date.localeCompare(b.date));
    const start = Date.parse(data[0].date), end = Date.parse(data.at(-1).date);
    const x = (date) => 48 + (Date.parse(date) - start) / Math.max(DAY, end - start) * 790;
    const y = (rate) => 215 - rate * 170;
    const points = data.map((d) => ({ ...d, rate: d.inbox + d.spam + d.promotion ? d.inbox / (d.inbox + d.spam + d.promotion) : null }));
    const marks = points.filter((d) => d.rate !== null).map((d) => '<circle cx="' + x(d.date) + '" cy="' + y(d.rate) + '" r="4" fill="#156d67"><title>' + esc(d.date + ': ' + pct(d.rate) + '; ' + d.inbox + ' inbox, ' + d.spam + ' spam') + '</title></circle>').join('');
    // Draw only consecutive dates with known values; gaps are not interpolated.
    const segments = points.slice(1).map((d, i) => {
      const prev = points[i];
      return prev.rate !== null && d.rate !== null && Date.parse(d.date) - Date.parse(prev.date) === DAY ? '<line x1="' + x(prev.date) + '" y1="' + y(prev.rate) + '" x2="' + x(d.date) + '" y2="' + y(d.rate) + '" stroke="#156d67" stroke-width="2"/>' : '';
    }).join('');
    return '<figure><figcaption>' + esc(domain) + ' · daily warmup inbox rate</figcaption><svg viewBox="0 0 880 255" role="img" aria-label="' + esc(domain) + ' daily warmup inbox rate; dashed line is the policy threshold"><line x1="48" y1="' + y(threshold) + '" x2="838" y2="' + y(threshold) + '" stroke="#a36522" stroke-dasharray="5 5"/><text x="48" y="' + (y(threshold) - 9) + '">' + esc(pct(threshold)) + ' policy</text><text x="8" y="48">100%</text><text x="18" y="218">0%</text>' + segments + marks + '<text x="48" y="245">' + esc(data[0].date) + '</text><text x="838" y="245" text-anchor="end">' + esc(data.at(-1).date) + '</text></svg><details><summary>Daily evidence and counts</summary><table><thead><tr><th>Date UTC</th><th>Inbox</th><th>Spam</th><th>Unclassified</th><th>Inbox rate</th></tr></thead><tbody>' + points.map((d) => '<tr><td>' + esc(d.date) + '</td><td>' + d.inbox + '</td><td>' + d.spam + '</td><td>' + (d.sent - d.inbox - d.spam - d.promotion) + '</td><td>' + pct(d.rate) + '</td></tr>').join('') + '</tbody></table></details></figure>';
  }).join('');
}

export function htmlReport(r) {
  const s = r.snapshot, t = r.totals;
  const poolSummary = roles.map((role) => {
    const ds = r.domains.filter((d) => d.proposedPool === role);
    return '<tr><th>' + role + '</th><td>' + ds.length + '</td><td>' + count(ds.reduce((n, d) => n + d.mailboxes, 0)) + '</td><td>Proposed only</td></tr>';
  }).join('');
  const hold = r.domains.filter((d) => d.proposedPool === 'hold');
  const table = '<div class="table-wrap"><table><thead><tr>' + headers.map((h) => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' + rows(r).map((row) => '<tr>' + row.map((cell) => '<td>' + esc(cell) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  const css = 'body{font:16px/1.55 system-ui,sans-serif;color:#202b30;background:#fafaf7;margin:0}main{max-width:1160px;margin:auto;padding:40px 24px}h1{font-size:clamp(28px,5vw,46px);line-height:1.15;margin:10px 0 16px}h2{margin-top:38px;font-size:23px}h1{font-family:Georgia,serif;font-weight:500}.system-flow{display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin:24px 0;padding:18px 0;border-top:1px solid #dce2df;border-bottom:1px solid #dce2df}.system-flow div{flex:1;min-width:190px}.assumption{border-left:3px solid #a36522;padding-left:14px}p{max-width:88ch}small,.muted{color:#53636a}.label{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#156d67}.metrics{display:flex;gap:32px;flex-wrap:wrap;margin:28px 0}.metrics strong{display:block;font-size:34px;line-height:1.1}.metrics span{font-size:14px}table{border-collapse:collapse;width:100%;font-size:14px;text-align:left}th,td{padding:11px 12px;border-bottom:1px solid #dce2df;vertical-align:top}th{font-weight:600}td:first-child{overflow-wrap:anywhere}.table-wrap{overflow-x:auto}figure{margin:24px 0}figcaption{font-weight:600}svg{width:100%;height:auto;max-height:300px}svg text{font:13px system-ui;fill:#53636a}.flow{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:20px 0}.flow b{color:#156d67}li{margin-bottom:8px}summary{cursor:pointer;color:#156d67;padding:8px 0}a{color:#156d67}hr{border:0;border-top:1px solid #dce2df;margin:28px 0}@media(max-width:600px){main{padding:24px 14px}.metrics{gap:20px}th,td{padding:8px}svg text{font-size:15px}}@media print{body{background:white}main{padding:0}.table-wrap{overflow:visible}table{font-size:10px}th,td{padding:5px}details{display:block}}';
  const findings = r.domains.filter((d) => d.reasons.length || d.notes).map((d) => '<li><strong>' + esc(d.domain) + '</strong>: ' + esc([...d.reasons, d.notes].filter(Boolean).join('. ')) + '</li>').join('');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; base-uri \'none\'"><title>Fleet review · ' + esc(s.run_id) + '</title><style>' + css + '</style></head><body><main><div class="label">builders.ac / fleet review / ' + esc(r.config.mode) + '</div><h1>How the fleet protects the next campaign.</h1><p>' + esc(s.coverage.description) + '</p><p class="muted">Report ' + esc(reportStamp(s)) + ' · ' + esc(s.run_id) + '. ' + (s.coverage.complete ? 'Complete declared scope.' : 'Partial fleet coverage.') + ' Report only; the helper never changes campaigns.</p><div class="metrics"><div><strong>' + count(t.mailboxes) + '</strong><span>mailboxes inspected</span></div><div><strong>' + t.attention + '</strong><span>domains need attention</span></div><div><strong>' + t.mixed + '</strong><span>domains shared across lanes</span></div></div><div class="flow"><b>Observe</b><span>→</span><b>Classify</b><span>→</span><b>Plan pools</b><span>→</span><b>Rehearse replacement</b></div>' + systemHtml(r) + '<h2>03 / Evidence behind the scenario</h2><p>Warmup window: ' + esc(s.windows.warmup.start) + '–' + esc(s.windows.warmup.end) + '. Sending window: ' + esc(s.windows.sending.start) + '–' + esc(s.windows.sending.end) + '. Dates are UTC. The chart is daily performance; the health rule uses the weighted seven-day rate.</p>' + chart(s, r.config.warmup_threshold) + '<h2>04 / Domain evidence and proposed assignments</h2>' + table + '<h2>What the rules recommend</h2><ul>' + findings + '</ul><h2>A provisional pool map</h2><p>Healthy, unassigned domains are sorted by name within each ESP. ' + pct(r.config.standby_share) + ' are reserved for a hypothetical standby lane and ' + pct(r.config.catchall_share) + ' for catch-all; the remainder is primary. These are domain-count planning assumptions. Existing configured assignments are preserved. Infrastructure-group separation still needs verification.</p><table><thead><tr><th>Proposed pool</th><th>Domains</th><th>Mailboxes</th><th>Status</th></tr></thead><tbody>' + poolSummary + '<tr><th>Hold / investigate</th><td>' + hold.length + '</td><td>' + count(hold.reduce((n, d) => n + d.mailboxes, 0)) + '</td><td>Not allocated</td></tr></tbody></table><h2>Replacement rehearsal</h2><p><strong>' + t.ready + ' verified standby mailboxes</strong> in the inspected data. Reserve target for covered campaign inventory: ' + t.target + '; gap: ' + t.shortage + '. This is a requirement, not an order or a claim about the uninspected fleet.</p><p>A proposed standby domain is not yet usable. Verify its warming age, complete current membership, health, infrastructure group and designation before selecting exact replacement mailboxes. With no verified candidates, the honest result is a replacement requirement—not a fictional successful swap.</p><h2>Collaboration handoff</h2><p>Our side supplies the health rules, replacement requirements and report. Ali and Abbas connect their backup inventory and consume an ESP/lane/quantity refill requirement in their existing ordering and warmup workflow. That connection is proposed, not implemented.</p><h2>Limits and next step</h2><p>Current membership does not prove historical isolation. Warmup does not prove campaign placement or cause. Authentication checks describe current configuration, not historical message authentication. ' + esc(s.limitations ?? '') + '</p><p>Use this report to compare pool rules with the other team. All allocations are local recommendations; no email, ordering, DNS or sequencer changes were made by this helper.</p><hr><small>Open locally or print to PDF. No external assets, tracking or network calls.</small></main></body></html>\n';
}

export async function generateReport(directory) {
  const path = (file) => directory + '/' + file;
  const markdown = await readFile(path('swap.md'), 'utf8');
  const { config, frontmatter } = readConfig(markdown);
  const snapshot = JSON.parse(await readFile(path('snapshot.json'), 'utf8'));
  const result = review(snapshot, config);
  const history = await readFile(path('runs.csv'), 'utf8');
  const lines = history.trimEnd().split('\n');
  const row = [snapshot.run_id, snapshot.observed_at, config.mode, result.totals.mailboxes, result.totals.attention, result.totals.mixed, result.totals.ready].join(',');
  const filtered = lines.filter((line, i) => i === 0 || line.split(',')[0] !== snapshot.run_id);
  filtered.push(row);
  // Validate and render before changing any output. Re-rendering a run is idempotent.
  const html = htmlReport(result), body = markdownReport(result);
  await writeFile(path('report.html'), html);
  await writeFile(path('swap.md'), frontmatter + '\n' + body);
  await writeFile(path('runs.csv'), filtered.join('\n') + '\n');
  return result;
}
