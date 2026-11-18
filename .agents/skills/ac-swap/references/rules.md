# V0 operating rules

This is the policy to use when interpreting the skill and its supporting reports.
The helper evaluates evidence and simulates one pair. It is not a live executor.

## Pools and unit

- Swap one named mailbox for one named standby. Use that mailbox's own evidence.
  Domain totals never identify a failing mailbox and never authorize replacing
  every mailbox on the domain. Shared DNS failure is a configuration review for
  affected mailboxes, not automatic mass replacement.
- Primary sends to verified deliverable recipients. Catch-all sends to the
  separately chosen Catch-all recipient segment. Standby is qualified unused
  stock with an explicit `standby_for` lane. Recovery is a health state.
- Domains remain separate between Primary and Catch-all. Once a domain is
  designated for or observed assigned to Catch-all, none of its mailboxes can
  become Primary, including after warming, recovery, removing tags or moving
  through Standby. Persist that exclusion in `catchall_history_domains`; never
  erase it merely because a later snapshot no longer shows the campaign.
- `ever_catchall: false` means verified clean history; null means unknown, not
  clean. Unknown history cannot qualify a Primary replacement. A sibling's
  Catch-all history excludes the entire domain from Primary.
- Preserve configured roles and captured lane assignments. Do not allocate pools
  using percentages. Old `standby_share` / `catchall_share` settings are ignored.
- No rotation, automatic cooldown, automatic return to sending, automatic purchase
  or automatic warmup changes. Preserve existing provider settings and respect
  actual available capacity; a mailbox with zero current capacity is not ready.

## Signals and thresholds

| Signal | Interpretation |
| --- | --- |
| Fresh DNS failure | Configuration review; investigate. No automatic swap from a provider flag alone. |
| Mailbox warmup inbox rate <90% | Recovery candidate with ≥50 classified warmup results over seven complete UTC dates ending yesterday. |
| Mailbox sender-side bounce rate ≥3% | Recovery candidate over three complete UTC dates ending yesterday, with ≥50 sends per mailbox. |
| Recipient-side bounces | List issue; do not swap solely for this signal. Independently failing warmup remains actionable. |
| Stale or missing evidence | Historical finding / unverified. No live decision from cached failures alone. |

Warmup rate is inbox / (inbox + spam + promotion), not the warmup setting and
not a measurement of campaign inbox placement. The minimum is 50 classified
warmup results over seven complete UTC dates and 50 campaign sends over three
complete UTC dates, per mailbox. At 60 sends, two sender-side bounces are 3.33%
and trigger the rule. At 49 sends, the bounce assessment remains unverified.
DNS and warmup can still be assessed separately.

The 3% rule uses PlusVibe's **sender-side bounce count / sent count**, not combined
recipient bounces, and not an assertion that every sender-side bounce is a hard
bounce. Raw hard-bounce classification requires separate diagnostic evidence.

## Standby and execution

A standby must be explicitly designated, target the same lane and mailbox
provider, pass its own fresh DNS/warmup checks, have ≥15 known days of warming,
have nonzero usable capacity and complete availability evidence. The standby mailbox itself must have no current campaign assignments, including
completed, paused or draft campaigns. An unused sibling can remain standby when
another mailbox on its domain is consumed by a same-lane campaign. Cross-lane
domain conflicts still block qualification.
Recheck shared failing infrastructure and exact campaign impact before live use.
Do not count an entire domain as ready from one representative mailbox.

Execute only under separate explicit live authorization and a saved active
campaign include list. Reserve one exact pair, preserve limits and recovery state,
attach the replacement, read back its membership, remove the source, then verify
both sides. Keep the same pair when resuming; never allocate it twice.

If no qualified replacement exists, skip and report the shortage. If attachment
or verification fails, leave the source attached and record the partial result.
This protects membership continuity; it does not stop an unhealthy source from
sending. The agent does not pause/launch campaigns. The campaign operator handles
an urgent stop through their normal workflow. No successful swap is claimed until
remote read-back proves it. Replenishment is a count of consumed spares for the
normal business workflow; no order is placed.

A real interrupted-operation test and mailbox-level provider read-back are still
required before claiming production swap execution. Only one executor may run.
