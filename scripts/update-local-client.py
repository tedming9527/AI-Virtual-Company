#!/usr/bin/env python3
# coding: utf-8
"""Update a reviewed Git tag and the local Codex MCP/skill/hook installation.
Call from the bound checkout. Personal data is never copied, removed or published.
Hook trust and native activation must be verified separately through the client API.
Python 3.11+; includes task_begin/load_asset/task_closeout approval defaults and
preserves existing tool approval choices. No global approval policy is changed.
"""
import argparse, hashlib, json, pathlib, re, shlex, shutil, subprocess, datetime, os, sys, tomllib
p=argparse.ArgumentParser();p.add_argument('tag');p.add_argument('--node',default=shutil.which('node'));p.add_argument('--codex-home',default=str(pathlib.Path.home()/'.codex'));a=p.parse_args()
if not re.fullmatch(r'v\d+\.\d+\.\d+',a.tag):p.error('Expected exact semver release tag')
root=pathlib.Path.cwd().resolve();home=pathlib.Path(a.codex_home).resolve();version=a.tag[1:];cache=root/'runtime/cache/client-update'/version;cache.mkdir(parents=True,exist_ok=True)
def run(*args):return subprocess.check_output(args,text=True).strip()
remote=run('git','remote','get-url','origin')
if not re.fullmatch(r'(https://github\.com/|git@github\.com:)[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(?:\.git)?',remote):raise SystemExit('A reviewed GitHub origin is required')
subprocess.run(['git','fetch','origin','tag',a.tag],check=True)
commit=run('git','rev-parse',a.tag+'^{commit}')
# Preserve generated old public preview, but reject all other tracked local edits.
dirty=run('git','status','--porcelain','--untracked-files=no')
if dirty:
 if dirty.strip()!='M panorama/index.html':raise SystemExit('Checkout has tracked edits; update refused')
 shutil.copy2(root/'panorama/index.html',cache/'previous-panorama.html')
 subprocess.run(['git','restore','--','panorama/index.html'],check=True)
subprocess.run(['git','merge','--ff-only',a.tag],check=True)
manifest=json.loads((root/'bootstrap.json').read_text());assert manifest['version']==version
source=root/'mcp/ted-avc-manager';package=json.loads((source/'package.json').read_text());assert package['version']==version
pkg=pathlib.Path.home()/'.local/lib/ted-avc-manager'/version
if not pkg.exists():pkg.parent.mkdir(parents=True,exist_ok=True);shutil.copytree(source,pkg)
for f in source.rglob('*'):
 if f.is_symlink():raise SystemExit('Linked package file refused')
 if f.is_file():assert (pkg/f.relative_to(source)).read_bytes()==f.read_bytes(),'Installed version differs from released source'
node=str(pathlib.Path(a.node).resolve());assert int(run(node,'-p','process.versions.node.split(".")[0]'))>=22
bin_dir=pathlib.Path.home()/'.local/bin';bin_dir.mkdir(parents=True,exist_ok=True)
for name in ['ted-avc-manager','pack-manager']:
 launcher=bin_dir/name;tmp=launcher.with_name(name+'.update')
 tmp.write_text('#!/bin/sh\nset -eu\nexec '+shlex.quote(node)+' '+shlex.quote(str(pkg/'src/cli.js'))+' "$@"\n');tmp.chmod(0o700);tmp.replace(launcher)
launcher=bin_dir/'ted-avc-manager';deployment=root/'runtime/footer-hook-deployment.json'
config=json.loads(deployment.read_text())
for project in config['projects']:
 if pathlib.Path(project['root']).resolve()==root:
  project['execution']={'enabled':True,'mode':'monitor','maxToolCalls':1000,'bootstrapTools':['mcp__ted_avc_manager__'+n for n in ['list_packs','find_skill','list_assets','recommend_assets','check_update','load_asset','task_begin']]}
deployment.write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n')
for command in [['upgrade'],['init','根据 github://'+remote.split('github.com')[-1].lstrip('/:').replace('.git','')+'@'+a.tag+' 开始执行初始化，安装 mcp'],['install-codex-hooks',str(deployment),str(home)],['install-execution-hooks',str(deployment),str(home)]]:
 subprocess.run([str(launcher)]+command,check=True)
