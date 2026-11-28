"""Tests of the L02-F measurement method, distinct from asset acceptance."""
import importlib.util
import math
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('quartering', Path(__file__).with_name('audit-quartering.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class QuarteringMethodTests(unittest.TestCase):
    def test_true_quarters_in_both_directions_and_across_angle_wrap(self):
        for degrees in range(-180, 181, 15):
            angle = math.radians(degrees)
            left = (2.5 * math.cos(angle), 2.5 * math.sin(angle))
            for turn in (-math.pi / 2, math.pi / 2):
                right = (2.5 * math.cos(angle + turn), 2.5 * math.sin(angle + turn))
                self.assertTrue(module.quartered(left, right))
                self.assertAlmostEqual(module.phase_difference(left, right), 90)

    def test_mirrored_and_opposite_cranks_fail_in_common_axle_coordinates(self):
        self.assertFalse(module.quartered((1.8, 1.8), (1.8, 1.8)))
        self.assertFalse(module.quartered((1.8, 1.8), (-1.8, -1.8)))

    def test_degenerate_and_nonfinite_pins_are_rejected(self):
        for bad in [(0, 0), (math.nan, 1), (1, math.inf)]:
            with self.assertRaises(ValueError):
                module.phase_difference(bad, (1, 2))

    def test_pin_cap_selection_uses_glb_forward_axis_and_rejects_spokes(self):
        points = [(6.61, 1.8 + .3 * math.sin(i * math.tau / 24),
                   -1.8 + .3 * math.cos(i * math.tau / 24)) for i in range(24)]
        centre = module.cap_centre(points, 1, 6.0)
        self.assertAlmostEqual(centre['alongMm'], 1.8)
        self.assertAlmostEqual(centre['heightMm'], 1.8)
        with self.assertRaises(ValueError):
            module.cap_centre(points + [(6.61, 5, 0)], 1, 6.0)
        with self.assertRaises(ValueError):
            module.cap_centre(points, -1, 6.0)

    def test_immutable_source_is_consistently_unquartered_at_all_thresholds(self):
        report = module.audit()
        self.assertFalse(report['pass'])
        self.assertEqual(len(report['failedAxles']), 8)
        self.assertLess(report['maximumMeasuredSidePhaseDifferenceDegrees'], .2)
        for axle in report['axles']:
            reference = axle['samples'][0]['phaseDifferenceDegrees']
            for sample in axle['samples']:
                self.assertEqual(sample['phaseDifferenceDegrees'], reference)
            for residual in axle['L02EMotionDifference'].values():
                self.assertAlmostEqual(residual['maximumMotionDifferenceMm'], residual['analyticMaximumMm'])


class QuarteringCandidateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import json
        candidate_spec = importlib.util.spec_from_file_location('candidate', Path(__file__).with_name('audit-quartering-candidate.py'))
        cls.candidate = importlib.util.module_from_spec(candidate_spec)
        candidate_spec.loader.exec_module(cls.candidate)
        cls.manifest = json.loads((cls.candidate.OUT / 'quartering-rig.json').read_text())

    def test_candidate_passes_and_conserves_all_driver_triangles(self):
        result = self.candidate.audit(self.manifest)
        self.assertTrue(result['pass'])
        self.assertEqual(result['driverTrianglesConserved'], 50653)
        self.assertLess(result['maximumCrankMotionDifferenceMm'], .01)

    def test_removing_quarter_turn_is_detected_as_asset_failure(self):
        import copy
        broken = copy.deepcopy(self.manifest)
        broken['positiveSidePhaseRad'] = 0
        self.assertFalse(self.candidate.audit(broken)['pass'])

    def test_wrong_triangle_partition_and_nonfinite_phase_are_rejected(self):
        import copy
        broken = copy.deepcopy(self.manifest)
        wheel = next(iter(broken['wheels'].values()))
        item = next(p for p in wheel['primitives'] if p['positiveTriangles'])
        item['positiveTriangles'].pop()
        with self.assertRaises(ValueError):
            self.candidate.audit(broken)
        broken = copy.deepcopy(self.manifest)
        broken['positiveSidePhaseRad'] = math.nan
        with self.assertRaises(ValueError):
            self.candidate.audit(broken)


if __name__ == '__main__':
    unittest.main()
