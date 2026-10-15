#!/usr/bin/env python3
"""Plan or apply one content-preserving inbox JSON filename repair."""
import argparse
import datetime
import json
import os
from pathlib import Path
import re
import uuid

from client_environment import safe, read, save, inventory, copy_verified, personal_locked


def repair_inbox_name(personal, filename, *, apply=False):
    personal = safe(Path(personal))
    if not personal.is_dir() or not (personal / 'inbox').is_dir():
        raise ValueError('Existing personal project and inbox required')
    if not isinstance(filename, str) or not re.fullmatch(r'[^.\x00\r\n/\\][^\x00\r\n/\\]*\.json', filename):
        raise ValueError('Use one inbox JSON basename, not a path')
    source = safe(personal / 'inbox' / filename)
    if not source.is_file() or source.stat().st_size > 1024 * 1024:
        raise ValueError('Expected a regular inbox JSON file no larger than 1 MiB')
    snapshot = inventory(source)
    if re.match(r'^\d{4}-\d{2}-\d{2}-', filename):
        return {'status': 'already-conforming', 'source': 'inbox/' + filename, 'sha256': snapshot['']}
    document = read(source)
    created = document.get('created_at') if isinstance(document, dict) else None
    if not isinstance(created, str):
        raise ValueError('Explicit ISO created_at required; do not guess from file timestamps')
    date = (datetime.date.fromisoformat(created) if re.fullmatch(r'\d{4}-\d{2}-\d{2}', created)
            else datetime.datetime.fromisoformat(created.replace('Z', '+00:00')).date()).isoformat()
    target = safe(source.with_name(date + '-' + filename))
    if target.exists():
        raise ValueError('Target exists; refusing to overwrite')
    result = {'schema': 'avc.inbox-naming-repair.v1', 'status': 'planned',
              'source': 'inbox/' + filename, 'target': 'inbox/' + target.name,
              'sha256': snapshot[''], 'createdAt': created,
              'ownershipChanged': False, 'promotion': 'none'}
    if not apply:
        return result
    with personal_locked(personal):
        if inventory(source) != snapshot:
            raise ValueError('Source changed; repair stopped')
        recovery = safe(personal / 'staging/naming-repairs' / uuid.uuid4().hex)
        copy_verified(source, recovery / 'original.json', snapshot)
        result.update(status='preserved', recovery=str(recovery.relative_to(personal)))
        save(recovery / 'receipt.json', result)
        if inventory(source) != snapshot:
            raise ValueError('Source changed during preservation; original backup retained')
        # Exclusive link creation cannot overwrite a destination created by a
        # concurrent writer. Both names are in the same inbox/filesystem.
        os.link(source, target, follow_symlinks=False)
        if inventory(source) != snapshot or inventory(target) != snapshot:
            raise ValueError('Content changed; retain both names and original backup for review')
        source.unlink()
        result['status'] = 'verified'
        save(recovery / 'receipt.json', result)
        return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--personal-project', required=True, type=Path)
    parser.add_argument('--file', required=True, help='One inbox JSON basename')
    parser.add_argument('--apply', action='store_true', help='Apply the reviewed repair; default only plans')
    args = parser.parse_args()
    try:
        print(json.dumps(repair_inbox_name(args.personal_project, args.file, apply=args.apply), ensure_ascii=False, indent=2))
    except (ValueError, OSError, KeyError) as error:
        parser.exit(1, str(error) + '\n')
