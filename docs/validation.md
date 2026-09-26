# Validation status

Date: 2026-09-27

## Observed

- Node v24.18.0 ran `scripts/check-endpoints.mjs` successfully for both servers.
- Both endpoints returned the expected unauthenticated HTTP 401 challenge and
  valid resource metadata identifying their respective MCP URLs.
- Claude Code 2.1.283 recognized both project entries from `.mcp.json`. Both
  reported pending project approval, correctly preserving the native trust flow.
- A native Claude Code login attempt stopped at pending project approval.
  No OAuth login completed. Further authentication attempts were explicitly
  deferred by the owner.
- An anonymous shallow clone from the public GitHub URL included the project MCP
  settings, canonical skill, and Claude Code skill link without authentication.
- The deployed builders.ac landing page copied the public repository URL directly.

## Local verification

The skill frontmatter, reference paths, JSON/TOML agreement, shared Claude skill
link, and package contents are checked locally before handoff. These checks do
not grant account access or establish successful MCP tool execution.

## Still unverified

- Native OAuth completion for either service in either client.
- Authenticated tool discovery and .ac `me` plus Treg `my_tools`/`balance` in
  the same session.
- Restart with retained authentication and the complete clean-machine flow.

Tasks 1.2–1.4 remain pending their live acceptance evidence. Implementation is
ready for that test; no authentication should be requested while the owner is away.

## Updated local setup path

The current instructions configure builders.ac MCP only and use Treg CLI for all
local coding agents. The earlier two-MCP observations above describe the previous
flow. Codex CLI 0.157.1 reproduced a Treg MCP OAuth metadata decoding failure before
browser sign-in; public metadata checks alone did not detect that incompatibility.
The revised Treg CLI flow and complete fresh setup still require authenticated
acceptance. Repository availability and the landing-page link can be checked
independently.

## Infrastructure skill: item 2.1

- Added `ac-infra` with a shared Claude Code link and a provisioning reference.
- Checked tool names, argument mapping, OAuth collection reads, capacity rules,
  Operation handling, and sequencer semantics against the app's committed
  v1alpha1 OpenAPI and MCP dispatcher source on 2026-09-27. Public OpenAPI
  retrieval was unavailable during this check; live discovery remains authoritative.
- Repository validation and the skill-creator frontmatter validator pass.
- Reviewed the offline scenarios in `infra-acceptance.md` against the instructions;
  this is a static review, not an authenticated agent or provider test.
- No domains or mailboxes were provisioned for this change. Live item 2.1
  acceptance and the separate item 2.2 recording remain pending.
