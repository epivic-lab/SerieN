"""L02-F acceptance gate: measure the actual crankpin caps in immutable GLB.

Measures along/height in the same axle frame for both sides (no viewing-side
sign reversal). This is a mesh measurement, not the L02-E animation metadata.
Exit 2 means the asset fails quartering. Never rewrite the model to pass a test.
"""
import argparse
import hashlib
import json
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'docs/_active/rolling-stock/evidence/L02-D/prototype'
SOURCE_SHA = '14622eac1e9dc20e58411ceea59cf7ea053724936c637dbd2413596a5ba331e1'
TOLERANCE_DEGREES = 2.0


def phase_difference(left, right):
    if not all(math.isfinite(v) for p in (left, right) for v in p):
        raise ValueError('Non-finite pin centre')
    if min(math.hypot(*left), math.hypot(*right)) < .1:
        raise ValueError('Crankpin at axle centre is not measurable')
    cross = left[0] * right[1] - left[1] * right[0]
    dot = left[0] * right[0] + left[1] * right[1]
    return abs(math.degrees(math.atan2(cross, dot)))


def quartered(left, right):
    return abs(phase_difference(left, right) - 90) <= TOLERANCE_DEGREES


def cap_centre(points, side, threshold):
    if side not in (-1, 1):
        raise ValueError('Invalid wheel side')
    cap = [p for p in points if side * p[0] > threshold]
    if len(cap) < 12:
        raise ValueError('Not enough cap vertices')
    low = [min(p[k] for p in cap) for k in range(3)]
    high = [max(p[k] for p in cap) for k in range(3)]
    # The outer cap is thin axially and compact around its off-centre pin.
    # A contaminated wheel/spoke selection must not silently become a pin.
    if high[0] - low[0] > .03 or max(high[k] - low[k] for k in (1, 2)) > 1:
        raise ValueError('Selection is not the isolated crankpin cap')
    return {
        'vertices': len(cap), 'boundsGlbMm': [low, high],
        'alongMm': -(low[2] + high[2]) / 2,
        'heightMm': (low[1] + high[1]) / 2,
    }


def audit():
    binary = (SOURCE / 'prototype.glb').read_bytes()
    digest = hashlib.sha256(binary).hexdigest()
    if digest != SOURCE_SHA:
        raise ValueError('Unexpected source GLB; requalify cap selection first')
    size = struct.unpack_from('<I', binary, 12)[0]
    gltf = json.loads(binary[20:20 + size])
    data = binary[28 + size:]
    rig = json.loads((SOURCE / 'rig.json').read_text())
    animation = json.loads((ROOT / 'docs/_active/rolling-stock/evidence/L02-E/coupling-rods.json').read_text())

    def positions(index):
        accessor = gltf['accessors'][index]
        if accessor['type'] != 'VEC3' or accessor['componentType'] != 5126 or accessor.get('sparse'):
            raise ValueError('Expected dense float positions')
        view = gltf['bufferViews'][accessor['bufferView']]
        offset = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
        return [struct.unpack_from('<fff', data, offset + k * view.get('byteStride', 12))
                for k in range(accessor['count'])]

    records = []
    for name, axle in rig['axles'].items():
        if axle['parent'] not in ('engine_rear', 'engine_front'):
            continue
        node = next(node for node in gltf['nodes'] if node.get('name') == name)
        if any(key in node for key in ('matrix', 'rotation', 'scale')):
            raise ValueError('Unexpected axle coordinate transform')
        points = [p for primitive in gltf['meshes'][node['mesh']]['primitives']
                  for p in positions(primitive['attributes']['POSITION'])]
        # Repeat the cap selection over three thresholds to measure sensitivity.
        samples = []
        for threshold in (6.0, 6.2, 6.4):
            sides = {str(side): cap_centre(points, side, threshold) for side in (-1, 1)}
            vectors = [(sides[str(side)]['alongMm'], sides[str(side)]['heightMm']) for side in (-1, 1)]
            samples.append({'thresholdMm': threshold, 'sides': sides,
                            'phaseDifferenceDegrees': phase_difference(*vectors),
                            'pass': quartered(*vectors)})
        spec = animation['frames'][axle['parent']]
        q = (spec['crankAlongMm'], spec['crankHeightMm'])
        residuals = {}
        for side, cap in samples[0]['sides'].items():
            p = (cap['alongMm'], cap['heightMm'])
            # Difference of motion only: (R(theta)-I)(q-p). Independent of any
            # claim that an original rod hole is initially centred on the pin.
            d = (q[0] - p[0], q[1] - p[1])
            measured = []
            for step in range(73):
                angle = step * math.tau / 72
                c, s = math.cos(angle), math.sin(angle)
                measured.append(math.hypot((c - 1) * d[0] - s * d[1], s * d[0] + (c - 1) * d[1]))
            residuals[side] = {'maximumMotionDifferenceMm': max(measured),
                               'analyticMaximumMm': 2 * math.hypot(*d)}
        records.append({'axle': name, 'samples': samples, 'L02EMotionDifference': residuals})
    if len(records) != 8:
        raise ValueError('Expected exactly eight driving axles')
    return {
        'sourceSha256': digest, 'targetPhaseDifferenceDegrees': 90,
        'toleranceDegrees': TOLERANCE_DEGREES,
        'method': 'AABB centre of isolated outer crankpin cap, common along/height frame; three axial thresholds',
        'scope': 'Eight driving wheelsets in source GLB; no mechanical certification of rod holes or valve gear',
        'axles': records,
        'pass': all(s['pass'] for r in records for s in r['samples']),
        'failedAxles': [r['axle'] for r in records if not all(s['pass'] for s in r['samples'])],
        'maximumMeasuredSidePhaseDifferenceDegrees': max(s['phaseDifferenceDegrees'] for r in records for s in r['samples']),
        'maximumL02ECrankMotionDifferenceMm': max(v['maximumMotionDifferenceMm'] for r in records for v in r['L02EMotionDifference'].values()),
        'limits': [
            'Cap centres estimated from decimated mesh bounds, not fitted metrology of physical hardware.',
            'Quartering failure is about 90 degrees: much larger than sub-degree cap-mesh asymmetry.',
            'L02-E motion residual is not a measured rod-hole gap or a BVH collision.',
            'Main rod, valve gear and swept interference qualification are stopped at this failed gate.',
        ],
        'quarteringReference': 'https://fmwsolutions.com/2018/12/driving-wheel-amp-crank-pin-machining-campo-1309/',
    }


