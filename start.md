# Set up builders.ac

Configure builders.ac and Treg in the agent running this conversation, install
our getting-started skill, then complete native authentication.
No builders.ac CLI, GitHub account, repository clone, or ZIP is needed.
This release connects tools and guides website/ICP discovery; campaign execution
is a later milestone. Preserve any explicit request to defer authentication.

## Execution contract

Follow the section for the current client exactly and in order. Do not substitute
another scope, installer, transport, or authentication method. Execute supported
setup and login commands yourself; do not hand the user a command checklist. The
normal user actions are required project trust or MCP approval, browser sign-in
and consent, and a client restart when its documented reconnect cannot load a
new server. Do not stop before attempting every step the current process can
perform and recording the observed result.

## 1. Configure builders.ac MCP

- builders-ac: `https://mcp.builders.ac/mcp`
- Treg: use its official CLI for local coding agents; do not add a Treg MCP entry.

Identify the current client. Use the current project/workspace and preserve all
unrelated configuration and existing credentials. Reuse an enabled builders.ac
server with the same URL, including one under another name, instead of duplicating
it. Merge only missing entries; if an existing name points elsewhere, explain
the conflict before replacing it.
Never disable trust or approval controls. Do not configure other installed clients.
If the current directory is a container for several repositories rather than the
intended working project, clarify the destination before writing parent-level
configuration. Do not silently install across sibling projects.

### Codex

Use the current working directory as the project. Inspect the user and project
Codex configuration without printing unrelated settings or credentials. Compare
canonical URLs after ignoring only a trailing slash. If an enabled server already
points to `https://mcp.builders.ac/mcp`, reuse its existing name. Otherwise merge
this entry into the project's `.codex/config.toml` (trusted projects only):

```toml
[mcp_servers.builders-ac]
url = "https://mcp.builders.ac/mcp"
```

Do not use `codex mcp add`: this setup is project-scoped, not user-scoped. Do not
add a duplicate under a different name.

### Claude Code and Cursor

Use `.mcp.json` for Claude Code, `.cursor/mcp.json` for Cursor:

```json
{
  "mcpServers": {
    "builders-ac": { "type": "http", "url": "https://mcp.builders.ac/mcp" }
  }
}
```

### Gemini CLI

Merge into `.gemini/settings.json`. Use `httpUrl` for Streamable HTTP:

```json
{
  "mcpServers": {
    "builders-ac": { "httpUrl": "https://mcp.builders.ac/mcp" }
  }
}
```

### OpenClaw

Check the installed version's native MCP support before editing. On versions
supporting `mcp.servers`, merge this entry into the active OpenClaw configuration
(normally `~/.openclaw/openclaw.json`, which may be shared across agents):

```json
{
  "mcp": {
    "servers": {
      "builders-ac": { "url": "https://mcp.builders.ac/mcp", "transport": "streamable-http", "auth": "oauth" }
    }
  }
}
```

Explain shared configuration scope before applying. Use the active operator's
native OAuth flow. If this version lacks native remote MCP/OAuth, report the
compatibility limitation and consult its official docs; do not silently install
bridges or use shared tokens. Node-hosted and Gateway configuration differ.

## 2. Install the getting-started skill

Download these public files, preserving their names and relative layout:

- https://builders.ac/skills/ac-getting-started/SKILL.md
- https://builders.ac/skills/ac-getting-started/references/connections.md
- https://builders.ac/skills/ac-getting-started/references/targeting.md

Use the current client's destination:

| Client | Skill directory in the project/workspace |
| --- | --- |
| Codex | `.agents/skills/ac-getting-started/` |
| Claude Code | `.claude/skills/ac-getting-started/` |
| Cursor | `.cursor/skills/ac-getting-started/` |
| Gemini CLI | `.gemini/skills/ac-getting-started/` |
| OpenClaw | `skills/ac-getting-started/` in the active agent workspace |

Read before installing. Do not overwrite user-customized skills without resolving
the difference. Use normal files; no symlinks are required. Keep runtime reports
in `.kit/` only when needed to resume, and customer briefs in `runs/`. In a Git
repository, ignore those paths without altering other entries; do not create a
standalone `.gitignore` in a non-repository just to report setup activity. If no project is open, establish a
new working folder with the user before writing files. These instructions can
also be followed directly when a client cannot hot-load the installed skill.

## 3. Authenticate and check

