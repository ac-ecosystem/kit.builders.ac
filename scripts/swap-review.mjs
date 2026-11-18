import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { assessSignals, reviewMailboxes } from './swap-policy.mjs';
import { simulationMarkdown } from './swap-simulation.mjs';
import { reportStamp, systemHtml } from './swap-scenarios.mjs';

const DAY = 86400000;
const checks = ['spf', 'dkim', 'dmarc', 'mx'];
const roles = ['primary', 'catchall', 'standby'];
const esc = (v) => String(v ?? 'unknown').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pct = (n) => n === null ? 'unknown' : (n * 100).toFixed(1) + '%';
const count = (n) => Number(n).toLocaleString('en-US');
const validTime = (v) => typeof v === 'string' && Number.isFinite(Date.parse(v));
const days = (a, b) => (Date.parse(b) - Date.parse(a)) / DAY + 1;
function requireThat(ok, message) { if (!ok) throw new Error(message); }

export const defaults = {
  mode: 'dry-run', schedule: 'manual', ready_days: 15, warmup_threshold: 0.9,
  warmup_min_results: 50, bounce_window_days: 3, bounce_threshold: 0.03,
  bounce_min_sends: 50,
  primary_domains: [], catchall_domains: [], standby_domains: [], catchall_history_domains: [], live_campaign_include: [],
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
  for (const key of ['warmup_threshold', 'bounce_threshold']) {
    requireThat(Number.isFinite(config[key]) && config[key] >= 0 && config[key] <= 1, key + ' must be between 0 and 1');
  }
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
  requireThat(Array.isArray(config.catchall_history_domains) && config.catchall_history_domains.every((d) => typeof d === 'string' && d === d.toLowerCase()), 'invalid catchall history');
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
    requireThat(c.assigned_mailboxes === undefined || (Number.isInteger(c.assigned_mailboxes) && c.assigned_mailboxes >= 0), 'invalid campaign assignment count');
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
  if (s.mailboxes !== undefined) {
    requireThat(Array.isArray(s.mailboxes), 'mailboxes must be an array');
    const ids = new Set(), addresses = new Set(), perDomain = new Map();
    for (const m of s.mailboxes) {
      requireThat(typeof m.id === 'string' && m.id.length > 0 && !ids.has(m.id), 'duplicate or invalid mailbox ID');
      requireThat(typeof m.email === 'string' && m.email === m.email.toLowerCase() && m.email.split('@').length === 2 && m.email.indexOf('@') > 0 && m.email.endsWith('@' + m.domain) && !addresses.has(m.email), 'invalid or duplicate mailbox address');
      requireThat(domainNames.has(m.domain), 'mailbox domain not in snapshot');
      requireThat([true, false, null].includes(m.ever_catchall), 'mailbox catchall history must be true, false or null');
      requireThat(['primary', 'catchall', 'unknown'].includes(m.standby_for), 'invalid standby lane');
      const domain = s.domains.find((d) => d.domain === m.domain);
      requireThat(Array.isArray(m.memberships) && m.memberships.every((id) => domain.memberships.includes(id)), 'mailbox membership missing from domain summary');
      ids.add(m.id); addresses.add(m.email);
      perDomain.set(m.domain, (perDomain.get(m.domain) ?? 0) + 1);
      requireThat(perDomain.get(m.domain) <= domain.mailboxes, 'mailbox evidence exceeds domain inventory');
      validateSnapshot({ ...s, domains: [{ ...m, esp: domain.esp, mailboxes: 1 }], mailboxes: undefined, daily_warmup: [] });
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
    const signals = assessSignals(d, snapshot, config);
    const observedPool = explicit ?? (lanes.length > 1 ? 'mixed lanes' : lanes[0] ?? 'unassigned');
    // Ready counts require individual mailbox evidence below, never domain averages.
    return { ...d, ...signals, campaigns, observedPool, laneConflict: lanes.length > 1, explicit, ready: false, readyMailboxes: 0, proposedPool: explicit ?? (lanes.length === 1 ? lanes[0] : 'hold') };
  });
  const mailboxes = reviewMailboxes(snapshot, config, domains);
  for (const d of domains) {
    d.readyMailboxes = mailboxes.filter((m) => m.domain === d.domain && m.ready).length;
    d.ready = d.readyMailboxes === d.mailboxes;
  }
  const ready = mailboxes.filter((m) => m.ready).length;
  const sources = mailboxes.filter((m) => m.replaceCandidate);
  const groups = [...new Set(sources.map((m) => m.esp + ':' + m.lane))];
  const replacementNeeds = groups.map((key) => {
    const [esp, lane] = key.split(':');
    const required = sources.filter((m) => m.esp === esp && m.lane === lane).length;
    const available = mailboxes.filter((m) => m.ready && m.esp === esp && m.standby_for === lane && !sources.some((source) => source.domain === m.domain)).length;
    return { esp, lane, required, available, shortage: Math.max(0, required - available) };
  });
  const target = sources.length;
  return {
    snapshot, config, domains, mailboxes, replacementNeeds,
    catchallHistory: [...new Set([...(config.catchall_history_domains ?? []), ...config.catchall_domains, ...domains.filter((d) => d.campaigns.some((c) => c.lane === 'catchall')).map((d) => d.domain), ...(snapshot.mailboxes ?? []).filter((m) => m.ever_catchall === true).map((m) => m.domain)])].sort(),
    totals: {
      mailboxes: domains.reduce((n, d) => n + d.mailboxes, 0),
      attention: domains.filter((d) => d.reasons.length).length,
      mixed: domains.filter((d) => d.laneConflict).length,
      ready, target, shortage: replacementNeeds.reduce((n, group) => n + group.shortage, 0),
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
  return simulationMarkdown(r);
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
  const findings = r.domains.filter((d) => d.reasons.length || d.historicalFindings.length || d.notes).map((d) => '<li><strong>' + esc(d.domain) + '</strong>: ' + esc([...d.reasons, ...d.historicalFindings.map((finding) => 'Historical only: ' + finding), d.notes].filter(Boolean).join('. ')) + '</li>').join('');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; base-uri \'none\'"><title>Fleet review · ' + esc(s.run_id) + '</title><style>' + css + '</style></head><body><main><div class="label">builders.ac / fleet review / ' + esc(r.config.mode) + '</div><h1>How the fleet protects the next campaign.</h1><p>' + esc(s.coverage.description) + '</p><p class="muted">Report ' + esc(reportStamp(s)) + ' · ' + esc(s.run_id) + '. ' + (s.coverage.complete ? 'Complete declared scope.' : 'Partial fleet coverage.') + ' Report only; the helper never changes campaigns.</p><div class="metrics"><div><strong>' + count(t.mailboxes) + '</strong><span>mailboxes inspected</span></div><div><strong>' + t.attention + '</strong><span>domains need attention</span></div><div><strong>' + t.mixed + '</strong><span>domains shared across lanes</span></div></div><div class="flow"><b>Observe</b><span>→</span><b>Classify</b><span>→</span><b>Plan pools</b><span>→</span><b>Rehearse replacement</b></div>' + systemHtml(r) + '<h2>03 / Evidence behind the scenario</h2><p>Warmup window: ' + esc(s.windows.warmup.start) + '–' + esc(s.windows.warmup.end) + '. Sending window: ' + esc(s.windows.sending.start) + '–' + esc(s.windows.sending.end) + '. Dates are UTC. The chart is daily performance; the health rule uses the weighted seven-day rate.</p>' + chart(s, r.config.warmup_threshold) + '<h2>04 / Domain evidence and proposed assignments</h2>' + table + '<h2>What the rules recommend</h2><ul>' + findings + '</ul><h2>Explicit pool assignments</h2><p>Pool roles come from configuration and captured campaign lanes. No percentage-based reassignment occurs. Ready counts require individual mailbox evidence; domain averages are context only. Catch-all sending history permanently excludes the domain and all its mailboxes from Primary.</p><table><thead><tr><th>Proposed pool</th><th>Domains</th><th>Mailboxes</th><th>Status</th></tr></thead><tbody>' + poolSummary + '<tr><th>Hold / investigate</th><td>' + hold.length + '</td><td>' + count(hold.reduce((n, d) => n + d.mailboxes, 0)) + '</td><td>Not allocated</td></tr></tbody></table><h2>Replacement rehearsal</h2><p><strong>' + t.ready + ' verified standby mailboxes</strong> in the inspected data. Mailbox replacement candidates in the inspected evidence: ' + t.target + '; gap: ' + t.shortage + '. This is a requirement, not an order or a claim about the uninspected fleet.</p><p>A proposed standby domain is not yet usable. Verify its warming age, complete current membership, health, infrastructure group and designation before selecting exact replacement mailboxes. With no verified candidates, the honest result is a replacement requirement—not a fictional successful swap.</p><h2>Collaboration handoff</h2><p>Our side supplies the health rules, replacement requirements and report. The customer team connects its backup inventory and consume an ESP/lane/quantity refill requirement in their existing ordering and warmup workflow. That connection is proposed, not implemented.</p><h2>Limits and next step</h2><p>Current membership does not prove historical isolation. Warmup does not prove campaign placement or cause. Authentication checks describe current configuration, not historical message authentication. ' + esc(s.limitations ?? '') + '</p><p>Use this report to compare pool rules with the other team. All allocations are local recommendations; no email, ordering, DNS or sequencer changes were made by this helper.</p><hr><small>Open locally or print to PDF. No external assets, tracking or network calls.</small></main></body></html>\n';
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
  const { dashboardHtml, dashboardDestination } = await import('./swap-dashboard.mjs');
  const dashboard = await dashboardHtml(result);
  if (config.dashboard_site_directory && !config.dashboard_project_id) throw new Error('Dashboard Site needs dashboard_project_id');
  const destination = await dashboardDestination(config.dashboard_site_directory, config.dashboard_project_id);
  await writeFile(path('report.html'), html);
  await writeFile(path('dashboard.html'), dashboard);
  if (destination) {
    await mkdir(config.dashboard_site_directory + '/dist', { recursive: true });
    await writeFile(destination, dashboard);
  }
  await writeFile(path('report.md'), body);
  const historyLine = 'catchall_history_domains: ' + JSON.stringify(result.catchallHistory);
  const nextFrontmatter = /^catchall_history_domains:/m.test(frontmatter) ? frontmatter.replace(/^catchall_history_domains:.*$/m, () => historyLine) : frontmatter.replace(/\n---\s*$/, '\n' + historyLine + '\n---\n');
  await writeFile(path('swap.md'), nextFrontmatter + '\n# Fleet review\n\nRun ' + snapshot.run_id + '. Open [the fleet dashboard](dashboard.html). Read [the simulation walkthrough](report.md).\n');
  await writeFile(path('runs.csv'), filtered.join('\n') + '\n');
  return result;
}
