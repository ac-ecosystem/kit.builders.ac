---
name: ac-swap
description: Catch burned or spam-placed mailboxes in live sequencer campaigns and swap them for warmed standbys from a per-ESP pool, with a person approving every swap in Slack. Also keeps the standby pool topped up through intake and refill recommendations, and posts a weekly summary. Use to set up mailbox swapping, run a swap scan, placement test or decision check, review swap proposals, check pool runway, or post the weekly swap summary. Never launches, pauses, or creates campaigns, sends email, or deprovisions mailboxes.
---

# Swap burned mailboxes out of live campaigns

Find mailboxes that are hurting live campaigns, propose swapping them for Ready
standbys, and carry out only what an Approver accepted in Slack. Keep the
Standby pool above its floor by taking in new mailboxes and recommending refills
before the pool runs short.

Read [CONTEXT.md](../../../CONTEXT.md) for the terms used here: Standby, Ready
standby, Standby pool, Pool floor, Covered campaign, Flag, List-suspected
campaign, Swap proposal, Approver, Decision, Intake, Refill recommendation,
Swapped-out mailbox. [ADR 0001](../../../docs/adr/0001-swap-engine-as-kit-skill.md)
explains why this is a skill rather than a service.

## Hard rules

- Use only MCP connections that are already loaded and authenticated in this
  session: builders.ac, the customer's sequencer, and Slack. Never add or edit MCP
  configuration, ask for an API key, call a provider API directly, or handle a
  credential.
- Never create, activate, pause, resume, or delete a campaign. Never send email,
  preview email, or test email, except the seed sends of a placement test in
  `live` mode.
- Never deprovision, delete, or retire a mailbox or domain. Swapped-out mailboxes
  wait for a person's retirement decision.
- Move a mailbox only after a Decision approved exactly that move, and only
  after the dry-run re-check matches the proposal.
- In `dry-run` mode, make no sequencer writes at all: no tags, no ramp changes, no
  campaign membership changes, no placement tests.
- All state lives in the `swap/` workspace described below. Never store raw tool
  responses, secrets, or internal database IDs there.

## The swap workspace

Swap state is fleet-wide, so it lives in one Git-ignored `swap/` folder, not in a
campaign run. Create it with `node scripts/swap-workspace.mjs init` and validate it
with `node scripts/swap-workspace.mjs check` before reporting any mode complete.

```text
swap/
├── swap.md        # config (frontmatter) + dashboard
├── proposals.csv  # one row per Swap proposal
└── actions.csv    # one row per mailbox action (the audit trail)
```

The committed [example](../../../examples/swap/swap.md) shows every field filled in with
synthetic data. Keep the CSV headers exactly as the script writes them.

## Modes

Each run does exactly one mode. The customer schedules them in their own agent
client; a person can also ask for any mode by name.

| Mode | Default schedule | Purpose |
| --- | --- | --- |
| `setup` | once | Connect, configure and schedule (below) |
| `scan` | daily 07:00, client time zone | Flags, list guard, proposal, intake, refill check; weekly summary on Mondays |
| `placement` | Monday and Thursday 06:00 | Start placement tests (live mode only) |
| `decide` | every 2 hours, 08:00–20:00 | Read Decisions, expire, re-check, execute, collect placement results |

Start every mode the same way: read `swap.md`, confirm the sequencer workspace
still matches `sequencer_workspace_id`, verify the builders.ac account with `me`,
and confirm the Slack channel is reachable unless `approval_channel: chat`. A
failed sequencer check stops the run. A failed builders.ac check lets the run
continue on sequencer signals only, with the blocker recorded in `swap.md`. A
failed Slack check stops `decide` but lets `scan` write its proposal to the
dashboard.

Sequencer responses can be very large (a page of 100 mailboxes can be hundreds of
kilobytes). Use server-side filters, prefer the bulk statistics tools for wide
sweeps, and process large results from disk or in a subagent rather than reading
them inline. The sequencer reference names the cheap calls.

## Setup

Run setup when `swap/` does not exist or the user asks to reconfigure. Ask only
for what cannot be discovered, and write every answer into `swap.md` frontmatter.

1. **Connections.** Call builders.ac `me`. Find the customer's sequencer through
   builders.ac `listProviderAccounts`, then match an already loaded sequencer MCP
   by inspecting tool names and schemas. Read the matching reference, currently
   [PlusVibe](references/plusvibe.md), and [the swap contract](references/swap-contract.md).
   Without a matching sequencer MCP, stop: swapping cannot run.
2. **Workspace.** Resolve exactly one sequencer workspace. Ask when several match.
3. **Approvers (required, no default).** Ask the user who may approve swaps.
   Resolve each name to a Slack user through the Slack MCP and confirm the list
   back. Setup cannot finish without at least one Approver.
4. **Slack channel.** Ask for the channel where proposals go. Without a Slack MCP,
   record `approval_channel: chat`; proposals then wait in `swap.md` for a Decision
   typed into the agent conversation.
5. **Standby tag.** Ask for the customer's tag name (default `standby`). Create it
   if it does not exist, unless the mode is `dry-run`. If the sequencer has no tag
   tools, record `standby_mode: implicit` and ask for the exclusion list of
   mailboxes that must never be used as standbys.
