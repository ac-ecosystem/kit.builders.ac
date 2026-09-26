# Set up builders.ac

Configure builders.ac and Treg in the agent running this conversation, install
our getting-started skill, then guide the user through native authentication.
No builders.ac CLI, GitHub account, repository clone, or ZIP is needed.
This release connects tools and guides website/ICP discovery; campaign execution
is a later milestone. Preserve any explicit request to defer authentication.

## 1. Configure the MCP servers

- builders-ac: `https://mcp.builders.ac/mcp`
- treg: `https://treg.to/mcp/`

Identify the current client. Use the current project/workspace and preserve all
unrelated configuration and existing credentials. Merge only missing entries;
if an existing name points elsewhere, explain the conflict before replacing it.
Never disable trust or approval controls. Do not configure other installed clients.

### Codex

Merge into the project's `.codex/config.toml` (trusted projects only):

```toml
[mcp_servers.builders-ac]
url = "https://mcp.builders.ac/mcp"

[mcp_servers.treg]
url = "https://treg.to/mcp/"
```

### Claude Code and Cursor

Use `.mcp.json` for Claude Code, `.cursor/mcp.json` for Cursor:

```json
{
  "mcpServers": {
    "builders-ac": { "type": "http", "url": "https://mcp.builders.ac/mcp" },
    "treg": { "type": "http", "url": "https://treg.to/mcp/" }
  }
}
```

### Gemini CLI

Merge into `.gemini/settings.json`. Use `httpUrl` for Streamable HTTP:

```json
{
  "mcpServers": {
    "builders-ac": { "httpUrl": "https://mcp.builders.ac/mcp" },
    "treg": { "httpUrl": "https://treg.to/mcp/" }
  }
}
```

### OpenClaw

Check the installed version's native MCP support before editing. On versions
supporting `mcp.servers`, merge these entries into the active OpenClaw configuration
(normally `~/.openclaw/openclaw.json`, which may be shared across agents):

```json
{
  "mcp": {
    "servers": {
      "builders-ac": { "url": "https://mcp.builders.ac/mcp", "transport": "streamable-http", "auth": "oauth" },
      "treg": { "url": "https://treg.to/mcp/", "transport": "streamable-http", "auth": "oauth" }
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
in `.kit/` and customer briefs in `runs/`; add those paths to the project's
`.gitignore` without altering other entries. If no project is open, establish a
new working folder with the user before writing files. These instructions can
also be followed directly when a client cannot hot-load the installed skill.

## 3. Authenticate and check

Reuse working connections. The user completes project trust, sign-in, and consent.
Never request passwords, OTPs, or API keys in chat. For Treg, the user chooses
their own team; no Treg CLI or shared company token is needed.

- Codex: `codex mcp login builders-ac`, then `codex mcp login treg` in the project.
- Claude Code: approve project MCP entries in the client, then use `/mcp` or
  `claude mcp login builders-ac` and `claude mcp login treg`.
- Cursor: use the native MCP connection/authorization controls in settings.
- Gemini CLI: `/mcp auth builders-ac`, then `/mcp auth treg`.
- OpenClaw: use native MCP authentication for the installed version; consult its
  help rather than inventing CLI commands.

Reconnect or open a new session if the client needs it to load configuration.
Discover tool schemas and call builders.ac `me` and Treg `my_tools` or `balance`
in the same session. A successful config write or HTTP 401 is not a successful
tool call. Do not spend credits, provision resources, or send email during setup.
If authentication is deferred, report files ready and live checks pending.

## 4. Ask for the company website

Read the installed skill and follow its website-to-ICP workflow. Once both
connections work, ask: "What's your company's website?" Research it, confirm
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
