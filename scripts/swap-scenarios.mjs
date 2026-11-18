const escape = (value) => String(value ?? 'unknown').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function reportStamp(snapshot) {
  const date = snapshot.report_at ?? snapshot.observed_at;
  const day = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date));
  const time = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(date));
  return day + ', ' + time + ' ICT';
}

export function forecast(r) {
  const source = (r.mailboxes ?? []).filter((m) => m.replaceCandidate).sort((a, b) => a.id.localeCompare(b.id))[0];
  if (!source) return null;
  const replacements = 1;
  // Deliberately hypothetical stock, not inferred from the observed/proposed pool.
  const assumedStandbys = replacements * 2;
  const remaining = assumedStandbys - replacements;
  return {
    source, replacements, assumedStandbys, remaining,
    reserveTarget: assumedStandbys, refill: replacements,
    capacityCeiling: source.capacity_today,
    assumptions: 'Assume ' + assumedStandbys + ' verified ' + source.esp + ' standby mailboxes, at least ' + r.config.ready_days + ' days warmed, healthy DNS and warmup, outside campaign commitments and failing infrastructure. This stock is illustrative, not discovered inventory.',
  };
}

export function systemMarkdown(r) {
  const f = forecast(r);
  return [
    '## How the proposed system works', '',
    'PlusVibe evidence → DNS / warmup / bounce rules → pool and health classification → replacement forecast → reserve check → local report.', '',
    '| Pool / state | Purpose | Entry and exit |', '| --- | --- | --- |',
    '| A · Primary | Deliverable-lead campaigns | Healthy, designated inventory with verified no Catch-all domain history |',
    '| B · Catch-all | Isolate catch-all sending | Dedicated domains and verified independent infrastructure |',
    '| C · Standby | Replace a sender in either lane | Own health, warming age, explicit lane and no campaign commitments; one mailbox per swap |',
    '| Recovery | Keep poor-performing senders out of outreach | Re-evaluate evidence before returning; warmup continues only if already enabled |',
    '| Configuration review | Investigate failed authentication checks | Repair and verify; a provider flag alone does not prove root cause |', '',
    'The agent workflow and local review/report helper are implemented. Pool assignments are proposed. Sending, swapping, ordering and recovery outcomes in the following scenario are forecasts, not executed results.', '',
    ...(f ? ['## Scenario: ' + f.source.domain, '',
      'Observed: ' + f.source.mailboxes + ' mailboxes, seven-day warmup inbox ' + (f.source.warmupRate * 100).toFixed(2) + '%, ' + f.source.sent + ' account-level campaign sends and ' + f.source.sender_bounces + ' sender bounces in the stated window.', '',
      'Assumption: ' + f.assumptions, '',
      '1. Flag only the individual mailbox from its own fresh evidence.',
      '2. Recommend excluding these mailboxes from the next launch. A draft stays a draft; there is no executable live swap in this report.',
      '3. If used in an authorized active-campaign scenario, select ' + f.replacements + ' same-ESP replacements, attach and verify all required memberships, then detach and verify the source.',
      '4. If any attachment fails, keep the source attached and record the partial result; do not report a successful swap.',
      '5. Under the assumed stock, standby falls from ' + f.assumedStandbys + ' to ' + f.remaining + '. Reserve target ' + f.reserveTarget + ' gives a refill requirement of ' + f.refill + ' mailboxes. No order is placed.',
      '6. Move the source to recovery conceptually; healthy replacement counts do not guarantee restored inbox placement. Monitor subsequent evidence.', '',
      'Capacity: ' + (f.capacityCeiling === null ? 'unknown' : 'the source accounts expose a combined ceiling of ' + f.capacityCeiling + ' campaign sends/day') + '. Actual replacement capacity depends on inherited caps, ramp and other commitments.', ''] : []),
    '## Collaboration handoff', '',
    'builders.ac kit: collect and explain evidence, define replacement requirements and emit the local report. Customer team: map its existing backup inventory and receive an ESP/lane/quantity refill requirement through their own provisioning and warmup workflow. No new Slack app or database is needed for this demonstration.', '',
  ].join('\n');
}

