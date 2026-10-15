import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from client_environment import inventory, read, copy_verified
from repair_inbox_event_name import repair_inbox_name

REPO = Path(__file__).resolve().parents[1]


class InboxRepairTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name).resolve()
        self.personal = self.base / 'projects/demo'
        (self.personal / 'inbox').mkdir(parents=True)
        self.source = self.personal / 'inbox/event.json'
        self.source.write_text(json.dumps({'id': 'stable-event', 'created_at': '2026-10-15', 'status': 'partial'}))

    def test_plan_is_read_only_apply_preserves_identity_and_clears_doctor_naming_issue(self):
        before = inventory(self.personal)
        plan = repair_inbox_name(self.personal, 'event.json')
        self.assertEqual(plan['status'], 'planned')
        self.assertEqual(inventory(self.personal), before)
        js = "import {doctorPersonal} from './mcp/ted-avc-manager/src/core/personal.js';console.log(JSON.stringify(doctorPersonal(process.argv[1],'demo')));"
        def naming():
            value = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', js, str(self.base)], cwd=REPO, text=True))
            return [i for i in value['issues'] if i['kind'] == 'naming']
        self.assertEqual(len(naming()), 1)
        result = repair_inbox_name(self.personal, 'event.json', apply=True)
        target = self.personal / result['target']
        backup = self.personal / result['recovery'] / 'original.json'
        self.assertFalse(self.source.exists())
        self.assertEqual(inventory(target), inventory(backup))
        self.assertEqual(read(target)['id'], 'stable-event')
        self.assertEqual(result['sha256'], inventory(target)[''])
        self.assertFalse(result['ownershipChanged'])
        self.assertEqual(result['promotion'], 'none')
        self.assertEqual(naming(), [])
        self.assertEqual(repair_inbox_name(self.personal, target.name, apply=True)['status'], 'already-conforming')

    def test_unknown_date_and_paths_never_get_guessed_or_moved(self):
        for name in ['../event.json', '/event.json', '.hidden.json', 'event.json\n']:
            with self.assertRaises(ValueError):
                repair_inbox_name(self.personal, name, apply=True)
        for created in [None, '2026-02-30', 'not-a-date']:
            self.source.write_text(json.dumps({'created_at': created}))
            before = inventory(self.personal)
            with self.assertRaises(ValueError):
                repair_inbox_name(self.personal, 'event.json', apply=True)
            self.assertEqual(inventory(self.personal), before)

    def test_symlinks_and_existing_destination_are_never_overwritten(self):
        alias = self.personal / 'inbox/alias.json'
        alias.symlink_to(self.source)
        with self.assertRaises(ValueError):
            repair_inbox_name(self.personal, alias.name, apply=True)
        alias.unlink()
        target = self.personal / 'inbox/2026-10-15-event.json'
        target.write_text('other writer')
        with self.assertRaises(ValueError):
            repair_inbox_name(self.personal, 'event.json', apply=True)
        self.assertEqual(target.read_text(), 'other writer')
        self.assertTrue(self.source.is_file())

    def test_destination_race_preserves_source_backup_and_competing_file(self):
        target = self.personal / 'inbox/2026-10-15-event.json'
        def race(source, backup, snapshot):
            result = copy_verified(source, backup, snapshot)
            target.write_text('competing writer')
            return result
        original = self.source.read_bytes()
        with patch('repair_inbox_event_name.copy_verified', side_effect=race):
            with self.assertRaises(FileExistsError):
                repair_inbox_name(self.personal, 'event.json', apply=True)
        self.assertEqual(self.source.read_bytes(), original)
        self.assertEqual(target.read_text(), 'competing writer')
        backups = list((self.personal / 'staging/naming-repairs').glob('*/original.json'))
        self.assertEqual(backups[0].read_bytes(), original)

    def test_source_change_during_preservation_stops_before_move(self):
        def change(source, backup, snapshot):
            result = copy_verified(source, backup, snapshot)
            source.write_text('new user content')
            return result
        original = self.source.read_bytes()
        with patch('repair_inbox_event_name.copy_verified', side_effect=change):
            with self.assertRaisesRegex(ValueError, 'Source changed'):
                repair_inbox_name(self.personal, 'event.json', apply=True)
        self.assertEqual(self.source.read_text(), 'new user content')
        self.assertFalse((self.personal / 'inbox/2026-10-15-event.json').exists())
        backups = list((self.personal / 'staging/naming-repairs').glob('*/original.json'))
        self.assertEqual(backups[0].read_bytes(), original)


if __name__ == '__main__':
    unittest.main()
