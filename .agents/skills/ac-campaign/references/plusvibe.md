# PlusVibe inactive-draft procedure

Use this procedure only when builders.ac identifies PlusVibe as the connected
sequencer and an authenticated PlusVibe MCP is already loaded in the current
agent session. It records the PlusVibe MCP contract verified on 2026-09-27. Read
the live tool descriptions and schemas before every mutation. If creation no
longer guarantees a draft or a later operation can activate it implicitly, stop
and record the blocker instead of guessing.

## Resolve the workspace and senders

1. Call `get_workspaces` to verify authentication and enumerate accessible
   workspaces. Match the workspace observed through builders.ac exactly; ask the
   user when more than one workspace could match.
2. Page through `list_email_accounts` for that workspace. Intersect those
   results with the suitable connected sender inboxes recorded in
   `infrastructure.md`. Do not modify an account or select an address that is
   absent from either source.

## Create and configure the draft

1. Call `create_campaign` with only `workspace_id` and the reviewed campaign
   name. Its documented behavior must still say that the new campaign is
   created in `DRAFT` status with default settings.
2. Save the returned campaign ID immediately and call `get_campaign_status`.
   Continue only when the read-back explicitly reports `DRAFT`. If any later
   read reports another status, stop all mutations and record the observed
   status in `campaign.md`.
3. Call `patch_campaign_update` for the reviewed sequence and safeguards. Do
   not pass its `status` field: omitting it preserves the current draft status.
   Translate custom CSV variables to PlusVibe placeholders. Standard fields use
   names such as `{{first_name}}` and `{{company_name}}`; custom fields use the
   provider form, such as `{{custom_subject_angle}}` and
   `{{custom_personalization}}`.
4. Preserve the settings reviewed in `campaign.md`. Unless the user selected
   stricter values, use the conservative draft settings
   `stop_on_lead_replied=yes`, `send_risky_email=no`, `send_seg_email=no`,
   `is_emailopened_tracking=no`, `is_unsubscribed_link=yes`, and
   `unsub_blocklist=yes`. These settings do not authorize activation.
5. Call `set_campaign_schedule` with exactly one schedule. Its `start_date`
   must be today or later. Include only active day keys set to `true`; never
   include an inactive day with `false`.
6. Call `set_campaign_email_accounts` once with the complete reviewed sender
   set. `account_list` takes sender email addresses, not account IDs, and
   replaces the campaign's full sender set.
7. After configuration, call `get_campaign_status` again and require `DRAFT`
   before importing any leads.

`patch_campaign_update` can set `ACTIVE`, `PAUSED`, or `INACTIVE`. Never pass any
of those status values during this workflow. Never call a launch, start, resume,
preview-email, or test-email tool.

## Import the reviewed recipients

Call `add_leads_to_campaign` using only the rows in `campaign.csv`:

- Map `email`, `first_name`, `last_name`, `company` to `company_name`, and
  `website` to `company_website`.
- Put `subject_angle` and `personalization` in `custom_variables` using those
  exact keys.
- Set `resume_camp_if_completed=false` and `is_overwrite=false`.
- Set `skip_lead_in_active_pause_camp=true` so a recipient already assigned to
  an active or paused campaign is not silently duplicated. Record every skipped
  recipient and do not claim the imported count matches until it does.
- Keep batches bounded. After each batch, require `get_campaign_status` to
  remain `DRAFT`; stop at the first error or status change.

Do not import extra workspace leads, retry a partially successful batch without
first reading the campaign, or use an option that can resume a campaign.

## Read back before marking ready

Use read-only PlusVibe tools to verify the remote draft against the local
artifacts:

1. `get_campaign_status` must report `DRAFT`.
2. `list_campaigns` filtered by `campaign_id` must show the reviewed sequence,
   settings, and schedule.
3. `get_campaign_email_accounts` must equal the reviewed sender-address set.
4. `get_lead_count` filtered by `campaign_id` must equal the intended recipient
   count.
5. Page through `list_all_leads` filtered by `campaign_id` and compare the exact
   normalized email set with `campaign.csv`.

Only after every check succeeds may `run.md` become `ready_for_launch`. On a
partial failure, keep `current_phase: campaign`, set `status: blocked`, and
record the campaign ID, its verified status, completed steps, and the smallest
safe next action. Leave the remote campaign in `DRAFT`; do not delete or launch
it automatically.

PlusVibe documents regular placeholders, custom-variable mapping, and Liquid
syntax in its official guides:

- <https://help.plusvibe.ai/en/articles/8682003-how-to-personalize-your-emails>
- <https://help.plusvibe.ai/en/articles/14094469-custom-variables-lead-level-personalization>
- <https://help.plusvibe.ai/en/articles/10748974-liquid-syntax-guide-for-plusvibe>
