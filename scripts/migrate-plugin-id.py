#!/usr/bin/env python3
"""Plan, apply, or roll back the context-compressor plugin ID migration."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import uuid

OLD='smart-cache-pro';NEW='context-compressor'

def digest(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()

def atomic(path,value):
    temp=path.with_name(path.name+'.tmp-'+uuid.uuid4().hex)
    temp.write_text(json.dumps(value,indent=2)+'\n');os.replace(temp,path)

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('operation',nargs='?',choices=['plan','apply','rollback'],default='plan')
    p.add_argument('--config',required=True);args=p.parse_args();config=Path(args.config).expanduser().resolve()
    if not config.is_file() or config.is_symlink():raise ValueError('config must be a regular existing JSON file')
    root=json.loads(config.read_text());entries=root.setdefault('plugins',{}).setdefault('entries',{})
    state=config.parent/'.context-compressor-migration';receipt=state/'receipt.json'
    if args.operation=='rollback':
        if not receipt.is_file():raise ValueError('rollback receipt unavailable')
        saved=json.loads(receipt.read_text());current=entries.get(NEW)
        if OLD in entries or current is None or digest(current)!=saved['new_digest']:raise ValueError('plugin entries changed; reconcile before rollback')
        entries[OLD]=saved['old_entry'];entries.pop(NEW);atomic(config,root)
        print(json.dumps({'status':'OK','operation':'rollback','from':NEW,'to':OLD,'config_preserved':True}));return
    if NEW in entries and OLD not in entries:
        print(json.dumps({'status':'ALREADY_CURRENT','changed':False}));return
    if OLD not in entries:raise ValueError('old plugin entry is absent')
    if NEW in entries:raise ValueError('both old and new plugin entries exist; refusing duplicate activation')
    result={'status':'DRY_RUN' if args.operation=='plan' else 'APPLYING','from':OLD,'to':NEW,'config_preserved':True}
    if args.operation=='plan':print(json.dumps(result));return
    old=entries.pop(OLD);entries[NEW]=old;state.mkdir(mode=0o700,exist_ok=True)
    atomic(config,root);atomic(receipt,{'schema':1,'old_entry':old,'new_digest':digest(old),'config':str(config)})
    result['status']='OK';result['rollback']='rollback';print(json.dumps(result))

if __name__=='__main__':
    try:main()
    except (OSError,ValueError,KeyError,TypeError,json.JSONDecodeError) as exc:
        print(json.dumps({'status':'FAIL','error':str(exc)}),file=sys.stderr);sys.exit(1)
