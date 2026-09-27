# Campaign handoff contract

`campaign.md` defines the shared sequence and settings. `campaign.csv` is the
provider-importable lead table. Together they describe exactly what the user can
import and turn on; neither artifact authorizes or performs a remote mutation.

## Fixed CSV schema

Use this exact UTF-8 header and column order:

```csv
email,first_name,last_name,company,website,title,subject_angle,personalization
```

Derive every row from one `eligible=true` row in `prospects.csv`:

- Normalize `email` to lowercase and use it as the stable join key.
- Copy the identity and company fields from the canonical prospect row.
- `subject_angle` is a short lead-specific phrase used by the shared subject.
- `personalization` is one concise, evidence-backed opening or relevance block.
- Keep each variable portable plain text. Do not place HTML, markdown, JSON,
  formulas, secrets, tracking parameters, or complete unrelated email sequences
  in a cell.

CSV must follow RFC 4180 quoting. Reject cells beginning with `=`, `+`, `-`, or
`@`; silently prefixing them changes campaign content and is not acceptable.
Reject duplicate emails and rows whose source prospect is absent or ineligible.

## Template model

Sequencers hold shared sequence steps and merge lead variables at send time. Use
double-brace placeholders in `campaign.md`, for example:

```text
Subject: {{subject_angle}}

Hi {{first_name}},

{{personalization}}

<shared offer and CTA>
```

Every placeholder used by a template must be a column in `campaign.csv`, and
every required value must resolve for every row. Standard provider mappings may
rename fields during import; record the exact mapping in `campaign.md`. If the
selected provider uses different placeholder syntax, show both the canonical
template and the provider translation.

Do not use one `generated_body` variable as the entire campaign by default. It
is technically possible on providers with arbitrary custom variables, but it
removes campaign-wide control and makes review, formatting, follow-ups, and A/B
variants harder. Use full-body variables only when the user explicitly chooses
that tradeoff.

## Readiness boundary

Keep `campaign.csv` header-only until the campaign handoff is intentionally
prepared. A run is `ready_for_launch` only when:

1. `campaign.md` contains the complete shared sequence and provider mapping.
2. `campaign.csv` contains at least one eligible recipient.
3. Every row renders every step without an unresolved or blank placeholder.
4. Counts, exclusions, provider/workspace, and planned senders are recorded.
5. The run workspace validator succeeds.

At that point stop. Do not authenticate to the provider, import the CSV, create
a remote campaign, send email, or activate anything. The user performs those
steps in the sequencer.
