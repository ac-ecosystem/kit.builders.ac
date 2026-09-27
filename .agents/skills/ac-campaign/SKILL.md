---
name: ac-campaign
description: Prepare and review an outbound campaign from verified builders.ac run artifacts, then create it as an inactive draft through an already configured sequencer MCP when available. Use for campaign copy, personalization variables, sequence templates, sender planning, schedules, CSV generation, or remote campaign drafting. Never launch or send a campaign.
---

# Prepare a campaign draft

Turn the verified list and ready infrastructure in one existing run into a
reviewed sequence and one import-ready `campaign.csv`. When the matching
sequencer MCP is already available in this session, create and fully configure
an inactive remote draft. The user alone turns the campaign on.

## Resume and select the destination

Read [the run artifact contract](../../../docs/run-artifacts.md), then reuse the
matching run. Read `run.md`, `brief.md`, `prospecting.md`, `prospects.csv`, and
`infrastructure.md`. Do not create another directory, lead export, or script.

Discover builders.ac tools and call `me`. Use every page of
`listProviderAccounts` to identify the connected sequencer, provider workspace,
and validation state. Resolve ambiguity with the user; do not silently pick an
account. Read inbox and domain state to summarize active connected senders, but
do not change infrastructure or provider state.

Read [the campaign handoff contract](references/campaign-contract.md) before
writing either campaign artifact. Never ask the user to paste a provider API key,
Provisioning credential, mailbox credential, or password.

## Write the shared sequence

Use only rows from `prospects.csv` with `eligible=true`. Recheck duplicates, the
customer's own domains, known prior opt-outs, and every verification result.
Never include invalid, unknown, catch-all, or unverified rows.

Write `campaign.md` with:

- Connected provider and workspace observed through builders.ac.
- Eligible lead count, exclusions, and suitable connected sender inboxes.
- One shared subject/body template per step using explicit `{{placeholders}}`.
- Delays, timezone, sending window, daily limits, stop-on-reply, and unsubscribe
  behavior for the user to configure in the sequencer.
- The exact CSV-to-provider field mapping and any provider-specific import notes.

Keep the campaign structure shared. Put researched lead-specific material in the
CSV variables rather than writing an unrelated sequence for every row. A useful
default is a shared offer and CTA with per-lead `subject_angle` and
`personalization`. Every claim must be grounded in the saved prospect evidence;
never fabricate a trigger, metric, technology, or relationship.

## Create the launch handoff

Follow the fixed schema in the campaign handoff contract. Derive `campaign.csv`
from the eligible rows of `prospects.csv`; do not treat it as a second prospect
database. Preserve one row per intended recipient and add only the variables
used by `campaign.md`.

Render every template locally against every row before finalizing the file.
Refuse unresolved placeholders, blank required variables, duplicate emails,
ineligible rows, or values that would be interpreted as spreadsheet formulas.
Review a representative rendered sample in conversation without creating a
separate preview artifact.

Writing a non-empty, valid `campaign.csv` completes the local draft. Keep
`current_phase: campaign` while resolving the remote draft.

## Discover the sequencer MCP

Inspect the MCP servers and tools already available in this session. Match the
provider observed through builders.ac to an existing provider MCP such as
PlusVibe, Smartlead, Instantly, or EmailBison. Do not assume the server name;
inspect tool names, descriptions, and schemas for campaign creation, campaign
updates, lead import, sender assignment, and campaign status.

Do not add or edit MCP configuration, start a second agent session, call a
provider API directly, or obtain credentials. If no matching sequencer MCP is
already loaded and authenticated, do not attempt remote creation. Set `run.md`
to `status: blocked`, record that the matching sequencer MCP is unavailable, and
tell the user plainly that the campaign artifacts are ready but the remote
campaign could not be created in this session.

## Create an inactive remote draft

Create the remote campaign only through tools whose documented behavior keeps a
new campaign inactive or whose activation operation is clearly separate. Use
the reviewed `campaign.md` and `campaign.csv` as the exact source of truth:

1. Create the campaign as a draft, paused, or otherwise not-started campaign.
2. Read its status and stop if it is not explicitly inactive.
3. Configure the reviewed sequence, variables, schedule, limits, safeguards,
   and selected sender accounts without changing its inactive state.
4. Import only the eligible rows in `campaign.csv`, preserving the documented
   field mapping and personalization variables.
5. Read the campaign back and verify its status is still inactive, recipient
   count matches, sequence is present, and intended senders are assigned.

Never call an operation whose purpose is to activate, launch, start, or resume a
campaign, or to transmit a campaign, preview, or test email. Assigning sender
accounts to an inactive draft is allowed. If a provider combines creation and
activation in one operation, do not use it.

Record only the provider's public campaign ID, verified inactive status,
workspace, counts, selected senders, timestamp, and any incomplete setup in
`campaign.md`. Do not store raw tool responses or secrets. After successful
verification, update `run.md` to `status: ready_for_launch` and name manual
provider review and activation as the next action.

Report the two artifacts, remote campaign ID and status, recipient count,
provider/workspace, senders, and validation result. Stop with the campaign
inactive. Only the user may activate it.
