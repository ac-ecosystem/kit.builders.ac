---
status: accepted
---

# Swap V0 is an agent skill with local reports

V0 runs in the customer's agent through already authenticated sequencer and
optional builders.ac MCP connections. The agent collects evidence; an offline
helper calculates pool recommendations and renders a local system/scenario
report. No database, worker, hosted dashboard or Slack app is needed.

The workflow is manual-first and starts in dry-run. One run replaces the former
scan/placement/decide loop. Slack approvals and the proposal queue were removed
from V0 on 2026-11-17. A live procedure requires explicit user authorization and
configured scope, but per-swap Slack decisions are not part of it.

## Consequences

- A report can explain and forecast a real incident without live changes or a
  known backup inventory, provided assumptions remain explicit.
- Provisional pool mapping is inspectable and repeatable, not optimized or
  automatically deployed.
- Each run stores normalized evidence, a latest Markdown/HTML report, a summary
  history and a separate action journal. Detailed old reports are not archived.
- Scheduling is optional and created only on request through the agent client.
- A later service may own reliable scheduling, shared state and replenishment;
  V0 does not claim those capabilities.
