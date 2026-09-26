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

for (const [name, files] of [
  ['ac-getting-started', ['SKILL.md', 'references/connections.md', 'references/targeting.md']],
  ['ac-infra', ['SKILL.md', 'references/provisioning.md']],
]) {
  const canonicalSkill = resolve(root, '.agents/skills', name);
  const claudeSkill = resolve(root, '.claude/skills', name);
  assert((await lstat(claudeSkill)).isSymbolicLink(), `${name}: Claude Code skill must be a link`);
  assert(await realpath(claudeSkill) === await realpath(canonicalSkill), `${name}: link must resolve to canonical skill`);
  for (const file of files) {
    const contents = await readFile(resolve(canonicalSkill, file), 'utf8');
    // Resolve local Markdown references from their containing file, not the repo root.
    for (const match of contents.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^https?:\/\//.test(target) || target.startsWith('#')) continue;
      await readFile(resolve(dirname(resolve(canonicalSkill, file)), target.split('#')[0]), 'utf8');
    }
  }
  const skill = await readFile(resolve(canonicalSkill, 'SKILL.md'), 'utf8');
  assert(/^---\n[\s\S]+?\n---\n/.test(skill), `${name}: YAML frontmatter required`);
  assert(skill.split('\n').includes(`name: ${name}`), `${name}: frontmatter name must match directory`);
}

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
