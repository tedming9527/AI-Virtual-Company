import { bytePrefix } from './context-budget.js';
// Collection failures are diagnostic output, never native permission decisions.
// Do not write a fallback receipt: the failed storage may itself be the cause.
export function hookWarning(component, reason) {
  component = bytePrefix(String(component), 48); reason = bytePrefix(String(reason), 200);
  return { systemMessage: `⚠️ Ted 采集失败或未验证 [${component}]：${reason}。采集/校验未完成，证据不可声明为已验证。当前任务照常推进，无需暂停、重试或追加回合；请修复钩子，检查采集配置、路径、权限或锁。平台权限、沙箱和审批仍然有效。` };
}
