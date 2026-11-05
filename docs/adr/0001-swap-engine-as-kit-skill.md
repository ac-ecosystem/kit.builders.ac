---
status: accepted
---

# Swap engine V0 is a kit skill; a hosted service comes later

The V0 swap engine (detect burned mailboxes, get a human approval, swap in warmed
standbys, replenish) ships as a kit skill, `ac-swap`, that runs in the customer's
own agent. It works only through MCP connections the customer has already
authenticated (builders.ac, their sequencer, Slack). Each sequencer gets a
reference file that maps the swap contract onto that vendor's tools. Approval is a
reply in a Slack thread, which the next run reads before acting. It is not an
interactive button.

We chose this over shipping a runnable worker plus a Slack app in this repository.
The kit is public, holds no credentials, and has no server to receive Slack button
clicks or run on a schedule. A worker would break all three properties. A skill
proves the swap loop on real data now. Scheduled runs, Slack buttons and a held
standby pool move to a hosted builders.ac service (V5/V10) once the loop is proven.

## Consequences

- Scheduling is the customer's responsibility (a routine or scheduled task in their
  agent client), so run cadence is best effort in V0.
- Approval latency equals the gap between runs. A reply only takes effect on the
  next run.
- Adding a sequencer means adding one reference file, not changing the skill.
