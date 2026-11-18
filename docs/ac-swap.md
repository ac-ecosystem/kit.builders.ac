# ac-swap V0: understand the fleet and forecast a swap

Ask your agent to run ac-swap. It reads the selected sequencer workspace,
explains health and pool assignments, and forecasts replacement behavior.
V0 uses one manual-first workflow with no Slack integration or per-swap decision
queue. Scheduling is optional and created only when requested.

## The dashboard

Open `swap/dashboard.html`, or the saved public URL. It shows three pools,
campaign status, a domain health chart, searchable inventory and a step-through
swap simulation. Click a pool to filter inventory; click a domain for DNS and
warmup evidence. Supporting detail is expandable.

Each agent run reads MCP evidence, regenerates the dashboard and republishes the
same public URL: Claude Artifact in supported Claude clients, Site in Codex.
The browser reload button only reloads the published snapshot. See
[dashboard publishing](../.agents/skills/ac-swap/references/dashboard.md) for
identity, public data boundaries and clients without publishing tools.

The dashboard counts observed assignments. Shared senders remain visible in both
lanes, with an overlap warning. No provisional percentage allocation or assumed
standby capacity is added to observed inventory. A partial snapshot cannot prove
standby absence elsewhere. Campaign send/bounce totals are lifetime where captured;
domain counts use the displayed evidence windows.

`swap/report.md` remains the portable Mermaid simulation walkthrough.
`swap/report.html` is secondary diagnostic evidence and is not a public export.
Customer snapshots, private notes and mailbox addresses stay local.

A synthetic dashboard is in [examples/swap/dashboard.html](../examples/swap/dashboard.html).
Refresh it with:

~~~sh
node scripts/swap-workspace.mjs report --dir examples/swap
~~~

## Start a review

~~~sh
node scripts/swap-workspace.mjs init
~~~

The agent uses already authenticated PlusVibe MCP tools to collect a normalized
snapshot.json. builders.ac signals are optional; missing signals are disclosed.
Relevant completed/paused campaigns and upcoming drafts can be reviewed.

~~~sh
node scripts/swap-workspace.mjs report
node scripts/swap-workspace.mjs check
~~~

The helper has no network or execution calls. It validates the saved snapshot,
calculates health and preserves explicit/observed pool roles, then writes the dashboard and reports. Publication is a separate agent step.

## Pools and policy

Pool role and health state are independent. Passing DNS does not imply strong
warmup performance. A domain used in both lanes is an isolation finding; current
membership does not prove historical use. Domain separation does not establish
tenant/IP separation.

Use explicit Primary / Catch-all / Standby domain designations and observed campaign
lanes. Unmapped inventory stays unassigned. Percentage allocation has been removed.
Previously Catch-all domains and every mailbox on them are permanently excluded
from Primary, even after warming or recovery. Persist that history across runs.

The unit is one mailbox. Domain health is context, not permission to swap every
mailbox. The default signal rules are fresh DNS, a 90% seven-day warmup inbox rate,
and a 3% sender-side bounce cutoff over three complete UTC days. Each mailbox
needs ≥50 classified warmup results over the seven-day window and ≥50 sends over
the three-day window for the corresponding rule to evaluate. Insufficient data
leaves that assessment unverified; other checks can still be assessed.

A qualified standby needs individual evidence, explicit target lane and domain
standby designation, at least 15 known warming days, fresh passing health, nonzero
capacity and no campaign attachments of any status. Never count every mailbox on
a domain from one representative. Unknown Catch-all history blocks Primary use.
No rotation, cooldown, automatic return to sending or purchasing is implemented.

Read [the compact operating rules](../.agents/skills/ac-swap/references/rules.md)
for precise thresholds, failure behavior and the mailbox evidence contract.

## Forecast without live actions

A scenario selects one individually evidenced unhealthy mailbox and assumes a
qualified one-for-one replacement. Domain-only snapshots select no source. Show how that quantity would be consumed, what
campaign membership would change, how failures would stop detachment, and what
reserve gap would result. Forecast capacity from inherited limits, not mailbox
count alone. Do not invent replacement identities or claim recovery occurred.

The refill requirement is the natural integration point for a team that already
orders infrastructure and warms new backups. No order is placed by this kit.

## Local storage

| File | Purpose |
| --- | --- |
| swap.md | Settings, hosting identity and dashboard / walkthrough links |
| dashboard.html | Primary interactive dashboard; public allowlist only |
| report.md | Portable simulation walkthrough with Mermaid and state tables |
| snapshot.json | Minimal normalized evidence |
| report.html | System overview, pool map, scenarios and evidence |
| runs.csv | Summary history; rendering a run twice updates its row |
| actions.csv | Execution journal; empty for a read-only review |

All customer artifacts are Git-ignored. No database is created. Run summaries
are retained; detailed past snapshots/reports are not archived automatically.
An old proposals.csv workspace is preserved, not automatically rewritten; see
[the contract](../.agents/skills/ac-swap/references/swap-contract.md).

## Optional live mode and automation

Keep dry-run for a showcase. The separate live procedure remains documented for
future use: explicit user authorization, active campaign include list, designated
standbys, fresh mailbox-level checks, one executor and remote read-back. Neither
the report helper nor a proposed mapping enables live execution. Draft campaigns
are reviewed, never activated or automatically edited by the live swap loop.

After a successful manual review, an agent may offer a schedule. It creates one
only on an explicit request using the client's scheduling tool. A scheduler
without guaranteed single-run execution stays read-only.

## Verification

~~~sh
node --test scripts/swap-review.test.mjs
node scripts/validate-kit.mjs
~~~

Offline tests cover classification, incomplete/stale data, pool isolation,
forecast arithmetic, public export privacy, output escaping, Site identity checks and repeated refreshes. They do
not certify a production swap or future inbox placement.
