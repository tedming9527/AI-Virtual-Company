import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, readdirSync, symlinkSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const installer = resolve('scripts/install-codex-approvals.py');
const tools = ['task_begin', 'load_asset', 'task_closeout'];
function fixture(t, source) {
  mkdirSync('runtime/cache', { recursive: true });
  const home = mkdtempSync(resolve('runtime/cache/codex-approvals-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const file = join(home, 'config.toml');
  writeFileSync(file, source);
  const run = (...args) => spawnSync('python3', [installer, '--codex-home', home, ...args], { encoding: 'utf8' });
  const parse = () => {
    const result = spawnSync('python3', ['-c', 'import json,sys,tomllib; print(json.dumps(tomllib.load(open(sys.argv[1],"rb"))))', file], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  return { home, file, run, parse };
}
const base = '# user comment\napproval_policy = "on-request"\n[mcp_servers.ted-avc-manager]\ncommand = "node"\nargs = ["server.js"]\n';

test('only monitoring defaults change; installation backs up privately and is byte-idempotent', t => {
  const f = fixture(t, base + '[mcp_servers.other]\ncommand = "other"\n');
  const before = f.parse();
  const first = f.run('--authorize-monitor-tools');
  assert.equal(first.status, 0, first.stderr);
  const report = JSON.parse(first.stdout), after = f.parse();
  assert.deepEqual(report.added, tools);
  for (const tool of tools) assert.equal(after.mcp_servers['ted-avc-manager'].tools[tool].approval_mode, 'approve');
  delete after.mcp_servers['ted-avc-manager'].tools;
  assert.deepEqual(after, before);
  assert.equal(readFileSync(join(f.home, report.backup), 'utf8'), base + '[mcp_servers.other]\ncommand = "other"\n');
  assert.equal(statSync(join(f.home, report.backup)).mode & 0o777, 0o600);
  const once = readFileSync(f.file, 'utf8');
  assert.ok(once.startsWith('# user comment\n'));
  const second = f.run('--authorize-monitor-tools');
  assert.equal(second.status, 0, second.stderr);
  assert.equal(JSON.parse(second.stdout).changed, false);
  assert.equal(readFileSync(f.file, 'utf8'), once);
});

test('existing approval choices and quoted tables with other properties are preserved', t => {
  const f = fixture(t, base + `[mcp_servers."ted-avc-manager".tools.task_begin]
approval_mode = "prompt"
[mcp_servers.'ted-avc-manager'.tools.load_asset] # keep this
output_token_limit = 1000
[mcp_servers.ted-avc-manager.tools.upgrade]
approval_mode = "writes"
`);
  const result = f.run('--authorize-monitor-tools');
  assert.equal(result.status, 0, result.stderr);
  const settings = f.parse().mcp_servers['ted-avc-manager'].tools;
  assert.deepEqual(settings.task_begin, { approval_mode: 'prompt' });
  assert.deepEqual(settings.load_asset, { output_token_limit: 1000, approval_mode: 'approve' });
  assert.deepEqual(settings.upgrade, { approval_mode: 'writes' });
});

test('authorization required; check does not write; unknown or disabled servers rejected', t => {
  const f = fixture(t, base);
  assert.notEqual(f.run().status, 0);
  const preview = f.run('--check');
  assert.equal(preview.status, 0, preview.stderr);
  assert.deepEqual(JSON.parse(preview.stdout).added, tools);
  assert.equal(readFileSync(f.file, 'utf8'), base);
  assert.deepEqual(readdirSync(f.home), ['config.toml']);
  assert.notEqual(f.run('--authorize-monitor-tools', '--server-id', 'missing').status, 0);
  writeFileSync(f.file, base + 'enabled = false\n');
  assert.notEqual(f.run('--authorize-monitor-tools').status, 0);
});

test('re-registration restores existing monitor and non-monitor policies before adding defaults', t => {
  const f = fixture(t, base);
  const prior = { task_begin: { approval_mode: 'prompt' }, upgrade: { approval_mode: 'writes', output_token_limit: 2000 } };
  const result = f.run('--authorize-monitor-tools', '--preserve-tools-json', JSON.stringify(prior));
  assert.equal(result.status, 0, result.stderr);
  const settings = f.parse().mcp_servers['ted-avc-manager'].tools;
  assert.deepEqual(settings.task_begin, prior.task_begin);
  assert.deepEqual(settings.upgrade, prior.upgrade);
  assert.equal(settings.load_asset.approval_mode, 'approve');
  const before = readFileSync(f.file, 'utf8');
  const conflict = f.run('--authorize-monitor-tools', '--preserve-tools-json', JSON.stringify({ task_begin: { approval_mode: 'approve' } }));
  assert.notEqual(conflict.status, 0);
  assert.equal(readFileSync(f.file, 'utf8'), before);
});

test('invalid, inline and misleading multiline layouts cannot corrupt config', t => {
  const sources = [
    base + 'broken = [\n',
    base + 'tools = { task_begin = { output_token_limit = 10 } }\n',
    base + `note = '''
[mcp_servers.ted-avc-manager.tools.task_begin]
'''\n`,
  ];
  for (const source of sources) {
    const f = fixture(t, source);
    assert.notEqual(f.run('--authorize-monitor-tools').status, 0);
    assert.equal(readFileSync(f.file, 'utf8'), source);
    assert.deepEqual(readdirSync(f.home), ['config.toml']);
  }
});

test('re-registration preserves server allow/deny lists, defaults and disabled state', t => {
  const f = fixture(t, base);
  const policy = { enabled: false, enabled_tools: ['task_begin'], disabled_tools: ['upgrade'], default_tools_approval_mode: 'prompt' };
  const result = f.run('--authorize-monitor-tools', '--preserve-server-policy-json', JSON.stringify(policy));
  assert.equal(result.status, 0, result.stderr);
  const server = f.parse().mcp_servers['ted-avc-manager'];
  for (const [key, value] of Object.entries(policy)) assert.deepEqual(server[key], value);
  const before = readFileSync(f.file, 'utf8');
  assert.notEqual(f.run('--authorize-monitor-tools', '--preserve-server-policy-json', '{"command":"unrelated"}').status, 0);
  assert.equal(readFileSync(f.file, 'utf8'), before);
});

test('plugin-scoped policy stays within the selected installed server', t => {
  const source = base + '[plugins."ted@test".mcp_servers.monitor]\nenabled = true\n';
  const f = fixture(t, source);
  const result = f.run('--authorize-monitor-tools', '--plugin-id', 'ted@test', '--server-id', 'monitor');
  assert.equal(result.status, 0, result.stderr);
  const after = f.parse();
  assert.equal(after.mcp_servers['ted-avc-manager'].tools, undefined);
  assert.equal(after.plugins['ted@test'].mcp_servers.monitor.tools.task_begin.approval_mode, 'approve');
});

test('symlink config and competing installer lock are rejected without writes', t => {
  const f = fixture(t, base);
  mkdirSync(join(f.home, '.ted-avc-approvals.lock'));
  assert.notEqual(f.run('--authorize-monitor-tools').status, 0);
  assert.equal(readFileSync(f.file, 'utf8'), base);
  rmSync(f.file);
  const original = join(f.home, 'original.toml');
  writeFileSync(original, base);
  symlinkSync(original, f.file);
  assert.notEqual(f.run('--authorize-monitor-tools').status, 0);
  assert.equal(readFileSync(original, 'utf8'), base);
});
