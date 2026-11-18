# Fleet review and execution contract

Read [operating rules](rules.md) for the confirmed policy. Swaps are one mailbox
per pair; domain summaries are diagnostic context. No rotation is implemented.

## Local workspace

One Git-ignored swap/ directory contains exactly:
- swap.md: JSON-compatible YAML settings and a link to the walkthrough.
- dashboard.html: primary interactive public-export view (generated on each report).
- report.md: portable simulation walkthrough with Mermaid diagrams and state tables.
- snapshot.json: normalized latest observations, never raw provider responses.
- report.html: standalone report; open locally or print to PDF. No external assets.
- runs.csv: one summary per run ID. Rendering the same run updates its row.
- actions.csv: execution journal. Reports do not create execution records.

Use node scripts/swap-workspace.mjs init|report|check. Existing legacy workspaces
are never overwritten. To migrate one, preserve the entire old folder under
.kit/swap-legacy-<timestamp>/, initialize a new swap/, carry over non-secret
settings and inventory, and start in dry-run. Retain the old journal for auditing;
do not reinterpret old proposals as current execution authority.

The report is a deterministic review helper, not a scheduler or a swap daemon.
The agent collects data and (only when authorized) executes through MCP.

## Snapshot schema

Read examples/swap/snapshot.json from the repository root for a complete synthetic
example. All dates are UTC. The required shape is:

~~~json
{
  "version": 1,
  "run_id": "review-20261117-001",
  "workspace_id": "ws_example_0001",
  "observed_at": "2026-11-17T08:00:00Z",
  "coverage": {"complete": false, "description": "Selected campaigns and recovery domains"},
  "windows": {
    "warmup": {"start": "2026-11-10", "end": "2026-11-16"},
    "sending": {"start": "2026-11-14", "end": "2026-11-16"}
  },
  "campaigns": [{"id": "campaign-example", "name": "Example primary", "lane": "primary", "status": "DRAFT"}],
  "domains": [{
    "domain": "example-sender.com",
    "esp": "microsoft",
    "mailboxes": 50,
    "memberships": ["campaign-example"],
    "membership_complete": false,
    "sent": 100,
    "sender_bounces": 0,
    "recipient_bounces": 1,
    "capacity_today": 100,
    "warmup_age_days": null,
    "warmup": {"inbox": 2700, "spam": 750, "promotion": 0, "sent": 3500},
    "dns": {"spf": true, "dkim": true, "dmarc": true, "mx": true, "checked_at": "2026-11-17T08:00:00Z", "source": "sequencer health check"},
    "notes": "Optional evidence or source discrepancy"
  }],
  "daily_warmup": [{"domain": "example-sender.com", "date": "2026-11-16", "inbox": 375, "spam": 116, "promotion": 0, "sent": 500}],
  "limitations": "Optional context"
}
~~~

Use null for unavailable counters or warmup, and null for unknown DNS checks,
never zero or false. A domain's minimum known mailbox warming age may populate
warmup_age_days only if every mailbox's age is known. Seven-day results cannot
prove 15 days of warming. Set membership_complete only after checking all current
campaign memberships relevant to exclusion. Set coverage.complete only for a
complete declared scope; a selected subset cannot establish fleet-wide standby
absence. Preserve data failure and scope limits in the description and notes.

### Individual mailbox records

An optional `mailboxes` array permits per-mailbox review. Each row has `id`,
`email`, `domain`, `memberships`, `membership_complete`, `sent`, `sender_bounces`,
`recipient_bounces`, `capacity_today`, `warmup_age_days`, `warmup`, and `dns` with
exactly the same count/null rules as a domain row. It also has `ever_catchall`
(true / false / null) and `standby_for` (primary / catchall / unknown). Keep these
private. Parent domain memberships are the union of mailbox memberships; never
substitute the domain union for an individual mailbox's memberships. Partial
mailbox samples cannot establish full availability. Include campaign
`assigned_mailboxes` only after an exact membership read; the simulator requires
this count and never derives a baseline from domain membership unions. The synthetic fixture includes
one affected mailbox and one qualified standby as examples.

Without individual evidence, review domain findings but select no source mailbox
and count no verified standbys. Before execution also verify failure-infrastructure
separation. The helpers do not implement provider mutation or locking.

