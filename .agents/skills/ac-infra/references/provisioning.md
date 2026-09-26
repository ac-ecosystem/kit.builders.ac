# Provisioning MCP contract

Use live tool discovery as the authority for names, arguments and availability.
This guide reflects the v1alpha1 contract checked on 2026-09-27. Public references:
[MCP guide](https://docs.builders.ac/guides/mcp/) and
[OpenAPI](https://api.builders.ac/api/provisioning/v1alpha1/openapi.json).

## Tool selection

MCP tool names follow OpenAPI operation IDs. Path arguments such as `wsp`, `dom`
and `op` are top-level; request JSON belongs in `body`, and `Idempotency-Key`
becomes `idempotency_key`. Use actual returned public IDs, never guessed IDs.
Client tool prefixes may differ. Read tool-level errors, including `isError`,
even when the transport succeeds. Provisioning results wrap the API response as
`structuredContent.status`, `headers`, and `body`; read the Operation, page, or
problem from that `body`. Honor `Retry-After` when present.

| Purpose | Tools and important inputs |
| --- | --- |
| Identity/workspace | `me`, `listWorkspaces`; `createWorkspace` only when a new workspace is intended |
| Inventory/status | `listDomains` (`workspace_id`), `listInboxes` (`domain_id`, optionally `workspace_id`), `listOperations`, `getOperation` (`op`) |
| Connect owned domains | `connectDomains`: `wsp`, `idempotency_key`, `body.domains` containing objects with `name` and optional `external_id` |
| Repair incomplete domain | `reconnectDomain`: `dom`, `idempotency_key`; one domain per request |
| Create inboxes | `createInboxes`: `dom`, `idempotency_key`, `body.inboxes` containing `local_part` and optional `display_name`/`external_id`; alternatively `body.from_personas` with `persona_id` and `count` |
| Find sequencer | `listProviderAccounts`, `getProviderAccount`; select an existing registration and one of its `sequencer_workspaces` |
| Bind sequencer | `setDomainSequencer`: `dom`, `body.provider_account_id`, `body.sequencer_workspace`; returns a Domain, not an Operation |
| Upload inboxes | `uploadInboxes`: `idempotency_key`, `body.workspace_id`, `body.domain_ids`; returns an Operation |

List pages expose `data`, `has_more`, and `next_cursor`. Pass `next_cursor` as
`starting_after` with the same filters until complete. Do not count just the first
page or only `active` inboxes when planning capacity. Match the exact domain name
and ID within the selected workspace; avoid assuming a name filter exists.

OAuth can provision and read collection status. `getDomain` and `getInbox` are
secret-bearing retrieval tools and currently require API-key authentication.
Use collection results for non-secret readiness checks; do not ask for an API key
or mailbox passwords merely to poll status. Sequencer binding works through OAuth
without returning an SMTP password. Existing sequencer credentials stay server-side.

## Domain and capacity rules

- `connectDomains` accepts up to 50 owned names, all or nothing. Each new domain
  reserves 50 mailbox slots; connecting does **not** create inboxes. Purchase and
  renewal tools currently return `not_implemented`; do not promise acquisition.
- Reconnect preserves the domain ID and reserves no new slots. Active domains and
  domains being deprovisioned are not reconnectable. An in-flight resource claim
  must settle before another operation can use the domain.
- Create inboxes only on an `active` domain. The resulting capacity-occupying total
  must be **50, 75 or 150**. From zero, five is invalid; 50 is the smallest batch.
  From 50, adding 25 reaches 75. Ask before enlarging a user's smaller request.
- Pending and failed inboxes can occupy capacity too. The domain and its backing
  tenant each have an effective maximum of 150, and reservation growth must fit
  the account's paid slots. Other domains can share capacity. Public identity
  does not expose a slot balance; do not infer available paid slots from row
  counts or invent a capacity endpoint. Use exposed entitlement information if
  available and treat the mutation's typed capacity result as authoritative.
- Use either explicit inboxes or persona batches, not both. Persona references
  must be accessible in the intended workspace. Distinct addresses can share a
  display name; a display name is not a unique identifier.

## Sequencer scope and completion

A domain has at most one binding. Changing it replaces the previous destination
and requeues **all already-created inboxes** on the domain, including ones not
created by this run. Make that impact explicit and get authorization if it extends
beyond the requested setup. Do not silently move an existing sender fleet.

Binding already queues connection work. Read back the binding and inbox states
before submitting a redundant upload. When a separate upload is needed, its
snapshot includes all created, not-yet-connected inboxes on the named domains;
all domains must share the chosen workspace, sequencer account and sequencer
workspace. Omit `strategy` to preserve existing sending/warmup settings unless
the user requested a strategy change.

A `succeeded` upload may report `uploaded < requested`. Check each expected inbox's
`sequencer.state` (`not_uploaded`, `uploading`, `uploaded`, `failed`, or
`disconnected`) and destination/remote ID. Report skipped or failed inboxes as
incomplete. Binding success alone is not connection success. Neither operation
creates or activates a campaign.

## Retry and blocker handling

Persist one UUID idempotency key per intended operation and reuse the identical
arguments/key for a transport retry. A replay returns the same Operation; it does
not rerun a failed workflow. A changed plan is a new operation, only after resolving
the old outcome. Never rotate keys to bypass a conflict. PUT binding has no
idempotency key; reconcile its read-back after an uncertain response.

Poll `getOperation` until `done` is true, then inspect `state`, `error`, and
`response`. Terminal states are `succeeded`, `failed`, and `cancelled`; `done`
alone is not success. Completion can take time for DNS and Microsoft propagation.

| Problem | Next action |
| --- | --- |
| `domain_already_exists` | Resolve the returned owned domain ID and workspace; reuse or inspect its existing run |
| `domain_unavailable` | Stop that name; do not attempt to claim another account's resource |
| `resource_operation_in_progress` | Inspect/poll the existing Operation; no new mutation |
| `domain_not_reconnectable` | Re-read lifecycle state; do not force reconnect |
| `domain_inbox_count_invalid` | Explain `current`, `requested`, `resulting`, `allowed_totals`, `allowed_additions`; agree on a supported total |
| Capacity/quota refusal | Report returned capacity details; resolve entitlement or reduce agreed scope, never edit account allocations |
| `account_not_provisioned` | Allow bounded retries with the same request when retryable; persistent DNS allocation failure needs operator support |
| `mailbox_upload_unavailable` | Domain/mailbox provisioning can be reported separately; sequencer connection is blocked by entitlement |
| Authentication/permission refusal | Repair the customer's connection or report missing access; no internal credentials |
| Rate limit or transient service failure | Honor retry guidance, reconcile uncertain mutations, and back off within the run's wait budget |

For persistent failures, save the Operation ID, public problem code, correlation
ID, last state/time and affected resources in the private checkpoint. Explain the
specific blocker without guessing at internal locks, company profiles or provider
credentials. Do not alter production databases or infrastructure from this kit.