def diagram(result, destination):
    """Static measured-data SVG, explicitly distinct from a rendered GLB image."""
    parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="610" viewBox="0 0 1000 610">',
             '<rect width="1000" height="610" fill="#17212c"/>',
             '<g font-family="sans-serif" fill="#edf3f9">',
             '<text x="25" y="32" font-size="22">L02-F · quartatura misurata sui perni del GLB</text>',
             '<text x="25" y="58" font-size="14">Proiezione nello stesso piano asse: arancio = lato −X, azzurro = lato +X</text>',
             '<text x="25" y="80" font-size="14">Tratteggio = riferimento a 90° dal lato −X. Scala radiale 24 px/mm.</text>']
    for i, record in enumerate(result['axles']):
        cx, cy = 125 + (i % 4) * 250, 195 + (i // 4) * 220
        sample = record['samples'][0]
        left, right = (sample['sides'][str(side)] for side in (-1, 1))
        parts.append(f'<circle cx="{cx}" cy="{cy}" r="63" fill="none" stroke="#617080"/>')
        for cap, colour, width in [(left, '#ffb756', 7), (right, '#64d5ff', 2)]:
            x, y = cx + 24 * cap['alongMm'], cy - 24 * cap['heightMm']
            parts.append(f'<path d="M {cx} {cy} L {x} {y}" stroke="{colour}" stroke-width="{width}"/>')
        x, y = cx - 24 * left['heightMm'], cy - 24 * left['alongMm']
        parts.append(f'<path d="M {cx} {cy} L {x} {y}" stroke="#a6b2c0" stroke-dasharray="4 4"/>')
        label = record['axle'].replace('engine_', '').replace('_axle_', ' · asse ')
        parts.append(f'<text x="{cx}" y="{cy+86}" text-anchor="middle" font-size="15">{label}</text>')
        parts.append(f'<text x="{cx}" y="{cy+107}" text-anchor="middle" font-size="15">Δ = {sample["phaseDifferenceDegrees"]:.4f}° · FAIL</text>')
    parts += ['<text x="25" y="568" font-size="14">Rilievo numerico: quartering.json · non è una fotografia o una prova del biellismo completo.</text>',
              '<text x="25" y="591" font-size="14">Sorgente storico FAIL; candidato corretto verificato separatamente in candidate-quartering.json.</text>', '</g></svg>']
    destination.write_text('\n'.join(parts) + '\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/_active/rolling-stock/evidence/L02-F')
    args = parser.parse_args()
    result = audit()
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / 'quartering.json').write_text(json.dumps(result, indent=2) + '\n')
    diagram(result, args.output / 'quartering.svg')
    print(json.dumps({k: result[k] for k in ['pass', 'failedAxles', 'maximumMeasuredSidePhaseDifferenceDegrees', 'maximumL02ECrankMotionDifferenceMm']}, indent=2))
    raise SystemExit(0 if result['pass'] else 2)
