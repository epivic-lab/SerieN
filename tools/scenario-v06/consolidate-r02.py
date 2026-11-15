"""Version the R0.1 geometry without changing any point, node or safety rule."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'docs/_active/scenario-v06'
BASELINE = '65ec1675510700fef503c16af2cfbe725817568a'


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--output', type=Path, default=BASE/'candidate/R02/track.json')
    args = ap.parse_args()
    source = BASE/'candidate/R01/track.json'
    c = json.loads(source.read_text())
    c.update(schema='serien-v06-r02-candidate-1', base_commit=BASELINE,
             status='OFFLINE_GEOMETRY_VALIDATED_REGIA_REVIEW_PENDING_NOT_ACTIVE',
             parent_candidate_sha256=hashlib.sha256(source.read_bytes()).hexdigest())
    c['validation_r02'] = {
        'geometry_change_from_R01': 'NONE: all 79 pieces, nodes, ports, states and gaps preserved',
        'decision': 'retain R01: continuous G1 secondary CAD reconstruction; no demonstrably superior physical profile acquired',
        'local_masterplan_exception': 'Regia R02 mandate permits the R01 local WX shape exception, approximately 3.335 mm; dense R02 metrology refines its sampled maximum',
        'manufacturer_exact_geometry_certified': False,
        'report': '../../R02_WX_GEOMETRY_VALIDATION_REPORT.md',
        'visual_contract': 'visual-contract.json',
        'runtime_circulation': 'NOT VERIFIED; no simulator import or activation',
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(c, indent=2)+'\n')
    print(hashlib.sha256(args.output.read_bytes()).hexdigest(), args.output)


if __name__ == '__main__':
    main()
