"""Read-only JMRI/RailModeller audit. Writes diagnostic documents, never the simulator.
Usage: python3 scripts/analyze-jmri-layout.py source.xml [output-directory]
"""
import collections
import hashlib
import html
import json
import math
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

SCALE=10.0
ORIGIN=(30.3,99.3)
TOLERANCE_MM=2.5

def world(point):return {'x':SCALE*(point['x']-ORIGIN[0]),'z':SCALE*(point['y']-ORIGIN[1])}
def distance(a,b):return math.hypot(a['x']-b['x'],a['y']-b['y'])*SCALE

def geometry(a,b,angle=None,flip=False):
    p,q=world(a),world(b)
    chord=distance(a,b)
    if angle is not None:
        radius=chord/(2*math.sin(math.radians(angle)/2))
        return {'kind':'circular-arc','radius':radius,'angle':angle,'sweep':0 if flip else 1,'length':radius*math.radians(angle),'svg':f"M {p['x']:.9f},{p['z']:.9f} A {radius:.9f},{radius:.9f} 0 {int(angle>180)} {0 if flip else 1} {q['x']:.9f},{q['z']:.9f}"}
    return {'kind':'line','length':chord,'svg':f"M {p['x']:.9f},{p['z']:.9f} L {q['x']:.9f},{q['z']:.9f}"}

class Union:
    def __init__(self,ids):self.parent={id:id for id in ids}
    def find(self,id):
        while self.parent[id]!=id:
            self.parent[id]=self.parent[self.parent[id]];id=self.parent[id]
        return id
    def join(self,a,b):
        a,b=self.find(a),self.find(b)
        if a==b:return
        # Preserve turnout-port coordinates for an anchor/port rounding mismatch.
        if (':' not in a, a) > (':' not in b,b):a,b=b,a
        self.parent[b]=a

def graph(nodes,edges,union=None):
    canonical=(lambda id:union.find(id)) if union else (lambda id:id)
    adjacency={canonical(id):[] for id in nodes}
    retained=[]
    for edge in edges:
        a,b=canonical(edge['from']),canonical(edge['to'])
        if a==b:continue
        adjacency[a].append((b,edge['id']));adjacency[b].append((a,edge['id']));retained.append({**edge,'from':a,'to':b})
    components=[];seen=set()
    for start in adjacency:
        if start in seen:continue
        todo=[start];seen.add(start);members=[];edgeids=set()
        while todo:
            n=todo.pop();members.append(n)
            for nxt,id in adjacency[n]:
                edgeids.add(id)
                if nxt not in seen:seen.add(nxt);todo.append(nxt)
        components.append({'id':len(components)+1,'nodes':sorted(members),'edges':sorted(edgeids)})
    return {'vertexCount':len(adjacency),'edgeCount':len(retained),'componentCount':len(components),'cycleRank':len(retained)-len(adjacency)+len(components),'components':components,'openEnds':[id for id,inc in adjacency.items() if len(inc)==1],'isolatedNodes':[id for id,inc in adjacency.items() if not inc],'edges':retained},adjacency

