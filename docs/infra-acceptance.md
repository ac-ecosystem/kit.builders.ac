# Infrastructure acceptance: item 2.1

The implementation is available; authenticated end-to-end acceptance is pending.
Use an authorized test account, an owned test domain, and sufficient paid slots.
Run in Claude Code from a fresh clone; repeat discovery/resumption in Codex.
Never use customer production infrastructure merely to validate a skill change.

## Live run

1. Invoke `/ac-infra`: “set up infrastructure for <owned test domain>.” Verify
   builders.ac identity and workspace selection without requiring Treg login.
2. Agree on 50 inboxes and their names for an empty domain, or a supported top-up
   for an existing one. Confirm the agent explains reservations and reuses assets.
3. Observe connect acceptance, nameserver handling where required, Operation
   polling, and domain `active` before inbox creation. Verify a status read can
   use OAuth collection tools without obtaining mailbox passwords.
4. Interrupt after an accepted mutation. Restart and ask to continue. Verify the
   checkpoint reuses the same Operation/key instead of creating duplicate work.
5. Verify every expected mailbox is active, using all pages. Compare requested
   addresses and display names, including numeric suffixes and Unicode if used.
6. If sequencer connection is requested and entitled, select an existing test
   registration/workspace. Verify binding and each inbox's upload state and remote
   ID. No campaign activation or strategy change is implied.
7. Repeat the same request. Verify it reuses the completed resources. Record any
   actual health failures or unmeasured checks separately from provisioning.

## Offline scenario review

Use synthetic tool responses when a live failure would be disruptive. These are
behavioral acceptance cases, not claims that a live provider was exercised.

| Scenario | Expected behavior |
| --- | --- |
| Five inboxes requested on an empty domain | Explain allowed totals; no silent expansion to 50 |
| Domain has 50 occupying inboxes, user wants 75 total | Add 25, not 75; pending/failed rows included in capacity reasoning |
| Target appears after the first list page | Find and reuse it; no duplicate connect |
| Domain is in another workspace | Resolve mismatch before mutation |
| Domain is active and requested inboxes exist | No reconnect or duplicate creation |
| Accepted request loses its response | Reconcile Operations/resources; exact key/body for retry |
| Existing Operation is running | Poll it; no cancellation, lock clearing, or new key |
| DNS allocation stays unavailable or quota is exhausted | Bounded retry only when appropriate, then precise blocker; no DB fixes |
| Connect is terminal failed with partial resources | Inspect remaining state before an authorized reconnect |
| Upload succeeds with fewer uploaded than requested | Report incomplete; inspect individual sequencer states |
| Domain already has another sequencer binding | Explain all-inbox replacement scope before changing it |
| Health is empty/unmeasured; inboxes are active | Report provisioned with health unknown, not ready for outreach |

Keep account/resource identifiers, request checkpoints and recordings private
under ignored `runs/`. Record client/version, date, observed tools, expected vs
actual counts, Operation states, restart result, and blockers. Never record tokens
or passwords. Item 2.2 still needs its own real campaign demonstration.
