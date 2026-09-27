# builders.ac kit

For setup, account connection, company-website research, or ICP selection, read
`.agents/skills/ac-getting-started/SKILL.md` and follow the relevant reference.
Claude Code discovers the same skill through `.claude/skills/ac-getting-started`.

For domain or mailbox provisioning, status checks, or sequencer connection, read
`.agents/skills/ac-infra/SKILL.md`. Claude Code discovers it through
`.claude/skills/ac-infra`.

For lead sourcing, enrichment, verification, or list expansion, read
`.agents/skills/ac-prospecting/SKILL.md`. Claude Code discovers it through
`.claude/skills/ac-prospecting`.

For campaign copy, personalization variables, sequence planning, an import-ready
campaign CSV, or an inactive remote draft, read
`.agents/skills/ac-campaign/SKILL.md`. Claude Code discovers it through
`.claude/skills/ac-campaign`.

For development, keep this kit portable and project-scoped. Preserve unrelated
client settings. Never commit credentials, OAuth sessions, or customer run data.
Do not embed internal production access or shared company tokens.

Customer work must use the fixed `runs/<run-name>/` artifact contract in
`docs/run-artifacts.md`. Never create alternate lead lists, campaign scripts, or
credential files inside a run. The campaign skill may create an inactive draft
through an already configured matching sequencer MCP. It must never configure
that MCP, expose credentials, launch a campaign, or send email.
Use `node scripts/validate-kit.mjs` for repository validation and
`node scripts/check-endpoints.mjs` for public OAuth discovery only;
`docs/acceptance.md` describes the separate authenticated acceptance test.
