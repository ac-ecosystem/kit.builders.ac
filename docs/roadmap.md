# Delivery plan

## First milestone: connections and targeting

Ship `start.md`, the project MCP settings, and `ac-getting-started`. Public OAuth
discovery is checked separately from authenticated acceptance. The user has asked
to defer authentication during development; do not mark Notion 1.2–1.4 complete
until the fresh-client acceptance run in `acceptance.md` is actually observed.

Public distribution uses the builders.ac website's allowlisted static assets:
`/start.md` and `/skills/ac-getting-started/`. Source stays in this private repo;
visitors do not need GitHub access. The website records the source commit and
file hashes. Public availability must be verified after deployment separately
from committing and pushing the site.

## Next focused skills

| Skill | Outcome | Important conditions |
| --- | --- | --- |
| `ac-prospecting` | Small sample, then verified prospect list via Treg | Confirm targeting and spending limit; preserve source/recency; separate invalid and uncertain addresses; sample before expanding |
| `ac-infra` | Suitable inboxes connected to the selected sequencer | Reuse tenant-owned resources; discover current capability; wait for async completion; assess readiness before sending |
| `ac-campaign` | Reviewed copy and draft campaign, then requested activation | Reuse connected sequencer; check recipient suppression, sender capacity, schedule, unsubscribe handling; reconcile retries; verify live state |

Implement and validate each with real provider capabilities before advertising it.
Keep conditional best practices in the relevant skill or reference. API and MCP
tools execute operations; a skill alone cannot add a missing campaign endpoint.

## Findings that affect the next milestone

- Existing sending.ac sequencer credentials can be reused server-side. Public
  provider-account responses intentionally never return them.
- Current provisioning MCP does not expose campaign creation or activation.
  Choose and verify a campaign execution path before promising an end-to-end run.
- The source implementation returns `not_implemented` for domain purchases;
  new domain acquisition cannot be assumed to work through that tool.
- The Notion acceptance specifies Smartlead. Confirm the intended demo sequencer
  against the user's current connection instead of migrating their production
  sender fleet to match a stale brief.

A small server-side sequencer adapter could reuse stored keys and keep onboarding
to two MCP connections. This is a proposed backend change, not part of this kit
release. Native sequencer integrations are another option if speed is the priority;
they introduce an additional connection and must be tested explicitly.
