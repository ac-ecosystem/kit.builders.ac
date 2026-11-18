# GTM engineer: campaign and swap pilot checklist

The scripts review saved evidence and simulate a mailbox pair. They do not run a
background swap service. The first integration is a manually invoked agent using
already authenticated PlusVibe MCP. Only one operator/executor may run it. Merge
readiness is not proof of production execution.

## Before launch

- [ ] Record the exact PlusVibe workspace and parent campaign IDs. Identify the
  lane explicitly: Primary for verified deliverable leads, Catch-all for the
  chosen Catch-all segment. Keep recipient lists and sender domains separate.
- [ ] Freeze the exact sending mailbox list and current limits/intervals. Check
  every mailbox's other campaign commitments, actual available capacity and
  provider recovery state. Prefer senders dedicated to this pilot: mailbox stats
  combine sending across campaigns and do not prove campaign attribution. Do not
  change warmup or rotation settings for this pilot.
- [ ] Verify Primary domains have no prior Catch-all designation/assignment.
  A previously Catch-all domain and all siblings stay excluded from Primary.
  Unknown history is not clean. The saved showcase had shared lane assignments;
  do not treat that old sample as an approved launch list.
- [ ] Record explicit Primary / Catch-all / Standby domain designations in ignored
  swap/swap.md. For each standby mailbox, record its target lane and verified
  Catch-all history. No percentage allocation is required.
- [ ] Identify at least one exact qualified spare for each provider/lane exercised
  in the pilot. It needs ≥15 known warming days, fresh passing SPF/DKIM/DMARC/MX,
  ≥90% inbox among ≥50 classified warmup results over seven complete UTC dates,
  usable capacity and no campaign attachments of any status. Check separation
  from failing domains/tenants/IPs before using it. A 14-day stats chart alone
  does not prove 15 days of warming.
- [ ] Collect fresh individual mailbox evidence and full relevant memberships
  through authenticated MCP. Keep exact IDs/addresses private. Domain totals
  alone cannot select a source or qualify a standby. Record exact campaign
  assignment counts from membership reads, not domain totals.
- [ ] Run ac-swap in dry-run. Review the exact source candidates, warnings,
  provider/lane shortages and exclusion reasons. Resolve missing or conflicting
  evidence. Run node scripts/swap-workspace.mjs check.
- [ ] Name the campaign operator and the person who can stop sending. The agent
  cannot launch/pause campaigns. No spare or failed verification leaves the
  source attached, which does not stop an unhealthy mailbox from sending.

## Launch and observe

The GTM engineer launches through the normal campaign workflow. Launch does not
start an engine. Invoke the agent manually after the first batch to inspect
membership, capacity and provider errors, then review after each complete UTC day.
Do not create a schedule until explicitly requested and exclusive execution is
established.

| Rule | What to expect |
| --- | --- |
| Warmup <90%, ≥50 classified results, seven complete UTC dates | Mailbox recovery candidate; not its healthy peers |
| Sender bounce rate ≥3% AND ≥3 sender-side bounces in three complete UTC days | Mailbox candidate; confirm sender-related diagnostics before a live swap |
| One or two sender bounces above 3% | Warning, no bounce-based candidate |
| Recipient-address/list failures | List review, not automatic sender replacement |
| Fresh DNS failure | Configuration review; investigate before deciding |
| Missing/stale evidence or unknown sending rate | Unverified; do not invent a healthy state or execute from cached failures |

The bounce rule uses the three most recent complete UTC dates, ending yesterday;
it does not require three active sending days since launch. The warmup window
also ends yesterday. These rules do not provide an intraday circuit breaker
for a campaign launched today. Manually inspect PlusVibe errors during the first
sending batches; the operator handles any urgent stop.

## Before enabling real swaps

- [ ] Separately authorize live mode, with exact active campaign IDs and standby
  inventory. A merge, campaign launch or dry-run does not grant this authorization.
- [ ] Perform one supervised provider membership test under operator-controlled
  sending conditions. Use an explicitly selected pair; do not falsify health
  evidence or deliberately damage sender reputation to trigger a test. A forced
  test is outside normal policy and needs a separately scoped procedure; it is
  not an existing report-script command. Draft campaigns are never mutated by
  the operational swap loop.
- [ ] Verify the exact sequence against PlusVibe: reserve pair → preserve limits
  → attach spare → read back → remove source → read back. Check campaign tags
  cannot change an excluded campaign. Confirm the source's healthy peers stay put.
- [ ] Prove interruption handling: retain the same pair, inspect remote state,
  never reuse a reserved spare, and do not detach after failed verification.
  Re-running must not create another swap or silently increase sending capacity.
- [ ] Record actual outcomes in actions.csv. Only call the swap successful after
  remote read-back. A local simulation or structurally valid journal is not proof.

The remaining implementation/verification work is a dependable live execution
path with reservation, exclusive execution and interruption reconciliation. The
repository currently provides the reviewer, local model and agent procedure; it
does not provide a tested production runner. No automatic purchasing or return of
recovered mailboxes to sending is part of V0.
