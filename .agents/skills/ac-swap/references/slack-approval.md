# Slack approval

Approval is a reply in the proposal's Slack thread. The next `decide` run reads it.
Use only a Slack MCP that is already loaded and authenticated. Without one, set
`approval_channel: chat` and keep proposals in the `swap.md` dashboard for a
Decision typed in the agent conversation, using the same keywords.

## Posting a proposal

Post one top-level message per Swap proposal in the configured channel, then
record its thread reference in `proposals.csv`. The message contains:

1. Header: `Swap proposal <proposal_id> · <mode> · expires <time>`.
2. For each ESP: number of flagged mailboxes and the matching number of Ready
   standbys from that pool, for example `Google: 17 out, 17 standbys in`.
3. A table of flagged mailboxes: address, reason, the numbers behind it (for
   example `bounce 6.1% of 98 sent, 3 days` or `2 of 12 seeds in spam, Google`),
   and the campaigns it would leave.
4. List-suspected campaigns, listed separately as "check the lead list". They are
   not part of the Decision.
5. Pool shortfall, if any.
6. In `standby_mode: implicit`, the candidate standbys by name.
7. The exact replies that count:

```text
approve [reason]
approve except <mailbox>, <mailbox> [reason]
reject <reason>
```

Split a proposal that would exceed Slack's message length into a summary message
plus thread replies with the mailbox table; the Decision still goes in the thread
of the summary message.

## Reading Decisions

- Read the thread replies posted after the proposal message, oldest first.
- Only replies from Slack users on the `approvers` list count. For a reply from
  anyone else, post once: "Only listed Approvers can decide this proposal."
- A reply counts only if, after trimming, it starts with `approve`, `approve except`
  or `reject` (case-insensitive). Anything else is ignored. Emoji reactions never
  count.
- `reject` needs a reason. A bare `reject` gets the reply "Add a reason after
  `reject`" and does not lock the proposal.
- `approve except` takes mailbox addresses separated by commas. If an address is
  not in the proposal, do not guess: reply naming it and wait for a corrected
  Decision.
- The first valid Decision locks the proposal. Record `decided_by` (Slack user),
  `decided_at`, `decision`, `excluded` and `reason` in `proposals.csv`. Later
  replies get one note, "Already decided by <name> at <time>", and change nothing.

## After the Decision

- After the dry-run re-check, post either "Re-check passed, executing" or the new
  action list with "Needs a fresh Decision". The fresh Decision follows the same
  rules in the same thread.
- After execution, post the outcome: swapped, failed (with reason) and skipped,
  per mailbox, plus which standbys went in.
- When a proposal expires, post "Expired with no Decision; the next scan will
  re-propose with fresh data."
- In `dry-run` mode, record the Decision and reply "Dry run: Decision recorded,
  nothing changed."
