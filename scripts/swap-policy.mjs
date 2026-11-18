// Pure policy helpers. No provider calls, reservations or live mutations.
const DAY = 86400000;
const checks = ['spf', 'dkim', 'dmarc', 'mx'];
export function assessSignals(record, snapshot, config) {
  const classified = record.warmup ? record.warmup.inbox + record.warmup.spam + record.warmup.promotion : 0;
  const warmupRate = classified ? record.warmup.inbox / classified : null;
  const observedDay = new Date(snapshot.observed_at).toISOString().slice(0, 10);
  const yesterday = new Date(Date.parse(observedDay) - DAY).toISOString().slice(0, 10);
  const dnsAge = record.dns.checked_at ? Date.parse(snapshot.observed_at) - Date.parse(record.dns.checked_at) : null;
  const dnsFresh = dnsAge !== null && dnsAge >= 0 && dnsAge <= DAY;
  const warmupFresh = snapshot.windows.warmup.end === yesterday;
  const sendingFresh = snapshot.windows.sending.end === yesterday;
  const failedChecks = checks.filter((key) => record.dns[key] === false);
  const reasons = [], historicalFindings = [];
  if (failedChecks.length) (dnsFresh ? reasons : historicalFindings).push('Provider DNS check failed: ' + failedChecks.join(', ') + '; investigate configuration');
  if (warmupRate !== null && classified >= config.warmup_min_results && warmupRate < config.warmup_threshold) {
    (warmupFresh ? reasons : historicalFindings).push('Warmup below ' + (config.warmup_threshold * 100).toFixed(1) + '%');
  }
  const senderRate = record.sent && record.sender_bounces !== null ? record.sender_bounces / record.sent : null;
  const bounceWindowMatches = (Date.parse(snapshot.windows.sending.end) - Date.parse(snapshot.windows.sending.start)) / DAY + 1 === config.bounce_window_days;
  if (bounceWindowMatches && record.sent >= config.bounce_min_sends && senderRate !== null && senderRate >= config.bounce_threshold) {
    (sendingFresh ? reasons : historicalFindings).push('Sender-side bounce threshold reached');
  }
  const bounceEvaluable = sendingFresh && bounceWindowMatches && record.sent >= config.bounce_min_sends && senderRate !== null;
  const missing = !dnsFresh || !warmupFresh || checks.some((key) => record.dns[key] === null) || warmupRate === null || classified < config.warmup_min_results || record.esp === 'unknown';
  const health = dnsFresh && failedChecks.length ? 'configuration review' : reasons.length ? 'recovery' : missing ? 'unverified' : 'healthy';
  return { classified, warmupRate, dnsFresh, warmupFresh, sendingFresh, senderRate, bounceWindowMatches, bounceEvaluable, health, reasons, historicalFindings };
}

export function reviewMailboxes(snapshot, config, domains) {
  // Domain-level history is deliberately sticky across sibling mailboxes.
  const catchallDomains = new Set(config.catchall_history_domains ?? []);
  for (const d of domains) if (d.campaigns.some((c) => c.lane === 'catchall') || d.explicit === 'catchall') catchallDomains.add(d.domain);
  for (const m of snapshot.mailboxes ?? []) if (m.ever_catchall === true) catchallDomains.add(m.domain);
  return (snapshot.mailboxes ?? []).map((m) => {
    const domain = domains.find((d) => d.domain === m.domain);
    const campaigns = snapshot.campaigns.filter((c) => m.memberships.includes(c.id));
    const lanes = [...new Set(campaigns.map((c) => c.lane))];
    const lane = lanes.length === 1 ? lanes[0] : lanes.length ? 'mixed' : m.standby_for;
    const laneConflict = lanes.length > 1 || (domain.explicit === 'primary' && lanes.includes('catchall')) || (domain.explicit === 'catchall' && lanes.includes('primary'));
    const everCatchall = catchallDomains.has(m.domain) ? true : m.ever_catchall;
    const primaryEligible = everCatchall === false;
    const signals = assessSignals({ ...m, esp: domain.esp }, snapshot, config);
    const ready = domain.explicit === 'standby' && m.memberships.length === 0 && m.membership_complete && snapshot.coverage.complete && !domain.laneConflict && !laneConflict &&
      ['primary', 'catchall'].includes(m.standby_for) && (m.standby_for !== 'primary' || primaryEligible) && signals.health === 'healthy' &&
      m.warmup_age_days !== null && m.warmup_age_days >= config.ready_days && m.capacity_today !== null && m.capacity_today > 0;
    const replaceCandidate = signals.health === 'recovery' && m.membership_complete && snapshot.coverage.complete && !laneConflict &&
      ['primary', 'catchall'].includes(lane) && (lane !== 'primary' || primaryEligible) && campaigns.some((c) => ['ACTIVE', 'DRAFT'].includes(c.status));
    const eligibilityReasons = [];
    if (domain.explicit !== 'standby') eligibilityReasons.push('Domain not designated standby');
    if (m.memberships.length) eligibilityReasons.push('Campaign commitment must be removed and verified before standby use');
    if (laneConflict || domain.laneConflict) eligibilityReasons.push('Conflicting lane assignments');
    if (m.standby_for === 'primary' && !primaryEligible) eligibilityReasons.push('Primary requires verified no Catch-all history across the domain');
    if (!m.membership_complete || !snapshot.coverage.complete) eligibilityReasons.push('Incomplete availability evidence');
    if (signals.health !== 'healthy') eligibilityReasons.push('Mailbox health not qualified');
    if (m.warmup_age_days === null || m.warmup_age_days < config.ready_days) eligibilityReasons.push('Warming age not qualified');
    if (!m.capacity_today) eligibilityReasons.push('No verified sending capacity');
    if (!['primary', 'catchall'].includes(m.standby_for)) eligibilityReasons.push('Standby target lane unknown');
    return { ...m, ...signals, eligibilityReasons, esp: domain.esp, mailboxes: 1, campaigns, lane, laneConflict, everCatchall, primaryEligible, ready, replaceCandidate };
  });
}
