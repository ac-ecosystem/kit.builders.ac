# Connect builders.ac and Treg

Read https://builders.ac/start.md for the current client-specific configuration
and authentication procedure. In a development checkout, use the root start.md.
Use only the current client's configuration. Codex, Claude Code, Cursor, Gemini
CLI, and OpenClaw use different locations; do not apply Claude's JSON everywhere.

Reuse working connections. Keep these states separate: configured, authenticated,
and a successful tool call in the current session. Native OAuth can require
project approval and a reconnect. Never claim that tools became available merely
because a file was written. Honor requests to defer authentication.

Discover schemas and call builders.ac `me` plus Treg `my_tools` or `balance`.
Check tool-level errors as well as HTTP status. No paid calls are needed. Do not
copy credentials between clients, ask for secrets in chat, or default to an
internal Treg team. A customer selects their own team at consent.

Record date, client, successful tool names, and blockers in `.kit/setup-status.md`.
Ensure `.kit/` and `runs/` are Git-ignored before writing reports or briefs.
Keep account identifiers, raw responses, balances, credentials, and authorization
URLs out of reports. Recheck tools in later sessions instead of trusting a file.

If the user cannot authorize now, finish the files and clearly report live
checks as pending. Do not repeatedly request authorization.
