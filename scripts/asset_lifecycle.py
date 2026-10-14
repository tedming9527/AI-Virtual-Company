#!/usr/bin/env python3
"""Code-owned lineage, explicit promotion and client imports; no model-declared success."""
from pathlib import Path
import argparse, json, uuid
from client_environment import safe, read, save, inventory, digest, copy_verified, locked, personal_locked, OWNER, SCHEMA, remove

def identity(source,kind,name):
    import re
    if source not in ['central','user','client'] or kind not in ['skill','knowledge','framework','role','material'] or not re.fullmatch(r'[a-z0-9][a-z0-9-]*',name): raise ValueError('Invalid asset identity')
    return f'{source}:{kind}:{name}'

def fingerprint(files): return digest(json.dumps(files,sort_keys=True,separators=(',',':')).encode())
def ledger_file(personal): return safe(personal/'experience/.avc/asset-lifecycle.json')
def ledger(personal):
    f=ledger_file(personal)
    doc=read(f) if f.exists() else {'schema':'avc.asset-lifecycle.v1','assets':{},'transitions':[]}
    if doc.get('schema')!='avc.asset-lifecycle.v1': raise ValueError('Invalid lifecycle ledger')
    return doc

def import_user(home,personal,source):
    home,personal,source=map(safe,[home,personal,source])
    if not source.is_relative_to(personal/'custom'): raise ValueError('Only explicit user custom assets may be imported')
    meta=read(source/'meta.json');asset_id=identity('user',meta['type'],meta['name'])
    if meta['type']!='skill' or not (source/'SKILL.md').is_file(): raise ValueError('Native import requires a skill')
    with locked(home), personal_locked(personal):
        m=read(home/OWNER/'manifest.json')
        if m.get('schema')!=SCHEMA: raise ValueError('Initialize client first')
        files=inventory(source);revision=fingerprint(files);target='ted-avc-user-'+meta['name'];dst=home/'skills'/target
        if dst.exists():raise ValueError('Import target exists; rebuild or explicitly remove old import first')
        copy_verified(source,dst,files)
        marker={'owner':OWNER,'assetId':asset_id,'ownership':'user','source':str(source),'sourceRevision':revision,'generation':m['generation'],'direction':'user-to-client'}
        save(dst/'.avc-owned.json',marker)
        if inventory(source)!=files: remove(dst);raise ValueError('Source changed during import')
        entry={**marker,'target':target,'files':inventory(dst),'sourceFiles':files,'version':meta['version']}
        try:
            m['imports'].append(entry);save(home/OWNER/'manifest.json',m)
        except BaseException:remove(dst);raise
        # Client copies retain user ownership and do not automatically become new user revisions.
        return entry

def scan_client(home):
    home=safe(home);workspace=home/OWNER/'state/workspace'
    with locked(home):
        index=read(workspace/'index.json');previous=index.get('files',{});current={}
        for rel,h in inventory(workspace).items():
            if rel=='index.json':continue
            prior=previous.get(rel,{})
            if prior.get('sha256')==h:current[rel]=prior;continue
            if rel.startswith('history/'):current[rel]={'sha256':h,'origin':prior.get('origin','client-audit'),'kind':'audit','ownership':'client','status':'historical'}
            else:current[rel]={'sha256':h,'origin':prior.get('origin','client-created:'+uuid.uuid4().hex),'kind':'material','ownership':'client','status':'unpromoted',**({'parentAssetId':prior['assetId']} if prior.get('assetId') else {})}
        index['files']=current;save(workspace/'index.json',index)
        return {'files':len(current),'unpromoted':sum(v['status']=='unpromoted' for v in current.values())}

