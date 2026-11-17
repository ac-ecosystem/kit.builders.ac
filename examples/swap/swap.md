---
mode: "dry-run"
sequencer: "plusvibe"
sequencer_workspace_id: "ws_example_0001"
schedule: "manual"
timezone: "Asia/Ho_Chi_Minh"
live_campaign_include: []
primary_domains: []
catchall_domains: []
standby_domains: ["example-standby.net"]
ready_days: 15
warmup_threshold: 0.9
warmup_min_results: 200
bounce_window_days: 3
bounce_threshold: 0.05
bounce_min_sends: 200
standby_share: 0.1
catchall_share: 0.2
---

# Fleet review

Run: example-20261117-001 · 17 November 2026, 9:36 AM ICT · dry-run · report only, no execution by this helper.

Coverage: Synthetic six-domain fleet. Every name, identifier and observation is illustrative. (complete).

Warmup: 2026-11-10 to 2026-11-16. Sending: 2026-11-14 to 2026-11-16. All dates UTC.

1050 mailboxes inspected · 2 domains need attention · 2 domains shared between lanes.

## How the proposed system works

PlusVibe evidence → DNS / warmup / bounce rules → pool and health classification → replacement forecast → reserve check → local report.

| Pool / state | Purpose | Entry and exit |
| --- | --- | --- |
| A · Primary | Deliverable-lead campaigns | Healthy, designated primary inventory |
| B · Catch-all | Isolate catch-all sending | Dedicated domains and verified independent infrastructure |
| C · Standby | Replace a sender in either lane | Known warming age, health and no campaign commitments; consumed by a swap |
| Recovery | Keep poor-performing senders out of outreach | Re-evaluate evidence before returning; warmup continues only if already enabled |
| Configuration review | Investigate failed authentication checks | Repair and verify; a provider flag alone does not prove root cause |

The agent workflow and local review/report helper are implemented. Pool assignments are proposed. Sending, swapping, ordering and recovery outcomes in the following scenario are forecasts, not executed results.

## Scenario: example-decline.com

Observed: 50 mailboxes, seven-day warmup inbox 76.86%, 138 account-level campaign sends and 0 sender bounces in the stated window.

Assumption: Assume 100 verified microsoft standby mailboxes, at least 15 days warmed, healthy DNS and warmup, outside campaign commitments and failing infrastructure. This stock is illustrative, not discovered inventory.

1. Flag the domain from warmup evidence; do not wait for bounce volume.
2. Recommend excluding these mailboxes from the next launch. A draft stays a draft; there is no executable live swap in this report.
3. If used in an authorized active-campaign scenario, select 50 same-ESP replacements, attach and verify all required memberships, then detach and verify the source.
4. If any attachment fails, keep the source attached and record the partial result; do not report a successful swap.
5. Under the assumed stock, standby falls from 100 to 50. Reserve target 95 gives a refill requirement of 45 mailboxes. No order is placed.
6. Move the source to recovery conceptually; healthy replacement counts do not guarantee restored inbox placement. Monitor subsequent evidence.

Capacity: the source accounts expose a combined ceiling of 100 campaign sends/day. Actual replacement capacity depends on inherited caps, ramp and other commitments.

## Collaboration handoff

builders.ac kit: collect and explain evidence, define replacement requirements and emit the local report. Customer team: map its existing backup inventory and receive an ESP/lane/quantity refill requirement through their own provisioning and warmup workflow. No new Slack app or database is needed for this demonstration.

## Observed evidence and provisional mapping

| Domain | Mailboxes | Health | DNS checks | Warmup inbox | Campaign sends | Sender bounces | Recipient bounces | Observed pool | Proposed pool |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| example-config.com | 50 | configuration review | SPF: pass / DKIM: pass / DMARC: fail / MX: pass | 99.0% | 100 | 0 | 0 | mixed lanes | hold |
| example-decline.com | 50 | recovery | SPF: pass / DKIM: pass / DMARC: pass / MX: pass | 76.9% | 138 | 0 | 0 | mixed lanes | hold |
| example-unknown.com | 50 | unverified | SPF: ? / DKIM: ? / DMARC: ? / MX: ? | unknown | unknown | unknown | unknown | unassigned | hold |
| example-catchall.com | 50 | healthy | SPF: pass / DKIM: pass / DMARC: pass / MX: pass | 99.0% | 100 | 0 | 0 | catchall | standby |
| example-primary.com | 800 | healthy | SPF: pass / DKIM: pass / DMARC: pass / MX: pass | 99.0% | 100 | 0 | 0 | primary | catchall |
| example-standby.net | 50 | healthy | SPF: pass / DKIM: pass / DMARC: pass / MX: pass | 99.0% | 100 | 0 | 0 | standby | standby |

## Replacement rehearsal

Verified standby mailboxes in inspected data: 50. Covered-inventory reserve target: 95. Gap: 45.

Proposed pools are a domain-count planning split, not deployed tags or verified standby capacity. Unknown warmup age, incomplete membership, or occupied drafts prevent readiness. No mailbox has been moved.

- example-decline.com: Warmup below 90.0%
- example-config.com: Provider DNS check failed: dmarc; investigate configuration. Synthetic configuration failure; investigate before reuse.

## Limits

Current membership does not prove historical lane isolation. Warmup results do not prove campaign placement or causality. DNS checks are current configuration evidence, not historical message authentication. Counts apply only to this inspected subset.

No order is placed. Refill numbers are a recommendation; unknown inventory can contain additional standbys. Pool targets are configurable planning assumptions.
