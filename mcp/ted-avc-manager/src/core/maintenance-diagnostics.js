// A fixed read-only recovery command; never interpret natural-language intent.
import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
export function diagnosticCall(root, deploymentFile) {
  return { tool: 'functions.exec_command', input: {
    cmd: [process.execPath, fileURLToPath(new URL('../cli.js', import.meta.url)), 'maintenance-doctor', '--deployment', resolve(deploymentFile)].map(quote).join(' '),
    workdir: realpathSync(root), shell: '/bin/sh', login: false,
  } };
}
export function isDiagnosticCall(input, deploymentFile) {
  if (!['PreToolUse', 'PostToolUse'].includes(input.hook_event_name) || !['exec_command', 'functions.exec_command'].includes(input.tool_name)) return false;
  const args = input.tool_input;
  if (!args || typeof args !== 'object' || Array.isArray(args)) return false;
  const allowed = ['cmd', 'workdir', 'shell', 'login', 'tty', 'max_output_tokens', 'yield_time_ms'];
  if (Object.keys(args).some(key => !allowed.includes(key))) return false;
  if (args.tty !== undefined && args.tty !== false) return false;
  if (['max_output_tokens', 'yield_time_ms'].some(key => args[key] !== undefined && (!Number.isInteger(args[key]) || args[key] < 0))) return false;
  const expected = diagnosticCall(input.cwd, deploymentFile).input;
  return args.cmd === expected.cmd && args.workdir === expected.workdir && args.shell === expected.shell && args.login === false;
}
export function maintenanceDoctor(root, deploymentFile) {
  const result = { executionStatus: 'unbound_diagnostic', actualExecutor: 'platform agent', taskBeginExposure: 'unknown: verify tools/list in the current host', bindingActive: 'unknown', checks: {}, diagnosticCall: diagnosticCall(root, deploymentFile) };
  try {
    const config = JSON.parse(readFileSync(deploymentFile, 'utf8'));
    const project = config.projects?.find(project => realpathSync(resolve(project.root)) === realpathSync(root));
    result.checks = { deploymentReadable: true, projectConfigured: Boolean(project), executionEnabled: project?.execution?.enabled === true, executionMode: project?.execution?.mode ?? 'unknown', taskBeginBootstrapConfigured: Array.isArray(project?.execution?.bootstrapTools) && project.execution.bootstrapTools.some(tool => /^mcp__(?:ted_avc_manager|ted-avc-manager|pack_manager|pack-manager)__task_begin$/.test(tool)) };
  } catch (error) { result.checks = { deploymentReadable: false, error: error.code || error.name }; }
  return result;
}
