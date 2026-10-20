import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('sync', Path(__file__).with_name('safe-sync-daily-ads.py'))
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)

class SafeSyncTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='yoki-sync-test-')
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.g('init', '-q')
        self.g('config', 'user.email', 'fixture@example.invalid')
        self.g('config', 'user.name', 'Fixture')
        self.write('artifacts/mobile/package.json', '{"name":"@workspace/mobile"}\n')
        self.write('artifacts/a.txt', 'a\nb\nc\nd\ne\nf\ng\nh\ni\nj\n')
        self.write('.gitignore', '.env\nignored/\n')
        self.base = self.commit()
        self.write('artifacts/a.txt', 'NEW\nb\nc\nd\ne\nf\ng\nh\ni\nj\n')
        self.write('artifacts/b.txt', 'added\n')
        self.target = self.commit()
        self.g('checkout', '-q', self.base)
    def g(self, *args):
        p = subprocess.run(['git','-C',str(self.root),*args], capture_output=True, check=True)
        return p.stdout
    def write(self, name, text):
        p = self.root/name; p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)
    def commit(self):
        self.g('add','.');self.g('commit','-qm','fixture');return self.g('rev-parse','HEAD').decode().strip()
    def plan(self, known=()):
        return sync.plan(self.root,self.base,self.target,known)
    def apply(self, changes):
        return sync.apply(self.root,changes,self.base,self.target)
    def test_dry_run_does_not_change_index_head_or_sources(self):
        index=(self.root/'.git/index').read_bytes();head=self.g('rev-parse','HEAD')
        changes=self.plan();self.assertEqual(len(changes),2)
        self.assertEqual((self.root/'.git/index').read_bytes(),index)
        self.assertEqual(self.g('rev-parse','HEAD'),head)
        self.assertFalse((self.root/'artifacts/b.txt').exists())
        self.assertTrue((self.root/'artifacts/a.txt').read_text().startswith('a\n'))
    def test_apply_backups_no_git_head_or_index_mutation(self):
        index=(self.root/'.git/index').read_bytes();head=self.g('rev-parse','HEAD')
        self.write('.env','DO_NOT_TOUCH=fixture\n'); backup=self.apply(self.plan())
        self.assertEqual((self.root/'artifacts/b.txt').read_text(),'added\n')
        self.assertTrue((self.root/'artifacts/a.txt').read_text().startswith('NEW\n'))
        self.assertEqual((backup/'files/artifacts/a.txt').read_text(),'a\nb\nc\nd\ne\nf\ng\nh\ni\nj\n')
        self.assertEqual((self.root/'.env').read_text(),'DO_NOT_TOUCH=fixture\n')
        self.assertEqual((self.root/'.git/index').read_bytes(),index)
        self.assertEqual(self.g('rev-parse','HEAD'),head)
        self.assertEqual(json.loads((backup/'manifest.json').read_text())['target'],self.target)
    def test_independent_local_change_is_preserved(self):
        p=self.root/'artifacts/a.txt';p.write_text(p.read_text().replace('j\n','LOCAL\n'))
        self.apply(self.plan())
        self.assertTrue(p.read_text().startswith('NEW\n'))
        self.assertTrue(p.read_text().endswith('LOCAL\n'))
    def test_conflict_stops_entire_plan(self):
        self.write('artifacts/a.txt','CONFLICT\nb\nc\nd\ne\nf\ng\nh\ni\nj\n')
        before=self.g('status','--porcelain')
        with self.assertRaises(sync.Stop):self.plan()
        self.assertEqual(self.g('status','--porcelain'),before)
        self.assertFalse((self.root/'artifacts/b.txt').exists())
    def test_untracked_new_file_is_not_overwritten(self):
        self.write('artifacts/b.txt','UNTRACKED\n')
        with self.assertRaises(sync.Stop):self.plan()
        self.assertEqual((self.root/'artifacts/b.txt').read_text(),'UNTRACKED\n')
    def test_repeating_apply_is_noop(self):
        self.apply(self.plan());self.assertEqual(self.plan(),[])
    def test_known_previously_added_version_can_advance(self):
        self.g('checkout','-q',self.target)
        old=self.target
        self.write('artifacts/b.txt','updated\n');self.target=self.commit()
        self.g('checkout','-q',old)
        self.apply(self.plan(known=(old,)))
        self.assertEqual((self.root/'artifacts/b.txt').read_text(),'updated\n')
    def test_symlink_file_is_refused(self):
        p=self.root/'artifacts/a.txt';p.unlink();p.symlink_to('/etc/passwd')
        with self.assertRaises(sync.Stop):self.plan()
    def test_symlink_parent_is_refused(self):
        (self.root/'other').mkdir(); (self.root/'artifacts/link').symlink_to(self.root/'other',target_is_directory=True)
        with self.assertRaises(sync.Stop):sync.source_path(self.root,'artifacts/link/x.txt')
    def test_forbidden_paths_are_refused(self):
        for name in ['../x','/tmp/x','.env','artifacts/.env.local','artifacts/key.pem','.replit']:
            with self.subTest(name=name),self.assertRaises(sync.Stop):sync.source_path(self.root,name)
    def test_edit_after_plan_stops_before_any_write(self):
        changes=self.plan();self.write('artifacts/a.txt','edit after plan\n')
        with self.assertRaises(sync.Stop):self.apply(changes)
        self.assertEqual((self.root/'artifacts/a.txt').read_text(),'edit after plan\n')
        self.assertFalse((self.root/'artifacts/b.txt').exists())
    def test_failed_second_write_rolls_back_first_write(self):
        changes=self.plan();real=sync.write_atomic
        def failure(path,data,mode):
            if path.name=='b.txt':raise OSError('fixture write failure')
            real(path,data,mode)
        with patch.object(sync,'write_atomic',failure),self.assertRaises(OSError):self.apply(changes)
        self.assertTrue((self.root/'artifacts/a.txt').read_text().startswith('a\n'))
        self.assertFalse((self.root/'artifacts/b.txt').exists())
        self.assertFalse((self.root/'.git/yoki-source-sync.lock').exists())
    def test_existing_sync_lock_prevents_writes(self):
        self.write('.git/yoki-source-sync.lock','busy')
        with self.assertRaises(sync.Stop):self.apply(self.plan())
        self.assertFalse((self.root/'artifacts/b.txt').exists())
    def test_deleted_target_is_refused(self):
        self.g('checkout','-q',self.target);self.g('rm','artifacts/a.txt');self.target=self.commit()
        self.g('checkout','-q',self.base)
        with self.assertRaises(sync.Stop):self.plan()
    def test_existing_executable_mode_preserved(self):
        p=self.root/'artifacts/a.txt';p.chmod(0o755);self.apply(self.plan());self.assertEqual(p.stat().st_mode&0o777,0o755)
    def test_cli_defaults_to_dryrun(self):
        p=subprocess.run(['python3',str(Path(sync.__file__)), '--base',self.base,'--target',self.target],cwd=self.root,capture_output=True,text=True)
        self.assertEqual(p.returncode,0,p.stderr);self.assertIn('DRY_RUN_OK',p.stdout)
        self.assertFalse((self.root/'artifacts/b.txt').exists())
    def test_active_git_operation_blocks_cli(self):
        self.write('.git/MERGE_HEAD',self.target)
        p=subprocess.run(['python3',str(Path(sync.__file__)), '--base',self.base,'--target',self.target,'--apply'],cwd=self.root,capture_output=True,text=True)
        self.assertEqual(p.returncode,2);self.assertIn('Git operation',p.stderr)
        self.assertFalse((self.root/'artifacts/b.txt').exists())
    def test_unpinned_target_is_refused(self):
        with self.assertRaises(sync.Stop):sync.plan(self.root,self.base,'HEAD',())

if __name__ == '__main__':unittest.main(verbosity=2)
