#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { check as checkSupervision } from './supervision-gate.mjs';
import { checkParticipation } from './employee-participation-gate.mjs';

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const companyRoot = realpathSync(process.env.AI_VIRTUAL_COMPANY_ROOT || scriptRoot);

const emit = value => process.stdout.write(`${JSON.stringify(value)}\n`);

function bootstrap() {
  return spawnSync(path.join(companyRoot, 'scripts/check-company-bootstrap.sh'), [], {
    cwd: companyRoot,
    env: { ...process.env, AI_VIRTUAL_COMPANY_ROOT: companyRoot },
    encoding: 'utf8',
    timeout: 15_000,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function positiveSupervisionClaim(message) {
  if (typeof message !== 'string') return false;
  const pattern = /(已受监管|正在受监管|处于监管中|已进入监管|正在持续监督|已由.{0,20}(监管|监督))/g;
  for (const match of message.matchAll(pattern)) {
    const prefix = message.slice(Math.max(0, match.index - 12), match.index);
    if (!/(未|不|禁止|不能|不得|无法|尚未|并非|不可|没有)[^。；，\n]{0,8}$/.test(prefix)) return true;
  }
  return false;
}

function companySignature(message) {
  if (typeof message !== 'string') return null;
  const finalLine = message.trimEnd().split('\n').at(-1);
  if (/^以上内容由 Ted 公司的[^等\n]{1,30}等人为您提供$/.test(finalLine)) return 'employee';
  if (/^以上内容由 Ted 公司提供；任务主责：[^；\n]{1,30}；实际执行者：platform agent$/.test(finalLine)) return 'platform';
  return null;
}

function positiveEmployeeParticipationClaim(message) {
  if (typeof message !== 'string') return false;
  const pattern = /(?:员工本人|陈知行|林知夏|周启明|陆行远|苏映雪|顾清妍|辛澈|沈砚舟).{0,28}(?:已参与|已执行|已评审|已贡献|亲自参与|亲自执行)/g;
  for (const match of message.matchAll(pattern)) {
    const prefix = message.slice(Math.max(0, match.index - 16), match.index);
    if (!/(未|不|禁止|不能|不得|无法|尚未|并非|不可|没有)[^。；，\n]{0,10}$/.test(prefix)) return true;
  }
  return false;
}

function positiveCompanyWorkflowClaim(message) {
  if (typeof message !== 'string') return false;
  const pattern = /(?:平台接管门禁已通过|公司(?:初始化|接管|工作流).{0,12}(?:已通过|已完成|已生效|已启用|成功)|(?:已完成|已通过|已启用|已生效).{0,12}公司(?:初始化|接管|工作流)|已由.{0,20}(?:员工|路由官).{0,20}(?:主责|分配))/g;
  for (const match of message.matchAll(pattern)) {
    const prefix = message.slice(Math.max(0, match.index - 12), match.index);
    if (!/(未|不|禁止|不能|不得|无法|尚未|并非|不可|没有)[^。；，\n]{0,8}$/.test(prefix)) return true;
  }
  return false;
}

function context(input) {
  return [
    'TED_CODEX_PLATFORM_TAKEOVER_V1: 公司 bootstrap 已通过，当前入口上下文已生成；平台安装、信任与拦截效果须另行验收。',
    `公司根目录：${companyRoot}`,
    `当前 Codex 会话：${input.session_id || 'unknown'}；事件：${input.hook_event_name}.`,
    '本轮必须按 INITIALIZATION_POLICY.md 完成事实源加载、路由和任务登记后再执行。',
    '不得把 hook 已激活等同于任务已受监管；监管声明必须另行通过 scripts/supervision-gate.mjs 的实时证据门禁。',
    '公司最终回复尾注必须匹配执行证据：无具名员工本人回执时写“以上内容由 Ted 公司提供；任务主责：{主责实名}；实际执行者：platform agent”；仅在员工参与门禁通过后使用员工提供式尾注。'
  ].join('\n');
}

function bootstrapFailureContext(detail) {
  return [
    `Ted 公司工作流暂不可用：${detail}`,
    '不得宣称公司接管、员工分配、平台强制或持续监督已生效。',
    '普通任务仍可按已有用户授权、权限和项目约束继续；明确依赖公司治理的范围应暂停。'
  ].join('\n');
}

async function readInput() {
  let data = '';
  for await (const chunk of process.stdin) {
    data += chunk;
    if (data.length > 1024 * 1024) throw new Error('hook_input_too_large');
  }
  return JSON.parse(data);
}

export async function handle(input, { bootstrapRunner = bootstrap, participationChecker = checkParticipation, supervisionChecker = checkSupervision } = {}) {
  const event = input?.hook_event_name;
  if (!['SessionStart', 'Stop'].includes(event)) return { output: {} };
  const result = bootstrapRunner();
  if (result.error || result.status !== 0) {
    const detail = (result.stderr || result.error?.message || 'unknown bootstrap failure').trim();
    const additionalContext = bootstrapFailureContext(detail);
    if (
      event === 'Stop' &&
      (positiveSupervisionClaim(input.last_assistant_message) ||
        positiveCompanyWorkflowClaim(input.last_assistant_message) ||
        positiveEmployeeParticipationClaim(input.last_assistant_message))
    ) {
      return {
        blocked: true,
        event,
        reason: '公司工作流暂不可用，无法支持当前回复中的公司接管、员工分配或监管成功声明。请撤回该声明后再结束。'
      };
    }
    if (event === 'Stop') return { output: {} };
    return {
      output: {
        hookSpecificOutput: { hookEventName: event, additionalContext }
      }
    };
  }
  if (event !== 'Stop') {
    return { output: { hookSpecificOutput: { hookEventName: event, additionalContext: context(input) } } };
  }
  const signature = companySignature(input.last_assistant_message);
  if (!signature) {
    return {
      output: {
        decision: 'block',
        reason:
          '最终公司回复缺少与执行证据一致的尾注。无员工本人回执时必须标明任务主责与“实际执行者：platform agent”；员工提供式尾注必须有员工参与门禁证据。'
      }
    };
  }
  const participation = await participationChecker(input.session_id, { root: companyRoot });
  if (participation.reason !== 'participation_requirement_missing' && !participation.claim_allowed) {
    return { output: { decision: 'block', reason: `当前任务已冻结具名员工本人参与要求，但门禁未通过（${participation.reason}）。请等待可信员工回执或报告 blocked。` } };
  }
  if (positiveEmployeeParticipationClaim(input.last_assistant_message) && !participation.claim_allowed) {
    return { output: { decision: 'block', reason: '检测到具名员工本人参与声明，但没有通过可信员工身份回执门禁。请撤回该声明。' } };
  }
  if (signature === 'employee' && !participation.claim_allowed) {
    return { output: { decision: 'block', reason: '员工提供式尾注没有通过员工参与门禁。请改用标明“实际执行者：platform agent”的尾注。' } };
  }
  if (!positiveSupervisionClaim(input.last_assistant_message)) return { output: {} };
  const taskId = input.session_id;
  if (typeof taskId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(taskId)) {
    return { output: { decision: 'block', reason: '检测到“已受监管”声明，但当前会话 ID 无法用于监管登记。请撤回该声明并报告 task_identity_unusable。' } };
  }
  const gate = await supervisionChecker(taskId, { root: companyRoot });
  if (!gate.claim_allowed) {
    return { output: { decision: 'block', reason: `检测到无有效证据的监管声明（${gate.reason}）。请继续当前回合，撤回“已受监管”表述并向用户报告告警。` } };
  }
  return { output: {} };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  readInput().then(handle).then(result => {
    if (!result.blocked) return emit(result.output);
    emit({ continue: false, stopReason: result.reason, systemMessage: result.reason });
  }).catch(error => {
    process.stderr.write(`Ted 公司平台接管 hook 异常，已按 fail-closed 阻止：${error.message}\n`);
    process.exitCode = 2;
  });
}
