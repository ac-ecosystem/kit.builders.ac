# builders.ac Deliverability signals

The builders.ac MCP exposes the public
[Deliverability API](https://docs.builders.ac/guides/deliverability/) as read-only
tools. They cover domains owned by the authenticated builders.ac account; domains
in invited workspaces and domains from other suppliers are not included. Use them
only for domains that also carry mailboxes in Covered campaigns.

If these tools are not listed in the session (an older builders.ac MCP, or a client
that has not refreshed its tool list), skip the domain signals, say so in the
dashboard, and continue with sequencer signals only.

## Tools used

| Tool | Arguments | Used for |
| --- | --- | --- |
| `listDomains` | workspace filter, all pages | Map domain names to `dom_` IDs |
| `getDeliverabilityBounces` | `range: 3d` (match `bounce_window_days`; allowed ranges are `1h`, `8h`, `24h`, `3d`, `7d`, `14d`) | Per-domain `sent`, `bounces`, `rate`, `rate_unavailable`, `sent_incomplete` |
| `getDeliverabilityChecks` | none, or `domain_id` | Current blacklist overview (`zone`, `status`: `clear` / `listed` / `unknown`) and the check catalogue |
| `getDeliverabilityCheckResults` | `check: blacklist:<zone>`, `date` (today) | Which domains are listed on that zone |

## Domain flags

1. **Blacklist.** From `getDeliverabilityChecks`, take every blacklist with status
   `listed`. For each, call `getDeliverabilityCheckResults` with `check` set to the
   catalogue ID for that zone and today's date. Flag every covered mailbox on each
   domain whose verdict is listed. Show the zone name in the proposal. Treat
   `unknown` as no signal.
2. **Domain bounce.** From `getDeliverabilityBounces`, flag every covered mailbox
   on a domain whose `rate` is at least `domain_bounce_rate_threshold` and whose
   `sent` is at least `domain_bounce_min_sends`. If `rate` is null, skip the domain
   and show its `rate_unavailable` reason in the dashboard. If `sent_incomplete` is
   true, mention it next to the number.

These numbers come from the builders.ac message trace, so they exist only for
mailboxes builders.ac hosts. Other mailboxes rely on sequencer signals.
