// Public, read-only OAuth discovery check. Never reads or stores credentials.
import { readFile } from 'node:fs/promises';

const config = JSON.parse(await readFile(new URL('../.mcp.json', import.meta.url), 'utf8'));
let failed = false;
for (const [name, server] of Object.entries(config.mcpServers)) {
  try {
    const response = await fetch(server.url, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
        protocolVersion: '2025-03-26', capabilities: {},
        clientInfo: { name: 'builders-kit-discovery', version: '0.1.0' },
      } }),
    });
    if (response.status !== 401) throw new Error(`Expected authentication challenge; received HTTP ${response.status}`);
    const metadataUrl = /resource_metadata="([^"]+)"/.exec(response.headers.get('www-authenticate') ?? '')?.[1];
    if (!metadataUrl || new URL(metadataUrl).origin !== new URL(server.url).origin) {
      throw new Error('Missing or unexpected OAuth resource metadata URL');
    }
    const metadataResponse = await fetch(metadataUrl, { redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!metadataResponse.ok) throw new Error(`OAuth metadata HTTP ${metadataResponse.status}`);
    const metadata = await metadataResponse.json();
    if (metadata.resource !== server.url || !metadata.authorization_servers?.length) {
      throw new Error('OAuth metadata does not identify this server');
    }
    console.log(`${name}: reachable; OAuth discovery OK; authenticated tools NOT tested`);
  } catch (error) {
    failed = true;
    console.error(`${name}: ${error.message}`);
  }
}
process.exitCode = failed ? 1 : 0;
