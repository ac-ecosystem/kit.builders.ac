# ac-swap guide

`ac-swap` keeps live cold-email campaigns on healthy mailboxes. It watches every
mailbox in your active campaigns. When a mailbox starts bouncing, lands in spam or
sits on a blacklisted domain, it proposes a swap in Slack. After one of your
Approvers replies `approve`, it takes those mailboxes out of their campaigns and
puts warmed standbys from your pool in their place. It also keeps the pool topped
up and posts a weekly summary.

It runs inside your own coding agent (Claude Code, Codex and others) through MCP
connections you have already signed in to. Nothing is hosted, and no keys are
stored in this kit. [ADR 0001](adr/0001-swap-engine-as-kit-skill.md) explains why.

> **Video walkthrough:** _coming with the live demo_ (unlisted YouTube link and
> release download will be added here).

<!-- screenshot: 00-overview.gif — short loop of proposal → approve → swap result -->

## What it does and does not do

| It does | It never does |
| --- | --- |
| Flag mailboxes with sustained bounces, spam placement or a blacklisted domain | Create, launch, pause or delete a campaign |
| Post a swap proposal to Slack and wait for an Approver | Send email (except placement-test seeds in live mode) |
| Move flagged mailboxes out of campaigns and Ready standbys in | Deprovision or delete mailboxes or domains |
| Tag and warm new mailboxes into the standby pool | Ask for an API key or change your MCP settings |
| Recommend when to order more mailboxes | Rank or compare mailbox suppliers |

It starts in **dry-run** mode: it shows exactly what it would do and changes
nothing until you switch it to `live`.

## Words used here

The full glossary is in [CONTEXT.md](../CONTEXT.md). The short version:

- **Standby**: a warmed mailbox kept out of all active campaigns, marked with your
  standby tag.
- **Ready standby**: a Standby that has warmed for at least 15 days.
- **Standby pool**: all Standbys for one ESP (Google or Microsoft).
- **Flag**: a rule hit that makes a mailbox a swap candidate.
- **Swap proposal**: the batch of flagged mailboxes waiting for your Decision.
- **Approver**: someone you named who may decide proposals.

## Before you start

You need, connected and signed in inside the same agent session:

1. **builders.ac MCP**: already set up by this kit (`/mcp` in Claude Code).
2. **Your sequencer's MCP**: PlusVibe in V0. `ac-swap` uses only a connection you
   added yourself.
3. **Slack MCP** (recommended): for proposals and approvals. Without it, proposals
   wait in `swap/swap.md` and you approve in the agent chat.
4. A Slack channel for proposals, and the names of the people who may approve.
5. Some warmed mailboxes outside your campaigns to act as the first standbys.

## Set up

Say **"set up ac-swap"** (or `/ac-swap setup`). The agent will:

1. Check your builders.ac account and find your sequencer.
2. Ask which sequencer workspace to watch.
3. **Ask who your Approvers are.** This is required; there is no default. It
   looks each name up in Slack and confirms the list with you.
4. Ask for the proposal channel.
5. Ask for your standby tag name (default `standby`).
6. Ask for campaigns to leave out. For the first live week it suggests a short
   list of campaigns to include instead.
7. Show the thresholds and let you change them.
8. Offer to schedule the three runs in your agent client.
9. Create `swap/` and start in dry-run mode.

<!-- screenshot: 01-setup-approvers.png — the Approver question with callouts: (1) names typed, (2) resolved Slack users, (3) confirmation -->

### Thresholds

| Setting | Default | Meaning |
| --- | --- | --- |
| Bounce rate | 4.5% over 3 days, at least 50 sent | Flags one mailbox |
| Placement | any seed in spam | Flags one mailbox |
| Blacklist | domain listed | Flags every mailbox on the domain (builders.ac domains) |
| Domain bounce | 5%, at least 200 sent | Flags every mailbox on the domain (builders.ac domains) |
| Domain rule | 2 flagged mailboxes | Flags every mailbox on the domain |
| List guard | half a campaign's mailboxes bouncing | Treats it as a list problem, no swap |
| Ready | 15 days warming | When a Standby can be used |
| Pool floor | 10% of live mailboxes per ESP | When to refill |
| Ramp for a promoted standby | 10/day, +2/day, cap 30, 15 min apart | Sending limits after a swap |

## How it runs

| Run | Default time | What happens |
| --- | --- | --- |
| `scan` | daily 07:00 | Checks every mailbox, posts a proposal if anything is flagged, takes new mailboxes into the pool, checks runway; on Mondays posts the weekly summary |
| `placement` | Mon and Thu 06:00 | Starts a placement test (live mode only) |
| `decide` | every 2 hours, 08:00–20:00 | Reads replies, carries out approved swaps, collects placement results |

Ask for any run by name at any time, for example "run swap scan now".

## Approving a swap in Slack

Each proposal shows how many mailboxes leave per ESP, how many standbys come in,
the reason and numbers for every flagged mailbox, and the campaigns affected.

<!-- screenshot: 02-proposal.png — proposal message with callouts: (1) proposal id + expiry, (2) per-ESP counts, (3) reason + numbers per mailbox, (4) list-suspected campaigns, (5) the exact replies -->

