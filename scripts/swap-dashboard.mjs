import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readConfig, review } from './swap-review.mjs';
import { simulate } from './swap-simulation.mjs';
import { reportStamp } from './swap-scenarios.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicText = (v) => String(v ?? '').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted]');
const finite = (v) => Number.isFinite(v) && v >= 0 ? v : null;
const sum = (rows, key) => rows.reduce((n, d) => n + d[key], 0);

/** Public allowlist: no account/campaign IDs, mailbox addresses, raw notes or credentials. */
export function dashboardData(r) {
  const source = r.snapshot;
  const campaignKeys = new Map(source.campaigns.map((c, i) => [c.id, 'campaign-' + (i + 1)]));
  const domains = r.domains.map((d) => ({
    name: d.domain, esp: d.esp, mailboxes: d.mailboxes, health: d.health,
    warmupRate: d.warmupRate, warmupResults: d.classified,
    sent: d.sent, senderBounces: d.sender_bounces, recipientBounces: d.recipient_bounces,
    capacity: d.capacity_today, warmupAge: d.warmup_age_days,
    ready: d.ready, pool: d.explicit ?? null, lanes: [...new Set(d.campaigns.map((c) => c.lane).filter((l) => l !== 'unknown'))],
    overlap: d.laneConflict, campaigns: d.memberships.map((id) => campaignKeys.get(id)),
    dns: { spf: d.dns.spf, dkim: d.dns.dkim, dmarc: d.dns.dmarc, mx: d.dns.mx, fresh: d.dnsFresh },
    reasons: d.reasons.map(publicText),
    daily: (source.daily_warmup ?? []).filter((p) => p.domain === d.domain).map((p) => ({
      date: p.date, inbox: p.inbox, spam: p.spam, promotion: p.promotion, sent: p.sent,
    })),
  }));
  const campaigns = source.campaigns.map((c) => ({
    key: campaignKeys.get(c.id), name: publicText(c.name), lane: c.lane, status: c.status,
    laneSource: ['explicit', 'name'].includes(c.lane_source) ? c.lane_source : 'unverified',
    mailboxes: sum(domains.filter((d) => d.campaigns.includes(campaignKeys.get(c.id))), 'mailboxes'),
    domains: domains.filter((d) => d.campaigns.includes(campaignKeys.get(c.id))).map((d) => d.name),
    sent: finite(c.sent_count), bounces: finite(c.bounced_count),
  }));
  const pool = (role) => {
    const ds = domains.filter((d) => d.pool === role || (role !== 'standby' && d.lanes.includes(role)));
    return { domains: ds.length, mailboxes: sum(ds, 'mailboxes'), attention: sum(ds.filter((d) => d.reasons.length), 'mailboxes'), ready: sum(ds.filter((d) => d.ready), 'mailboxes') };
  };
  const scenario = (failure) => {
    const sim = simulate(r, { failVerification: failure });
    if (!sim) return null;
    return {
      domain: sim.source.domain, target: publicText(sim.campaign.name), status: sim.campaign.status,
      source: sim.replacements, initialStandby: sim.assumedStandbys, reserveTarget: sim.reserveTarget,
      refill: sim.refill, capacity: sim.capacityCeiling, success: sim.success,
      steps: sim.steps.map((s) => ({
        event: s.event, assigned: s.assigned, source: s.sourceAssigned, replacements: s.replacementAssigned,
        verified: s.verified, ready: s.ready, reserved: s.reserved, recovery: s.recovery, warming: s.warming, requested: s.requested,
      })),
    };
  };
  return {
    version: 1, title: 'Fleet Observatory', snapshotLabel: reportStamp(source),
    synthetic: source.evidence_kind === 'synthetic', complete: source.coverage.complete,
    windows: {
      warmup: { start: source.windows.warmup.start, end: source.windows.warmup.end },
      sending: { start: source.windows.sending.start, end: source.windows.sending.end },
    },
    policy: { warmupThreshold: r.config.warmup_threshold, readyDays: r.config.ready_days },
    totals: {
      domains: domains.length, mailboxes: sum(domains, 'mailboxes'),
      attention: domains.filter((d) => d.reasons.length).length,
      overlap: sum(domains.filter((d) => d.overlap), 'mailboxes'),
      unassigned: domains.filter((d) => !d.pool && !d.lanes.length).length,
      ready: sum(domains.filter((d) => d.ready), 'mailboxes'),
    },
    pools: { primary: pool('primary'), catchall: pool('catchall'), standby: pool('standby') },
    domains, campaigns, simulation: { success: scenario(false), failure: scenario(true) },
  };
}

export async function dashboardHtml(r) {
  const assets = resolve(root, 'assets/fleet-dashboard');
  const [template, css, js] = await Promise.all(['index.html', 'dashboard.css', 'dashboard.js'].map((f) => readFile(resolve(assets, f), 'utf8')));
  const json = JSON.stringify(dashboardData(r)).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return template.replace('/*DASHBOARD_CSS*/', () => css).replace('/*FLEET_DATA*/', () => 'window.FLEET_DATA=' + json + ';').replace('/*DASHBOARD_JS*/', () => js);
}

export async function dashboardDestination(siteDirectory, projectId) {
  if (!siteDirectory) return null;
  const manifest = JSON.parse(await readFile(resolve(siteDirectory, '.openai/hosting.json'), 'utf8'));
  if (!manifest.project_id || (projectId && manifest.project_id !== projectId) || manifest.static?.directory !== 'dist') {
    throw new Error('Dashboard Site identity or static directory does not match configuration');
  }
  return resolve(siteDirectory, 'dist/index.html');
}

export async function exportDashboard(directory, siteDirectory) {
  const snapshot = JSON.parse(await readFile(resolve(directory, 'snapshot.json'), 'utf8'));
  const { config } = readConfig(await readFile(resolve(directory, 'swap.md'), 'utf8'));
  const html = await dashboardHtml(review(snapshot, config));
  const destination = await dashboardDestination(siteDirectory ?? config.dashboard_site_directory, config.dashboard_project_id);
  await writeFile(resolve(directory, 'dashboard.html'), html);
  if (destination) {
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, html);
  }
  return resolve(directory, 'dashboard.html');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--dir', '--site-dir'].includes(args[i]) || !args[i + 1]) throw new Error('usage: node scripts/swap-dashboard.mjs [--dir swap] [--site-dir <path>]');
    options[args[i]] = args[i + 1];
  }
  console.log(await exportDashboard(resolve(root, options['--dir'] ?? 'swap'), options['--site-dir'] ? resolve(root, options['--site-dir']) : undefined));
}
