"""Retire observations only from a verified old/new asset map, never from read errors."""
from pathlib import Path
import json
from client_environment import inventory, read, digest

def asset_map(packs):
    result={}
    for meta in sorted(Path(packs).glob('*/*/meta.json')):
        m=read(meta);kind,name=m['type'],m['name']
        if meta.parent.name!=name or meta.parent.parent.name!=kind:raise ValueError('Asset identity/path mismatch')
        files=inventory(meta.parent)
        bundle=[{'path':p,'bytes':(meta.parent/p).stat().st_size,'sha256':h} for p,h in files.items() if not any(n in ['.DS_Store','.git','node_modules'] for n in Path(p).parts)]
        sha=digest(json.dumps(bundle,ensure_ascii=False,separators=(',',':')).encode())
        key=f'general:{kind}/{name}@{m["version"]}#{sha}'
        result[key]={'source':'general','type':kind,'id':name,'version':m['version'],'bundleSha256':sha}
    return result

def key(asset):return f'{asset["source"]}:{asset["type"]}/{asset.get("id",asset.get("name"))}@{asset["version"]}#{asset["bundleSha256"]}'

def reconcile_observations(previous, old_map, new_map, live_user_keys=(), suppressed_keys=()):
    if previous.get('schema')!='avc.observations.v1':raise ValueError('Unknown observation schema; retain for review')
    retired=set(old_map)-set(new_map)-set(live_user_keys)
    suppressed=(set(suppressed_keys)|retired)-set(new_map)-set(live_user_keys)
    # Unknown provenance is retained, not guessed obsolete.
    events=[];seen=set()
    for e in previous.get('events',[]):
        if e.get('assetKey') in suppressed:continue
        event_id=e.get('eventId')
        if event_id and event_id in seen:continue
        if event_id:seen.add(event_id)
        events.append(e)
    rollups={k:v for k,v in previous.get('rollups',{}).items() if k not in suppressed}
    suggestions=[s for s in previous.get('suggestions',[]) if s.get('assetKey') not in suppressed]
    # Recompute only explicitly recorded signals; task success is not asset attribution.
    counts={}
    for e in events:
        if not e.get('assetKey'):continue
        row=counts.setdefault(e['assetKey'],{});signal=e.get('signal','unknown');row[signal]=row.get(signal,0)+1
    for k,v in counts.items():rollups[k]={'signals':v,'score':None,'status':'insufficient-attributed-evidence'}
    return {'schema':'avc.observations.v1','events':events,'rollups':rollups,'suggestions':suggestions}, {'schema':'avc.observation-retirement.v1','retiredAssetKeys':sorted(retired),'suppressedAssetKeys':sorted(suppressed),'removedEvents':len(previous.get('events',[]))-len(events),'removedRollups':len(set(previous.get('rollups',{}))&suppressed),'reason':'verified-complete-distribution-replacement'}

def collect_native(state):
    """Known raw logs -> observations. Parsing failure keeps originals, no fake success."""
    events=[];tasks=state/'runtime/execution/tasks'
    for file in sorted(tasks.glob('*.json')):
        task=read(file)
        # Observed deliveries count even when outcome/closeout is missing.
        # Canonical task facts are handed off separately, never compacted here.
        for asset in task.get('assets',[]):
            if not all(k in asset for k in ['source','type','name','version','bundleSha256']):continue
            events.append({'eventId':digest((str(file)+json.dumps(asset,sort_keys=True)).encode()),'assetKey':key(asset),'signal':'delivered','at':asset.get('loadedAt'),'taskId':task.get('taskId')})
    return events

def filter_native_log(data, retired_map, new_map):
    """Drop only attributable observation events; shared task/control facts remain."""
    rows=[];removed=0
    live_names={(a['source'],a['type'],a['id']) for a in new_map.values()}
    gone_names={(a['source'],a['type'],a['id']) for a in retired_map.values()}-live_names
    for line in data.decode().splitlines():
        if not line.strip():continue
        event=json.loads(line)
        identity=(event.get('source'),event.get('type'),event.get('name'))
        exact=None
        if all(event.get(k) for k in ['source','type','name','version','bundleSha256']): exact=key(event)
        if identity in gone_names or exact in retired_map:removed+=1;continue
        rows.append(json.dumps(event,ensure_ascii=False,separators=(',',':')))
    return ('\n'.join(rows)+ ('\n' if rows else '')).encode(),removed

def plan_archive_retirements(personal, retired_map, new_map):
    """Exact, hash-bound edits to owned historical observations; never scan user prose."""
    from client_environment import safe
    if not retired_map:return []
    plans=[]
    def plan(path,data):
        safe(path)
        if not path.is_relative_to(personal):raise ValueError('Observation archive escaped personal project')
        original=path.read_bytes()
        if original!=data:plans.append({'relative':str(path.relative_to(personal)),'before':digest(original),'data':data})
    def encoded(v):return (json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode()
    for receipt in sorted((personal/'staging/client-recovery').glob('*/recovery.json')):
        doc=read(safe(receipt))
        if doc.get('schema')!='avc.client-recovery.v1':continue
        changed=False
        for rel,entry in doc.get('files',{}).items():
            if entry.get('kind')!='audit':continue
            file=safe(receipt.parent/'files'/rel)
            if not file.is_relative_to(receipt.parent/'files'):raise ValueError('Recovery file escaped')
            data=file.read_bytes()
            if digest(data)!=entry['sha256']:raise ValueError('Audit archive changed; cannot retire from stale receipt')
            if rel.endswith('events.jsonl'):updated,_=filter_native_log(data,retired_map,new_map)
            elif '/tasks/' in rel and rel.endswith('.json'):
                task=json.loads(data)
                task['assets']=[a for a in task.get('assets',[]) if not all(a.get(f) for f in ['source','type','name','version','bundleSha256']) or key(a) not in retired_map]
                updated=encoded(task)
            else:continue
            if updated!=data:plan(file,updated);entry['sha256']=digest(updated);changed=True
        if changed:
            doc.setdefault('observationRetirements',[]).append({'assetKeys':sorted(retired_map),'reason':'verified-retirement','rawObservationsRetained':False})
            plan(receipt,encoded(doc))
    directory=personal/'experience/.avc';pending_file=directory/'weekly-state.json';state=read(pending_file) if pending_file.exists() else None
    for file in sorted(directory.glob('preparation-*.json')):
        doc=read(safe(file))
        if doc.get('schema')!='avc.weekly-preparation.v1':continue
        changed=False
        for window in doc.get('windows',[]):
            assets=window.get('assets',{});dropped=set(assets)&set(retired_map)
            if dropped:
                window['assets']={k:v for k,v in assets.items() if k not in retired_map}
                window['suggestions']=[v for v in window.get('suggestions',[]) if v.get('assetKey') not in retired_map]
                window['eventCount']=None;window['observationRetirements']=sorted(dropped);changed=True
        if changed:
            content=encoded(doc);plan(file,content)
            if state and state.get('pending',{} ) and state['pending'].get('file')==str(file.relative_to(personal)):
                if state['pending']['sha256']!=digest(file.read_bytes()):raise ValueError('Pending weekly proof changed')
                state['pending']['sha256']=digest(content);plan(pending_file,encoded(state))
    return plans