6. **Coverage.** Record the exclusion list of campaigns. For the first live week,
   record a short include list instead.
7. **Thresholds.** Show the defaults below and record any changes.
8. **Schedule.** Offer to create the three schedules in the user's client. If the
   client has no scheduler, record `schedule: manual` and explain how to run each
   mode by hand.
9. **Mode.** Start in `mode: dry-run`. Only the user switches it to `live`.

Default thresholds (all in `swap.md`):

| Setting | Default |
| --- | --- |
| `ready_days` | 15 |
| `bounce_window_days` | 3 |
| `bounce_rate_threshold` | 0.045 |
| `bounce_min_sends` | 50 |
| `domain_bounce_rate_threshold` | 0.05 |
| `domain_bounce_min_sends` | 200 |
| `campaign_list_recipient_share` | 0.7 |
| `domain_flagged_mailboxes` | 2 |
| `list_suspected_share` | 0.5 |
| `placement_min_seeds` | 1 |
| `placement_max_senders` | 200 per test, rotating through the fleet |
| `pool_floor_share` | 0.10 |
| `ramp_target` | `inherit`: the promoted standby gets the flagged mailbox's `daily_limit` and interval |
| `ramp` | used when `ramp_target: fixed`, or when the inherited limit is above the ramp start: start 10/day, +2/day, cap 30, interval 15 min |
| `proposal_expiry_hours` | 24 |

## Scan

The bounce window is the `bounce_window_days` most recent UTC dates, today
included. Live mailboxes means unique mailboxes across all Covered campaigns.

1. **Inventory.** List Covered campaigns: active parent campaigns in the workspace,
   minus the exclusion list (or only the include list during the first live week).
   Skip subsequences and draft campaigns. Report, but do not cover, campaigns the
   sequencer auto-paused for bounces; treat them as List-suspected campaigns
   (step 3). For each Covered campaign, read its mailboxes and resolve each one's
   account ID, ESP and tags as the sequencer reference describes. Report any
   mailbox whose ESP is unclear instead of guessing.
2. **Bounce numbers.** Read per-mailbox totals over the window. Use the
   sequencer's sender-side bounce rate when it reports one, because recipient-side
   bounces point at the list; show both. Skip mailboxes that sent nothing. Never
   treat a missing number as zero.
3. **List guard.** Mark a campaign List-suspected when at least
   `list_suspected_share` of its mailboxes meet the bounce threshold, or when the
   campaign's own bounce rate meets `bounce_rate_threshold` and at least
   `campaign_list_recipient_share` of its bounces are recipient-side, or when the
   sequencer auto-paused it for bounces. Bounce flags on its mailboxes are not
   proposed; the campaign is listed separately with "check the lead list".
   Spam-placement and blacklist flags still count.
4. **Mailbox bounce flags.** Flag a mailbox when its bounce rate is at least
   `bounce_rate_threshold` with at least `bounce_min_sends` sends in the window.
5. **Domain bounce flags.** Add the window's sends and sender-side bounces of all
   covered mailboxes on each domain. Flag every covered mailbox on a domain whose
   combined rate is at least `domain_bounce_rate_threshold` with at least
   `domain_bounce_min_sends` sends. This catches fleets where each mailbox sends
   too little to judge on its own.
6. **Placement.** Use results the last `decide` run collected (see Decide). Flag a
   mailbox when at least `placement_min_seeds` seeds landed in spam.
7. **builders.ac domain health.** For domains builders.ac holds for this account,
   follow [deliverability.md](references/deliverability.md): flag every covered
   mailbox on a domain that is listed on a blacklist, or whose builders.ac domain
   bounce rate meets the domain threshold. Treat a null rate as unavailable.
8. **Domain rule.** Flag every covered mailbox on a domain with at least
   `domain_flagged_mailboxes` mailboxes flagged by steps 4–7. Bounce flags removed
   by the list guard do not count.
9. **Dedup.** Drop mailboxes already in a pending proposal.
10. **Proposal.** If anything is left, write one Swap proposal and post it as
    described in [slack-approval.md](references/slack-approval.md). Show the standby
    count per ESP, never named standbys. If a pool cannot cover its count, say so in
    the proposal.
11. **Intake.** Find new mailboxes on the intake domains listed in `swap.md` that are
    in no active campaign and carry neither the standby nor the swapped-out tag. In
    `live` mode, tag them, turn warmup on, and record the start date in
    `actions.csv`. In `dry-run`, list what would be taken in.
12. **Refill check.** For each ESP, compute runway (below) and post a Refill
    recommendation when needed.
13. **Weekly summary.** On Mondays, post the weekly summary (below).
14. Update the `swap.md` dashboard: last run, open proposals, pool status, runway,
    blockers, next action.

## Placement

In `dry-run` mode, do nothing and say so: starting a test sends real email.

In `live` mode, start one placement test covering every mailbox in a Covered
campaign plus Standbys that are about to become Ready, following the sequencer
reference. Use neutral test copy unless `placement_content: campaign` is set.
Record the test ID in the `swap.md` dashboard. Do not wait for results; the next
`decide` run collects them.

