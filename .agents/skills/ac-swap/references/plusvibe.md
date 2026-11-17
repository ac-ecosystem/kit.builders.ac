# PlusVibe mapping for ac-swap

Use an already authenticated PlusVibe MCP. Check the workspace with
get_workspaces. Tool schemas take precedence; this mapping was checked on
2026-11-17. The report helper is offline; the agent makes these calls.

## Collect evidence

| Need | Tool | Important details |
| --- | --- | --- |
| Workspaces | get_workspaces | Resolve the intended company workspace, not every accessible client |
| Campaigns | list_campaigns | campaign_type=parent; include relevant ACTIVE, COMPLETED, PAUSED and DRAFT records for review; small pages because sequence bodies are large |
| Membership | get_campaign_email_accounts | Bare address array; current assignment, not historical sending proof |
| Inventory | list_email_accounts | Use exact domain, exact email or tag filter; returns accounts; provider is top-level |
| Mailbox sending stats | get_bulk_email_account_stats | Target up to 100 email_acc_ids, include_chart=false; accounts array, each with header totals |
| Warmup | get_bulk_warmup_stats | Same targeting, include_chart=false; max 14 dates and 14-day retention; use seven complete dates |
| Authentication checks | check_email_account_health | accounts takes EMAIL ADDRESSES, not domains; pass one representative address per domain; success_list carries spf/dkim/dmarc/mx booleans even when checks failed |
| Sending proof | list_all_leads then get_campaign_emails | Resolve lead email_account_id to a sender; read actual messages and sent_on/eaccount for attribution; do not save message bodies or lead PII in reports |
| Tags | list_tags | ea_count and camp_count describe usage; a tag change can modify campaign membership |
| Existing placement results | list_email_placement_tests and result readers | Read-only context; no new seed sends in this workflow |

All cursor-paged tools require starting_after="" first, then
next_starting_after while has_more=true. Do not use removed skip/page
pagination. Empty campaign responses may be {}. Normalize the actual response
shape, preserve failed/partial requests, and stop if the cursor does not advance.

Resolve each account ID from the filtered inventory. Payload cmps lists assigned
campaign IDs/names, but does not prove their active state. Resolve status before
calling inventory unused. A mailbox committed to a draft is not freely available.

## Units, dates and interpretation

- Provider MICROSOFT365 maps to microsoft. Confirm exact GOOGLE* values before
  mapping to google. Unknown/SMTP ESPs remain unknown for V0.
- Sending rates are percentages; policy values are fractions. Prefer raw counts.
  sender_bounce_count and recipient_bounce_count are separate; available since
  2026-09-14. Zero sends means an unavailable rate, not healthy delivery.
- Account totals are workspace-level, not campaign-specific. Membership plus
  workspace totals cannot establish which campaign actually sent.
- Warmup inbox rate is inbox / (inbox + spam + promotion), matching classified
  outcomes. Display unclassified sent counts separately. Aggregate counts across
  a domain; do not average mailbox percentages.
- get_bulk_warmup_stats chart_data uses dt for ISO date and date for display.
  Daily records have sent/inbox/spam/promotion. Sending chart records use date
  for ISO date and total_sent_count for volume.
- An empty warmup-enabled date means unknown. A re-enable date may be estimated.
  Fourteen days of retained warmup cannot prove the 15-day readiness requirement.
- A provider DNS false is a failed check, not proof that the record is absent.
  Cross-check with read-only public DNS if useful. Duplicate DMARC records and
  source disagreement should be reported precisely; do not silently fix DNS.
- Current DNS health is not historical message authentication or inbox placement.
  Readiness requires fresh evidence, not payload.analytics.health_scores=-1.
- capacity_today comes from payload.campaign_limit_today. Configured daily_limit
  is a cap; rest_cycles, ramp/randomization and other campaigns affect capacity.
  A rest cycle counts actual sending days, not necessarily calendar days.

## Authorized execution only

Attach using add_campaign_email_account (one address, additive), then verify with
get_campaign_email_accounts. Remove using remove_campaign_email_account.
Tag-attached sources require removing the membership tag, which can affect every
campaign using it; skip any operation outside the authorized include list.

update_email_account requires account ID, first_name, daily_limit and
interval_limit_in_min. Preserve force_exit_recovery=0. Ramp start + increment
must not exceed the inherited cap; do not apply a 10/day ramp to a 2/day source.

bulk_assign_tags ASSIGN/UNASSIGN changes membership for tag-driven campaigns.
Never put a standby into a campaign membership tag before the exact impact is
known. Do not change warmup or rest settings as part of a review.

Keep calls below roughly five per second and use filtered bulk reads. If a tool
reports a tighter limit, follow it. No provider credentials are retrieved.
