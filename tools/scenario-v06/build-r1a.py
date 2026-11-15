"""Deterministic R02 -> isolated runtime contract. Never reads/writes legacy data."""
from pathlib import Path
import argparse
import hashlib
import json

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'docs/_active/scenario-v06'
SOURCE = BASE / 'candidate/R02/track.json'
OUTPUT = ROOT / 'src/datasets/v06-r1a.json'

def build():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)
    routes = json.loads((BASE / 'evidence/R0/route-checks.json').read_text())
    node_id = lambda value: 'V06-' + value
    edge_id = lambda value: f'V06-P{value:03d}'
    terminals = {t['endpoint']: t['type'] for t in source['terminals']}
    nodes = {}
    for joint in source['junctions']:
        uid = node_id(joint['id'])
        nodes[uid] = dict(id=uid, x=joint['point_mm'][0], z=joint['point_mm'][1],
                          terminal=any(e in terminals for e in joint['endpoints']),
                          sourceJunction=joint['id'], endpoints=joint['endpoints'])
    loops = []
    lane_for_piece = {}
    # Runtime lane convention: inner=0, middle=1, outer=2.
    for lane, name in enumerate(['C', 'B', 'A']):
        walk = routes[name]['piece_walk']
        loops.append(dict(lane=lane, circuit=name,
                          segments=[dict(id=edge_id(i), sign=s) for i, s in walk]))
        for i, _ in walk:
            lane_for_piece[i] = lane
    controllers = []
    for control in source['controllers']:
        ports = {name: next(uid for uid, n in nodes.items() if [n['x'], n['z']] == point)
                 for name, point in control['ports_plan_mm'].items()}
        controllers.append(dict(id=control['id'], sourceId=control['manual_component'],
            code=control['kato_code'], name=control['id'],
            kind='cross' if control['type'] == 'WX310' else 'single',
            ports=ports, internal=[edge_id(p['piece']) for p in source['pieces'] if p['unit'] == control['id']],
            x=control['reference_point_plan_mm'][0], z=control['reference_point_plan_mm'][1],
            states={'false': 'N' if control['type'] == 'WX310' else 'S0',
                    'true': 'X' if control['type'] == 'WX310' else 'S1'},
            initialState=None, physicalCommandPolarity='NOT_CERTIFIED'))
    edges = []
    for piece in source['pieces']:
        i = piece['piece']
        edge = dict(id=edge_id(i), from_=node_id(piece['from_node']), to=node_id(piece['to_node']),
                    points=[dict(x=x, z=z) for x, z in piece['points']], length=piece['length_mm'],
                    sourcePiece=i, geometryRef=f"{SOURCE.relative_to(ROOT)}#/pieces/{i}",
                    sourceHiddenIntervalsMm=piece['hidden_intervals_mm'],
                    hiddenIntervalsMm=[[a, min(b, piece['length_mm'])] for a, b in piece['hidden_intervals_mm']],
                    direction='from-to; reverse traversal allowed',
                    role='mainline' if i in lane_for_piece else 'branch')
        edge['from'] = edge.pop('from_')
        if i in lane_for_piece:
            edge['lane'] = lane_for_piece[i]
            edge['circuit'] = ['C', 'B', 'A'][edge['lane']]
        if piece['unit']:
            edge.update(unit=piece['unit'], switchId=piece['unit'],
                        requiredState=piece['required_state'] in ['S1', 'X'])
            control = next(c for c in controllers if c['id'] == piece['unit'])
            edge['fromPort'] = next(p for p, uid in control['ports'].items() if uid == edge['from'])
            edge['toPort'] = next(p for p, uid in control['ports'].items() if uid == edge['to'])
            if piece['required_state'] == 'X':
                edge.update(role='crossover', fromLane=1 if piece['unit'] == 'WX-A' else 2,
                            toLane=0 if piece['unit'] == 'WX-A' else 1)
                # X routes are stored right -> left; derive lanes at actual ports.
                edge['fromLane'] = (1 if piece['unit'] == 'WX-A' else 2) if edge['fromPort'] == 'UR' else (0 if piece['unit'] == 'WX-A' else 1)
                edge['toLane'] = (1 if piece['unit'] == 'WX-A' else 2) if edge['toPort'] == 'UL' else (0 if piece['unit'] == 'WX-A' else 1)
        edges.append(edge)
    runtime_terminals = []
    for endpoint, kind in terminals.items():
        i, end = endpoint.split('.')
        piece = source['pieces'][int(i)]
        runtime_terminals.append(dict(id=node_id(piece['from_node' if end == 'S' else 'to_node']),
            edge=edge_id(int(i)), end=0 if end == 'S' else 1, type=kind,
            sourceEndpoint=endpoint, physicalUsefulLengthCertified=False, stopAnchor=None))
    def required_states(walk):
        states = {}
        for i, _ in walk:
            p = source['pieces'][i]
            if p['unit']:
                value = p['required_state'] in ['S1', 'X']
                if p['unit'] in states and states[p['unit']] != value:
                    return None
                states[p['unit']] = value
        return states
    itineraries = {name: dict(segments=[dict(id=edge_id(i), sign=s) for i, s in route['piece_walk']],
                     requiredStates=required_states(route['piece_walk']),
                     closed=name in ['A', 'B', 'C', 'TRIANGLE_GEOMETRIC_CYCLE'],
                     directTransitAllowed=name != 'TRIANGLE_GEOMETRIC_CYCLE') for name, route in routes.items()}
    # Explicit two-leg topological witness; never an instruction to stop on a buffer.
    approach = [[34,1],[27,1],[48,1],[46,1],[47,1],[52,-1],[50,-1],[32,-1],[53,-1],[44,1],[43,-1]]
    departure = [[43,1],[44,-1],[53,1],[31,-1],[39,-1],[40,-1],[38,1],[41,-1],[30,1],[29,1],[28,1],[26,1],[37,1]]
    manoeuvres = dict(triangle=dict(
        approach=dict(segments=[dict(id=edge_id(i),sign=s) for i,s in approach],requiredStates=required_states(approach)),
        departure=dict(segments=[dict(id=edge_id(i),sign=s) for i,s in departure],requiredStates=required_states(departure)),
        requiredEvent='stop before terminal with whole consist clear of N07; S1→S0; reverse',
        stopAnchor=None, runtimeAdmission=False))
    result = dict(schema='serien-v06-operational-1', layoutId='V06-R1A', version=1,
        units='mm', railTopMm=8.4, physical_profile_certified=False,
        runtime_circulation_verified=False, activation='ISOLATED_OPT_IN_ONLY',
        provenance=dict(baselineCommit='7118c99a9367da61f0042dfe40240fe78dc0d7c6',
            candidate=str(SOURCE.relative_to(ROOT)), candidateSha256=hashlib.sha256(raw).hexdigest(),
            sourceAxesSha256=source['source_axes_sha256'], alignmentSha256=source['source_sha256'],
            qualityGate='https://github.com/epivic-lab/SerieN/pull/13#issuecomment-6851925629'),
        nodes=nodes, edges=edges, controllers=controllers, terminals=runtime_terminals,
        mainLoops=loops, itineraries=itineraries, manoeuvres=manoeuvres, gaps=source['gaps'],
        statistics=dict(nodes=74, edges=79, components=1, cycleRank=6, terminals=3),
        limitations=['No spawn, certified stopping anchor, useful capacity or physical command polarity.',
                    'Triangle geometric cycle is not a direct runtime itinerary: N07 requires stop/clear/throw/reverse.',
                    'Unknown state must remain guarded by the existing engine; routing alone is not clearance.'])
    return (json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False) + '\n').encode()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=OUTPUT)
    args = parser.parse_args()
    data = build()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(data)
    print(f'{hashlib.sha256(data).hexdigest()}  {args.output.relative_to(ROOT) if args.output.is_relative_to(ROOT) else args.output}')
