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
| List campaigns | `list_campaigns` | Always pass `status=ACTIVE`, `campaign_type=parent` and a small `limit`: each campaign carries its full sequence bodies. Campaign rows include `sender_bounced_count`, `recipient_bounced_count`, `sent_count`, `is_pause_on_bouncerate`, `bounce_rate_limit`, `is_paused_at_bounced`, `email_accounts_count` |
| Campaign mailboxes | `get_campaign_email_accounts` | Returns bare email addresses only (no account IDs, provider or tags). Resolve them as described under "Resolving mailboxes" |
| Attach | `add_campaign_email_account` | One address per call; keeps existing accounts |
| Detach | `remove_campaign_email_account` | One address per call. Refused for a mailbox that is on the campaign through a tag; the error names the tag |
| Limits and ramp | `update_email_account` | Requires `id` (24-hex account ID), `first_name`, `daily_limit`, `interval_limit_in_min`. Copy `first_name` from `list_email_accounts`. Ramp: `is_slow_rampup: "yes"`, `rampup_daily_limit`, `rampup_daily_inc`; their sum must not exceed `daily_limit`. Leave `force_exit_recovery` at its default |
| Warmup on | `enable_warmup` | One address per call |
| Warmup results | `get_bulk_warmup_stats` | Max 14 days; `inbox_percent`, `spam_percent`, `google_percent`, `microsoft_percent` |
| Tags | `list_tags`, `create_tag`, `bulk_assign_tags` (`ASSIGN` / `UNASSIGN`) | Tag names are case-insensitive and unique. `list_tags` shows `camp_count`: if the standby tag has a non-zero `camp_count`, a campaign uses it for membership. Stop and tell the user |
| Placement test | `create_email_placement_test`, `update_email_placement_test`, `list_email_placement_test_runs`, `get_email_placement_test_run_detail`, `get_email_placement_test_automatic_result` | See below |

## Resolving mailboxes

Statistics tools need 24-hex account IDs, and the ESP comes from each account's
top-level `provider` field. To get both for a campaign's mailboxes:

- If every mailbox in the campaign carries one shared tag, call
  `list_email_accounts` with that tag's ID and page through it.
- Otherwise call `list_email_accounts` with `email=` per address. Each account's
  `payload.cmps` lists the campaigns (`id`, `name`) it is attached to, which also
  answers "is this mailbox in an active campaign".

`list_email_accounts` returns about 4–6 KB per account and no total count, so
never page through a whole large workspace with it. Use a `tags` filter (the
standby tag keeps the pool query small). For wide sweeps use
`get_bulk_email_account_stats` or `get_bulk_warmup_stats`, which are about 0.7 KB
and 0.4 KB per row; bulk stats also reports `total_accounts`.

ESP map for `provider`: `MICROSOFT365` → `microsoft`; a value starting with
`GOOGLE` → `google` (confirm the exact value on first sight and record it in
`swap.md`); anything else, such as `REGULAR_ACCOUNT` (SMTP), → report as unclear
and never swap.

## Reading bounce numbers

- `bounce_rate`, `sender_bounce_rate` and `recipient_bounce_rate` are percents
  (`100` means 1 of 1). `swap.md` thresholds are fractions, so compare
  `sender_bounce_rate` with threshold × 100.
- The sender/recipient split is reported as 0 when nothing was sent. Skip a
  mailbox whose `total_sent_count` is 0 rather than reading its rates.
- For domain bounce flags, add `total_sent_count` and `sender_bounce_count` per
  domain and compute the rate yourself.
- Do not use `payload.analytics.health_scores.*` fields: they report `-1` for no
  data and were observed staying `-1` on mailboxes that had bounces.

## Readiness

Use the warmup start date recorded at intake. For mailboxes taken in before
`ac-swap`, fall back to `payload.warmup_enb_dt` (the last time warmup was
enabled, which may be a bulk re-enable) and mark the date as estimated. An empty
string means unknown, not "today". Warmup statistics only cover 14 days, so they
cannot prove 15 days of warming on their own.

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
   `get_email_placement_test_run_detail` to see whether the run finished (statuses
   include `ERROR` and `INACTIVE`; the run detail's own `result` list can be empty),
   then `get_email_placement_test_automatic_result` once per sender. Each sender's
   result is split by recipient provider (`GOOGLE`, `MICROSOFT`) with
   `inbox_count` and `spam_count`. Spam seeds = the sum of `spam_count` across
   recipient providers. `data: []` means no result for that sender, not zero spam.
   Treat a run that has not finished after 90 minutes as failed and say so in the
   dashboard.
5. Results need one call per sender, about 5 per second, so cap a test at
   `placement_max_senders` (default 200) and rotate through the fleet across runs,
   flagged and soon-to-be-Ready mailboxes first.

In `dry-run`, no test is started. A scan may read results of an existing test in
the workspace from the last 7 days, labelled as not started by `ac-swap`.

If the placement allowance is tight, test one mailbox per domain, poll every 5
minutes, and stop waiting after 90 minutes.

## Limits

PlusVibe allows about 5 requests per second, with heavier endpoints weighted, and
temporarily blocks clients that exceed it. Prefer the bulk tools, keep pages at
100, and pause briefly between single-mailbox calls during a swap.
