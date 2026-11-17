# ac-swap V0: understand the fleet and forecast a swap

Ask your agent to run ac-swap. It reads the selected sequencer workspace,
explains health and pool assignments, and forecasts replacement behavior.
V0 uses one manual-first workflow with no Slack integration or per-swap decision
queue. Scheduling is optional and created only when requested.

## The report

Open swap/report.md in a Mermaid-capable Markdown viewer. It walks through one
local simulation using observed health and campaign membership, with explicit
standby assumptions, model state transitions and a deliberate verification-failure
branch. swap/report.html remains a secondary fleet diagnostic view.

The report explains:
1. The system: PlusVibe evidence → health rules → pool assignments → replacement
   forecast → replenishment requirement.
2. Pool A (primary), Pool B (catch-all), Pool C (standby), plus recovery and
   configuration-review states.
3. One concrete incident using observed metrics and clearly stated assumptions.
4. A daily warmup timeline, domain evidence table and provisional pool counts.
5. Expected attach/verify/detach behavior, failure handling, capacity limits and
   refill demand. No successful execution or deliverability improvement is implied.

Real observations, inferred lanes, proposed mappings and hypothetical inventory
are labeled separately. A run can be useful without known standbys or permission
to mutate anything. The report is designed for a joint engineering discussion.

A synthetic version is in [examples/swap](../examples/swap/swap.md). Generate or
refresh it with:

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
calculates health and a deterministic planning split, then writes the report.

## Pools and policy

Pool role and health state are independent. Passing DNS does not imply strong
warmup performance. A domain used in both lanes is an isolation finding; current
membership does not prove historical use. Domain separation does not establish
tenant/IP separation.

With no supplied map, the helper can demonstrate a proposed allocation within
each ESP. It sorts healthy domains by name, allocates 10% of domains to standby
and 20% to catch-all (rounded up), and leaves the remainder primary. These are
editable planning assumptions, not optimized or deployed assignments. Explicit
assignments in swap.md take precedence.

Default health rules are at least 90% inbox among classified warmup outcomes
over seven complete UTC dates, with at least 200 domain outcomes; fresh DNS checks;
and 5% sender bounces over three days with at least 200 sends. Recipient-side
bounces are investigated as list issues. These policies need operational tuning.

A verified standby also requires explicit designation, at least 15 known days of
warming and complete availability evidence. Unverified candidates remain visible.
A proposed standby pool is not counted as a verified pool.

## Forecast without live actions

A scenario can use a real unhealthy domain and assume a stated quantity of
verified replacement mailboxes. Show how that quantity would be consumed, what
campaign membership would change, how failures would stop detachment, and what
reserve gap would result. Forecast capacity from inherited limits, not mailbox
count alone. Do not invent replacement identities or claim recovery occurred.

The refill requirement is the natural integration point for a team that already
orders infrastructure and warms new backups. No order is placed by this kit.

## Local storage

| File | Purpose |
| --- | --- |
| swap.md | Settings and a link to the walkthrough |
| report.md | Primary simulation walkthrough with Mermaid and state tables |
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
forecast arithmetic, output escaping and repeated report generation. They do
not certify a production swap or future inbox placement.
