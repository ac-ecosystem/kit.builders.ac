# builders.ac kit

**Test configuration:** this checkout targets UAT at
`https://sending.ac.team/mcp`, not production. Sign in with your UAT account;
verify `me` and the intended workspace before provisioning. Switching from the
production endpoint may require reconnecting and authenticating again.

This public repository is the canonical builders.ac onboarding kit. Give its URL
to a local coding agent:

> Set up builders.ac — https://github.com/ac-ecosystem/kit.builders.ac

Clone and open the repository in Claude Code or Codex:

```sh
git clone https://github.com/ac-ecosystem/kit.builders.ac.git
cd kit.builders.ac
```

Then say:

> Set up the kit and connect my accounts.

The reusable workflow is the **ac-getting-started** skill. You can also invoke
`/ac-getting-started` in Claude Code or `$ac-getting-started` in Codex.
[`start.md`](start.md) is the agent-readable entry point. The builders.ac landing
page links to this repository directly; it does not publish another copy of the
instructions or skill files.

The kit includes the builders.ac MCP settings and instructions for Treg CLI. Your agent
guides you through signing in and checks both connections. You never need to
edit JSON, TOML, or paste an API key into chat.

Accept your client's normal project-trust and MCP connection prompts. Complete
each service's sign-in and consent screen; for Treg, choose the team you intend
to use. Credentials stay in the respective client or CLI authentication storage.

After the connections work, the agent asks for your company website. It confirms
the offer and audience, sources and verifies prospects through Treg, prepares the
infrastructure, and builds an import-ready campaign for the connected sequencer.
Each phase updates one private run workspace so another session can resume it cleanly.

## Infrastructure

Say “set up infrastructure for <your domain>” or invoke `/ac-infra` in Claude
Code (`$ac-infra` in Codex). The agent checks existing resources, agrees on a
supported mailbox total, provisions through builders.ac MCP, and verifies the
result. It can also connect inboxes to your existing sequencer when requested.
Only builders.ac authentication is required for this workflow.

Connecting an owned domain reserves 50 slots; mailbox creation is a separate
step with supported totals of 50, 75, or 150. DNS delegation may need registrar
action. Domain purchases and campaign activation are outside this infrastructure
skill. Live acceptance remains pending; see the
[infrastructure checklist](docs/infra-acceptance.md).

## Prospecting and campaigns

Invoke `ac-prospecting` after the targeting brief is confirmed. It uses Treg's
live catalog, starts with a small costed sample, independently verifies retained
emails, and writes one canonical `prospects.csv`.

Invoke `ac-campaign` after eligible leads and connected senders are ready. It
discovers the user's sequencer through builders.ac, writes shared sequence
templates in `campaign.md`, and derives an import-ready `campaign.csv` containing
only eligible recipients and reviewed personalization variables. It never imports,
sends, creates, or activates a remote campaign; the user performs the final
provider preview and launch.

## Connection model

builders.ac uses remote MCP with OAuth; Treg uses its official CLI and browser
sign-in. The agent installs Treg directly with a tool manager if needed and starts
native login flows. No additional provider or Provisioning credential is needed
to produce the campaign handoff. Authenticated lifecycle acceptance remains
pending.

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

For maintainers: `node scripts/validate-kit.mjs` checks repository structure and
the single-source distribution contract. `node scripts/check-endpoints.mjs`
checks public endpoints and OAuth discovery without credentials. Neither command
tests authenticated tool calls. See [the acceptance checklist](docs/acceptance.md).

## Contents

- `start.md`: agent-readable setup entry point.
- `.agents/skills/ac-getting-started/`: canonical onboarding skill and references.
- `.claude/skills/ac-getting-started`: relative link to the same skill for Claude Code.
- `.agents/skills/ac-infra/`: canonical infrastructure skill and contract reference.
- `.claude/skills/ac-infra`: relative link for Claude Code discovery.
- `.agents/skills/ac-prospecting/`: canonical sourcing and verification skill.
- `.agents/skills/ac-campaign/`: canonical campaign planning and CSV handoff skill.
- `.claude/skills/`: links to every canonical skill for Claude Code discovery.
- `.mcp.json` and `.codex/config.toml`: project-scoped, credential-free MCP settings.
- `docs/run-artifacts.md`: fixed private artifacts shared by every phase.

Customer briefs and local setup reports are written to Git-ignored directories.
See [validation](docs/validation.md) for the checks performed on this version.

## References

- [builders.ac MCP guide](https://docs.builders.ac/guides/mcp/)
- [Treg connection documentation](https://treg.to/llms.txt)
- [Claude Code MCP documentation](https://code.claude.com/docs/en/mcp)
- [Codex MCP documentation](https://developers.openai.com/codex/mcp/)

## Public distribution

`start.md` supports Codex, Claude Code, Cursor, Gemini CLI, and native-MCP
OpenClaw versions. Live authentication remains unverified. This repository is the
only published copy of the kit; reviewed changes become available from the same
public URL after they are pushed. Runtime customer files remain Git-ignored.