Reuse working connections. Own the setup through verification instead of ending
with a checklist of commands for the user. Start supported native login commands
yourself when authentication is in scope; the user completes project trust,
sign-in, and consent. An explicit request to defer authentication overrides this.
Explain the next browser action briefly, wait on the login process, then continue
from its result. Do not ask the user to report success when the process can report
it. Never capture or replay browser credentials or consent on the user's behalf.
Never request passwords, OTPs, or API keys in chat. For Treg, the user chooses
their own team; never use a shared company token.

### builders.ac: native MCP authentication

Use the existing builders.ac server name if reused; otherwise use `builders-ac`.

- Codex: execute `codex mcp login <builders-server-name>` from the project.
  Wait for the command result. If the server is not found, inspect the effective
  configuration and scope; report a trust blocker only when supported by the
  client's output. A startup trust warning alone does not prove login is blocked.
- Claude Code: after writing or reusing the configuration, check `claude mcp --help`.
  If `login` is supported, execute `claude mcp login <builders-server-name>`
  yourself from the project, using an interactive terminal if needed. Wait for
  the command result and continue verification. Do not stop at configuration or
  merely tell the user to run the command. If an actual pending-project-approval
  error blocks login, ask the user to open `/mcp` and approve that server, then
  retry. Use native authentication through `/mcp` only if CLI login is unavailable.
- Cursor: use the native MCP connection/authorization controls in settings.
- Gemini CLI: use `/mcp auth <builders-server-name>`.
- OpenClaw: use native MCP authentication for the installed version; consult its
  help rather than inventing CLI commands.

### Treg: official CLI

For local coding agents, follow Treg's local setup path at https://treg.to/llms.txt.
Reuse an installed CLI and working login. If `treg` is missing, read the official
installer and run it yourself:

```sh
curl -fsSL https://treg.to/install.sh | sh
```

Check the installer's output for the executable location if this shell does not
pick up the updated PATH. Execute `treg login`, let the user complete browser
sign-in and select their own team, then wait for the command result. Verify with
`treg balance` and one read-only `treg catalog search "email verification"`.
Use installed CLI help for team selection if it remains unset. Do not call paid
tools, add funds, or provision resources during verification.

Do not configure or authenticate Treg MCP for this local onboarding flow. If the
CLI cannot run in this environment, report the specific limitation and consult
Treg's current instructions; do not silently switch back to MCP or shared tokens.
Finish the Treg CLI steps even if builders.ac tools need a client reconnect.

### Verify and reconnect

Check whether this session can discover the newly configured tools. Prefer the
client's documented reconnect mechanism when available; do not invent a reload
command or assume every client hot-loads configuration. Request a restart only
when the tools remain unavailable and the installed client requires a new session.
If that handoff is necessary, save a short resume note with the pending checks and
provide one exact continuation prompt, including the working directory and resume
note path. Do not launch a nested agent session to pretend this session has tools.
Discover builders.ac tool schemas and call `me` in this session. Treg is verified
through the CLI checks above in the same conversation. A successful config write,
login, CLI config listing, or HTTP 401 is not a successful builders.ac tool call.
Record builders.ac MCP and Treg CLI outcomes separately. Do not spend credits,
provision resources, or send email during setup.
If authentication is deferred, report files ready and live checks pending.

## 4. Ask for the company website

Read the installed skill and follow its website-to-ICP workflow. Ask:
"What's your company's website?" Website research and a targeting brief do not
require both services to be connected; offer to continue this work when login is deferred
or a client reload is pending, clearly retaining the pending connection status.
Research the website, confirm
which offer to promote, suggest customer segments, and refine them through short
multiple-choice questions. Save a targeting brief before proposing a lead sample.

## Client references

Configuration is documented for all five clients; authenticated end-to-end
compatibility has not yet been tested for this release.

- https://developers.openai.com/codex/mcp/
- https://code.claude.com/docs/en/mcp
- https://cursor.com/docs/context/mcp
- https://geminicli.com/docs/tools/mcp-server/
- https://docs.openclaw.ai/gateway/config-extensions
- https://treg.to/llms.txt

## User-facing handoff

Keep routine file writes out of the main response unless the user asks. Describe
the outcome and the next required action. Do not end with a multi-step setup
checklist or ask "tell me when done" if you can observe completion. When a client
control must be operated by the user, state that one action and resume from the
result. Never label accounts connected until the live checks actually succeed.
