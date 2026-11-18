---
name: ac-swap
description: Review fleet health and propose pool assignments and mailbox replacements from sequencer evidence. Run manually or on an explicitly requested schedule, refresh a public fleet dashboard, and execute configured swaps only in explicit live mode. Use for DNS, warmup, bounce, standby and refill reviews.
---

# Review the fleet, then swap within the configured scope

One run collects evidence, classifies health, selects replacements and saves a
fleet dashboard and evidence report. There is no Slack connection, proposal queue or per-swap approval.
Start in dry-run; changing the skill does not authorize changes to a live account.

Read [the operating rules](references/rules.md) first: one mailbox per swap,
permanent Catch-all exclusion from Primary, 3% sender-side bounce threshold and
no rotation. Domain aggregates alone cannot select a mailbox.

Read [the contract](references/swap-contract.md) for pool rules, snapshot fields,
reporting and execution. For PlusVibe read [its mapping](references/plusvibe.md).
Use [builders.ac signals](references/deliverability.md) when its MCP is available.

## Boundaries

- Use only already authenticated MCP connections. Never configure connections,
  extract credentials or call vendor APIs directly.
- Never create, launch, pause, resume or delete a campaign, send email or start
  placement tests, purchase infrastructure, or deprovision a mailbox/domain.
- Dry-run forbids sequencer writes: no tag, warmup, ramp or membership changes.
  Publishing an authorized dashboard is separate from campaign execution.
- Live execution needs the user's explicit live authorization, a saved campaign
  include list and designated standby inventory. Keep configured client tool
  permissions intact. No additional approval loop is needed within that scope.
- An inferred pool assignment is a recommendation, never execution authorization.
- Public examples stay synthetic. Customer evidence stays in Git-ignored swap/.
  Save normalized observations and public IDs, never raw responses or secrets.
  Publish only the dashboard allowlist to the user-authorized audience; never
  publish the snapshot, mailbox addresses, credentials or private report HTML.

## Setup

1. Reuse the workspace named in this conversation or existing swap.md. Check it
   against the sequencer workspace list. If there is no unambiguous match,
   report the ambiguity without reading other customers' fleets.
2. Initialize with node scripts/swap-workspace.mjs init. An old workspace is
   recognized and left untouched; use the migration instructions in the contract.
3. Record workspace, campaign scope and pool assignments in swap.md. Defaults
   are dry-run and schedule: manual. Missing pool assignments do not block a
   review: preserve observed lanes and show unresolved inventory without allocating percentages.
4. If builders.ac MCP is available, verify its account before using its data.
   Otherwise continue with sequencer evidence and state which signals are absent.
5. Do not create an automation during setup by default. After a useful manual
   run, offer an optional schedule for this same run workflow. Create it only on
   an explicit scheduling request and only through the client's supported tool.
   Record cadence, timezone and automation ID only after creation succeeds.
   Without scheduling tools, keep manual mode; do not invent cron jobs.

## Run

1. Read configuration; verify the exact workspace. List parent campaigns in the
   configured scope, including recent completed/paused campaigns and upcoming
   drafts for review. Only active campaigns on live_campaign_include may be
   mutated. Label historical analytics and current membership separately.
2. Page all selected results using the live tool schema. Filter inventory by
   relevant tags or domains, then use bulk statistics for up to 100 IDs at a
   time. Do not load an unrestricted fleet into model context. If a page or
   signal fails, mark coverage incomplete; never replace missing data with zero.
3. Collect DNS health, seven complete UTC dates of warmup, bounce totals over the
   configured sending window, and current campaign membership. Preserve counts
   and source timestamps. A resolver/provider disagreement is a review finding,
   not a definitive root cause. Existing placement-test results are separate
   evidence; do not confuse them with warmup or start tests in this workflow.
4. Build the minimal snapshot.json specified in the contract. Include a daily
   warmup timeline when available. Collect the mailbox-level records in the
   contract before selecting a source or counting qualified standbys. Persist
   Catch-all domain history across runs; unknown history cannot qualify Primary. Resolve lane labels from explicit config
   first; campaign-name inference must be labeled. Missing lane = unknown.
5. Run node scripts/swap-workspace.mjs report. It refreshes dashboard.html
   (the primary view), report.md (Mermaid walkthrough), report.html and swap.md,
   and records one run summary in runs.csv. Re-rendering the same run must not
   duplicate history. The helper has no network calls or mutation capability.
6. Refresh the published dashboard on every run, including dry-run, following
   [dashboard publishing](references/dashboard.md). In Claude use a public Claude
   Artifact when supported; in Codex use a public Site. Reuse its saved identity
   and URL. Never claim a local file or private preview is public.
7. In dry-run, skip live execution. Show the dashboard link and key findings.
   Identify actual qualified standbys separately from hypothetical capacity. If none can be
   proven, show a replacement requirement and a clearly labeled rehearsal; do
   not claim a completed swap or restored delivery.
8. In authorized live mode, use the execution procedure in the contract. Recheck
   each mailbox, replacement, health and membership immediately before changes.
   Skip ambiguous or changed pairs; record failures rather than asking for a
   Slack decision. Resume unfinished actions before creating new ones.
9. Validate with node scripts/swap-workspace.mjs check. Finish with counts,
   evidence, proposed/completed actions, shortages and the report link. Update
   the run summary with actual outcomes; the report helper itself never executes.

A simple first showcase uses real deterioration, a configuration-only issue and
an isolation conflict. Keep the observed view and proposed allocation side by
side. Rehearsed replacements and hypothetical capacity are labeled throughout.

## Presentation

Use the dashboard first: Primary / Catch-all / Standby counts, campaign status,
one health chart and a step-through swap simulation. Use warm off-white, charcoal,
thin rules and a restrained accent; selected serif headings, readable controls,
flat sections. Put evidence and assumptions behind expandable details. Keep
observed inventory separate from assumed standby capacity. report.md remains a
portable Mermaid walkthrough; report.html is secondary diagnostic evidence.
