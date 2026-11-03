import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from pixel_factory import MOTIONS, export_monster, import_grid, load_catalog, pose

class PixelFactoryTests(unittest.TestCase):
    def monster(self, rank, rig):
        return {'monster_id':f'M01-01-{len(rank)+len(rig):02d}', 'rank':rank,'art_rig_group':rig,'type_id':'scout'}

    def test_frame_budgets(self):
        self.assertEqual({k:sum(v.values()) for k,v in MOTIONS.items()},
                         {'common':40,'special':52,'elite':80,'boss':160})
        self.assertEqual(1400*40 + 300*52 + 200*80 + 100*160, 103600)

    def test_deterministic_and_palette(self):
        m=self.monster('common','beast')
        self.assertEqual(pose(m,'walk',3,8).tobytes(),pose(m,'walk',3,8).tobytes())
        self.assertNotEqual(pose(m,'walk',3,8).tobytes(),pose(m,'attack_a',2,8).tobytes())
        self.assertNotEqual(pose(m,'walk',3,8).tobytes(),pose(m,'walk',3,8,1).tobytes())

    def test_animations_export_all_ranks(self):
        with tempfile.TemporaryDirectory() as tmp:
            for rank in MOTIONS:
                m=self.monster(rank,'robot')
                result=export_monster(m,Path(tmp)/rank)
                self.assertEqual(sum(v['frames'] for v in result['motions'].values()),
                                 sum(MOTIONS[rank].values()))
                self.assertIn('procedural_placeholder',result['art_generation_type'])
                self.assertTrue((Path(tmp)/rank/m['monster_id']/'animations.json').exists())

    def test_grid_duplicate_check(self):
        with tempfile.TemporaryDirectory() as tmp:
            grid=Image.new('RGBA',(32,16),(255,0,0,255))
            grid.save(Path(tmp)/'test.png')
            result=import_grid(Path(tmp)/'test.png',Path(tmp)/'frames',2,1)
            self.assertEqual(result['duplicate_exact_frames'],1)
            self.assertEqual(result['unique_exact_frames'],1)

    def test_catalog_duplicate_id_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            m=self.monster('common','beast')
            Path(tmp,'MONSTERS_01_05.json').write_text(json.dumps({'monsters':[m,m]}))
            with self.assertRaises(ValueError):
                load_catalog(Path(tmp))

if __name__=='__main__':
    unittest.main()