def promote_user(home,personal,relative_path,name,authorization_ref):
    """Explicit operator entry. Preservation never calls this function."""
    home,personal=map(safe,[home,personal]);workspace=home/OWNER/'state/workspace';src=safe(workspace/relative_path)
    if not src.is_relative_to(workspace) or src==workspace or not authorization_ref: raise ValueError('Promotion needs an exact workspace candidate and authorization reference')
    with locked(home), personal_locked(personal):
        index=read(workspace/'index.json');snapshot=inventory(src)
        if not snapshot:raise ValueError('Candidate empty or unavailable')
        selected={}
        for rel,h in snapshot.items():
            path=str((src/rel if rel else src).relative_to(workspace));record=index.get('files',{}).get(path)
            if not record or record.get('kind')=='audit' or record.get('status')!='unpromoted' or record.get('ownership')!='client': raise ValueError('Only registered unpromoted client material can be promoted')
            if h!=record['sha256']:raise ValueError('Candidate changed; rescan before promotion')
            selected[path]=record
        kind='material';meta=None
        if src.is_dir() and (src/'meta.json').is_file():
            meta=read(src/'meta.json');kind=meta['type']
            if meta.get('name')!=name:raise ValueError('Asset name differs from candidate metadata')
        key=identity('user',kind,name);files=snapshot if src.is_dir() else {src.name:snapshot['']};revision=fingerprint(files)
        doc=ledger(personal)
        if key in doc['assets']:raise ValueError('Asset exists; explicit revision workflow required')
        dst=safe(personal/'custom/packs'/kind/name if meta else personal/'custom/materials'/name/revision)
        if dst.exists():raise ValueError('User asset destination already exists; never overwrite')
        if src.is_dir():copy_verified(src,dst,snapshot)
        else:copy_verified(src,dst/src.name,snapshot)
        if inventory(dst)!=files:raise ValueError('Promotion target digest mismatch')
        transition={'id':uuid.uuid4().hex,'from':{'domain':'client','files':{p:r['sha256'] for p,r in selected.items()},'revision':revision},'to':{'domain':'user','assetId':key,'revision':revision,'path':str(dst)},'authorizationRef':authorization_ref,'status':'committed'}
        doc['assets'][key]={'ownership':'user','revision':revision,'path':str(dst),'status':'active','files':files,'origin':transition['from']};doc['transitions'].append(transition)
        save(ledger_file(personal),doc)
        for path,record in selected.items():
            relative=str((workspace/path).relative_to(src)) if src.is_dir() else src.name
            index['files'][path]={**record,'ownership':'user','status':'promoted','assetId':key,'userSource':str(dst/relative),'promotionId':transition['id']}
        save(workspace/'index.json',index)
        return transition

def propose_central(personal,asset_id,authorization_ref):
    personal=safe(personal);doc=ledger(personal);a=doc['assets'].get(asset_id)
    if not a or a['ownership']!='user' or a['status']!='active' or not authorization_ref:raise ValueError('Central proposal requires a registered active user asset and authorization')
    src=safe(a['path'])
    if not src.is_relative_to(personal/'custom'): raise ValueError('User asset path escaped')
    candidate=personal/'staging/central-proposals'/uuid.uuid4().hex
    files=inventory(src)
    if files!=a.get('files') or fingerprint(files)!=a['revision']:raise ValueError('Registered user source changed; register a reviewed revision first')
    copy_verified(src,candidate/'files',files)
    result={'schema':'avc.central-proposal.v1','from':{'assetId':asset_id,'revision':a['revision'],'files':files},'to':'central','ownership':'user','status':'pending-review','authorizationRef':authorization_ref,'publication':'none'}
    save(candidate/'proposal.json',result);return {'path':str(candidate),**result}

def register_central_release(personal,proposal,central_root,pack_path,tag,review_ref):
    with personal_locked(safe(personal)):
        return _register_central_release(personal,proposal,central_root,pack_path,tag,review_ref)

def _register_central_release(personal,proposal,central_root,pack_path,tag,review_ref):
    import re, subprocess
    personal,proposal,central_root=map(safe,[personal,proposal,central_root])
    if not proposal.is_relative_to(personal/'staging/central-proposals') or not re.fullmatch(r'v\d+\.\d+\.\d+',tag or '') or not review_ref:raise ValueError('Exact proposal, release tag and review reference required')
    info=read(proposal/'proposal.json')
    if info.get('status')!='pending-review' or info.get('ownership')!='user':raise ValueError('Invalid promotion state')
    if not re.fullmatch(r'packs/(skill|knowledge|framework|role)/[a-z0-9][a-z0-9-]*',pack_path):raise ValueError('Central package path required')
    def git(*args):return subprocess.check_output(['git','-C',str(central_root),*args])
    commit=git('rev-parse',tag+'^{commit}').decode().strip()
    subprocess.run(['git','-C',str(central_root),'merge-base','--is-ancestor',commit,'HEAD'],check=True)
    files=inventory(proposal/'files')
    if files!=info['from']['files']:raise ValueError('Promotion candidate changed')
    for rel,h in files.items():
        if digest(git('show',commit+':'+pack_path+'/'+rel))!=h:raise ValueError('Released content does not match reviewed candidate')
    meta=json.loads(git('show',commit+':'+pack_path+'/meta.json'))
    central_id=identity('central',meta['type'],meta['name'])
    if pack_path!=f"packs/{meta['type']}/{meta['name']}":raise ValueError('Released identity mismatch')
    doc=ledger(personal);source=doc['assets'].get(info['from']['assetId'])
    if not source or source['revision']!=info['from']['revision'] or inventory(safe(source['path']))!=source.get('files'):raise ValueError('User source revision changed')
    receipt={'id':uuid.uuid4().hex,'from':info['from'],'to':{'domain':'central','assetId':central_id,'version':meta['version'],'releaseTag':tag,'commit':commit},'reviewRef':review_ref,'status':'committed','sourcePreserved':True}
    doc['transitions'].append(receipt);save(ledger_file(personal),doc)
    save(proposal/'release-receipt.json',receipt);save(proposal/'proposal.json',{**info,'status':'released','releaseReceipt':receipt['id']})
    return receipt

