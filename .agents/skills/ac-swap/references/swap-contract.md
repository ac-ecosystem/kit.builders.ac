# Swap contract

`ac-swap` talks to every sequencer through the same set of capabilities. A
sequencer reference (for example [plusvibe.md](plusvibe.md)) maps each capability
to that vendor's MCP tools. Adding a sequencer means adding one reference file
that fills in this table; the skill itself does not change.

Read the live tool descriptions and schemas before every mutation. When they
disagree with a reference, the live tools win: stop and record the difference
instead of guessing.

## Sequencer capabilities

| Capability | Needed for | Required? |
| --- | --- | --- |
| List workspaces | Setup, start of every run | Yes |
| List mailboxes, with provider type (ESP), tags, warmup state | Inventory, pool, intake | Yes |
| Per-mailbox send and bounce totals over a date range | Bounce flags | Yes |
| List campaigns with status and type (parent or subsequence) | Covered campaigns | Yes |
| List a campaign's mailboxes | Inventory, read-back after attach | Yes |
| Attach one mailbox to a campaign | Swap | Yes |
| Detach one mailbox from a campaign | Swap | Yes |
| Read and update a mailbox's sending limits and ramp | Swap | Yes |
| Turn warmup on | Intake | Yes |
| Per-mailbox warmup results | Pool status, readiness evidence | Recommended |
| Tags: list, create, assign and remove on mailboxes | Standby tag | Recommended; without it use implicit standbys |
| Placement test: create, configure, start, read per-sender results | Placement flags | Optional; without it placement flags are skipped |

Each reference also states:

- How membership works: added one by one, or through a tag that pulls every tagged
  mailbox into a campaign. A swap must detach a tag-attached mailbox by removing
  that tag, and must never use the standby tag as a campaign membership tag.
- Rate limits and page sizes.
- How to read a mailbox's ESP. Report mailboxes whose ESP is unclear.

## Standby modes

- `standby_mode: tag` (default): a Standby carries the customer's standby tag, sits
  in no active campaign, and has warmup on. Attachments to paused, completed or
  draft campaigns do not disqualify it. Promoting it removes the tag.
- `standby_mode: implicit`: for sequencers without tag tools. Any warmed mailbox in
  no active campaign is a Standby, except mailboxes on `standby_exclusions`. Every
  proposal names the candidate standbys in this mode so a person can veto one.

A Standby is Ready once `ready_days` have passed since warmup started. Use the
start date recorded at intake. For mailboxes taken in before `ac-swap` existed,
use the warmup-enabled date the sequencer reports, and say in the dashboard that
the date is estimated. An unknown date means not Ready.

## ESP

Use `google` and `microsoft`. Mailboxes on any other provider are reported in the
dashboard and never swapped in V0.