Reply **in the thread** with one of:

```text
approve [reason]
approve except anna@example-sender.com, ben@example-sender.com [reason]
reject <reason>
```

- Only Approvers count. Other replies are ignored with a short note.
- The first valid reply decides and locks the proposal.
- `reject` needs a reason; it helps tune the thresholds.
- A proposal with no reply expires after 24 hours; the next scan proposes again
  with fresh numbers.

<!-- screenshot: 03-approve-reply.png — thread with the approve reply and the agent's acknowledgement -->

Before it acts, the agent re-checks that the flagged mailboxes are still in the
same campaigns and that the pool still has enough Ready standbys. If anything
changed, it posts the new list and waits for a fresh reply.

<!-- screenshot: 04-recheck-and-result.png — "Re-check passed, executing" then the per-mailbox result -->

## What a swap does

For each approved mailbox, oldest flag first:

1. Picks the oldest Ready standby from the same ESP, never on the same domain as a
   flagged mailbox.
2. Sets its sending limits and ramp.
3. Adds it to every campaign the flagged mailbox was in, and confirms it is there.
4. Only then removes the flagged mailbox, so campaign capacity never drops.
5. Moves the tags: the standby loses `standby`, the flagged mailbox gets
   `swapped-out` and keeps warming.

If adding the standby fails, the flagged mailbox stays put and that pair is marked
failed. Swapped-out mailboxes are listed for a person to decide on retirement;
`ac-swap` never deprovisions them.

<!-- screenshot: 05-plusvibe-before-after.png — campaign mailbox list before and after, callouts on the removed and added mailbox (addresses blurred) -->

## Keeping the pool full

- **Intake:** new mailboxes on your intake domains are tagged `standby` and their
  warmup is switched on automatically. They become Ready 15 days later.
- **Refill recommendations:** every scan works out how long each pool will last at
  the current swap rate. When the pool would drop below its floor before new
  mailboxes could finish warming (about 17 days), the agent posts how many to
  order. For builders.ac it includes a ready plan you can hand to `ac-infra`.

<!-- screenshot: 06-refill-recommendation.png — runway numbers and the suggested order -->

## The swap workspace

Everything lives in `swap/`, which Git ignores:

| File | What it holds |
| --- | --- |
| `swap.md` | Your settings (top) and the dashboard: last runs, open proposals, pool, runway, swapped-out mailboxes, blockers, next action |
| `proposals.csv` | One row per proposal, with the Decision, who made it and when |
| `actions.csv` | One row per step taken, for the audit trail and safe resumes |

See [`examples/swap/`](../examples/swap/swap.md) for a filled-in synthetic copy.
Check it any time with `node scripts/swap-workspace.mjs check`.

<!-- screenshot: 07-swap-md.png — dashboard with callouts on pool, runway and swapped-out list -->

## Weekly summary

Every Monday the scan posts one message, split by ESP: flags by reason; swaps
executed, failed, rejected and expired; list-suspected campaigns; pool size and
runway; and swapped-out mailboxes waiting for a retirement decision.

<!-- screenshot: 08-weekly-summary.png -->

## Going live

1. Let dry-run run for a week and review its proposals.
2. Make sure your standby tag is not used by any campaign for membership.
3. Set `mode: live` in `swap/swap.md` yourself.
4. Keep the short include list for the first live week, then clear it.

## Demo walkthrough

The demo has two parts.

**Part 1: dry run on real data.** Run `scan` in dry-run mode against a real
workspace. You get real flags and a real proposal, and nothing changes.

**Part 2: live swap in a sandbox campaign.**

1. A person creates one campaign, sets it active, and adds **no leads**, so it can
   never send. `ac-swap` never creates campaigns.
2. Attach five mailboxes to it and tag five Ready mailboxes `standby`.
3. In `swap.md`, set `demo: true` and list two attached mailboxes under
   `demo_force_flag`.
4. Run `scan`: a proposal for two mailboxes appears in Slack.
5. Reply `approve` in the thread.
6. Run `decide`: two standbys join the campaign and the two flagged mailboxes
   leave it. The thread shows the result.
7. Set `demo: false` afterwards.

The committed example in `examples/swap/` mirrors this demo with synthetic names.

## Troubleshooting

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| "No matching sequencer MCP" | Sequencer MCP not connected in this session | Connect it in your client, then run setup again |
| No domain blacklist or domain bounce flags | builders.ac Deliverability tools not listed yet, or the domains are not builders.ac domains | Reconnect the builders.ac MCP so the tool list refreshes; other signals still work |
| "Standby tag is used by a campaign" | A campaign pulls mailboxes in by that tag | Use a different standby tag, or change the campaign's membership |
| Proposal never executes | No valid Approver reply, or the 24-hour expiry passed | Reply with an exact keyword in the thread; check the Approver list in `swap.md` |
| "Needs a fresh Decision" | Something changed between approval and the run | Review the new list in the thread and reply again |
| Mailbox reported with unclear ESP | The sequencer did not say Google or Microsoft | Check it in the sequencer; it is never swapped until clear |
| Pair marked failed | The standby could not be added or confirmed | The flagged mailbox stayed in place; see `actions.csv` for the reason |
