"""Independent WX metrology plus frozen R0.1 regression. No builder imports.

Requires NumPy/Matplotlib for measurement/figures only. Does not run a train.
XTP coordinates use x=cx+|r|sin(a), y=cy+|r|cos(a), inches.
"""
import argparse
import copy
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path

os.environ.setdefault('MPLCONFIGDIR', '/tmp/serien-r02-matplotlib')
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT/'docs/_active/scenario-v06'
E = BASE/'evidence/R02'
R = 583.184
C = math.hypot(.688, .157)*25.4


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def solve(width, height, radius, middle):
    # Independent closed form of D=2R(1-cos(t))+c sin(t).
    theta = math.atan2(2*radius, middle) + math.asin((height-2*radius)/math.hypot(2*radius, middle))
    lead = (width-2*radius*math.sin(theta)-middle*math.cos(theta))/2
    assert lead > 0 and 0 < theta < math.pi/2
    return theta, lead


def ordinate(xs, width, height, radius, middle):
    theta, lead = solve(width, height, radius, middle)
    x1 = lead+radius*math.sin(theta)
    y1 = radius*(1-math.cos(theta))
    xx = np.minimum(xs, width-xs)
    yy = np.where(xx <= lead, 0, np.where(xx < x1,
                  radius-np.sqrt(np.maximum(0, radius**2-(xx-lead)**2)),
                  y1+(xx-x1)*math.tan(theta)))
    return np.where(xs <= width/2, yy, height-yy)


