import { lstat, readFile, realpath } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mcpUrl = 'https://mcp.builders.ac/mcp';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const mcp = JSON.parse(await readFile(resolve(root, '.mcp.json'), 'utf8'));
assert(mcp?.mcpServers?.['builders-ac']?.url === mcpUrl, '.mcp.json must configure the builders.ac MCP URL');

const codex = await readFile(resolve(root, '.codex/config.toml'), 'utf8');
assert(codex.includes('[mcp_servers.builders-ac]'), '.codex/config.toml must define builders-ac');
assert(codex.includes(`url = "${mcpUrl}"`), '.codex/config.toml must use the builders.ac MCP URL');

const canonicalSkill = resolve(root, '.agents/skills/ac-getting-started');
const claudeSkill = resolve(root, '.claude/skills/ac-getting-started');
const claudeLink = await lstat(claudeSkill);
assert(claudeLink.isSymbolicLink(), 'Claude Code skill must link to the canonical skill');
assert(await realpath(claudeSkill) === await realpath(canonicalSkill), 'Claude Code skill link must resolve to the canonical skill');

for (const file of [
  'SKILL.md',
  'references/connections.md',
  'references/targeting.md',
]) {
  await readFile(resolve(canonicalSkill, file), 'utf8');
}

const skill = await readFile(resolve(canonicalSkill, 'SKILL.md'), 'utf8');
assert(/^---\n[\s\S]+?\n---\n/.test(skill), 'SKILL.md must contain YAML frontmatter');
assert(/^name:\s*ac-getting-started\s*$/m.test(skill), 'SKILL.md must keep the ac-getting-started name');

const publicRepo = 'https://github.com/ac-ecosystem/kit.builders.ac';
const readme = await readFile(resolve(root, 'README.md'), 'utf8');
const start = await readFile(resolve(root, 'start.md'), 'utf8');
assert(readme.includes(publicRepo), 'README.md must identify the public kit repository');
assert(start.includes(`${publicRepo}.git`), 'start.md must direct agents to the canonical repository');

for (const [name, contents] of [['README.md', readme], ['start.md', start]]) {
  assert(!contents.includes('https://builders.ac/start.md'), `${name} must not use a vendored start.md`);
  assert(!contents.includes('https://builders.ac/skills/'), `${name} must not use vendored skill files`);
  assert(!contents.includes('sync-kit.mjs'), `${name} must not reference the removed sync process`);
}

console.log('builders.ac kit validation passed');
