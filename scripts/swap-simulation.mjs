import { forecast, reportStamp } from './swap-scenarios.mjs';

const clean = (value) => String(value ?? 'unknown').replace(/[\r\n|<>"\x60]/g, ' ');
const rate = (n) => n === null ? 'unknown' : (100 * n).toFixed(2) + '%';

/** Execute a local count-based state model. No provider calls or executable journal. */
export function simulate(r, { failVerification = false } = {}) {
  const f = forecast(r);
  if (!f) return null;
  const campaign = f.source.campaigns.find((c) => c.status === 'ACTIVE') ?? f.source.campaigns.find((c) => c.status === 'DRAFT');
  if (!campaign || !Number.isInteger(campaign.assigned_mailboxes) || campaign.assigned_mailboxes < 1) return null;
  const baseline = campaign.assigned_mailboxes;
  const state = { assigned: baseline, sourceAssigned: f.replacements, replacementAssigned: 0, verified: 0, ready: f.assumedStandbys, reserved: 0, recovery: 0, warming: 0, requested: 0 };
  const steps = [];
  const record = (event) => steps.push({ event, ...state });
  record('Start');
  record('Detect health breach');
  state.reserved = f.replacements;
  state.ready -= f.replacements;
  state.replacementAssigned = f.replacements;
  state.assigned += state.replacementAssigned;
  record('Reserve and attach replacements');
  if (failVerification) {
    record('Verification failed — source stays attached');
    return { ...f, campaign, baseline, steps, state: { ...state }, success: false };
  }
  state.verified = state.replacementAssigned;
  record('Verify all replacement attachments');
  if (state.verified !== f.replacements) throw new Error('Cannot remove source before full verification');
  state.assigned -= state.sourceAssigned;
  state.recovery += state.sourceAssigned;
  state.sourceAssigned = 0;
  state.reserved = 0;
  record('Remove source; verify final membership');
  state.requested = Math.max(0, f.reserveTarget - state.ready);
  record('Emit refill requirement');
  const requested = state.requested;
  state.warming = requested;
  state.requested = 0;
  record('Assume external provisioning completes');
  state.ready += state.warming;
  state.warming = 0;
  record('Assume warming age and health gates pass');
  return { ...f, campaign, baseline, steps, state: { ...state }, success: true };
}

export function poolDiagram(r) {
  const sim = simulate(r);
  if (!sim) return 'flowchart LR\n  Evidence["No qualifying incident in the supplied data"]';
  return [
    'flowchart LR',
    '  C["C · Standby\\n' + sim.assumedStandbys + ' ready — assumed"]',
    '  A["A · Primary\\nDeliverable leads"]',
    '  B["B · Catch-all\\nSeparate domains and infrastructure"]',
    '  R["Recovery\\n' + sim.replacements + ' affected source mailboxes"]',
    '  W["Provision and warm\\n' + sim.refill + ' requested — simulated"]',
    '  C -->|"Match ESP and lane"| A',
    '  C -->|"Match ESP and lane"| B',
    '  A -->|"Health breach"| R',
    '  B -->|"Health breach"| R',
    '  A -.->|"Reserve shortage"| W',
    '  W -->|"Age and health gates pass"| C',
  ].join('\n');
}

export function sequenceDiagram(r) {
  const sim = simulate(r);
  if (!sim) return 'sequenceDiagram\n  participant Model\n  Note over Model: No qualifying incident';
  return [
    'sequenceDiagram',
    '  participant M as Local simulation',
    '  participant C as Standby pool',
    '  participant P as Campaign membership copy',
    '  participant W as Replenishment model',
    '  Note over M,W: All operations below are simulated; one mailbox pair',
    '  M->>C: Reserve ' + sim.replacements + ' compatible mailboxes',
    '  C-->>M: ' + sim.assumedStandbys + ' ready becomes ' + sim.remaining + ' ready plus ' + sim.replacements + ' reserved',
    '  M->>P: Attach replacements (' + sim.baseline + ' becomes ' + (sim.baseline + sim.replacements) + ')',
    '  M->>P: Verify every replacement',
    '  alt All replacements verified',
    '    M->>P: Remove ' + sim.replacements + ' source mailboxes',
    '    P-->>M: ' + sim.baseline + ' assigned - source in recovery',
    '    M->>W: Request ' + sim.refill + ' mailboxes to restore reserve',
    '  else Any verification fails',
    '    Note over M,P: Keep source attached and record partial attachments',
    '  end',
  ].join('\n');
}

export function simulationMarkdown(r) {
  const sim = simulate(r);
  if (!sim) return '# Swap simulation\n\n' + reportStamp(r.snapshot) + '\n\nNo qualifying mailbox incident is present in this snapshot. Individual mailbox evidence and an exact observed campaign assignment count are required. No replacement scenario was invented.\n';
  const stateRows = sim.steps.map((st) => '| ' + clean(st.event) + ' | ' + st.assigned + ' | ' + st.sourceAssigned + ' | ' + st.ready + ' | ' + st.reserved + ' | ' + st.recovery + ' | ' + st.warming + ' |');
  const fail = simulate(r, { failVerification: true });
  const dns = ['spf', 'dkim', 'dmarc', 'mx'].map((key) => key.toUpperCase() + ' ' + (sim.source.dns[key] === true ? 'pass' : sim.source.dns[key] === false ? 'failed check' : 'unknown')).join('; ');
  return [
    '# Simulating one mailbox replacement', '',
    '**' + reportStamp(r.snapshot) + '** · ' + clean(sim.source.domain), '',
    '**' + (r.snapshot.evidence_kind === 'synthetic' ? 'Synthetic fixture' : 'Real PlusVibe observations') + ' → executed local simulation → expected outcome. No live changes.**', '',
    '## 1. Start with the incident', '',
    '| Observed input | Value |', '| --- | --- |',
    '| Selected mailbox (private) | ' + clean(sim.source.email) + ' · ' + clean(sim.source.id) + ' |',
    '| Source domain | ' + clean(sim.source.domain) + ' · ' + sim.replacements + ' ' + clean(sim.source.esp) + ' mailboxes |',
    '| Actual sending in the inspected window | ' + sim.source.sent + ' workspace-level account sends; ' + sim.source.sender_bounces + ' sender / ' + sim.source.recipient_bounces + ' recipient bounces |',
    '| Authentication check | ' + dns + ' |',
    '| Weighted seven-day warmup inbox rate | ' + rate(sim.source.warmupRate) + ' · policy minimum ' + rate(r.config.warmup_threshold) + ' |',
    '| Target membership copy | ' + clean(sim.campaign.name) + ' · ' + sim.campaign.status + ' · ' + sim.baseline + ' assigned mailboxes |', '',
    'Sending window: ' + r.snapshot.windows.sending.start + '–' + r.snapshot.windows.sending.end + '; warmup: ' + r.snapshot.windows.warmup.start + '–' + r.snapshot.windows.warmup.end + '. Dates UTC. Sends are not attributed to a campaign from membership alone.', '',
    'No individual mailbox daily timeline was captured; domain charts remain context only.', '',
    '**Model decision:** replace only the selected mailbox based on its own fresh evidence. Its domain peers are not automatically selected. The draft remains a draft.', '',
    '## 2. Define only the pools this scenario needs', '',
    '~~~mermaid', poolDiagram(r), '~~~', '',
    'A and B are separate campaign lanes. C supplies qualified replacements. Recovery holds affected senders. These roles are the proposed model, not deployed pool tags.', '',
    '**Simulation assumptions:** ' + sim.assumedStandbys + ' ready standbys; same ESP; compatible lane; at least ' + r.config.ready_days + ' days warmed; passing health; no campaign commitments; independent of the failing infrastructure. The model assumes the source is fully replaced in the one target campaign copy. It does not change other memberships.', '',
    '## 3. Execute the local membership model', '',
    '~~~mermaid', sequenceDiagram(r), '~~~', '',
    '| Local step | Assigned to target | Source still assigned | Standby ready | Reserved | Recovery | Warming |',
    '| --- | --- | --- | --- | --- | --- | --- |', ...stateRows, '',
    'The temporary ' + (sim.baseline + sim.replacements) + ' assignment count is not extra sending capacity. In the model, all replacements are verified before the source is removed. Source settings expose ' + (sim.capacityCeiling ?? 'unknown') + ' sends/day; equivalent replacement settings are an assumption, not a delivery forecast.', '',
    '## 4. Check the failure path', '',
    'A second run attaches ' + fail.state.replacementAssigned + ' replacement in the model, then deliberately fails read-back verification. The model keeps all ' + fail.state.sourceAssigned + ' source mailboxes attached, records ' + fail.state.reserved + ' reservations, and reports **no completed swap**. Partial attachments remain visible for reconciliation; they are not silently retried with different backups.', '',
    '## 5. Forecast replenishment', '',
    '| Calculation | Result |', '| --- | --- |',
    '| Reserve policy | Restore the illustrative starting stock of ' + sim.assumedStandbys + ' mailboxes |',
    '| After replacing the source | ' + sim.assumedStandbys + ' − ' + sim.replacements + ' = ' + sim.remaining + ' ready standbys |',
    '| Refill request | max(0, ' + sim.reserveTarget + ' − ' + sim.remaining + ') = **' + sim.refill + ' mailboxes** |',
    '| Conditional return | If external provisioning supplies ' + sim.refill + ' and all pass age/health gates, ready inventory becomes ' + sim.state.ready + ' |', '',
    'No order is placed. Warming takes at least ' + r.config.ready_days + ' days after warmup starts; provisioning time is additional. The recovery group is not automatically returned to sending.', '',
    '## 6. Questions for the joint engineering session', '',
    '- Pilot: verify one mailbox replacement and an interrupted operation against provider read-back.',
    '- Eligibility: how should ESP, campaign lane and shared tenant/IP constrain replacement matching?',
    '- Handoff: can the backup workflow accept a provider/lane/quantity request and return order, warming and ready states?', '',
    '> Scope: this is a local count-based simulation backed by the stated observations. Standby stock, replacement qualification and future procurement/health outcomes are assumed. It does not prove production execution, historical pool isolation, causality or improved inbox placement.', '',
  ].join('\n').replace(/~~~mermaid/g, '\x60\x60\x60mermaid').replace(/^~~~$/gm, '\x60\x60\x60');
}
