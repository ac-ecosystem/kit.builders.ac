# Treg prospecting contract

Use `treg catalog search` to discover current capabilities, then inspect the
selected endpoint with `treg catalog get <endpoint-id>` before calling it. Use
`treg call` exactly as the endpoint's live template and schema describe. Prefer
JSON output for parsing when the installed CLI supports it.

Current routed capabilities may include company search, people search, contact
enrichment, email discovery, and email verification. Names and providers are not
a permanent contract. On 2026-09-27, `treg.people.search` and
`treg.people.email.verify` were useful starting points, but discovery remains
authoritative.

Catalog search and schema inspection are not evidence that a paid data call
succeeded. Record the provider that actually served, the result's own source or
recency fields, the call time, and observed cost metadata. Respect async job IDs,
poll guidance, miss semantics, pagination, and provider rate limits.

## Spend and sampling

- Catalog cost can be per call, returned row, successful hit, credit, or async
  job result. Explain the relevant unit instead of multiplying unlike units.
- Treat a route's maximum cost as a ceiling, not the expected charge. Preserve
  route cost controls when the CLI exposes them.
- A paid full-list call requires an agreed ceiling. A prior request to explore an
  ICP does not authorize unbounded enrichment or verification spend.
- A miss is data, not an invitation to waterfall indefinitely. Stop when the
  agreed budget or provider policy says to stop.

## Evidence and normalization

Keep public source evidence that helps assess fit, not copied vendor payloads.
Normalize domains and emails to lowercase for matching while preserving names and
titles as returned. Do not merge two people merely because names match. Prefer a
stable source identifier when available.

Map verification outcomes conservatively:

| Canonical status | Meaning |
| --- | --- |
| `valid` | Endpoint explicitly says the mailbox is deliverable/valid |
| `invalid` | Endpoint explicitly says undeliverable, nonexistent, disposable, or blocked |
| `catch_all` | Domain accepts broadly and the individual mailbox is not proven |
| `unknown` | Check completed without a decisive result |
| `unverified` | No independent verification was performed |

When providers disagree, keep the latest results and describe the conflict in
`prospecting.md`; do not silently choose the optimistic answer. Never invent an
address from a naming pattern and mark it verified.
