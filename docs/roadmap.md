# Delivery plan

## First milestone: connections and targeting

Ship `start.md`, the project MCP settings, and `ac-getting-started`. Public OAuth
discovery is checked separately from authenticated acceptance. The user has asked
to defer authentication during development; do not mark Notion 1.2–1.4 complete
until the fresh-client acceptance run in `acceptance.md` is actually observed.

Public distribution uses this repository directly. The builders.ac website links
to `https://github.com/ac-ecosystem/kit.builders.ac` and does not vendor
`start.md` or skill files. Public availability must be verified after pushing the
kit and landing-page changes.

## Infrastructure implementation

`ac-infra` is implemented for Notion item 2.1: owned-domain setup, mailbox
provisioning, progress/resumption, and optional sequencer connection. Its live
acceptance is pending [infra-acceptance.md](infra-acceptance.md). This does not
complete item 2.2, the recorded end-to-end campaign run.

## Lifecycle skills

| Skill | Outcome | Important conditions |
| --- | --- | --- |
| `ac-prospecting` | Small sample, then verified prospect list via Treg | Implemented; authenticated acceptance pending |
| `ac-campaign` | Reviewed shared sequence and import-ready personalized CSV | Implemented as a credential-free handoff; provider import and activation remain user-controlled |

Validate the handoff against the import rules of each advertised provider before
calling it portable. Keep conditional best practices in the relevant skill or
reference.

## Findings that affect the next milestone

- Normal provider-account responses intentionally exclude credentials. Campaign
  handoff does not need them because it stops before any provider mutation.
- Sequencers combine shared templates with standard and custom lead variables.
  `campaign.csv` carries those variables while `campaign.md` carries the shared
  sequence and provider mapping.
- The source implementation returns `not_implemented` for domain purchases;
  new domain acquisition cannot be assumed to work through that tool.
- The Notion acceptance specifies Smartlead. Confirm the intended demo sequencer
  against the user's current connection instead of migrating their production
  sender fleet to match a stale brief.

The campaign CSV and placeholder mapping must be acceptance-tested against each
advertised provider's import UI before claiming portability.
