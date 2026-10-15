#!/usr/bin/env node
import { deliverContext, CONTEXT_LIMITS } from './core/context-budget.js';
import { clientStateRoot } from './core/client-state.js';
import { hookProject } from './core/session-ingress.js';
// One synchronous ingress per host event; cached footer/execution aliases use it too.
import { readFileSync } from 'node:fs';
import { captureNative, nativeTaskStatus, handleCapturedOnce } from './core/session-ingress.js';
import { runCodexHook } from './core/codex-hooks.js';
import { runExecutionHook } from './core/execution.js';
import { hookWarning } from './core/hook-warning.js';
let collection;
try {
  const pos = process.argv.indexOf('--deployment');
  if (pos < 0 || !process.argv[pos + 1]) throw Error('--deployment required');
  const file = process.argv[pos + 1], input = JSON.parse(readFileSync(0, 'utf8'));
  collection = captureNative(input, file);
  const output = handleCapturedOnce(input,file,collection,()=>{
  const parts = [];
  if (['SessionStart', 'UserPromptSubmit', 'Stop'].includes(input.hook_event_name)) parts.push(runCodexHook(input, file));
  if (['UserPromptSubmit', 'PreToolUse', 'PostToolUse'].includes(input.hook_event_name)) parts.push(runExecutionHook(input, file));
  // A resumed/forked/child session can attach at its first real tool event even
  // without a new user prompt. Provide the same task context on that event.
  if (collection.turn && ['SessionStart', 'SubagentStart', 'PreToolUse'].includes(input.hook_event_name)
      && (input.hook_event_name !== 'PreToolUse' || !nativeTaskStatus(input,file,collection.turn))) {
    parts.push(runExecutionHook(input, file, { contextOnly: true }));
  }
  const warnings = parts.map(p => p.systemMessage).filter(Boolean);
  const contexts = parts.map(p => p.hookSpecificOutput?.additionalContext).filter(Boolean).sort((a,b)=>Number(b.includes('Native binding'))-Number(a.includes('Native binding')));
  const output = { _tedCollection: { ...collection, turn: undefined, contextReturned: contexts.length > 0,
    footerStatus: input.hook_event_name === 'Stop' && collection.captured ? (parts[0]?.systemMessage ? 'unverified' : 'verified') : 'not-checked' } };
  const taskState = parts.find(p => p._tedTask)?._tedTask;
  if (taskState) Object.assign(output._tedCollection, { taskStatus: taskState.status, taskVerified: taskState.verified });
  if (warnings.length) output.systemMessage = [...new Set(warnings)].join('\n');
  const control = parts.find(p=>p.decision!==undefined||p.continue!==undefined||p.hookSpecificOutput?.permissionDecision!==undefined);
  if (control) Object.assign(output, control);
  if (contexts.length && !control) {
    const project = hookProject(JSON.parse(readFileSync(file, 'utf8')), input);
    const key = { sessionId: input.session_id, turnId: input.turn_id || collection.turn?.turnId || 'session-start', agentId: input.agent_id };
    const recovery = ['SessionStart','SubagentStart'].includes(input.hook_event_name);
    const deliveredParts = [], statuses = [];
    for (const context of new Set(contexts)) {
      const binding = context.includes('Native binding');
      const tag = binding ? 'binding' : context.includes('The following footer belongs') ? 'footer' : 'notice:' + context;
      const id = recovery ? `${tag}:recovery:${collection.captureId}` : tag;
      const delivered = deliverContext(clientStateRoot(project), key, id, context, { maxBytes: CONTEXT_LIMITS.hookBytes });
      statuses.push(delivered.status);
      if (delivered.content) deliveredParts.push(delivered.content);
    }
    output._tedCollection.contextDelivery = statuses;
    output._tedCollection.contextReturned = deliveredParts.length > 0;
    if (deliveredParts.length) output.hookSpecificOutput = { hookEventName: input.hook_event_name, additionalContext: deliveredParts.join('\n\n') };
  }
  return output;
  });
  process.stdout.write(JSON.stringify(output) + '\n');
} catch (error) {
  process.stdout.write(JSON.stringify({ ...hookWarning('ingress', error.message), _tedCollection: collection ?? { captured: false, attached: false, status: 'unverified' } }) + '\n');
}