def audit(source,destination):
    destination.mkdir(parents=True,exist_ok=True)
    original=source.read_bytes()
    if b'<!DOCTYPE' in original:raise ValueError('External DTDs are not used for this audit')
    root=ET.fromstring(original);editor=root.find('LayoutEditor')
    if editor is None:raise ValueError('Missing LayoutEditor')
    nodes={};points=[];turnouts=[];segments=[];edges=[];missing=[]
    for e in editor.findall('positionablepoint'):
        p={'id':e.get('ident'),'x':float(e.get('x')),'y':float(e.get('y')),'type':e.get('type'),'declaredConnection':e.get('connect1name')}
        nodes[p['id']]=p;points.append(p)
    for e in editor.findall('layoutturnout'):
        t={'id':e.get('ident'),'typeCode':int(e.get('type')),'hand':'right' if e.get('type')=='1' else 'left','continuing':e.get('continuing'),'center':{'x':float(e.get('xcen')),'y':float(e.get('ycen'))},'ports':{},'declaredConnections':{},'forbiddenTransition':['B','C']}
        if t['typeCode'] not in (1,2):raise ValueError('Unhandled turnout type; do not guess its connections')
        for port in 'ABC':
            id=t['id']+':'+port
            nodes[id]={'id':id,'x':float(e.get('x'+port.lower())),'y':float(e.get('y'+port.lower())),'type':'TURNOUT_PORT'}
            t['ports'][port]=id;t['declaredConnections'][port]=e.get('connect'+port.lower()+'name')
        normal=distance(nodes[t['ports']['A']],nodes[t['ports']['B']]);t['straightLength']=normal
        t['catalogFamily']='#6 R718' if normal>180 else '#4 R481'
        t['suggestedKatoCode']=('20-203' if t['hand']=='right' else '20-202') if normal>180 else ('20-221' if t['hand']=='right' else '20-220')
        for port in 'BC':edges.append({'id':t['id']+':A'+port,'from':t['ports']['A'],'to':t['ports'][port],'kind':'turnout-internal','turnout':t['id'],'route':'normal' if port=='B' else 'diverging'})
        turnouts.append(t)
    reciprocal=[]
    for e in editor.findall('tracksegment'):
        endpoints=[]
        for i in (1,2):
            typ=e.get('type'+str(i));name=e.get('connect'+str(i)+'name')
            id=name if typ=='POS_POINT' else name+':'+typ.split('_')[-1]
            if id not in nodes:missing.append({'segment':e.get('ident'),'endpoint':id})
            endpoints.append(id)
        if missing:continue
        a,b=endpoints;angle=float(e.get('angle')) if e.get('arc')=='yes' else None
        g=geometry(nodes[a],nodes[b],angle,e.get('flip')=='yes')
        seg={'id':e.get('ident'),'from':a,'to':b,'angle':angle,'flip':e.get('flip')=='yes','geometry':g,'zeroLength':g['length']<1e-8}
        segments.append(seg);edges.append({'id':seg['id'],'from':a,'to':b,'kind':'track','length':g['length']})
    if missing:raise ValueError('Unresolved source references: '+repr(missing))
    ids=[p['id'] for p in points]+[t['id'] for t in turnouts]+[s['id'] for s in segments]
    if len(ids)!=len(set(ids)):raise ValueError('Duplicate source identifiers')
    raw,adjacency=graph(nodes,edges)
    for t in turnouts:
        for port,id in t['ports'].items():
            actual=[edgeid for _,edgeid in adjacency[id] if not edgeid.startswith(t['id']+':')]
            declared=t['declaredConnections'][port]
            if actual!=([declared] if declared else []):reciprocal.append({'turnout':t['id'],'port':port,'declared':declared,'actual':actual})
    # Only mutually nearest open endpoints within 2.5mm are candidates; 33mm
    # parallel lines and all 310mm multi-track gaps remain strictly separate.
    pairs=[]
    for a in raw['openEnds']:
        nearest=sorted((distance(nodes[a],nodes[b]),b) for b in raw['openEnds'] if b!=a)
        if nearest and nearest[0][0]<=TOLERANCE_MM:
            d,b=nearest[0]
            reverse=min((distance(nodes[b],nodes[c]),c) for c in raw['openEnds'] if c!=b)
            if reverse[1]==a and a<b:pairs.append({'a':a,'b':b,'distanceMm':d})
    assert {(p['a'],p['b']) for p in pairs}=={('A55','TO0:B'),('A60','TO4:B')}, 'Unexpected close endpoints: review manually'
    byEdge={e['id']:e for e in edges};bySegmentEarly={e['id']:e for e in segments}
    def tangent(id):
        edge=byEdge[adjacency[id][0][1]];a,b=nodes[edge['from']],nodes[edge['to']]
        heading=math.atan2(b['y']-a['y'],b['x']-a['x']);seg=bySegmentEarly.get(edge['id'])
        angle=math.radians(seg['angle'])*( -1 if seg['flip'] else 1) if seg and seg['angle'] is not None else 0
        return heading-angle/2 if id==edge['from'] else heading+angle/2+math.pi
    for pair in pairs:
        delta=abs((tangent(pair['a'])-tangent(pair['b'])+math.pi)%(2*math.pi)-math.pi)
        pair['tangentMismatchDegrees']=abs(180-math.degrees(delta))
        assert pair['tangentMismatchDegrees']<5,'Near endpoints are not tangent-compatible'

    union=Union(nodes)
    zeros=[s for s in segments if s['zeroLength']]
    for s in zeros:union.join(s['from'],s['to'])
    for p in pairs:union.join(p['a'],p['b']);p['canonical']=union.find(p['a'])
    normalized,normalizedAdjacency=graph(nodes,edges,union)
    aliases=collections.defaultdict(list)
    for id in nodes:aliases[union.find(id)].append(id)
    normalized['nodes']=[{**nodes[id],'aliases':members,'world':world(nodes[id])} for id,members in aliases.items()]
    bySegment={s['id']:s for s in segments}
    for e in normalized['edges']:
        if e['kind']=='track':
            sourceSegment=bySegment[e['id']]
            e['sourceLength']=e['length'];e['geometry']=geometry(nodes[e['from']],nodes[e['to']],sourceSegment['angle'],sourceSegment['flip']);e['length']=e['geometry']['length']
        else:e['geometryConfidence']='connectivity only; schematic internal turnout path'

    for n in normalized['nodes']:
        if n['id']=='A67':n['sourceType']=n['type'];n['type']='END_BUMPER'
    explicit=[p['id'] for p in points if p['type']=='END_BUMPER']
    unexplained=[id for id in normalized['openEnds'] if ':' not in id and id not in explicit]
    # Missing module mouths are supported jointly by XML endpoints, the supplied
    # Kato list and the earlier complete PDF. They are NOT inserted into the graph.
    modules=[
      {'id':'WX-A','code':'20-210','label':'WX310 ovest','ports':['A7','A43','A25','A8'],'box':[68.1,102.1,99.1,113.4],'physicalRegion':[68.1,106.1,99.1,109.4]},
      {'id':'WX-B','code':'20-210','label':'WX310 est','ports':['A40','A30','A42','A32'],'box':[111.5,98.8,142.5,110.1],'physicalRegion':[111.5,102.8,142.5,106.1]},
      {'id':'WIDEN-L','code':'20-051','label':'Allargamento sinistro','ports':['A28','A44','A3','A46'],'box':[68.1,152.9,99.1,165.5],'physicalRegion':[68.1,155.9,99.1,162.5]},
      {'id':'WIDEN-R','code':'20-052','label':'Allargamento destro','ports':['A45','A23','A47','A2'],'box':[111.5,152.9,142.5,165.5],'physicalRegion':[111.5,155.9,142.5,162.5]}
    ]
    moduleEnds={port for module in modules for port in module['ports']}
    terminalCandidates=[id for id in unexplained if id not in moduleEnds]
    assert terminalCandidates==['A67'],terminalCandidates
    assert len(segments)==53 and len(points)==56 and len(turnouts)==6
    assert raw['componentCount']==9 and raw['cycleRank']==0
    assert normalized['componentCount']==8 and normalized['cycleRank']==1
    assert not raw['isolatedNodes'] and not reciprocal
    inventory=collections.Counter();arcRadii=collections.defaultdict(list)
    for s in segments:
        if s['zeroLength']:inventory['zero-length-connectors']+=1
        elif s['angle'] is not None:
            radius=s['geometry']['radius'];family=min([249,282,315,481],key=lambda r:abs(r-radius));inventory['curve-R'+str(family)]+=1;arcRadii[str(family)].append(radius)
        else:inventory['straight-'+str(min([62,124,186,248],key=lambda n:abs(n-s['geometry']['length'])))]+=1
    assert inventory=={'curve-R282':8,'straight-62':10,'straight-248':9,'curve-R315':8,'curve-R249':8,'straight-124':4,'straight-186':1,'curve-R481':3,'zero-length-connectors':2}
    changes={'buffer':{'point':'A67','from':'ANCHOR','to':'END_BUMPER','positionUnchanged':True,'trackExtended':False},'joins':pairs,'zeroLengthConnectors':[s['id'] for s in zeros],'missingModulesNotInserted':modules}
    result={'source':source.name,'sourceSha256':hashlib.sha256(original).hexdigest(),'sourceCounts':{'trackSegments':len(segments),'points':len(points),'turnouts':len(turnouts),'explicitBumpers':len(explicit)},'coordinateTransform':{'scaleMmPerXmlUnit':SCALE,'originXml':ORIGIN,'world':'x=10*(xml.x-30.3); z=10*(xml.y-99.3); y=rail grade from the simulator','svgViewBox':'0 0 1500 700','minimap':'SVG x = world.x; SVG y = world.z; preserveAspectRatio=xMidYMid meet','baseFrameIsAdopted':True,'sourceCoordinateResolutionMm':1},'rawGraph':raw,'normalizedGraph':normalized,'points':points,'turnouts':turnouts,'segments':segments,'catalogCounts':dict(inventory),'arcRadiiMm':dict(arcRadii),'openModuleEndpoints':sorted(moduleEnds),'unresolvedReferences':missing,'reciprocalErrors':reciprocal,'amendments':changes,'allBlocks':['RM Block'],'noTunnels':True}
    result['controlMappingApplied']=False
    result['proposedControlMapping']=[
        {'control':'WX-A','xmlTurnout':None,'catalogCode':'20-210','status':'missing from XML; documented western crossover'},
        {'control':'WX-B','xmlTurnout':None,'catalogCode':'20-210','status':'missing from XML; documented eastern crossover'},
        {'control':'Y-IN','xmlTurnout':'TO0','role':'Accesso merci ovest','status':'proposed; update port geometry'},
        {'control':'Y-2','xmlTurnout':'TO5','role':'Bivio tronchini ovest','status':'proposed; clarify current northern siding label'},
        {'control':'Y-3','xmlTurnout':'TO3','role':'Accesso merci est','status':'no direct current equivalence; explicit reassignment and rename needed'},
        {'control':'Y-R1','xmlTurnout':'TO1','role':'Runaround ovest','status':'role consistent'},
        {'control':'Y-R2','xmlTurnout':'TO2','role':'Runaround est','status':'role consistent'},
        {'control':'Y-4','xmlTurnout':'TO4','role':'Tronchino est','status':'role consistent'}
    ]
    result['simulatorIntegrated']=False
    result['sourceNotes']={'pointConnect2Missing':'Positionable points declare only connect1name; connectivity rebuilt from both ends of tracksegment records.','turnoutInternalGeometry':'schematic from A/B/C and center; not a physical Kato mesh','coordinateFrame':'adopted to align the 1500x700mm base; not an XML panel physical dimension'}
    (destination/'source.xml').write_bytes(original)
    # One explicit user-requested amendment only. Preserve the rest of the XML byte-for-byte.
    text=original.decode('utf-8')
    pattern=r'<positionablepoint\b[^>]*\bident="A67"[^>]*/>'
    match=re.search(pattern,text)
    if not match or 'type="ANCHOR"' not in match[0]:raise ValueError('Unexpected A67 source record')
    reviewed=text[:match.start()]+match[0].replace('type="ANCHOR"','type="END_BUMPER"')+text[match.end():]
    (destination/'with-fourth-buffer.xml').write_text(reviewed)
    csv=Path('docs/phase-0/kato-parts.csv')
    if csv.exists():
        rows=[row.split('\t') for row in csv.read_text().strip().splitlines()]
        total=sum(int(row[-1]) for row in rows)
        result['catalogReconciliation']={'bomTotalPieces':total,'nonzeroTrackSegments':len(segments)-len(zeros),'singleTurnouts':len(turnouts),'representedPhysicalPieces':len(segments)-len(zeros)+len(turnouts),'missingPhysicalPieces':total-(len(segments)-len(zeros)+len(turnouts)),'missingCodes':{'20-210':2,'20-051':1,'20-052':1},'sourceCsvSha256':hashlib.sha256(csv.read_bytes()).hexdigest()}
        assert result['catalogReconciliation']['missingPhysicalPieces']==4
    (destination/'diagnosis.json').write_text(json.dumps(result,indent=2)+'\n')
    for reviewedMode in (False,True):
        svg=make_svg(result,nodes,union,reviewedMode,True)
        (destination/('layout-reviewed.svg' if reviewedMode else 'layout-original.svg')).write_text(svg)
    (destination/'minimap-reviewed.svg').write_text(make_svg(result,nodes,union,True,False))
    (destination/'index.html').write_text(make_html())
    print(json.dumps({'counts':result['sourceCounts'],'rawComponents':raw['componentCount'],'afterSmallJoins':normalized['componentCount'],'cyclesAfterJoins':normalized['cycleRank'],'joins':pairs,'fourthBuffer':'A67','missingModules':[m['code'] for m in modules]},indent=2))
    return result