def distance(points, line):
    a = np.array(line[:-1]); v = np.diff(line, axis=0); den = np.sum(v*v, axis=1)
    out = []
    for chunk in np.array_split(points, max(1, len(points)//100)):
        w = chunk[:, None, :]-a
        t = np.clip(np.sum(w*v, axis=2)/den, 0, 1)
        out.extend(np.sqrt(np.min(np.sum((w-t[:, :, None]*v)**2, axis=2), axis=1)))
    return np.array(out)


def unit(v):
    return np.array(v)/np.linalg.norm(v)


def angle(a, b):
    a, b = unit(a), unit(b)
    return math.degrees(math.atan2(abs(float(np.cross(a, b))), float(a@b)))


def primitive_checks(piece):
    p = piece['profile']; prim = p['primitives']
    assert [q['kind'] for q in prim] == ['line', 'arc', 'line', 'arc', 'line']
    pts = np.array(piece['points'][::-1]); start, end = pts[0], pts[-1]
    width = end[0]-start[0]; sign = np.sign(end[1]-start[1]); height = abs(end[1]-start[1])
    theta, lead = solve(width, height, R, C)
    assert abs(p['radius_mm']-R) < 1e-12 and abs(p['center_straight_mm']-C) < 1e-12
    assert abs(p['symmetric_lead_mm']-lead) < 1e-9
    assert abs(p['sweep_degrees']-math.degrees(theta)) < 1e-9
    errors = np.abs(pts[:, 1]-(start[1]+sign*ordinate(pts[:, 0]-start[0], width, height, R, C)))
    assert max(errors) < 1e-9, ('analytic locus', piece['piece'], max(errors))
    tangents = []; lengths = []; poserr = []; turn = sign
    for q in prim:
        a, b = np.array(q['start']), np.array(q['end'])
        if q['kind'] == 'line':
            h = q['heading_rad']; t = np.array([math.cos(h), math.sin(h)])
            assert angle(b-a, t) < 1e-8
            assert abs(np.linalg.norm(b-a)-q['length_mm']) < 1e-9
            tangents.append((t, t)); lengths.append(q['length_mm'])
        else:
            center = np.array(q['center']); sw = q['sweep_rad']
            assert abs(q['radius_mm']-R) < 1e-12
            assert abs(sw-turn*theta) < 1e-10
            assert abs(np.linalg.norm(a-center)-R) < 1e-9
            assert abs(np.linalg.norm(b-center)-R) < 1e-9
            t0 = turn*np.array([-(a-center)[1], (a-center)[0]])/R
            t1 = turn*np.array([-(b-center)[1], (b-center)[0]])/R
            assert angle(t0, [math.cos(q['heading_start_rad']), math.sin(q['heading_start_rad'])]) < 1e-8
            tangents.append((t0, t1)); lengths.append(R*abs(sw)); turn *= -1
    for a, b in zip(prim, prim[1:]):
        poserr.append(math.dist(a['end'], b['start']))
    tanerr = [angle(a[1], b[0]) for a, b in zip(tangents, tangents[1:])]
    assert max(poserr) < 1e-10 and max(tanerr) < 1e-8
    assert math.dist(prim[0]['start'], start) < 1e-10 and math.dist(prim[-1]['end'], end) < 1e-10
    assert angle(tangents[0][0], [1, 0]) < 1e-10 and angle(tangents[-1][1], [1, 0]) < 1e-8
    maxstep = max(np.linalg.norm(np.diff(pts, axis=0), axis=1))
    return {'piece': piece['piece'], 'radius_mm': R, 'middle_mm': C, 'theta_deg': math.degrees(theta),
            'lead_mm': lead, 'analytic_length_mm': sum(lengths), 'polyline_length_mm': piece['length_mm'],
            'max_point_locus_error_mm': float(max(errors)), 'max_primitive_G0_error_mm': max(poserr),
            'max_primitive_G1_error_deg': max(tanerr), 'max_sample_step_mm': float(maxstep),
            'max_arc_sagitta_bound_mm': R-math.sqrt(R*R-(maxstep/2)**2),
            'curvature_per_mm': [0, sign/R, 0, -sign/R, 0],
            'curvature_class': 'G1, piecewise constant curvature; not G2/C2'}


def xtp_record(path):
    assert sha(path) == '7724f7ae4c246bbaf7f84f910e51a99a2758c9484f2ecd4088e558aecd9fe25d', 'pinned XTrackCAD file'
    txt = path.read_text(); key = 'TURNOUT N  "Kato Unitrack\tDouble Crossover\t20-210"'
    rec = txt[txt.index(key):]; rec = rec[:rec.index('\tEND')+len('\tEND')]+'\n'
    assert rec == (BASE/'evidence/R01/kato-20-210-excerpt.xtp').read_text()
    segs = []; endpoints = []
    for line in rec.splitlines():
        fields = line.split()
        if fields[0] == 'E': endpoints.append([float(v)*25.4 for v in fields[1:3]])
        if fields[0] == 'S':
            v = np.array([float(x)*25.4 for x in fields[3:7]]).reshape(2, 2)
            segs.append((v, unit(v[1]-v[0]), unit(v[1]-v[0])))
        if fields[0] == 'C':
            r, cx, cy, a, sweep = map(float, fields[3:]); r = abs(r)*25.4
            aa = np.linspace(math.radians(a), math.radians(a+sweep), 1001)
            xy = np.column_stack([cx*25.4+r*np.sin(aa), cy*25.4+r*np.cos(aa)])
            segs.append((xy, np.array([math.cos(aa[0]), -math.sin(aa[0])]),
                         np.array([math.cos(aa[-1]), -math.sin(aa[-1])])))
    rows = []; paths = []
    for label, ids in [('upper-to-lower', [1, 7, 8, -9, 6]), ('lower-to-upper', [4, -10, 11, 12, 3])]:
        parts = []
        for i in ids:
            ps, a, b = segs[abs(i)-1]
            parts.append((ps, a, b) if i > 0 else (ps[::-1], -b, -a))
        gaps = [float(np.linalg.norm(a[0][-1]-b[0][0])) for a, b in zip(parts, parts[1:])]
        kinks = [angle(a[2], b[1]) for a, b in zip(parts, parts[1:])]
        paths.append(np.concatenate([x[0] for x in parts]))
        rows.append({'route': label, 'internal_G0_gaps_mm': gaps, 'internal_G1_kinks_deg': kinks,
                     'max_gap_mm': max(gaps), 'max_kink_deg': max(kinks)})
    return {'file_sha256': sha(path), 'record_sha256': hashlib.sha256(rec.encode()).hexdigest(),
            'nominal_ports_mm': endpoints, 'routes': rows}, paths


def crossings(a, b):
    """All nonparallel segment intersections; explicitly detect collinear overlaps too."""
    out = []; b = np.array(b); c, v = b[:-1], np.diff(b, axis=0)
    for aa, bb in zip(a, a[1:]):
        aa, bb = np.array(aa), np.array(bb); u = bb-aa
        w = c-aa; den = u[0]*v[:, 1]-u[1]*v[:, 0]
        nz = np.abs(den) > 1e-10
        t = np.zeros(len(v)); s = np.zeros(len(v))
        t[nz] = (w[nz, 0]*v[nz, 1]-w[nz, 1]*v[nz, 0])/den[nz]
        s[nz] = (w[nz, 0]*u[1]-w[nz, 1]*u[0])/den[nz]
        for j in np.where(nz & (t >= -1e-9) & (t <= 1+1e-9) & (s >= -1e-9) & (s <= 1+1e-9))[0]:
            out.append((aa+t[j]*u).tolist())
        col = (~nz) & (np.abs(w[:, 0]*u[1]-w[:, 1]*u[0]) < 1e-9)
        for j in np.where(col)[0]:
            t0 = float(w[j]@u/(u@u)); t1 = float((w[j]+v[j])@u/(u@u))
            lo, hi = max(0, min(t0, t1)), min(1, max(t0, t1))
            if hi >= lo-1e-10: out.append((aa+(lo+hi)/2*u).tolist())
    unique = []
    for q in out:
        if not any(math.dist(q, r) < 1e-6 for r in unique): unique.append(q)
    return unique


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--xtp', type=Path, required=True, help='Pinned original XTrackCAD library')
    ap.add_argument('--master-svg', type=Path, required=True)
    ap.add_argument('--alignment', type=Path, required=True)
    ap.add_argument('--inventory', type=Path, required=True)
    ap.add_argument('--manifest', type=Path, required=True)
    ap.add_argument('--candidate', type=Path, default=BASE/'candidate/R02/track.json')
    ap.add_argument('--output', type=Path, default=E)
    args = ap.parse_args(); out = args.output; out.mkdir(parents=True, exist_ok=True)
    baseline = json.loads((BASE/'candidate/R01/track.json').read_text())
    c = json.loads(args.candidate.read_text()); raw = json.loads((BASE/'evidence/R01/source-axes.json').read_text())
    assert c['parent_candidate_sha256'] == sha(BASE/'candidate/R01/track.json')
    for key in ['pieces', 'junctions', 'controllers', 'gaps', 'terminals', 'source_axes_sha256', 'source_sha256', 'coordinates', 'safety']:
        assert c[key] == baseline[key], ('R01 regression', key)
    assert sha(args.alignment) == '6a494928707609f1cf6aa9b535a510ca721b9a3458eca0910dfc250c978f46ea'
    alignment = json.loads(args.alignment.read_text())
    assert sha(args.inventory) == 'a89687ee6010ba251e070091765270c038aa3ddcbb37b750126deed2ad315425'
    assert sha(args.manifest) == '234d93ac089d1c23a1c07c9e35160cc1e78608ad27ff0753986e97a77648c6c2'
    inventory = json.loads(args.inventory.read_text()); manifest = json.loads(args.manifest.read_text())
    visual_objects = [q for q in inventory['objects'] if q['module'] == 'railway_visual' and q['profile'] == 'game']
    assert len(visual_objects) == 7 and sum(q['triangles'] for q in visual_objects) == 970193
    visual_metadata = {'alignment_master': alignment['master'], 'alignment_WX': alignment['crossovers_wx310'],
        'visual_nodes': alignment['visual_nodes'],
        'objects': [{k: q[k] for k in ['sn_id', 'bbox_plan_mm', 'triangles', 'vertices', 'materials', 'masterplan_ref']} for q in visual_objects],
        'declared_GLB': next(q for q in manifest['files'] if q['path'] == 'modules/railway_visual.glb'),
        'binary_verified': False, 'limit': 'raw reference obtained; 32 MiB transfer limit; signed download proxy 403',
        'inventory_sha256': sha(args.inventory), 'manifest_received_sha256': sha(args.manifest)}
    (out/'visual-metadata.json').write_text(json.dumps(visual_metadata, indent=2)+'\n')
    assert raw['pieces'] == [{'piece': p['piece'], 'points': p['centreline_plan_mm'], 'hidden_intervals_mm': p['hidden_intervals_mm']} for p in alignment['pieces']]
    spec = importlib.util.spec_from_file_location('frozen_r01_checker', Path(__file__).with_name('verify-r01.py'))
    checker = importlib.util.module_from_spec(spec); spec.loader.exec_module(checker)
    regression = checker.inspect(c, raw)
    # Reuse the independent R01 checker without rewriting its historical physical-fidelity status.
    (out/'r01-regression.json').write_text(json.dumps(regression, indent=2)+'\n')
    p = {x['piece']: x for x in c['pieces']}; original = {x['piece']: x for x in raw['pieces']}
    profiles = [primitive_checks(p[i]) for i in [12, 13, 16, 17]]
    rejected = []
    for name, mutate in [
        ('interior-point-off-analytic-axis', lambda x: x['points'][100].__setitem__(1, x['points'][100][1]+.05)),
        ('false-arc-center', lambda x: x['profile']['primitives'][1]['center'].__setitem__(0, x['profile']['primitives'][1]['center'][0]+.05)),
        ('wrong-sweep', lambda x: x['profile']['primitives'][1].__setitem__('sweep_rad', .2)),
    ]:
        q = copy.deepcopy(p[12]); mutate(q)
        try: primitive_checks(q)
        except AssertionError: rejected.append(name)
        else: raise AssertionError(('mutation survived', name))
    xtp, cadpaths = xtp_record(args.xtp)
    comparisons = []; envelopes = []; interference = []
    for uid, ids in [('WX-A', [59, 60, 12, 13]), ('WX-B', [61, 62, 16, 17])]:
        ports = next(x['ports_plan_mm'] for x in c['controllers'] if x['id'] == uid)
        x0, y0 = ports['UL']; width = ports['UR'][0]-x0; height = ports['LL'][1]-y0
        xs = np.linspace(0, width, 31001)
        fit = np.column_stack([xs, ordinate(xs, width, height, R, C)])
        # A sensitivity study constrained by the ONLY recovered TRAX scalar, NOT its full library profile.
        surrogate = np.column_stack([xs, ordinate(xs, width, height, R, 11.6)])
        t2, lead2 = solve(width, height, R, 11.6)
        for pid, catalog in zip(ids[2:], cadpaths):
            ps = np.array(p[pid]['points']); src = np.array(original[pid]['points'])
            sign = 1 if pid == ids[2] else -1
            axis = fit+np.array([x0, y0]) if sign == 1 else np.column_stack([fit[:, 0]+x0, y0+height-fit[:, 1]])
            lo, hi = sorted(src[:, 0]); overlap = axis[(axis[:, 0] >= lo) & (axis[:, 0] <= hi)]
            cat = catalog.copy(); cat[:, 1] *= -1
            # Catalog origin at local upper left; rescale endpoints to same V06 ports for fair locus comparison.
            cat[:, 0] *= width/(12.204724*25.4); cat[:, 1] *= height/(1.299212*25.4); cat += [x0, y0]
            comparisons.append({'unit': uid, 'piece': pid, 'dense_overlap_to_original_core_max_mm': float(max(distance(overlap, src))),
                                'R01_to_R02_max_mm': 0, 'XTP_port_registered_sampled_Hausdorff_mm': float(max(max(distance(cat, ps)), max(distance(ps, cat)))),
                                'XTP_registration': 'diagonal scale x/y to fixed V06 ports; not adopted as geometry'})
            # Any intersection with a foreign path must be an exactly shared end node.
            foreign = []
            for j, other in p.items():
                if j in ids: continue
                xy = np.array(other['points'])
                if np.any(ps.max(axis=0) < xy.min(axis=0)) or np.any(xy.max(axis=0) < ps.min(axis=0)): continue
                common = [a for a in [ps[0], ps[-1]] for b in [xy[0], xy[-1]] if np.array_equal(a, b)]
                hits = crossings(ps, xy)
                bad = [z for z in hits if not any(math.dist(z, a) < 1e-7 for a in common)]
                assert not bad, ('foreign intersection', pid, j, bad)
                if hits: foreign.append({'piece': j, 'shared_endpoint_intersections': len(hits)})
            interference.append({'piece': pid, 'unexpected_foreign_intersections': 0, 'expected_external_joins': foreign})
        hits = crossings(p[ids[2]]['points'], p[ids[3]]['points'])
        assert len(hits) == 1 and math.dist(hits[0], [x0+width/2, y0+height/2]) < 1e-7
        assert all(math.dist(hits[0], j['point_mm']) > 1e-7 for j in c['junctions'])
        # Analytic normal offsets for rail centres, not a physical ballast/vehicle clearance certificate.
        dy = np.gradient(fit[:, 1], xs); normals = np.column_stack([-dy, np.ones(len(dy))])/np.sqrt(1+dy*dy)[:, None]
        rails = np.concatenate([fit+s*4.725*normals for s in [-1, 1]])
        assert rails[:, 0].min() >= -1e-9 and rails[:, 0].max() <= width+1e-9
        assert rails[:, 1].min() >= -4.725-1e-9 and rails[:, 1].max() <= height+4.725+1e-9
        envelopes.append({'unit': uid, 'ports_mm': ports, 'width_mm': width, 'spacing_mm': height,
                          'nominal_width_delta_mm': width-310, 'nominal_spacing_delta_mm': height-33,
                          'axis_bbox_mm': [x0, y0, x0+width, y0+height],
                          'rail_center_corridor_mm': [x0, y0-4.725, x0+width, y0+height+4.725],
                          'rail_offset_inner_radius_mm': R-4.725, 'offset_jacobian_min': 1-4.725/R,
                          'diamond_mm': hits[0], 'diamond_angle_deg': 2*next(z['theta_deg'] for z in profiles if z['piece'] == ids[2]),
                          'TRAX_11_6_same_R_sensitivity_NOT_library': {'theta_deg': math.degrees(t2), 'lead_mm': lead2,
                              'max_equal_x_difference_mm': float(np.max(np.abs(fit[:, 1]-surrogate[:, 1]))),
                              'note': 'TRAX radius/angle not recovered; 11.6 rounded; this is a controlled sensitivity only'}})
    # Re-read the hash-locked SVG rather than trusting the previous derived reference.
    import xml.etree.ElementTree as ET
    import re
    assert sha(args.master_svg) == '868751dc5d17885161e7ff1a7dac46d556d2af2dee578c787db80a6f5e489022'
    root = ET.parse(args.master_svg).getroot(); g = next(e for e in root if e.get('clip-path') == 'url(#clipMain)')
    rails = [e for e in g if e.tag.endswith('path') and e.get('stroke') == '#3b3631' and e.get('stroke-width') == '0.13']
    assert len(rails) == 152
    refs = []; gauge = []
    for i in range(0, len(rails), 2):
        a, b = [np.array(list(map(float, re.findall(r'-?\d*\.?\d+', e.get('d'))))).reshape(-1, 2) for e in rails[i:i+2]]
        refs.append(((a+b)/2-[20, 30])/.3733); gauge.extend(np.linalg.norm(a-b, axis=1)/.3733)
    for row in comparisons:
        src = np.array(original[row['piece']]['points'])
        index = min(range(len(refs)), key=lambda k: math.dist(refs[k][0], src[0])+math.dist(refs[k][-1], src[-1]))
        row.update(SVG_pair=index, original_endpoints_to_SVG_max_mm=float(max(distance(src, refs[index]))))
        assert row['original_endpoints_to_SVG_max_mm'] < .03
    summary = {'status': 'PASS_OFFLINE_GEOMETRY; CONDITIONAL_GO_REGIA_REVIEW; NOT_MANUFACTURER_CERTIFIED',
               'candidate_sha256': sha(args.candidate), 'preserved_R01_pieces': 79, 'preserved_nodes': 74,
               'profiles': profiles, 'XTrackCAD': xtp, 'comparisons': comparisons, 'envelopes': envelopes,
               'interference': interference, 'additional_mutations_rejected': rejected,
               'master_svg_rail_center_separation_mm': {'min': float(min(gauge)), 'max': float(max(gauge)), 'median': float(np.median(gauge)),
                  'note': 'schematic strokes; do not confuse with GLB rail centres declared 9.45 mm apart'},
               'source_locks': {'svg_sha256': sha(args.master_svg), 'alignment_sha256': sha(args.alignment)},
               'runtime_circulation': 'NOT VERIFIED', 'GLB_binary': 'NOT VERIFIED: 40139988 bytes exceeds transfer 32 MiB; signed raw retrieval proxy 403'}
    # A conservative local circular envelope for the seven native STOCK specifications.
    # Tangent-centred rigid rectangle only: excludes S-curve dynamics, couplers and foreign GLB assets.
    import re
    stock_text = (ROOT/'src/rolling-stock.js').read_text(); stock_envelopes = []
    for kind, fields in re.findall(r'^ (\w+):\{([^\n]+)\}', stock_text, re.M):
        dims = {key: float(value) for key, value in re.findall(r'(length|front|width):([\d.]+)', fields)}
        length, width = dims['length'], dims['width']; front = dims.get('front', length/2)
        longitudinal = max(front, length-front)
        outer = math.hypot(R+width/2, longitudinal)-R
        stock_envelopes.append({'kind': kind, **dims, 'tangent_rectangle_outer_excursion_mm': outer})
    assert len(stock_envelopes) == 7
    summary['preliminary_stock'] = {'native_specs': stock_envelopes,
        'source_sha256': sha(ROOT/'src/rolling-stock.js'),
        'two_worst_rectangles_margin_at_33_013_mm': 33.013-2*max(x['tangent_rectangle_outer_excursion_mm'] for x in stock_envelopes),
        'scope': 'local circular tangent rectangle bound, not a swept S-curve or runtime clearance certificate; Kenney assets excluded',
        'wheel_center_offset_mm': 4.7, 'wheel_tread_width_mm': 1.1, 'declared_rail_center_offset_mm': 4.725,
        'wheel_to_rail_center_delta_mm': .025,
        'assumed_rail_head_width_for_9mm_inner_gauge_mm': .45,
        'rail_section_certified': False, 'rail_top_delta_legacy_to_V06_mm': 2.45}
    (out/'metrology.json').write_text(json.dumps(summary, indent=2)+'\n')
    figures(p, original, comparisons, envelopes, cadpaths, out)
    print(json.dumps({'status': summary['status'], 'profiles': profiles, 'comparisons': comparisons, 'envelopes': envelopes}, indent=2))


def figures(p, raw, comparisons, envelopes, cadpaths, out):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    plt.rcParams.update({'font.size': 9, 'axes.grid': True, 'grid.alpha': .2})
    fig, axes = plt.subplots(2, 1, figsize=(14, 6))
    for ax, env, ids in zip(axes, envelopes, [[59, 60, 12, 13], [61, 62, 16, 17]]):
        for i in ids:
            a = np.array(raw[i]['points']); b = np.array(p[i]['points'])
            ax.plot(a[:, 0], a[:, 1], '--', color='#c43d36', lw=1.3)
            ax.plot(b[:, 0], b[:, 1], color='#007f8a', lw=1.3)
        for name, xy in env['ports_mm'].items(): ax.annotate(name, xy, xytext=(0, 6), textcoords='offset points')
        ax.plot(*env['diamond_mm'], 'x', color='#353535'); ax.invert_yaxis(); ax.set_aspect('equal')
        ax.set_title(env['unit']+' | red: original schematic cores; teal: R02=R01; diamond has no node')
    fig.tight_layout(); fig.savefig(out/'wx-validation.png', dpi=160); plt.close(fig)
    fig, (ax, delta) = plt.subplots(2, 1, figsize=(12, 6), gridspec_kw={'height_ratios': [1, 1]})
    width, height = 310., 33.; xs = np.linspace(0, width, 10001)
    ys = ordinate(xs, width, height, R, C); ax.plot(xs, ys, color='#007f8a', label='R01/R02 nominal-port reconstruction')
    cat = cadpaths[0].copy(); cat[:, 1] *= -1
    ax.plot(cat[:, 0], cat[:, 1], '--', color='#8d5caa', label='literal XTrackCAD record (rounded joins)')
    ax.plot(xs, ordinate(xs, width, height, R, 11.6), ':', color='#db8b11', label='11.6 mm middle, SAME R assumed: sensitivity, not full TRAX library')
    ax.set_aspect('equal'); ax.invert_yaxis(); ax.set(xlabel='local X mm', ylabel='local Y mm'); ax.legend(fontsize=8)
    delta.plot(xs, np.interp(xs, cat[:, 0], cat[:, 1])-ys, '--', color='#8d5caa', label='literal XTrackCAD minus fitted axis, equal X')
    delta.plot(xs, ordinate(xs, width, height, R, 11.6)-ys, ':', color='#db8b11', label='11.6 mm same-R sensitivity minus fitted axis')
    delta.set(xlabel='local X mm', ylabel='transverse difference mm', title='Differences enlarged vertically; no change to surrounding layout')
    delta.legend(fontsize=8)
    fig.tight_layout(); fig.savefig(out/'cad-comparison.png', dpi=180); plt.close(fig)
    board = plt.imread(BASE/'evidence/R01/masterplan-board.png')
    fig, ax = plt.subplots(figsize=(15, 7.5)); ax.imshow(board, extent=[0, 1500, 700, 0])
    for q in p.values():
        a = np.array(q['points']); ax.plot(a[:, 0], a[:, 1], color='#00bcd4', lw=.7)
    ax.set(xlim=(0, 1500), ylim=(700, 0), title='R02 offline candidate on hash-locked V06 masterplan; no runtime integration')
    ax.set_aspect('equal'); fig.tight_layout(); fig.savefig(out/'masterplan-overlay.png', dpi=150); plt.close(fig)


if __name__ == '__main__':
    main()
