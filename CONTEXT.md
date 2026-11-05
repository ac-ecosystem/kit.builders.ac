# builders.ac kit

The kit lets a customer's own agent run cold-email work through builders.ac and
their sequencer: onboarding, prospecting, infrastructure, campaigns, and swapping
burned mailboxes out of live campaigns.

## Swap

**Covered campaign**:
An active parent campaign in the chosen sequencer workspace that is not on the
exclusion list. During the first live week, only campaigns on a short include
list. Only Covered campaigns are scanned and swapped.
_Avoid_: monitored campaign, live campaign

**Standby**:
A warmed sequencer mailbox kept out of every active campaign so it can replace a
burned one. The customer's standby tag marks it. A sequencer without tags treats
any warmed mailbox outside a campaign as a Standby, except mailboxes on the
customer's exclusion list.
_Avoid_: backup, spare, warmed backup, reserve

**Ready standby**:
A Standby that has been warming for at least the configured number of days
(15 by default).
_Avoid_: warm, ready mailbox

**Standby pool**:
All Standbys for one ESP (Google or Microsoft). Any flagged mailbox on that ESP
is replaced from it. No Standby is set aside for a particular mailbox in advance.
_Avoid_: backup pool, spares, reserve

**Pool floor**:
The smallest Standby pool allowed for an ESP: 10% of that ESP's live mailboxes by
default.
_Avoid_: minimum stock, threshold

**Intake**:
Taking a newly supplied mailbox into the Standby pool: tagging it, turning on
warmup and recording when warming started.
_Avoid_: onboarding, import

**Refill recommendation**:
The agent's advice to order more mailboxes for a pool, posted when the pool is
projected to fall below its floor before new mailboxes could finish warming. It
includes how many to order and from which supplier.
_Avoid_: reorder alert, low-stock warning

**Swapped-out mailbox**:
A flagged mailbox that a swap took out of every campaign. It keeps warming and
waits for a retirement decision.
_Avoid_: burned mailbox, dead mailbox, retired

**Flag**:
A rule hit that marks a mailbox, or every mailbox on a domain, as a swap
candidate: sustained bounces, spam placement, a blacklist listing, or several
flagged mailboxes on one domain.
_Avoid_: alert, burn, strike

**List-suspected campaign**:
A campaign where half or more of the mailboxes are flagged for bounces at once.
The likely cause is the lead list, so those mailboxes are not swapped.
_Avoid_: bad campaign, burned campaign

**Swap proposal**:
One batch of flagged mailboxes to take out of named campaigns, plus how many
Ready standbys each Standby pool supplies (one per flagged mailbox), waiting for a
Decision. Which standbys go in is decided when the swap runs, oldest Ready first.
It expires after 24 hours without a Decision.
_Avoid_: alert, request, ticket

**Approver**:
A person on the customer's approver list whose reply can decide a Swap proposal.
The customer names Approvers when setting up swaps; there is no default.
_Avoid_: reviewer, admin, manager

**Decision**:
An Approver's `approve`, `approve except …` or `reject` reply on a Swap proposal,
optionally with a reason. The first Decision locks the proposal; later replies
change nothing.
_Avoid_: vote, sign-off, reaction
