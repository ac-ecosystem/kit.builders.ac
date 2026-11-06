---
mode: live
demo: true
sequencer: plusvibe
sequencer_workspace_id: ws_example_0001
builders_account: acc_example_0001
approval_channel: slack:#ac-swap-demo
approvers: [U0EXAMPLE01 (Demo Approver)]
standby_mode: tag
standby_tag: standby
swapped_out_tag: swapped-out
standby_exclusions: []
campaign_exclusions: [Internal seed test]
campaign_include: []
intake_domains: [example-sender.com, example-outreach.com, example-mail.net]
ready_days: 15
bounce_window_days: 3
bounce_rate_threshold: 0.045
bounce_min_sends: 50
domain_bounce_rate_threshold: 0.05
domain_bounce_min_sends: 200
campaign_list_recipient_share: 0.7
domain_flagged_mailboxes: 2
list_suspected_share: 0.5
placement_min_seeds: 1
placement_max_senders: 200
placement_content: neutral
pool_floor_share: 0.10
ramp_target: inherit
ramp: { daily_limit: 30, rampup_daily_limit: 10, rampup_daily_inc: 2, interval_limit_in_min: 15 }
proposal_expiry_hours: 24
schedule: { scan: "07:00 daily", placement: "06:00 Mon,Thu", decide: "every 2h 08:00-20:00" }
timezone: Asia/Jakarta
demo_force_flag: [ben@example-sender.com, cara@example-sender.com]
updated_at: 2026-11-06T09:12:00Z
---

# Swap dashboard

Status: live (demo). Synthetic example: every name, domain and ID here is made up.

## Last runs

| Mode | Finished | Result |
| --- | --- | --- |
| decide | 2026-11-06 09:12 WIB | sp-0002 executed: 2 swapped, 0 failed |
| scan | 2026-11-06 07:03 WIB | sp-0002 posted (2 demo flags); 3 mailboxes taken in |
| scan | 2026-11-05 07:02 WIB | sp-0001 posted (dry run); 1 list-suspected campaign |

## Open proposals

None.

## Pool

| ESP | Ready | Warming | Floor | Daily burn (30 d) | Runway | Refill recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| google | 6 | 3 | 4 | 0.1 | 60 days | none |
| microsoft | 9 | 0 | 5 | 0.2 | 45 days | none |

## Placement

Last test: pt-example-0042, finished 2026-11-05 07:40 WIB. 1 mailbox with seeds in spam (dan@example-outreach.com, 2 of 12, Google).

## Swapped-out mailboxes awaiting a retirement decision

- ben@example-sender.com (sp-0002, demo)
- cara@example-sender.com (sp-0002, demo)

## Blocker

None.

## Next action

Next scan 2026-11-07 07:00 WIB. Demo complete; set `demo: false` before regular use.
