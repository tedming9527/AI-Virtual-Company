#!/usr/bin/env node
// Deterministic installation front end. It never asks an LLM to edit configuration.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { clientStatus } from './core/client-status.js';

const known=new Set(['--client','--codex-home','--personal-project','--source','--node','--python','--yes','--json','--help']);
const args=process.argv.slice(2), command=args[0]&&!args[0].startsWith('--')?args.shift():'install';
const options={};
try {
  for(let i=0;i<args.length;i++) {
    const key=args[i];if(!known.has(key))throw Error('未知选项：'+key);
    if(['--yes','--json','--help'].includes(key))options[key]=true;
    else {if(!args[i+1]||args[i+1].startsWith('--'))throw Error(key+' 缺少参数');options[key]=args[++i];}
  }
  if(options['--help']) {
    console.log('yarn setup [install|status|recover] / npm run setup -- [install|status|recover]\n选项：--client codex --codex-home <目录> --personal-project <已有用户项目> --source <中央源码> --yes --json\n仅 Codex 适配器已实现；其他客户端不能安装。配置写入、宿主加载、会话介入分别验收。');
  } else {
    const home=resolve(options['--codex-home']||process.env.CODEX_HOME||join(homedir(),'.codex'));
    if(command==='status') console.log(JSON.stringify(clientStatus({codexHome:home}),null,2));
    else {
      if(!['install','recover'].includes(command))throw Error('未知操作：'+command);
      const ui=process.stdin.isTTY&&!options['--yes']?createInterface({input:process.stdin,output:process.stdout}):null;
      try {
        let client=options['--client'];
        if(!client&&ui)client=(await ui.question('安装到哪个客户端？\n1. Codex（已实现）\n2. Claude Code（尚未提供可验证适配器）\n选择 [1]: ')).trim()||'1';
        if(client==='1')client='codex';if(client==='2')client='claude';
        if(!client)throw Error('非交互调用必须明确 --client codex');
        if(client!=='codex')throw Error('该客户端尚无已验证适配器；未写入任何配置：'+client);
        const source=resolve(options['--source']||process.env.AVC_PROJECT_ROOT||join(dirname(fileURLToPath(import.meta.url)),'../../..'));
        if(!existsSync(join(source,'scripts/client_environment.py')))throw Error('源码缺失；请使用 --source 指定完整中央源码。现有采集不依赖源码在线。');
        let personal=options['--personal-project'];
        if(!personal&&existsSync(join(home,'ted-avc-manager/deployment.json')))personal=JSON.parse(readFileSync(join(home,'ted-avc-manager/deployment.json'),'utf8')).environment?.AVC_PERSONAL_DIR;
        if(command==='install'&&!personal&&ui)personal=(await ui.question('已有用户资料项目目录（不会初始化或清空用户数据）: ')).trim();
        if(command==='install'&&!personal)throw Error('请指定 --personal-project；用户资料初始化与客户端安装分开。');
        const python=options['--python']||'python3', node=options['--node']||process.execPath;
        const probe=spawnSync(python,['-c','import sys;assert sys.version_info >= (3,11)'],{encoding:'utf8'});
        if(probe.error||probe.status!==0)throw Error('需要 Python 3.11+；未修改客户端');
        if(command==='install'&&Number(process.versions.node.split('.')[0])<22)throw Error('需要 Node 22+');
        if(command==='install'&&!options['--yes']) {
          if(!ui)throw Error('非交互安装须 --yes，或在终端运行向导');
          const answer=await ui.question(`将保全并重建 ${home} 中公司受管环境，接入该客户端所有会话。其他插件、账号、用户资料保持原状。确认 [y/N]: `);
          if(!/^y(es)?$/i.test(answer.trim()))throw Error('已取消；未修改客户端');
        }
        const argv=[join(source,'scripts/client_environment.py'),command==='install'?'rebuild':'recover','--root',source,'--codex-home',home,'--node',node];
        if(command==='install')argv.push('--personal-project',resolve(personal));
        const result=spawnSync(python,argv,{encoding:'utf8',maxBuffer:8*1024*1024});
        if(result.error||result.status!==0)throw Error(result.stderr||result.error?.message||'安装事务失败；请检查并 recover');
        const installation=JSON.parse(result.stdout);
        const runtime=spawnSync('codex',['--version'],{encoding:'utf8',timeout:3000});
        console.log(JSON.stringify({...installation,client,scope:'client',hostVersion:runtime.status===0?runtime.stdout.trim():'unknown',compatibility:'pending-native-event-verification',nativeActivation:'pending-host-reload-and-event'},null,2));
        if(!options['--json'])console.log('请在客户端审阅并信任新增 Hook，然后重载。原会话下一次真实事件与新会话使用同一入口；运行 yarn client:status 核对事件、上下文交付和任务绑定。安装成功不代表原生接入已验证。');
      } finally {ui?.close();}
    }
  }
} catch(error) {console.error('[Ted 安装器] '+error.message);process.exitCode=1;}
