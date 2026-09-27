---
name: ac-infra
description: Set up email infrastructure for user-owned domains through builders.ac MCP, provision mailboxes, check progress, and optionally connect them to an existing sequencer account. Use for domain setup, mailbox capacity or provisioning, reconnecting failed domains, and resuming infrastructure runs.
---

# Set up email infrastructure

Turn “set up infrastructure for <domain>” into active domains and the requested
mailboxes through builders.ac MCP. Reuse existing resources and continue until
the requested outcome is verified or a specific blocker needs attention.
Campaign creation, activation, and sending are separate tasks.

## Establish the target

Read [the run artifact contract](../../../docs/run-artifacts.md). Reuse the run
for this campaign idea or initialize one before writing infrastructure state. Do
not create a standalone checkpoint or alternate run layout.

Verify the selected MCP endpoint against the requested environment before any
mutation. This kit currently targets UAT at `https://sending.ac.team/mcp`. A
successful login alone does not prove the environment; do not fall back to a
production connection. Record the endpoint with the account/workspace public IDs
in `infrastructure.md`, and recheck them when resuming.

Discover the connected builders.ac tools and their current schemas; call `me`
to verify the account. If unavailable, follow the builders.ac connection steps in
[connections.md](../ac-getting-started/references/connections.md). Infrastructure
does not require Treg or a completed targeting brief; skip those onboarding steps.
Use the authenticated customer's tools, never operator database or cluster access.

Resolve the intended workspace, owned domain names, mailbox total and identities,
and optional sequencer destination from the conversation and existing resources.
Ask only for missing decisions. Distinguish a requested final total from an
additional count. A bare domain request does not authorize silently creating
50 mailboxes: explain the supported totals and slot reservation before proceeding.
Honor authorization already given for a concrete setup; do not repeatedly ask.

Read [the provisioning contract](references/provisioning.md) before mutations.
Use list tools with workspace/domain filters and all pages to find existing
resources and work in flight. Reuse active domains and suitable inboxes; do not
reconnect or recreate them just to rerun this skill. If a resource belongs to a
different workspace than intended, resolve that mismatch before changing anything.

## Build the per-domain plan

Limit changes to the domains the user selected. Other failed domains discovered
in the account are not automatically part of the task. For each selected domain,
show current lifecycle state, active/pending/failed inbox counts, the agreed final
total, and the proposed action. Available slots are a ceiling, not an instruction
to spend them all. Use 75 per domain when that is the user's chosen target; do not
silently choose 150 to maximize usage.

For example, with an agreed target of 75 on each of two domains:

- An existing failed domain with zero inboxes needs an eligible `reconnectDomain`,
  then a verified active state, then creation of 75 inboxes. Do not call
  `connectDomains` for a name the account already holds or unlink its tenant/DNS.
- An active domain with 50 active inboxes needs 25 additional inboxes. Preserve
  the existing 50 and its sequencer binding; no reconnect is needed.
- If some inboxes are pending or failed, reconcile their Operations and capacity
  first. Do not interpret “75 active” as permission to over-create replacements.

The active domain's authorized top-up can proceed while another domain reconnects;
only creation on the recovering domain depends on its reconnect completing.
Ask for missing mailbox names/personas or permission to generate a naming pattern
once, before creation. If the user requested a proposal first, stop at the plan;
otherwise execute an already-authorized concrete plan without another approval.

## Provision and resume

1. State the concrete changes: domains to connect or repair, inboxes to reuse/add,
   final totals, known slot impact, and any sequencer binding change. If a needed
   decision changes scope or cost, obtain it before submitting that change.
2. Save a private checkpoint at `runs/<run-name>/infrastructure.md`. Before each
   mutation record its tool, exact non-secret arguments, and stable idempotency
   key when required; after acceptance add the Operation ID. Keep checkpoints
   out of Git and exclude credentials, passwords and raw tool responses.
3. Connect only missing, user-owned domains. For existing incomplete domains,
   inspect current Operations first; use reconnect only for an eligible domain
   after the previous run is terminal and the cause has been addressed.
4. Poll accepted Operations and read back domain state. If delegation is needed,
   show the returned nameservers and the exact registrar action still required.
   Do not claim it is automatic when no authorized registrar tool is available.
5. On active domains, create only the agreed missing mailboxes, respecting count
   and capacity rules. Preserve supplied display names, including numbers and
   Unicode. Do not invent identities or duplicate existing addresses.
6. If requested, reuse the chosen sequencer registration and bind/upload according
   to the contract. Verify individual inbox connections, not only the Operation.

On restart, recheck the account/workspace and checkpointed Operations before
continuing. A timed-out tool call has an uncertain outcome; reconcile it instead
of generating a new request. Failed or cancelled work may leave resources behind.
Inspect those resources before proposing repair; never delete them as a retry.

Honor server retry guidance. Without it, poll reads with a modest increasing
interval (for example 15, 30, then 60 seconds). After about ten minutes without
progress, save the last observed state and next read to resume; report pending,
not failed or successful. Continue longer if the user requested monitoring and
the client supports it. A new session must not depend on an in-memory timer.
Do not reset workflows, clear locks, rotate credentials, edit DNS, or cancel work
as an automatic response to a slow Operation.

## Verify the outcome

Read all relevant domain and inbox pages after completion. Compare the expected
addresses/counts with actual states and Operation results, including partial
failures. Report per domain:

- Domain state and observed health checks with their measurement time.
- Requested, active, pending, and failed mailbox counts.
- Sequencer destination and uploaded/pending/failed counts when requested.
- Outstanding DNS, capacity, entitlement, or provider blockers and the next action.

Keep “provisioned,” “connected to the sequencer,” and “ready for outreach” distinct.
An empty health result, an `unmeasured` check, or an old health timestamp does not
prove health. Active inboxes do not prove login, send/receive, warmup, or campaign
readiness. Summarize only verified outcomes and keep the private checkpoint usable
for the next session.
