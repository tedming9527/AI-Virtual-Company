#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { check as checkSupervision } from './supervision-gate.mjs';

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

function hasCompanySignature(message) {
  return (
    typeof message === 'string' &&
    /以上内容由 Ted 公司的[^等\n]{1,30}等人为您提供$/.test(message.trimEnd())
  );
}

function explicitlyRequiresCompanyGovernance(prompt) {
  if (typeof prompt !== 'string') return false;
  const withoutNegatedScope = prompt.replace(
    /(?:不|无需|不需要|不依赖|无需依赖).{0,8}(?:公司治理|公司接管|员工分配|岗位路由|持续监督|受监管)/g,
    ''
  );
  const governedScope = /(?:公司(?:治理|接管|初始化|员工|岗位|规则|资料|记忆|事实源|工作流)|岗位路由|员工分配|平台(?:强制|接管|hook|不可绕过)|持续监督|受监管|监管门禁|supervision_live|platform_hook_verified|company_ready)/i;
  const explicitAction = /(?:必须|要求|确保|开启|进入|恢复|继续|开始|执行|审计|检查|更新|修改|修复|读取|加载|验证|分配|路由|监督|监管|按照|按公司)/;
  return governedScope.test(withoutNegatedScope) && explicitAction.test(withoutNegatedScope);
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
    '每条公司最终回复的精确且非空白末行必须是“以上内容由 Ted 公司的{该任务既定主责实名}等人为您提供”；发送前执行尾注自检。'
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

export async function handle(input, { bootstrapRunner = bootstrap } = {}) {
  const event = input?.hook_event_name;
  if (!['SessionStart', 'UserPromptSubmit', 'Stop'].includes(event)) return { output: {} };
  const result = bootstrapRunner();
  if (result.error || result.status !== 0) {
    const detail = (result.stderr || result.error?.message || 'unknown bootstrap failure').trim();
    const additionalContext = bootstrapFailureContext(detail);
    if (event === 'UserPromptSubmit' && explicitlyRequiresCompanyGovernance(input.prompt)) {
      return {
        blocked: true,
        event,
        reason: `公司工作流暂不可用，当前请求明确依赖公司治理，相关范围已暂停：${detail}`
      };
    }
    if (
      event === 'Stop' &&
      (positiveSupervisionClaim(input.last_assistant_message) ||
        positiveCompanyWorkflowClaim(input.last_assistant_message))
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
  if (!hasCompanySignature(input.last_assistant_message)) {
    return {
      output: {
        decision: 'block',
        reason:
          '最终公司回复缺少精确末行“以上内容由 Ted 公司的{该任务既定主责实名}等人为您提供”。请继续当前回合，补齐尾注后再结束。'
      }
    };
  }
  if (!positiveSupervisionClaim(input.last_assistant_message)) return { output: {} };
  const taskId = input.session_id;
  if (typeof taskId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(taskId)) {
    return { output: { decision: 'block', reason: '检测到“已受监管”声明，但当前会话 ID 无法用于监管登记。请撤回该声明并报告 task_identity_unusable。' } };
  }
  const gate = await checkSupervision(taskId, { root: companyRoot });
  if (!gate.claim_allowed) {
    return { output: { decision: 'block', reason: `检测到无有效证据的监管声明（${gate.reason}）。请继续当前回合，撤回“已受监管”表述并向用户报告告警。` } };
  }
  return { output: {} };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  readInput().then(handle).then(result => {
    if (!result.blocked) return emit(result.output);
    if (result.event === 'UserPromptSubmit') return emit({ decision: 'block', reason: result.reason });
    emit({ continue: false, stopReason: result.reason, systemMessage: result.reason });
  }).catch(error => {
    process.stderr.write(`Ted 公司平台接管 hook 异常，已按 fail-closed 阻止：${error.message}\n`);
    process.exitCode = 2;
  });
}
