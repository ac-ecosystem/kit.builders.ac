# Connection acceptance: 1.2–1.4

Use a fresh copy of the kit with no project authentication. The user needs an
installed, signed-in Claude Code or Codex client and access to both services.
"Clean machine" does not mean the kit installs the AI client or creates paid
service accounts. Run the primary acceptance in Claude Code, as the brief requires;
repeat in Codex for compatibility.

## Procedure

1. Open the kit as the project, accept the client's trust prompt, and ask it to
   set up the kit. Do not manually edit JSON or TOML.
2. Confirm the builders.ac project server loads and the agent runs its native MCP
   login command or exposed native authentication flow. Confirm it installs the
   Treg package directly if missing and runs `treg login`, without bootstrapping
   other coding clients.
   Complete browser sign-in and choose the intended Treg team. No Treg MCP entry
   should be added.
3. In one session, list/discover .ac tools and call `me` successfully.
4. In that same conversation, run `treg balance` and a read-only
   `treg catalog search "email verification"` successfully. No paid data call is necessary.
5. Confirm the agent reports each connection accurately and asks for the company
   website. Website research may proceed while connection checks remain pending.
6. Restart the client. Confirm connections can reuse native saved authentication
   without asking for pasted keys or manual configuration edits.
7. Repeat setup and confirm it does not duplicate entries or erase other settings.

## Failure checks

- Cancel sign-in: setup remains incomplete and identifies the pending service.
- Wrong/missing team access: let the user choose the right team or obtain access;
  never fall back to an internal shared token.
- A tool returns `isError`: do not count HTTP 200 as success.
- Project not trusted or MCP not approved: explain the native prompt, do not
  disable client protections.
- Login requires a terminal: use a PTY or the client's available native auth tool;
  preserve the actual login result instead of reporting a pipeline's exit status.
- Browser does not launch: open the active client-issued authorization URL; keep
  its listener alive and verify completion. If no local browser can be launched,
  provide the active link or documented remote-login path without asking for
  callback codes in chat.
- New server absent from `/mcp`: reconnect or save progress for one restart;
  do not loop on approval instructions for an invisible server.
- Installer permission denied: request specific native approval if available;
  do not bypass the denial or modify session permission settings.
- Server unreachable: preserve the working connection and report the affected one.
- Config is missing or names conflict: follow the scoped repair in AGENTS.md.

## Evidence

Record date, client version, fresh-copy method, discovered tool names, the two
successful calls, restart result, and any blockers. Keep customer data and tokens
out of recordings and committed files. `.kit/setup-status.md` is ignored.

| Task | Required evidence |
| --- | --- |
| 1.2 | Fresh clone opens in Claude Code and lists authenticated .ac tools |
| 1.3 | .ac OAuth and a real tool call work with no hand-edited configuration |
| 1.4 | Treg CLI returns authenticated balance and catalog results in the same conversation |

Public endpoint checks and valid configuration files are prerequisites, not a
substitute for this acceptance run. Leave unchecked items open until observed.
