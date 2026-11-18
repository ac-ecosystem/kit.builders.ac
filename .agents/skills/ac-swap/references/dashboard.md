# Refresh and publish the fleet dashboard

Every agent run updates the same dashboard URL after collecting evidence. The
browser reload button only reloads that published snapshot. It does not call APIs.
Manual invocation stays the default; this workflow does not create a schedule.

## Generate

Run `node scripts/swap-workspace.mjs report --dir swap`. The deterministic helper
renders `swap/dashboard.html` from the normalized snapshot and policy. It has no
provider/network calls. Use `node scripts/swap-dashboard.mjs --dir swap` to render
only the dashboard. The source is `assets/fleet-dashboard/`.

Use fresh authenticated MCP reads on each agent run. If reads fail, preserve the
last observation timestamps, record missing coverage in the snapshot and report
the incomplete refresh. Do not re-date cached evidence or replace unknowns with
zero. A saved presentation timestamp is separate from the observation windows.

Observed pool counts use explicit roles and captured campaign memberships, not
provisional percentage allocations. A mailbox shared across lanes is counted in
both lane cards; the overlap indicator explains this. Standby requires designation;
readiness separately requires passing health, age and membership gates. Partial
scope never establishes the absence of stock elsewhere. The rehearsal uses assumed
inventory only in its simulation view. Campaign totals are lifetime where provided;
domain send/bounce counts use the stated sending window. Warmup is not campaign
placement. Add optional nonnegative campaign `sent_count` / `bounced_count` values
only when observed; omit them when unavailable. Record campaign `lane_source`
as `explicit` or `name` so inferred labels remain visible in the dashboard.

## Public audience and data

For this requested workflow, use a public Claude Artifact in Claude and a public
Site in Codex, when the client's native tools support publishing. Public means
anyone with the URL can visit. Follow the installed hosting skill and native tool
contract. Do not use an iframe/private preview as proof of public access. If the
client cannot publish, leave the local dashboard, state the publication blocker,
and return no fabricated public URL. Dashboard publication does not authorize any
mailbox, campaign, DNS or purchasing changes.

The generated dashboard allowlist contains domain aggregates, DNS booleans,
warmup history, campaign names/status and synthetic simulation steps. It excludes
workspace IDs, original campaign IDs, mailbox addresses, raw notes and credentials.
Before first publication, ensure this aggregate content matches the user's
requested audience. Keep customer files in ignored `swap/`; commit only synthetic
examples to the kit repository. Never deploy the entire swap directory or the
secondary report, which can contain private notes.

## Reuse identity on every run

Record client, public audience, dashboard URL, project/artifact ID and (for Sites)
absolute source directory in ignored `swap/swap.md` frontmatter. For example the
field names are `dashboard_client`, `dashboard_audience`, `dashboard_url`,
`dashboard_project_id`, `dashboard_site_directory`. Save returned version and
deployment IDs there after successful publication. Do not store hosting tokens.

For a Site, keep its source in an isolated ignored directory, with
`.openai/hosting.json` declaring the saved project ID and static directory `dist`.
With `dashboard_site_directory` and `dashboard_project_id` configured, each report
also refreshes that source's `dist/index.html`, after checking manifest identity.
The explicit `--site-dir <absolute-path>` export option supports initial setup.

Then use the Sites skill's source helper to push/package that exact source, save
the matching version and deploy to the existing project. Preserve the audience;
never create a new Site per run. Tokens travel only through the documented hidden
stdin flow. Publication is an agent step, not an implicit network call in the
report script. Reconcile an existing deployment before retrying it. Save the
successful URL/version and show it in the final response. If publication fails,
keep the previous successful deployment and identify the unpublished local run.

For Claude Artifacts, update the same artifact using the generated standalone HTML
and the client's supported public-publishing workflow. Preserve its identity and
public audience, and verify the returned public URL. If Claude Code has no Artifact
publishing surface, use a supported public Sites tool if available, or report the
hosting limitation. Do not pretend that writing HTML creates a public Artifact.
