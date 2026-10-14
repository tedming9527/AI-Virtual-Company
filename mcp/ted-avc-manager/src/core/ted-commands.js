import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { clientStatus } from './client-status.js';
import { flowCheck, flowDoctor, flowPanorama } from './flows.js';
import { buildPanoramaModel } from '../panorama/generate.js';
import { repositoryOf } from '../panorama/candidates.js';
export const TED_COMMANDS=[
  {action:'help',description:'查看便捷命令与实际支持的客户端入口'},
  {action:'update',description:'检查安装版本、本地中央声明及公开最新 Release'},
  {action:'panorama',description:'生成本地全景图，展示最近资料升级与有效评分'},
  {action:'scores',description:'只读汇总有效评分与证据不足项，不制造实证样本'},
  {action:'doctor',description:'只读检查安装、会话采集和用户资料目录'},
  {action:'repair',description:'生成确定性修复方案和安装命令，不修改信任或自动重建'},
  {action:'status',description:'只读查看事件、上下文返回和任务契约状态'},
];
const aliases={'检查更新':'update','check-update':'update','全景图':'panorama','评分':'scores','体检':'doctor','修复':'repair','状态':'status','帮助':'help'};
export function parseTedCommand(command) {
  if(typeof command!=='string'||command.length>200||/[\r\n\0]/.test(command))throw Error('Invalid ted command');
  const match=/^(?:\/ted|\$ted|ted)(?:\s+(\S+))?\s*$/.exec(command.trim());
  if(!match)throw Error('Use /ted <action>, $ted <action>, or ted <action>');
  const action=aliases[match[1]]||match[1]||'help';
  if(!TED_COMMANDS.some(c=>c.action===action))throw Error('Unknown ted action; use ted help');return action;
}
export function tedAction(input={}) {
  if(input.command!==undefined&&input.action!==undefined)throw Error('Choose command or action');
  const action=input.command!==undefined?parseTedCommand(input.command):input.action||'help';
  if(!TED_COMMANDS.some(c=>c.action===action))throw Error('Unknown ted action');return action;
}
export async function runTedCommand(root,input={},options={}) {
  const action=tedAction(input),readOnly=action!=='panorama';
  if(action==='help')return {action,readOnly,commands:TED_COMMANDS,invocation:{skill:'$ted <action>',menu:'输入 /，在技能列表选择 Ted，再补充动作；实际菜单可见性需宿主验收',text:'/ted <action>',mcp:{tool:'ted_doctor',arguments:{}},cli:'ted-avc-manager ted <action>',nativeSlash:'Enabled skills appear in supported host slash menus; text aliases are not proof of picker visibility',nativeMention:'Standalone skill; native @Ted plugin registration is not claimed'}};
  if(action==='status')return {action,readOnly,...clientStatus(options)};
  if(action==='update') {
    const local=flowCheck(root,{runningVersion:options.runningVersion}),repo=repositoryOf(root);
    let remote={status:input.offline?'offline':'unavailable'};
    if(!input.offline&&repo)try {
      const response=await (options.fetch||fetch)(`https://api.github.com/repos/${repo}/releases/latest`,{signal:AbortSignal.timeout(6000),headers:{Accept:'application/vnd.github+json'}});
      if(!response.ok)throw Error('GitHub release lookup unavailable');const release=await response.json();
      if(!/^v\d+\.\d+\.\d+$/.test(release.tag_name)||release.draft||release.prerelease)throw Error('No verified stable release');
      remote={status:'available',tag:release.tag_name,publishedAt:release.published_at,url:`https://github.com/${repo}/releases/tag/${release.tag_name}`};
    }catch(error){remote={status:'unavailable',reason:error.message};}
    return {action,readOnly,local,remote,installation:'A version check does not install or reload the client'};
  }
  if(action==='panorama')return {action,readOnly,result:flowPanorama(root,{view:'local'})};
  if(action==='scores') {
    const model=buildPanoramaModel(root,{view:'local',offline:true,externalRoots:[]});
    return {action,readOnly,summary:model.qualityOverview,governance:model.weeklyGovernance,
      limitations:'Delivered asset bodies are not attributed outcomes or user feedback; insufficient evidence remains unscored'};
  }
  const status=clientStatus(options);let personal;
  try{personal=flowDoctor(root);}catch(error){personal={available:false,reason:error.message};}
  if(action==='doctor')return {action,readOnly,status,personal};
  const deployment=process.env.AVC_DEPLOYMENT_FILE;
  let bound={};try{if(deployment&&existsSync(deployment))bound=JSON.parse(readFileSync(deployment,'utf8'));}catch{}
  const home=options.codexHome||process.env.CODEX_HOME,source=bound.environment?.AVC_PROJECT_ROOT||root;
  return {action,readOnly,status,personal,plan:[
    {step:'reload',reason:'Cached MCP process must load the new installed generation',requiresHostAction:true},
    {step:'review-hooks',reason:'Review exact native hook definitions; installation does not grant trust',requiresHostAction:true},
    {step:'rebuild-if-needed',executable:process.execPath,args:[join(source,'mcp/ted-avc-manager/src/cli.js'),'setup','install','--client','codex',...(home?['--codex-home',home]:[])],effect:'Preserve then replace owned client environment; interactive installer confirms the concrete operation'}
  ],applied:false,taskContinues:true};
}
