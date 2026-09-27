# Lifecycle acceptance

Run these checks from a fresh public clone. Static validation proves packaging;
authenticated checks prove discovery and prospecting. Campaign acceptance may
create an inactive provider draft but never delivers email.

## Static

1. Run `node scripts/validate-kit.mjs`.
2. Run `node scripts/run-workspace.mjs init acceptance-test`.
3. Confirm the run contains exactly the seven documented artifacts and
   `node scripts/run-workspace.mjs check acceptance-test` succeeds.
4. Confirm both CSV files have their documented fixed headers.
5. Add an unexpected file and confirm the check fails; remove the entire ignored
   `runs/acceptance-test/` directory afterward.

## Targeting and prospecting

1. Give the agent a company website and confirm it initializes one run, presents
   audience choices, and records the confirmed brief without extra files.
2. Ask for a small sample. Confirm it inspects the live Treg catalog and price
   before paid calls, records the observed source and cost, and does not expand
   without the agreed ceiling.
3. Confirm every campaign-eligible row has a decisive independent verification
   result and every rejected or uncertain row remains visible with a reason.

## Infrastructure

Follow [infra-acceptance.md](infra-acceptance.md). Confirm the same run is reused
and the verified remote state is recorded in `infrastructure.md`.

## Campaign handoff

1. Confirm the agent discovers the connected provider and workspace through
   builders.ac without asking for a provider or Provisioning credential.
2. Confirm `campaign.md` contains shared sequence steps, explicit placeholders,
   schedule and safety settings, planned senders, and the exact provider mapping.
3. Confirm `campaign.csv` contains exactly one row for every selected
   `eligible=true` prospect and no rejected, uncertain, or duplicate address.
4. Render every row locally and confirm no placeholder is unresolved or blank.
   Check a sample against its saved public evidence and reject one fabricated or
   formula-like value.
5. With no provider MCP loaded, confirm the agent preserves the artifacts, marks
   the run blocked, and plainly reports that it cannot create the remote campaign.
   It must not edit MCP configuration or ask for a provider credential.
6. In a separate disposable workspace with the matching provider MCP already
   loaded and authenticated, confirm the agent creates a new inactive campaign,
   configures the reviewed sequence and settings, assigns only the intended
   senders, imports exactly the eligible CSV rows, and reads the result back.
7. Confirm `run.md` becomes `ready_for_launch` only after the local validator and
   remote status/count checks pass.
8. Confirm the agent stops while the campaign is still inactive. It must not call
   any activate, launch, start, resume, send, preview, or test-email operation.

## Manual provider check

For each provider advertised as supported, use a disposable draft owned by the
maintainer and verify the documented column mapping, placeholders, sequence,
sender assignment, imported count, and inactive status in the provider UI. Do
not launch it. Record provider-specific mapping corrections in the campaign
reference before claiming support.
