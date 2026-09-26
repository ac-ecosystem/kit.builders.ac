# builders.ac kit

For setup, account connection, company-website research, or ICP selection, read
`.agents/skills/ac-getting-started/SKILL.md` and follow the relevant reference.
Claude Code discovers the same skill through `.claude/skills/ac-getting-started`.

For development, keep this kit portable and project-scoped. Preserve unrelated
client settings. Never commit credentials, OAuth sessions, or customer run data.
Do not embed internal production access or shared company tokens.

Current scope: getting started and ICP discovery. Prospecting, infrastructure,
and campaign skills are planned in `docs/roadmap.md`, not yet implemented.
Use `node scripts/validate-kit.mjs` for repository validation and
`node scripts/check-endpoints.mjs` for public OAuth discovery only;
`docs/acceptance.md` describes the separate authenticated acceptance test.