def make_svg(result,nodes,union,reviewed,annotated):
    canonical=lambda id:union.find(id) if reviewed else id
    pnode=lambda id:nodes[canonical(id)]
    def color(s):
        if s['angle']==45:
            r=s['geometry']['radius'];return '#497eab' if r>300 else '#967241' if r>265 else '#44836d'
        a,b=pnode(s['from']),pnode(s['to'])
        if abs(a['y']-b['y'])<.001:
            if any(abs(a['y']-v)<.001 for v in [102.8,165.8]):return '#497eab'
            if any(abs(a['y']-v)<.001 for v in [106.1,162.5]):return '#967241'
            if any(abs(a['y']-v)<.001 for v in [109.4,155.9]):return '#44836d'
        return '#53645c'
    fragments=[]
    if annotated:
        fragments+=['<rect x="-55" y="-100" width="1610" height="990" fill="#f8f7f0"/>',f'<text x="0" y="-63" class="title">SerieN · XML RailModeller / JMRI — {"revisione diagnostica" if reviewed else "export originale"}</text>',f'<text x="0" y="-35">53 segmenti · 56 punti · 6 deviatoi · {"4" if reviewed else "3"} respingenti · gallerie assenti</text>','<text x="0" y="-12" class="small">Scala calibrata: 10 mm/unità XML. Cornice 1500×700 mm adottata per allineamento al mondo 3D.</text>','<rect width="1500" height="700" fill="#eeeee4" stroke="#56685b" stroke-width="2"/>']
        fragments+=['<g stroke="#506754" stroke-opacity=".1">'+''.join(f'<path d="M{x} 0v700"/>' for x in range(100,1500,100))+''.join(f'<path d="M0 {z}h1500"/>' for z in range(100,700,100))+'</g>']
        for m in result['amendments']['missingModulesNotInserted']:
            x,y,x2,y2=m['physicalRegion'];a,b=world({'x':x,'y':y}),world({'x':x2,'y':y2})
            fragments.append(f'<g><rect x="{a["x"]:.3f}" y="{a["z"]:.3f}" width="{b["x"]-a["x"]:.3f}" height="{b["z"]-a["z"]:.3f}" fill="#e9b84e" fill-opacity=".1" stroke="#b88326" stroke-width="2" stroke-dasharray="8 6"/><text x="{a["x"]+8:.3f}" y="{a["z"]-12:.3f}" class="small warning">{m["id"]} · {m["code"]} assente XML</text></g>')
    fragments.append('<g id="xml-tracks" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">')
    for s in result['segments']:
        if s['zeroLength']:continue
        g=geometry(pnode(s['from']),pnode(s['to']),s['angle'],s['flip'])
        fragments.append(f'<path id="{s["id"]}" d="{g["svg"]}" stroke="{color(s) if annotated else '#b9ccc1'}"><title>{s["id"]}: {s["from"]} ↔ {s["to"]}; {g["length"]:.2f} mm</title></path>')
    fragments.append('</g><g id="turnout-internals" fill="none" stroke="'+('#866093' if annotated else '#b9ccc1')+'" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">')
    for t in result['turnouts']:
        a,b,c=(world(pnode(t['ports'][p])) for p in 'ABC');center=world(t['center'])
        fragments.append(f'<path d="M{a["x"]},{a["z"]} L{b["x"]},{b["z"]}"><title>{t["id"]} A–B: normale</title></path>')
        fragments.append(f'<path d="M{a["x"]},{a["z"]} L{center["x"]},{center["z"]} L{c["x"]},{c["z"]}"><title>{t["id"]} A–C: schema JMRI; B–C vietato</title></path>')
    fragments.append('</g>')
    if annotated:
        graphData=result['normalizedGraph'] if reviewed else result['rawGraph']
        for id in graphData['openEnds']:
            if id in ['EB39','EB49','EB52'] or reviewed and id=='A67':continue
            p=world(pnode(id));fragments.append(f'<circle cx="{p["x"]}" cy="{p["z"]}" r="5" fill="#c14e3e"><title>Estremo aperto: {id}</title></circle>')
    buffers=['EB39','EB49','EB52']+(['A67'] if reviewed else [])
    for id in buffers:
        point=pnode(id);p=world(point)
        s=next(s for s in result['segments'] if s['from']==id or s['to']==id)
        other=pnode(s['to'] if s['from']==id else s['from']);dx=point['x']-other['x'];dy=point['y']-other['y'];length=math.hypot(dx,dy);nx=-dy/length*9;nz=dx/length*9
        col='#b64780' if id=='A67' else '#263c31'
        fragments.append(f'<path d="M{p["x"]-nx},{p["z"]-nz} L{p["x"]+nx},{p["z"]+nz}" stroke="{col}" stroke-width="5"><title>{id}: {"quarto respingente aggiunto; nessuna prolunga" if id=="A67" else "respingente XML"}</title></path>')
        if annotated:fragments.append(f'<text x="{p["x"]+10}" y="{p["z"]+17}" class="label" fill="{col}">{id}{" · NUOVO" if id=="A67" else ""}</text>')
    if annotated:
        for t in result['turnouts']:
            p=world(t['center']);fragments.append(f'<text x="{p["x"]-8}" y="{p["z"]-14}" class="label turnout-label">{t["id"]}</text>')
        for i,j in enumerate(result['amendments']['joins'],1):
            p=world(nodes[j['canonical']]);fragments.append(f'<circle cx="{p["x"]}" cy="{p["z"]}" r="12" fill="none" stroke="#4388b7" stroke-dasharray="3 3"/><text x="{p["x"]+11}" y="{p["z"]+22}" class="small">J{i}</text>')
        fragments.append('<g id="all-point-labels" style="display:none">')
        for id,p in nodes.items():
            q=world(p);fragments.append(f'<text x="{q["x"]+5}" y="{q["z"]-5}" class="tiny label">{html.escape(id)}</text>')
        fragments.append('</g>')
        fragments+=['<text x="0" y="728">FRONTE / VISITATORE · world Z=700 · SVG X=world X, SVG Y=world Z</text>','<text x="0" y="760">Verde: anello interno · ocra: centrale · blu: esterno · viola: collegamenti interni deviatoi, schematici.</text>','<text x="0" y="785">Riquadri ambra: moduli assenti, NON collegamenti ricostruiti. Punti rossi: estremi aperti.</text>','<text x="0" y="810">J1 A55↔TO0:B e J2 A60↔TO4:B: disallineamenti di 2 mm; nessun altro aggancio automatico.</text>','<text x="0" y="835">Zero anelli principali chiusi nell’export. Dopo i due piccoli agganci: un ciclo topologico di runaround.</text>','<text x="0" y="860">A67: quarto fine binario nella copia revisionata, senza aggiungere o allungare segmenti.</text>']
    box='-55 -100 1610 990' if annotated else '0 0 1500 700'
    style='<style>text{font:17px system-ui,sans-serif;fill:#293e32}.title{font-size:25px;font-weight:700}.small{font-size:13px}.tiny{font-size:10px}.label{font-size:14px;paint-order:stroke;stroke:#f8f7f0;stroke-width:4px;stroke-linejoin:round}.turnout-label{font-weight:bold;fill:#704c83}.warning{fill:#8b6221}</style>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{box}" role="img" aria-label="Diagnosi ferroviaria XML SerieN, senza connessioni inventate">{style}'+''.join(fragments)+'</svg>'

def make_html():
    return '''<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>SerieN · diagnosi XML JMRI</title><style>body{font:16px system-ui;margin:18px;color:#293e32;background:#f8f7f0}nav{display:flex;gap:14px;flex-wrap:wrap;align-items:center}object{width:100%;min-width:850px;min-height:900px}main{overflow:auto}a{color:#3d7058}button{padding:8px}</style><h1>SerieN · diagnosi XML JMRI</h1><p>Questa è una planimetria diagnostica: i quattro moduli multibinario mancanti rimangono interrotti. Non è stata integrata nel simulatore.</p><nav><button id="original">Export originale</button><button id="reviewed">Revisione: due giunzioni + quarto respingente</button><button id="labels">Mostra/nascondi identificatori</button><a href="README.md">Diagnosi tecnica</a><a href="layout-reviewed.svg">SVG revisionato</a><a href="layout-original.svg">SVG originale</a><a href="diagnosis.json">Grafo e diagnosi JSON</a><a href="with-fourth-buffer.xml">XML con quarto respingente</a></nav><main><object id="plan" type="image/svg+xml" data="layout-reviewed.svg"></object></main><script>const p=document.getElementById('plan');document.getElementById('original').onclick=()=>p.data='layout-original.svg';document.getElementById('reviewed').onclick=()=>p.data='layout-reviewed.svg';document.getElementById('labels').onclick=()=>{const e=p.contentDocument?.getElementById('all-point-labels');if(e)e.style.display=e.style.display==='none'?'':'none';};</script></html>'''

if __name__=='__main__':
    source=Path(sys.argv[1]);output=Path(sys.argv[2]) if len(sys.argv)>2 else Path('docs/jmri-layout')
    audit(source,output)
