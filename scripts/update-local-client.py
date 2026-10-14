#!/usr/bin/env python3
# coding: utf-8
"""Update a reviewed Git tag and the local Codex MCP/skill/hook installation.
Call from the bound checkout. User assets are preserved; central-owned distribution copies are replaced by the verified source.
Hook trust and native activation must be verified separately through the client API.
Python 3.11+; rebuilds owned entries without retaining obsolete configuration. Native/global approval policy is unchanged.
"""
import argparse, json, pathlib, re, shutil, subprocess, os
p=argparse.ArgumentParser();p.add_argument('tag');p.add_argument('--personal-project');p.add_argument('--node',default=shutil.which('node'));p.add_argument('--codex-home',default=str(pathlib.Path.home()/'.codex'));a=p.parse_args()
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
# Client rebuild is a separate transaction; never call personal init here.
from client_environment import rebuild
personal=a.personal_project or os.environ.get('AVC_PERSONAL_DIR')
if not personal:
 local=root/'runtime/storage.json'
 if local.exists():personal=json.loads(local.read_text()).get('personal')
if not personal:raise SystemExit('--personal-project is required; no implicit personal directory')
evidence=rebuild(root,home,pathlib.Path(personal),pathlib.Path(a.node).resolve(),migrate=home==(pathlib.Path.home()/'.codex').resolve())
evidence.update({'tag':a.tag,'commit':commit})
(cache/'installation.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(evidence,ensure_ascii=False))
