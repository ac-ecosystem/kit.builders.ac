---
name: ac-campaign
description: Prepare and review a provider-neutral outbound campaign handoff from verified builders.ac run artifacts. Use for campaign copy, personalization variables, sequence templates, sender planning, schedules, or a sequencer-importable campaign CSV. This skill never imports, sends, creates, or activates a remote campaign.
---

# Prepare a campaign handoff

Turn the verified list and ready infrastructure in one existing run into a
reviewed sequence and one import-ready `campaign.csv`. Stop at the handoff. The
user imports the CSV and turns the campaign on in their sequencer.

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
writing either campaign artifact. This workflow does not need a provider API key,
Provisioning credential, mailbox credential, or direct provider API call.

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

Writing a non-empty, valid `campaign.csv` is the handoff marker. Update `run.md`
to `status: ready_for_launch`, keep `current_phase: campaign`, and name manual
sequencer import and activation as the next action. It does not mean anything was
sent or changed remotely.

## Stop at the boundary

Do not upload leads, create a draft campaign, attach senders, send tests or
previews, call a provider API, or activate anything. Report the two handoff files,
recipient count, provider/workspace, planned senders, and validation result. The
user owns the import, final provider preview, and launch.
