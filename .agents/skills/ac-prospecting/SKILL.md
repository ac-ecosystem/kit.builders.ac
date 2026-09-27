---
name: ac-prospecting
description: Build and verify a campaign-ready B2B prospect list from a confirmed builders.ac targeting brief using Treg. Use for lead sourcing, contact enrichment, email discovery, verification, list expansion, or resuming a prospecting run.
---

# Build a verified prospect list

Turn a confirmed offer and audience into a traceable list of real companies and
people. Start small, verify every address, and expand only after the sample and
spend are understood. This skill does not provision infrastructure or launch a
campaign.

## Resume the run

Read [the run artifact contract](../../../docs/run-artifacts.md). List existing
runs before creating one and reuse the matching campaign idea. Initialize a new
run only when necessary. Read its `run.md` and `brief.md`; if the offer or target
is unresolved, use [ac-getting-started](../ac-getting-started/SKILL.md) first.

Check Treg authentication with a read-only command. If unavailable, follow the
Treg section of [connections.md](../ac-getting-started/references/connections.md).
Never request a provider key in chat or choose an internal/shared team for the
user.

Read [the Treg prospecting contract](references/treg.md) before paid calls. Use
live catalog discovery and endpoint schemas as the authority; catalog entries,
prices, provider availability, and response shapes can change.

## Source and verify

1. Translate the confirmed brief into explicit company filters, role filters,
   geography, exclusions, and evidence required to call a row a match. Record
   this plan in `prospecting.md` without inventing companies or contacts.
2. Discover candidate company and people-search tools. Inspect their current
   schemas, cost, recency, and miss behavior. Prefer connected team credentials
   when appropriate; do not assume one vendor can answer the whole brief.
3. State the sample size, maximum expected spend, and what a useful sample will
   decide. Obtain the user's decision before a paid call when the conversation
   has not already authorized that spend. Start with a small sample rather than
   purchasing the full requested list.
4. Normalize and deduplicate candidates by company domain and then by person and
   email. Keep source and source-check time. Reject rows that fail the confirmed
   company or role criteria before paying to enrich them further.
5. Show the sample with fit evidence and important data gaps. Expand only after
   the sample supports the idea or the user chooses a revised target.
6. Discover email or enrich contacts only for retained candidates. Verify every
   address independently unless the serving endpoint supplies current, explicit
   verification evidence. A confidence score, inferred pattern, or directory row
   is not verification.
7. Classify each row conservatively as `valid`, `invalid`, `catch_all`,
   `unknown`, or `unverified`. Set `eligible=true` only for addresses the user has
   agreed may enter the campaign; invalid, unknown, catch-all, and unverified
   addresses default to ineligible.

Write every candidate to the canonical `prospects.csv` header. Summarize queries,
providers, observed costs, source recency, counts by verification state, rejection
reasons, and remaining uncertainty in `prospecting.md`. Do not save raw Treg
responses. Update `run.md` after the sample decision and final verification.

## Completion

Before reporting completion, validate the run workspace. Report total candidates,
eligible rows, rejected rows, uncertain rows, actual observed spend, and the exact
file the campaign phase should read. Name rejected rows and reasons through the
canonical CSV rather than hiding them in a count. A sourced list is not a verified
list, and a verified list is not authorization to launch a campaign.
