# Set up builders.ac

Use this public repository as the builders.ac onboarding workspace. Configure
builders.ac and Treg in the agent running this conversation, load the included
getting-started skill, then complete native authentication. This repository is
the source of truth; do not retrieve copied setup or skill files from the
builders.ac website.
This release covers website/ICP discovery, prospecting, infrastructure, and a
campaign draft when the matching sequencer MCP is already available. Preserve
any explicit request to defer authentication.

## Execution contract

If the current project is not this kit checkout, clone
`https://github.com/ac-ecosystem/kit.builders.ac.git` into a new
`kit.builders.ac` folder and use that folder as the project. Do not copy the kit
into an unrelated repository or recreate its files manually. If the running
client cannot load project MCP settings added after startup, ask for one restart
from the cloned folder and continue there.

Follow the section for the current client and the supported fallbacks below.
Preserve the requested configuration scope and use native authentication. Execute supported
setup and login commands yourself; do not hand the user a command checklist. The
normal user actions are required project trust or MCP approval, browser sign-in
and consent, and a client restart when its documented reconnect cannot load a
new server. Do not stop before attempting every step the current process can
perform and recording the observed result.

## 1. Configure builders.ac MCP

This kit currently targets **UAT**. Use the user’s UAT account and verify `me`
and the selected workspace before mutations. An existing production connection
is not a substitute for this UAT connection; reconnect and authenticate as needed.

- builders-ac: `https://sending.ac.team/mcp`
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
points to `https://sending.ac.team/mcp`, reuse its existing name. Otherwise merge
this entry into the project's `.codex/config.toml` (trusted projects only):

```toml
[mcp_servers.builders-ac]
url = "https://sending.ac.team/mcp"
```

Do not use `codex mcp add`: this setup is project-scoped, not user-scoped. Do not
add a duplicate under a different name.

### Claude Code and Cursor

Use `.mcp.json` for Claude Code, `.cursor/mcp.json` for Cursor:

```json
{
  "mcpServers": {
    "builders-ac": { "type": "http", "url": "https://sending.ac.team/mcp" }
  }
}
```

### Gemini CLI

Merge into `.gemini/settings.json`. Use `httpUrl` for Streamable HTTP:

```json
{
  "mcpServers": {
    "builders-ac": { "httpUrl": "https://sending.ac.team/mcp" }
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
      "builders-ac": { "url": "https://sending.ac.team/mcp", "transport": "streamable-http", "auth": "oauth" }
    }
  }
}
```

Explain shared configuration scope before applying. Use the active operator's
native OAuth flow. If this version lacks native remote MCP/OAuth, report the
compatibility limitation and consult its official docs; do not silently install
bridges or use shared tokens. Node-hosted and Gateway configuration differ.

## 2. Load the included skills

The canonical skills are already present under `.agents/skills/`: getting started,
prospecting, infrastructure, and campaign drafting. Codex loads them there.
Claude Code uses the included links under `.claude/skills/`. For another client,
use every canonical local skill directory as the source and place it at the
client's project destination only when that client requires its own path:

| Client | Skill directory in the project/workspace |
| --- | --- |
| Codex | `.agents/skills/<skill-name>/` |
| Claude Code | `.claude/skills/<skill-name>/` |
| Cursor | `.cursor/skills/<skill-name>/` |
| Gemini CLI | `.gemini/skills/<skill-name>/` |
| OpenClaw | `skills/<skill-name>/` in the active agent workspace |

Read before placing it in another client directory. Do not overwrite
user-customized skills without resolving the difference. Keep runtime reports
in `.kit/` only when needed to resume, and customer briefs in `runs/`. In a Git
repository, ignore those paths without altering other entries; do not create a
standalone `.gitignore` in a non-repository just to report setup activity. If no project is open, establish a
new working folder with the user before writing files. These instructions can
also be followed directly when a client cannot hot-load the included skill.

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

### Shared login flow (all clients): native URL → open browser → verify

Use this same approach in Codex, Claude Code, Cursor, Gemini CLI, and OpenClaw,
and for Treg CLI: have the native authentication flow issue the sign-in URL,
open it for the user, wait for completion, and verify access. Client differences
only determine how to start the native flow. If it opens the browser automatically,
keep that flow running instead of opening duplicate tabs.

1. Inspect available tools and installed help. Reuse a working connection. Prefer
   an exposed native authentication tool that returns an active sign-in URL;
   otherwise start the supported native login command or connection control.
   Start only one flow for each service. Use an interactive terminal
   (PTY/TTY) when the command requires it and the execution tool provides one.
   Run login directly, without `| tail` or other pipelines that hide prompts and
   the login exit status. Keep the login process or native callback listener alive
   while the user signs in. A background-task exit code alone is not proof of login.
2. If the shell cannot provide the required terminal, use the client's exposed
   native authentication tool or connection control. Discover the actual schema;
   do not assume every client exposes the same tool name. A terminal error is
   a reason to try this supported path, not to abandon authentication.
