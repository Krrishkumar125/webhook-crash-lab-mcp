import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

describe('npm metadata', () => {
  it('stays search-friendly', () => {
    expect(pkg.description.length).toBeLessThanOrEqual(120);
    expect(pkg.keywords.length).toBeGreaterThanOrEqual(8);
    expect(pkg.keywords.length).toBeLessThanOrEqual(12);
    expect(pkg.repository.url).toMatch(/github\.com\/Krrishkumar125\//);
    expect(pkg.homepage).toBeTruthy();
    expect(pkg.bugs).toBeTruthy();
  });

  it('server.json matches mcpName and package version', () => {
    const server = JSON.parse(readFileSync(new URL('../server.json', import.meta.url), 'utf8'));
    expect(server.name).toBe(pkg.mcpName);
    expect(server.description.length).toBeLessThanOrEqual(100);
    expect(server.packages[0].identifier).toBe(pkg.name);
  });
});

describe('README install badges', () => {
  it('VS Code and Cursor deeplinks install the same server as .mcp.json', () => {
    const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
    const mcp = JSON.parse(readFileSync(new URL('../.mcp.json', import.meta.url), 'utf8'));
    const expected = mcp.mcpServers['webhook-crash-lab'];
    const vs = /mcp\/install\?name=webhook-crash-lab&config=([^)\s]+)/.exec(readme)?.[1] ?? '';
    const cur = /install-mcp\?name=webhook-crash-lab&config=([^)\s]+)/.exec(readme)?.[1] ?? '';
    expect(JSON.parse(decodeURIComponent(vs))).toEqual(expected);
    expect(JSON.parse(Buffer.from(cur, 'base64').toString('utf8'))).toEqual(expected);
  });
});
