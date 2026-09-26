# builders.ac kit

Open this folder in Claude Code or Codex and say:

> Set up the kit and connect my accounts.

The reusable workflow is the **ac-getting-started** skill. You can also invoke
`/ac-getting-started` in Claude Code or `$ac-getting-started` in Codex.
[`start.md`](start.md) is the entry point intended for the landing page's
copy-and-paste setup prompt. The website publishes it alongside the skill files; no repository clone or ZIP is needed.

The kit includes the builders.ac MCP settings and instructions for Treg CLI. Your agent
guides you through signing in and checks both connections. You never need to
edit JSON, TOML, or paste an API key into chat.

Accept your client's normal project-trust and MCP connection prompts. Complete
each service's sign-in and consent screen; for Treg, choose the team you intend
to use. Credentials stay in the respective client or CLI authentication storage.

After the connections work, the agent asks for your company website. It will
help you confirm your offer and choose whom to target using short multiple-choice
questions. Lead sourcing and campaign execution are subsequent milestones.

## Current milestone

This version provides the connection setup for tasks 1.2–1.4. builders.ac uses
remote MCP with OAuth; Treg uses its official CLI and browser sign-in. The agent
installs Treg directly with a tool manager if needed and executes native login
flows itself, opening client-issued sign-in links when necessary. Authenticated
acceptance of this revised flow remains unverified. The source repository remains
private; the website serves an explicit allowlist of public setup files.

| Client | Included project configuration | Sign-in |
| --- | --- | --- |
| Claude Code | `.mcp.json` | `claude mcp login builders-ac` (or `/mcp` if unavailable), then `treg login` |
| Codex | `.codex/config.toml` | `codex mcp login builders-ac`, then `treg login` |

Open the kit itself as your project. Codex loads project configuration only for
trusted projects. A client already running when files are added may need a
reconnect or a new session. Update older clients if the MCP login command is
unavailable; Claude Code also offers authentication through `/mcp`.

The files are already configured in a fresh download. The agent repairs missing
entries if needed, preserving your other settings. Signing in still requires
your participation: downloading a folder cannot grant access to your accounts.

## What counts as connected

In the same agent session:

1. Discover builders.ac tools and successfully call `me`.
2. Run `treg balance` and a read-only `treg catalog search "email verification"` successfully.

An empty successful tool result is valid. A configuration entry, an HTTP 401,
or an OAuth metadata response alone does not pass this test. The connection
check does not purchase data, provision infrastructure, or send email.

For maintainers: `node scripts/check-endpoints.mjs` checks the public endpoints
and OAuth discovery without credentials. It does **not** test authenticated
tool calls. See [the acceptance checklist](docs/acceptance.md).

## Contents

- `start.md`: agent-readable setup entry point.
- `.agents/skills/ac-getting-started/`: canonical onboarding skill and references.
- `.claude/skills/ac-getting-started`: relative link to the same skill for Claude Code.
- `.mcp.json` and `.codex/config.toml`: project-scoped, credential-free MCP settings.
- `docs/roadmap.md`: later skills and the remaining campaign integration work.

Customer briefs and local setup reports are written to Git-ignored directories.
See [validation](docs/validation.md) for the checks performed on this version.

## References

- [builders.ac MCP guide](https://docs.builders.ac/guides/mcp/)
- [Treg connection documentation](https://treg.to/llms.txt)
- [Claude Code MCP documentation](https://code.claude.com/docs/en/mcp)
- [Codex MCP documentation](https://developers.openai.com/codex/mcp/)

## Public distribution

`start.md` supports Codex, Claude Code, Cursor, Gemini CLI, and native-MCP OpenClaw versions. Live authentication remains unverified. The website vendors only `start.md` and the three skill files, with a source commit recorded in `public/kit-release.json`. Update with `node scripts/sync-kit.mjs ../kit.builders.ac` from the website repo. No runtime customer files are published.
