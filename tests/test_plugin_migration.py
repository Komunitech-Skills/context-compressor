import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]

class PluginMigration(unittest.TestCase):
    def test_plan_apply_rollback_and_unrelated_config(self):
        with tempfile.TemporaryDirectory() as temp:
            config=Path(temp)/'openclaw.json';original={'owner':'keep','plugins':{'entries':{'smart-cache-pro':{'enabled':True,'config':{'minLines':44}},'other':{'enabled':True}}}}
            config.write_text(json.dumps(original))
            def call(op):return subprocess.run(['python3',str(ROOT/'scripts/migrate-plugin-id.py'),op,'--config',str(config)],capture_output=True,text=True)
            self.assertEqual(json.loads(call('plan').stdout)['status'],'DRY_RUN')
            self.assertEqual(json.loads(config.read_text()),original)
            applied=call('apply');self.assertEqual(applied.returncode,0,applied.stderr)
            data=json.loads(config.read_text());self.assertNotIn('smart-cache-pro',data['plugins']['entries']);self.assertEqual(data['plugins']['entries']['context-compressor'],original['plugins']['entries']['smart-cache-pro'])
            data['post_apply_owner_edit']=True;config.write_text(json.dumps(data))
            rolled=call('rollback');self.assertEqual(rolled.returncode,0,rolled.stderr)
            data=json.loads(config.read_text());self.assertEqual(data['plugins']['entries']['smart-cache-pro'],original['plugins']['entries']['smart-cache-pro']);self.assertTrue(data['post_apply_owner_edit'])

    def test_refuses_duplicate_ids(self):
        with tempfile.TemporaryDirectory() as temp:
            config=Path(temp)/'openclaw.json';config.write_text(json.dumps({'plugins':{'entries':{'smart-cache-pro':{},'context-compressor':{}}}}))
            result=subprocess.run(['python3',str(ROOT/'scripts/migrate-plugin-id.py'),'apply','--config',str(config)],capture_output=True,text=True)
            self.assertNotEqual(result.returncode,0)

if __name__=='__main__':unittest.main()