export function systemHtml(r) {
  const f = forecast(r);
  const poolRows = [
    ['A · Primary', 'Deliverable leads', 'Healthy, designated primary domains', 'Receives qualified standbys; no catch-all mixing'],
    ['B · Catch-all', 'Catch-all leads', 'Dedicated domains / verified independent infrastructure', 'Keeps catch-all exposure separate from primary'],
    ['C · Standby', 'Replacement inventory', 'Known warmup age + passing health + no campaign commitments', 'Supplies replacements; refill returns here after warming'],
    ['Recovery', 'Poor-performing senders', 'Warmup or sender-health rule hit', 'Recheck before reuse; no automatic return from one good sample'],
    ['Configuration review', 'Authentication concerns', 'DNS check failed or sources disagree', 'Investigate and verify before reuse'],
  ];
  const table = '<div class="table-wrap"><table><thead><tr><th>Pool / health state</th><th>Purpose</th><th>Qualification</th><th>Expected behavior</th></tr></thead><tbody>' + poolRows.map((row) => '<tr>' + row.map((cell) => '<td>' + escape(cell) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  const overview = '<section id="system"><h2>01 / The system</h2><p>The kit combines PlusVibe evidence with operating rules, then produces a pool map and an action forecast. The agent workflow and review helper exist. No hosted swap service, live pool migration or replenishment order is demonstrated here.</p><div class="system-flow" aria-label="System flow"><div><b>PlusVibe</b><br>Inventory · campaigns · DNS · warmup · bounces</div><span aria-hidden="true">→</span><div><b>ac-swap rules</b><br>Qualify · isolate · match replacements</div><span aria-hidden="true">→</span><div><b>Run report</b><br>Evidence · proposed pools · forecast · refill requirement</div></div><h3>Pool role and health are separate</h3><p>A primary domain can enter recovery while retaining its intended lane. A standby is usable only after its age, health and availability are verified. Pool names below describe the proposed operating model; they are not deployed PlusVibe tags.</p>' + table + '</section>';
  if (!f) return overview;
  const draft = f.source.campaigns.filter((c) => c.status === 'DRAFT').map((c) => c.name).join('; ');
  const cases = [
    ['Detect', (f.source.warmupRate * 100).toFixed(2) + '% seven-day warmup inbox; ' + f.source.sender_bounces + ' recorded sender bounces', 'Flag the individual mailbox from its own health evidence, even when a bounce-only trigger stays quiet.'],
    ['Protect the next launch', draft || 'Current campaign assignments', 'Recommend excluding the affected ' + f.replacements + ' mailboxes before launch. No draft activation or membership edit is performed.'],
    ['Select', f.assumptions, 'Forecast ' + f.replacements + ' compatible replacements; reject unknown ages, shared failing infrastructure or already committed accounts.'],
    ['Verify before removing', 'Hypothetical authorized active-campaign execution', 'Attach replacements → verify every required attachment → remove source → verify final membership. A failure keeps the source attached; partial attachments are recorded.'],
    ['Recover and refill', 'Assumed standby: ' + f.assumedStandbys + ' → ' + f.remaining + '; reserve target: ' + f.reserveTarget, 'Keep the source out of outreach pending recovery evidence. Emit a ' + f.refill + '-mailbox refill requirement; ordering and warming remain future steps.'],
  ];
  const scenario = '<section id="scenario"><h2>02 / A real incident, forecast forward</h2><h3>' + escape(f.source.domain) + '</h3><p><strong>Observed:</strong> ' + f.replacements + ' mailboxes; ' + f.source.sent + ' account-level campaign sends in the stated window; warmup inbox rate ' + (f.source.warmupRate * 100).toFixed(2) + '%. DNS and campaign evidence appear below. The report does not attribute warmup deterioration to a particular campaign.</p><div class="system-flow" aria-label="Forecast pool transitions"><div><b>C · Standby</b><br>' + f.assumedStandbys + ' assumed → ' + f.remaining + ' remaining</div><span aria-hidden="true">→</span><div><b>A or B · Campaign lane</b><br>' + f.replacements + ' compatible replacements</div><span aria-hidden="true">→</span><div><b>Recovery</b><br>' + f.replacements + ' source mailboxes held out</div></div><p class="assumption"><strong>Forecast assumptions:</strong> ' + escape(f.assumptions) + ' No replacement was selected from a claimed live standby pool and no action was taken.</p><div class="table-wrap"><table><thead><tr><th>Step</th><th>Evidence or assumption</th><th>Expected behavior</th></tr></thead><tbody>' + cases.map((row) => '<tr>' + row.map((cell) => '<td>' + escape(cell) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div><p><strong>Capacity forecast:</strong> ' + (f.capacityCeiling === null ? 'source capacity is unknown' : 'source settings expose a combined ceiling of ' + f.capacityCeiling + ' campaign sends/day') + '. Replacement count is not a guarantee of identical immediate capacity; inherited limits, ramp and other commitments still apply. Improved deliverability is not forecast as a numerical guarantee.</p></section>';
  return overview + scenario;
}
