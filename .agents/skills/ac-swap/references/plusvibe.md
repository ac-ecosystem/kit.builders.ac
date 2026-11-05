# PlusVibe mapping for ac-swap

Use this only when builders.ac shows PlusVibe as the connected sequencer and an
authenticated PlusVibe MCP is already loaded in the session. It records the
PlusVibe MCP contract read on 2026-11-05. Read the live tool descriptions and
schemas before every mutation; stop and record any difference.

Every tool takes `workspace_id`. Resolve it once with `get_workspaces` during setup
and check it at the start of every run.

## Capabilities

| Swap contract capability | PlusVibe tool | Notes |
| --- | --- | --- |
| List workspaces | `get_workspaces` | |
| List mailboxes | `list_email_accounts` | Filter by `tags` (comma-separated tag IDs) or `email`; page with `limit`/`skip`. Each account has `payload.warmup`, `in_recovery`, `payload.daily_limit`, `payload.campaign_limit_today`, `payload.sending_rampup` |
| Per-mailbox totals | `get_bulk_email_account_stats` | Up to 100 mailboxes per page, max 90 days; pass `include_chart=false`. Header fields include `total_sent_count`, `total_bounce_count`, `bounce_rate`, `reply_rate`, and since 2026-09-14 `sender_bounce_rate` and `recipient_bounce_rate` |
| List campaigns | `list_campaigns` | `campaign_type=parent`, then keep status `ACTIVE` |
| Campaign mailboxes | `get_campaign_email_accounts` | |
| Attach | `add_campaign_email_account` | One address per call; keeps existing accounts |
| Detach | `remove_campaign_email_account` | One address per call. Refused for a mailbox that is on the campaign through a tag; the error names the tag |
| Limits and ramp | `update_email_account` | Requires `id` (24-hex account ID), `first_name`, `daily_limit`, `interval_limit_in_min`. Copy `first_name` from `list_email_accounts`. Ramp: `is_slow_rampup: "yes"`, `rampup_daily_limit`, `rampup_daily_inc`; their sum must not exceed `daily_limit`. Leave `force_exit_recovery` at its default |
| Warmup on | `enable_warmup` | One address per call |
| Warmup results | `get_bulk_warmup_stats` | Max 14 days; `inbox_percent`, `spam_percent`, `google_percent`, `microsoft_percent` |
| Tags | `list_tags`, `create_tag`, `bulk_assign_tags` (`ASSIGN` / `UNASSIGN`) | Tag names are case-insensitive and unique. `list_tags` shows `camp_count`: if the standby tag has a non-zero `camp_count`, a campaign uses it for membership. Stop and tell the user |
| Placement test | `create_email_placement_test`, `update_email_placement_test`, `list_email_placement_test_runs`, `get_email_placement_test_run_detail`, `get_email_placement_test_automatic_result` | See below |

## Tag-attached mailboxes

`bulk_assign_tags` says campaigns that use a tag update their mailbox lists
automatically when the tag changes. So:

- Detaching a tag-attached flagged mailbox means `UNASSIGN` of that campaign tag on
  the mailbox. That removes it from every campaign using the tag, which is the
  intended result. List those campaigns in the action rows.
- Never assign a campaign membership tag to a standby during a swap. Attach
  standbys one by one with `add_campaign_email_account`.

## Ramp for a promoted standby

Defaults from `swap.md`: `daily_limit` 30, `rampup_daily_limit` 10,
`rampup_daily_inc` 2, `interval_limit_in_min` 15. Check that
`rampup_daily_limit + rampup_daily_inc <= daily_limit` before calling. Read the
account first and keep its current `first_name`.

## Placement tests (live mode only)

1. `create_email_placement_test` with `type: ONE_OFF` and a name such as
   `ac-swap <date>`. It is created in `DRAFT`.
2. `update_email_placement_test` while still in draft: `throttle: SEQUENTIAL` with
   `min_intv`, `content_config` with a neutral subject and body (or the campaign's
   copy when `placement_content: campaign`), `sender_config` with the explicit
   sender list, and the seed `recipient_config` the tool requires. Then set
   `status: ACTIVE` to run it once. A one-off test cannot be edited after it starts.
3. Record the parent test ID in the dashboard. Do not wait.
4. The next `decide` run calls `list_email_placement_test_runs` and
   `get_email_placement_test_run_detail` to see whether the run finished, then
   `get_email_placement_test_automatic_result` per sender for inbox and spam counts.
   Treat a run that has not finished after 90 minutes as failed and say so in the
   dashboard.

If the placement allowance is tight, test one mailbox per domain, poll every 5
minutes, and stop waiting after 90 minutes.

## Limits

PlusVibe allows about 5 requests per second, with heavier endpoints weighted, and
temporarily blocks clients that exceed it. Prefer the bulk tools, keep pages at
100, and pause briefly between single-mailbox calls during a swap.