def register_central_artifact_release(personal,proposal,central_root,targets,tag,review_ref,name):
    """Release lineage for any existing central artifact/composition; map every frozen source file."""
    import re, subprocess
    personal,proposal,central_root=map(safe,[personal,proposal,central_root])
    with personal_locked(personal):
        if not proposal.is_relative_to(personal/'staging/central-proposals') or not re.fullmatch(r'v\d+\.\d+\.\d+',tag or '') or not review_ref:raise ValueError('Exact proposal, release tag and review reference required')
        central_id=identity('central','material',name)
        info=read(proposal/'proposal.json')
        if info.get('status')!='pending-review' or info.get('ownership')!='user':raise ValueError('Invalid promotion state')
        files=inventory(proposal/'files')
        if files!=info['from']['files']:raise ValueError('Promotion candidate changed')
        if not isinstance(targets,dict) or set(targets)!=set(files) or len(set(targets.values()))!=len(targets):raise ValueError('Exact full source-to-central mapping required')
        for target in targets.values():
            if not isinstance(target,str) or not target or '\\' in target or Path(target).is_absolute() or any(x in ['..','.git','runtime','tmp','output'] for x in target.split('/')):raise ValueError('Central target escaped or uses private/runtime area')
            # Exact tracked files, including roles, frameworks, workflows, tools and presets.
            if target.startswith('/') or target.endswith('/') or '//' in target or '.' in target.split('/'):raise ValueError('Invalid central target')
        def git(*args):return subprocess.check_output(['git','-C',str(central_root),*args])
        commit=git('rev-parse',tag+'^{commit}').decode().strip()
        subprocess.run(['git','-C',str(central_root),'merge-base','--is-ancestor',commit,'HEAD'],check=True)
        for source,target in targets.items():
            if digest(git('show',commit+':'+target))!=files[source]:raise ValueError('Released artifact differs from reviewed candidate')
        doc=ledger(personal);asset=doc['assets'].get(info['from']['assetId'])
        if not asset or asset['revision']!=info['from']['revision'] or inventory(safe(asset['path']))!=asset.get('files'):raise ValueError('User source revision changed')
        receipt={'id':uuid.uuid4().hex,'from':info['from'],'to':{'domain':'central','assetId':central_id,'releaseTag':tag,'commit':commit,'targets':targets},'reviewRef':review_ref,'status':'committed','sourcePreserved':True}
        doc['transitions'].append(receipt);save(ledger_file(personal),doc)
        save(proposal/'release-receipt.json',receipt);save(proposal/'proposal.json',{**info,'status':'released','releaseReceipt':receipt['id']})
        return receipt

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('command',choices=['scan-client','import-user','promote-user','propose-central','register-central-release','register-central-artifact-release']);p.add_argument('--codex-home',type=Path,default=Path.home()/'.codex');p.add_argument('--personal-project',type=Path,required=True);p.add_argument('--source',type=Path);p.add_argument('--path');p.add_argument('--name');p.add_argument('--asset-id');p.add_argument('--authorization-ref');p.add_argument('--proposal',type=Path);p.add_argument('--central-root',type=Path);p.add_argument('--pack-path');p.add_argument('--tag');p.add_argument('--review-ref');p.add_argument('--targets',type=Path);a=p.parse_args()
    if a.command=='scan-client':result=scan_client(a.codex_home)
    elif a.command=='import-user':result=import_user(a.codex_home,a.personal_project,a.source)
    elif a.command=='promote-user':result=promote_user(a.codex_home,a.personal_project,a.path,a.name,a.authorization_ref)
    elif a.command=='register-central-artifact-release':result=register_central_artifact_release(a.personal_project,a.proposal,a.central_root,read(a.targets),a.tag,a.review_ref,a.name)
    elif a.command=='register-central-release':result=register_central_release(a.personal_project,a.proposal,a.central_root,a.pack_path,a.tag,a.review_ref)
    else:result=propose_central(a.personal_project,a.asset_id,a.authorization_ref)
    print(json.dumps(result,ensure_ascii=False))
