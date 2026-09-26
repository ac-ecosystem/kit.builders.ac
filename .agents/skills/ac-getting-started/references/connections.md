# Connect builders.ac and Treg

Read https://builders.ac/start.md for the current client-specific configuration
and authentication procedure. In a development checkout, use the root start.md.
Use only the current client's configuration. Codex, Claude Code, Cursor, Gemini
CLI, and OpenClaw use different locations; do not apply Claude's JSON everywhere.

Reuse working connections. Keep these states separate: configured, authenticated,
and a successful tool call in the current session. Native OAuth can require
project approval and a reconnect. Never claim that tools became available merely
because a file was written. Honor requests to defer authentication.

Use builders.ac MCP and Treg's official CLI for local coding agents. After adding
builders.ac configuration, prefer an exposed native authentication tool; otherwise
execute the client's supported native login yourself:
`codex mcp login <builders-server-name>` or `claude mcp login <builders-server-name>`.
Run login directly without output-filtering pipelines; use a PTY when required.
If unavailable, discover the client's native authentication tool or control.
Follow start.md's shared flow for every client: open the exact URL issued by the active
native flow yourself, retaining its callback listener. Do not construct OAuth
URLs or ask for callback URLs or authorization codes in chat. If a newly added
server is absent from Claude's `/mcp`, use a documented reconnect or one resumable
session restart before asking for approval there again.
Discover builders.ac schemas and call `me` in the current session.

Follow start.md to install Treg's official package directly with `uv` or `pipx`
if missing. Do not run the general shell installer, which bootstraps other clients.
Run `treg login`, then verify with `treg balance` plus a read-only
`treg catalog search "email verification"`. Request native command approval when
needed; do not broaden session permissions or hand executable work to the user
when a supported execution and approval path is available.
Do not add Treg MCP for this local workflow. A builders.ac reconnect does not
block Treg CLI setup. Report each service's authentication and verification status
separately; never claim a live MCP check from a configuration or login result.
Check tool-level errors as well as HTTP status. No paid calls are needed. Do not
copy credentials between clients, ask for secrets in chat, or default to an
internal Treg team. A customer selects their own team at consent.

Record date, client, successful tool/CLI checks, and blockers in `.kit/setup-status.md`.
In Git repositories, ensure `.kit/` and `runs/` are ignored before writing reports
or briefs. Do not create a standalone `.gitignore` in a non-repository.
Keep account identifiers, raw responses, balances, credentials, and authorization
URLs out of reports. Recheck tools in later sessions instead of trusting a file.

If the user cannot authorize now, finish the files and clearly report live
checks as pending. Do not repeatedly request authorization.