3. Take the authorization URL returned by the active flow and, unless it already
   launched the browser, open that exact URL yourself. On
   macOS use `open`, on desktop Linux use `xdg-open`, and on Windows use the native
   browser launcher such as PowerShell `Start-Process`. Pass the URL as one safely
   quoted argument or a structured argument, never interpolate it as shell code.
   Opening the page is part of setup; leave account selection, sign-in, and consent
   to the user. Say what they need to do in the browser, then observe the flow's
   result rather than asking them to say “done” when completion is observable.
4. The authorization URL must come from the active native client/CLI flow. Do not
   construct OAuth URLs, PKCE values, callback ports, or tokens yourself, or reuse
   a URL after its listener has ended. If a flow expires, start a fresh native
   flow. Do not run competing logins for the same service. On remote/headless
   hosts, use the client's documented remote-login mode; opening a localhost
   callback flow on a different machine does not make its listener reachable.
5. If browser launching is unavailable or denied, provide the active sign-in link
   for the user to open. Do not ask for callback URLs, authorization codes, tokens,
   or passwords in chat. If a client supports manual callback input, direct the
   user to that client's designated authentication prompt. Keep transient URLs
   out of saved reports and committed files.
6. After login, check its result, rediscover tools if needed, and run the read-only
   verification below. Distinguish browser-launch success, OAuth success, and a
   successful authenticated call. Do not promise hot-loading or a reconnect-free
   result before observing it.

When an action needs permission, request the native approval for that specific
command if available and resume after approval. If the session policy denies it
without an approval path, explain the exact blocked action and required client
control. Do not broaden session permissions, self-approve MCP servers, or rerun
an equivalent denied command through another wrapper to evade the denial.

### builders.ac: native MCP authentication

Use the existing builders.ac server name if reused; otherwise use `builders-ac`.
First discover an exposed native authentication tool and use it when available.
The following client entry points apply when a usable tool is not exposed; all
paths continue through the shared URL-opening and verification flow above.

- Codex: execute `codex mcp login <builders-server-name>` from the project.
  Wait for the command result. If the server is not found, inspect the effective
  configuration and scope; report a trust blocker only when supported by the
  client's output. A startup trust warning alone does not prove login is blocked.
- Claude Code: after writing or reusing the configuration, check `claude mcp --help`.
  If `login` is supported, execute `claude mcp login <builders-server-name>`
  directly in an interactive terminal when available. If it reports a terminal
  requirement and no PTY is available, discover and use the in-session native
  authentication tool (some versions expose an `authenticate` placeholder for
  an approved, unauthenticated server). Open its returned URL as described above.
  If a pending-project-approval error blocks login, use `/mcp` to approve the
  server when it is visible. If the new server is absent from the running client's
  controls, use a documented reconnect or request one session restart in the same
  project, with a resume note. Do not repeatedly direct the user to an empty
  `/mcp` list. After approval/loading, resume login and verification yourself.
  Use `/mcp` authentication controls if no callable native auth tool or usable
  CLI login is available. Do not launch a nested agent to simulate loaded tools.
- Cursor: use the native MCP connection/authorization controls in settings.
- Gemini CLI: use `/mcp auth <builders-server-name>`.
- OpenClaw: use native MCP authentication for the installed version; consult its
  help rather than inventing CLI commands.

### Treg: official CLI

Use Treg's official Python package directly, preserving the scope of this setup.
Reuse an installed CLI and working login. The general installer at
https://treg.to/install.sh also bootstraps skills across detected coding clients;
do not run that script for this project-scoped onboarding.

If `treg` is missing and `uv` is available, execute:

```sh
uv tool install --python '>=3.12,<3.14' 'tools-registry[proxy]'
```

This installs a user-level CLI executable in an isolated tool environment; it
should not register MCP servers or bootstrap skills in other coding clients.
Do not run `treg skill bootstrap` or `treg mcp install`. If `uv` is unavailable,
use an existing `pipx` with an available Python 3.12 or 3.13, for example
`pipx install --python python3.12 'tools-registry[proxy]'`. Check installed help
and interpreter availability first. If neither manager is available, explain the
missing prerequisite and use its official installation instructions with native
approval as needed; do not silently modify system Python or use the broad Treg
installer as a fallback. These direct package commands match the package and
Python range in Treg's installer; consult its current documentation if they change.

Resolve the executable through the tool manager if this shell's PATH has not
updated. Run `treg login` yourself, applying the terminal and browser fallbacks
above when supported by the installed CLI. Open its client-issued sign-in URL
if it does not open automatically. Let the user sign in and select their
own team, wait for the result, then verify with `treg balance` and one read-only
`treg catalog search "email verification"`.
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

Read `ac-getting-started` and follow its website-to-ICP workflow. Ask:
"What's your company's website?" Website research and a targeting brief do not
require both services to be connected; offer to continue this work when login is deferred
or a client reload is pending, clearly retaining the pending connection status.
Research the website, initialize or resume the matching run, confirm
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