# Only the new namespaced bridge is installed; never overwrite an unrelated skill.
bridge=home/'skills/ted-avc-manager';bridge.parent.mkdir(parents=True,exist_ok=True)
if bridge.exists():
 existing=bridge/'meta.json'
 if not existing.is_file() or json.loads(existing.read_text()).get('name')!='ted-avc-manager':raise SystemExit('Unrelated local skill occupies bridge destination')
 shutil.copytree(root/'packs/skill/ted-avc-manager',bridge,dirs_exist_ok=True)
else:shutil.copytree(root/'packs/skill/ted-avc-manager',bridge)
command='cd '+shlex.quote(str(root))+' && exec '+shlex.quote(node)+' '+shlex.quote(str(pkg/'src/cli.js'))+' server'
client_env={**os.environ,'CODEX_HOME':str(home)}
client_config=home/'config.toml'
previous_config=client_config.read_bytes() if client_config.exists() else None
previous_server=tomllib.loads(previous_config.decode()).get('mcp_servers',{}).get('ted-avc-manager',{}) if previous_config else {}
previous_tools=previous_server.get('tools',{})
previous_policy={key:previous_server[key] for key in ['enabled','enabled_tools','disabled_tools','default_tools_approval_mode'] if key in previous_server}
subprocess.run(['codex','mcp','add','ted-avc-manager','--env','CODEX_HOME='+str(home),'--','/bin/sh','-c',command],check=True,env=client_env)
registered_config=client_config.read_bytes()
# Reviewed installation includes only the three local monitoring-tool defaults.
# Run after MCP registration, which may rewrite the server's configuration.
try:
 approval_result=json.loads(subprocess.check_output([sys.executable,str(root/'scripts/install-codex-approvals.py'),'--codex-home',str(home),'--server-id','ted-avc-manager','--authorize-monitor-tools','--preserve-tools-json',json.dumps(previous_tools),'--preserve-server-policy-json',json.dumps(previous_policy)],text=True))
except subprocess.CalledProcessError:
 # Do not leave a re-registered server with the user's previous policies lost.
 if previous_config is not None and client_config.read_bytes()==registered_config:client_config.write_bytes(previous_config)
 raise
subprocess.run(['codex','mcp','remove','pack-manager'],check=True,env=client_env)
# Native clients can retain a reviewed command path after an upgrade. Preserve
# each known older manager entry before forwarding just that entry to this tag.
compat=[]
if home == (pathlib.Path.home()/'.codex').resolve():
 old_entries=[pathlib.Path.home()/'.local/lib/avc-pack-manager/1.1.1/src/codex-hook.js']
 libraries=pathlib.Path.home()/'.local/lib/ted-avc-manager'
 target_parts=tuple(map(int,version.split('.')))
 if libraries.is_dir():
  old_entries += [x/'src/codex-hook.js' for x in libraries.iterdir() if re.fullmatch(r'\d+\.\d+\.\d+',x.name) and tuple(map(int,x.name.split('.')))<target_parts]
 for old in old_entries:
  if not old.is_file() or old.is_symlink():continue
  backup_dir=cache/'compatibility'/old.parents[2].name/old.parents[1].name;backup_dir.mkdir(parents=True,exist_ok=True)
  backup=backup_dir/'codex-hook.original.js'
  if not backup.exists():shutil.copy2(old,backup)
  target=pkg/'src/codex-hook.js'
  old.write_text('// Compatibility forwarding entry; original preserved by reviewed update.\nawait import('+json.dumps(target.as_uri())+');\n')
  compat.append({'path':str(old),'backup':str(backup),'target':str(target),'originalSha256':hashlib.sha256(backup.read_bytes()).hexdigest(),'forwarderSha256':hashlib.sha256(old.read_bytes()).hexdigest()})
evidence={'tag':a.tag,'commit':commit,'updatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'package':str(pkg),'bridge':str(bridge),'service':'ted-avc-manager','executionMode':'monitor','monitorToolApprovals':approval_result,'cachedFooterCompatibility':compat,'nativeHookTrust':'pending reviewed API hashes','nativeActivation':'pending client reload and acceptance'}
(cache/'installation.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(evidence,ensure_ascii=False))