Warmup inbox rate = inbox / (inbox + spam + promotion). Show unclassified
sends separately. Require at least warmup_min_results classified results for the evaluated record
(default 50), seven complete UTC dates, and a window ending yesterday UTC.
DNS results must be within 24 hours of observed_at. These are configurable policy
assumptions, not proof of campaign placement. The sending window must match
bounce_window_days before applying a bounce threshold; longer retrospective
windows are context only. The default sender-side bounce cutoff is inclusive at 3% with at least 3
sender-side bounce events in the same three-day window. No minimum-send floor
applies; one or two events above 3% are warnings only. It does not imply a
hard-bounce-only classification. Recipient bounces alone are not a sender-recovery flag.

## Pool mapping without an existing mapping

Pool role and health state are separate. Roles: primary, catchall, standby,
unassigned/mixed. States: healthy, recovery, configuration review, unverified.
The report does not invent resting cycles; show rest only with provider evidence.

1. Explicit primary_domains, catchall_domains and standby_domains in swap.md win.
   These arrays contain domain names, not provider tags.
2. For the observed view, infer lane membership from the reviewed campaign mapping.
   Label name-based campaign mapping as inferred. Membership in both lanes is a
   conflict, not an automatic choice of one. Current assignments are not history.
3. Preserve explicit roles and captured campaign lanes. Unmapped inventory stays
   unassigned; never redistribute it using percentages. Persist Catch-all history
   in catchall_history_domains; no mailbox on a previously Catch-all domain may
   enter Primary. Unknown history blocks Primary qualification.
4. Never assign two roles to one domain. Same-domain separation alone does not
   prove tenant/IP independence; report missing infrastructure grouping.
5. Verified standby capacity needs explicit designation, sufficient known age,
   fresh passing DNS and warmup health, complete scope/membership evidence and no
   campaign attachment of any status. Readiness is per mailbox, not per domain. A proposed pool never becomes a verified standby
   pool automatically. Exact mailbox eligibility is rechecked at execution.

Without verified standbys, report the gap and rehearse the steps using a stated
hypothetical one-mailbox pair. No fake mailbox identities or successful swap
claims are needed. Report replacement needs from individually flagged mailboxes. Refill consumed
standbys one-for-one; do not infer purchase quantities from a fleet percentage.
Refill recommendations do not place orders. Existing pool inventory must be
verified before making a purchase recommendation.

## Authorized live execution

No per-swap approval or Slack is involved. The user explicitly enables live mode
and configures active campaign IDs and standby domains. Inferred pool proposals,
old decisions and dry-run results never enable live mode. Uncertain signals,
incomplete inventory, membership conflicts or insufficient replacements stop
the affected pair. The report-only helper does not validate all mailbox-level
eligibility; the agent must do that here.

No eligible spare means skip and report a shortage. An attach failure leaves the
source attached; the operator handles any urgent sending stop. No rotation occurs.

Use one non-overlapping executor. If an earlier run is unfinished, resume its
journal before allocating any standby. Schedules without guaranteed single-run
execution must remain read-only.

For each flagged mailbox, oldest flag first:
1. For bounce-triggered sources, inspect per-inbox failure diagnostics. Skip
   unresolved classification and recipient-address failures. Apply the list guard: predominantly recipient-side campaign bounces point at
   the list, not automatic sender replacement. DNS and warmup findings remain
   independently visible. Only current, in-scope active memberships are mutable.
2. Select the oldest eligible, unused standby from the same ESP and compatible
   lane, outside all flagged domains and known shared failing infrastructure.
   Verify every mailbox's own warmup/age/DNS, full memberships and current limits.
3. Persist a planned journal row with exact source, standby and campaign IDs
   before mutation. Reuse the same source-to-standby assignment on resume. Never
   allocate one standby twice.
4. Preserve recovery state and inherit sending limits/intervals without exceeding
   the source mailbox's capacity. Ramp only if the inherited cap allows it.
   A 2/day source must not be raised to a default 10/day ramp. Reject invalid caps.
5. Attach the replacement to every included campaign. Read back all attachments.
   If any attach/verification fails, do not detach the source. Mark the pair
   failed and retain its partial replacement attachments in the journal.
6. Detach the source, then verify absence and replacement presence. Tag-based
   detachment can affect other campaigns: inspect and include its complete impact;
   skip if it would change an excluded, draft, paused or completed campaign.
7. Remove the replacement's standby tag if present, tag the source swapped-out
   and leave its warmup unchanged. Do not claim it left every campaign if
   memberships remain outside scope. Recheck and record each operation.

Journal key: <run_id>:<source>:<step>:<campaign or ->. Update the existing planned
row to done/failed rather than appending duplicate keys. On restart inspect remote
state before retrying any ambiguous operation. Do not select a second replacement
for a partially completed pair. Dry-run plans are not executable journals.
The action validator checks structure, not remote outcomes; only MCP read-back
can establish successful execution.