Cap each test at `placement_max_senders`, putting flagged and soon-to-be-Ready
mailboxes first and rotating through the rest across runs. If the sequencer's
placement allowance is tighter still, test one random mailbox per domain and, when
one lands in spam, test every mailbox on that domain in the next run.

## Decide

1. **Collect placement results** for any test recorded in the dashboard that has
   finished. Store per-mailbox inbox and spam counts in the dashboard for the next
   scan. Spam results also produce a proposal immediately, using Scan steps 6 and
   8–10. A sender with no result is "no result", never "no spam".
2. **Read Decisions** for every pending proposal, following
   [slack-approval.md](references/slack-approval.md).
3. **Expire** pending proposals older than `proposal_expiry_hours`. Mark them
   `expired` and say so in the thread.
4. **Dry-run re-check** each approved proposal. Build the exact action list: which
   mailbox leaves which campaign, how many standbys from which pool. Confirm that
   every flagged mailbox is still in the same campaigns and the pool still has
   enough Ready standbys. If anything differs, execute nothing, post the new action
   list in the thread, and ask for a fresh Decision.
5. **Execute** (live mode only) as described below. In `dry-run`, record the
   Decision, post "dry run: nothing changed", and stop.
6. **Report** the outcome in the thread and update both CSVs and the dashboard.

## Executing a swap

For each approved flagged mailbox, oldest flag first:

1. Take the oldest Ready standby from the same ESP's pool that is not on the same
   domain as any flagged mailbox in the proposal.
2. Read the standby's account settings, then set its sending limits: with
   `ramp_target: inherit`, use the flagged mailbox's `daily_limit` and interval,
   ramping from the `ramp` start only when that limit is higher than the start;
   with `ramp_target: fixed`, use `ramp`. Keep the fields the sequencer requires
   unchanged. A promoted standby must never send more than the mailbox it replaces.
3. Attach the standby to every Covered campaign the flagged mailbox is in.
4. Read each campaign's mailbox list back and confirm the standby is present.
5. Detach the flagged mailbox from those campaigns. If it is on a campaign through
   a tag, remove that tag from the mailbox instead.
6. Remove the standby tag from the promoted mailbox. Add the swapped-out tag to the
   flagged mailbox. Leave its warmup on.

If step 3 or 4 fails, leave the flagged mailbox in place, mark that pair `failed`
with the reason, and continue with the next mailbox. If the pool runs out, stop
swapping, mark the rest `skipped: pool empty`, and ask for a Decision on them.

Before every call, check whether the step is already done (already attached,
already detached, tag already gone) and skip it if so. Write one `actions.csv` row
per step with a stable idempotency key `<proposal_id>:<mailbox>:<step>:<campaign or ->`,
so a crashed run resumes without repeating work.

A proposal is `executed` when every approved mailbox was swapped and verified, and
`failed` when at least one pair failed or was skipped.

## Pool runway and refills

- Pool size for an ESP = Ready standbys + Standbys still warming.
- Pool floor = `pool_floor_share` × live mailboxes on that ESP.
- Daily burn = swaps carried out for that ESP over the last 30 days ÷ 30.
- Runway = days until Ready standbys fall to the floor at that burn. With no burn,
  runway is "n/a (no swaps in 30 days)".
- Lead time = `ready_days` + 2 days to provision.

Post a Refill recommendation when the pool is already below its floor, or will
fall below it within the lead time. Size it to bring the pool back to the floor
plus 30 days of burn (with no burn: floor minus Ready standbys). If warmed
mailboxes already sit outside every active campaign, say "tag existing" with their
count before suggesting an order. Record each recommendation as one `refill` row in
`actions.csv` with key `refill:<esp>:<UTC date>` and an empty proposal ID.

In `dry-run` the standby tag may not exist yet, so the pool reads as empty. Also
report how many warmed mailboxes outside every active campaign could become
Standbys per ESP, and label the recommendation "tag existing" rather than "order". For mailboxes builders.ac supplies, round up to the domain
totals [ac-infra](../ac-infra/SKILL.md) supports and include a proposed plan (for
example `foo.com 50→75`); the user runs `ac-infra` to carry it out. For other
suppliers, state the count to request. Do not repost while a recommendation for
that ESP is still open in the dashboard.

## Weekly summary

Every Monday, the `scan` run posts one message drawn from the swap files and the
dashboard, split by ESP:

- Flags by reason (bounce, spam placement, blacklist, domain rule).
- Swaps executed, failed, rejected (with reasons) and expired.
- List-suspected campaigns.
- Pool size, runway and any open Refill recommendation.
- Swapped-out mailboxes waiting for a retirement decision.

Do not compare or rank suppliers.

## Demo support

`swap.md` may list `demo_force_flag` mailboxes. They are treated as flagged with
reason `demo` only while `demo: true` is set, and are ignored in every other run.
They count toward the domain rule (Scan step 8) like a flag from steps 4–7. The
demo uses a campaign a person created, with zero leads or only internal test
recipients; this skill never creates one.
