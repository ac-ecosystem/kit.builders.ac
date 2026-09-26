# Validation status

Date: 2026-09-26

## Observed

- Node v24.18.0 ran `scripts/check-endpoints.mjs` successfully for both servers.
- Both endpoints returned the expected unauthenticated HTTP 401 challenge and
  valid resource metadata identifying their respective MCP URLs.
- Claude Code 2.1.283 recognized both project entries from `.mcp.json`. Both
  reported pending project approval, correctly preserving the native trust flow.
- A native Claude Code login attempt stopped at pending project approval.
  No OAuth login completed. Further authentication attempts were explicitly
  deferred by the owner.

## Local verification

The skill frontmatter, reference paths, JSON/TOML agreement, shared Claude skill
link, and package contents are checked locally before handoff. These checks do
not grant account access or establish successful MCP tool execution.

## Still unverified

- Native OAuth completion for either service in either client.
- Authenticated tool discovery and .ac `me` plus Treg `my_tools`/`balance` in
  the same session.
- Restart with retained authentication and the complete clean-machine flow.
- Public download or deployment of `start.md`.

Tasks 1.2–1.4 remain pending their live acceptance evidence. Implementation is
ready for that test; no authentication should be requested while the owner is away.
