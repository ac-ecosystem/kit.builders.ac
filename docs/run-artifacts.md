# Run artifact contract

Customer work lives under one Git-ignored `runs/<run-name>/` directory. A run is
one campaign idea for one company and audience. Reuse the matching run across
skills and sessions; create another only when the user starts a distinct idea.

Initialize a new run with:

```sh
node scripts/run-workspace.mjs init <run-name>
```

Validate it before reporting a phase complete:

```sh
node scripts/run-workspace.mjs check <run-name>
```

`run-name` is a short lowercase slug such as `acme-founders`. The initializer
creates the complete allowed layout:

```text
runs/<run-name>/
├── run.md
├── brief.md
├── prospecting.md
├── prospects.csv
├── infrastructure.md
├── campaign.md
└── campaign.csv
```

Do not add phase directories, raw response dumps, duplicate drafts, or names such
as `final-v2.md`. Keep temporary calculations in memory. If a tool requires a
temporary file, remove it after the result has been incorporated into the
canonical artifact.

## Shared dashboard

`run.md` is the human-readable source of truth. Keep its frontmatter current and
update its checklist, current decision, blocker, and next action after every
completed phase, accepted asynchronous mutation, or blocking result.

Allowed overall statuses are `planned`, `in_progress`, `blocked`,
`ready_for_launch`, `active`, and `completed`. Allowed phases are
`getting-started`, `prospecting`, `infrastructure`, `campaign`, and `complete`.
A phase file contains the detailed
evidence; `run.md` links to it rather than copying the detail.

## Phase ownership

| Skill | Canonical artifacts |
| --- | --- |
| `ac-getting-started` | `run.md`, `brief.md` |
| `ac-prospecting` | `run.md`, `prospecting.md`, `prospects.csv` |
| `ac-infra` | `run.md`, `infrastructure.md` |
| `ac-campaign` | `run.md`, `campaign.md`, `campaign.csv`; reads `prospects.csv`; may record one inactive remote draft |

`prospects.csv` keeps one normalized row per candidate and uses this fixed header:

```csv
company,website,first_name,last_name,title,email,source,source_checked_at,verification_status,verified_at,eligible,rejection_reason
```

`eligible` is `true` only for rows approved for campaign import. Rejected and
uncertain rows remain visible in the same file; campaign handoff must filter
explicitly to `eligible=true`.

## Privacy and resumption

`campaign.csv` is the one provider-importable handoff. It contains only eligible
lead identity fields and the reviewed personalization variables documented in
`campaign.md`. Do not add scripts, credential files, `.env` files, generated
payloads, or provider response dumps beside it.

When an already configured sequencer MCP creates a remote draft, record its
public campaign ID and verified inactive status in `campaign.md`; do not create a
new artifact for the provider operation.

Artifacts may contain customer-owned contact data and public resource IDs, so
keep them local and out of Git. Never store access tokens, API keys, passwords,
authorization URLs, mailbox secrets, raw tool responses, or internal database
IDs. Store the minimum public IDs, timestamps, exact non-secret mutation inputs,
and idempotency keys needed to reconcile or resume work.

Before creating a run, list `runs/` and inspect plausible `run.md` files. Never
fork a run merely because the session restarted or another skill took over.
