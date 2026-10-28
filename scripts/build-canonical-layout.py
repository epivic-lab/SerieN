"""Build runtime geometry from the preserved JMRI source and documented modules.

No proximity connections beyond the two audited 2mm endpoint reconciliations.
Internal module profiles are explicitly marked fitted, never source XML geometry.
"""
import hashlib
import html
import importlib.util
import json
import math
from pathlib import Path
import tempfile
import contextlib
import io

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('audit',ROOT/'scripts/analyze-jmri-layout.py')
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)

def arc(a,b,angle,flip=False):
    dx,dz=b['x']-a['x'],b['z']-a['z'];chord=math.hypot(dx,dz)
    theta=math.radians(angle)*(-1 if flip else 1)
    radius=chord/(2*math.sin(abs(theta)/2))
    h=chord/(2*math.tan(theta/2))
    cx=(a['x']+b['x'])/2-dz/chord*h;cz=(a['z']+b['z'])/2+dx/chord*h
    start=math.atan2(a['z']-cz,a['x']-cx)
    count=max(2,math.ceil(radius*abs(theta)/2))
    points=[{'x':cx+radius*math.cos(start+theta*i/count),'z':cz+radius*math.sin(start+theta*i/count)} for i in range(count+1)]
    points[0]=a.copy();points[-1]=b.copy()
    return points,{'kind':'circular-arc','radius':radius,'angle':angle,'flip':flip}

def s_curve(a,b,radius,first,last=None,center=0):
    """Tangent line/arc/line/reverse-arc/line, exact two port constraints.
    Wideners use the measured PDF 42mm lead and two 15deg curves, with the
    rounded XML port height determining the fitted radius; WX uses an explicitly
    secondary catalog profile. Neither is claimed metrologically certified.
    """
    width=b['x']-a['x'];height=b['z']-a['z'];sgn=1 if height>0 else -1
    lo,hi=0,math.pi/3
    for _ in range(70):
        theta=(lo+hi)/2
        if 2*radius*(1-math.cos(theta))+center*math.sin(theta)<abs(height):lo=theta
        else:hi=theta
    theta=(lo+hi)/2
    curved=2*radius*math.sin(theta)+center*math.cos(theta)
    if first is None:first=(width-curved)/2
    last=width-curved-first
    if min(first,last)<0:raise ValueError('Module cannot fit its audited mouths')
    points=[a.copy()];x,z=a['x'],a['z'];heading=0
    def straight(length):
        nonlocal x,z
        x+=length*math.cos(heading);z+=length*math.sin(heading);points.append({'x':x,'z':z})
    def curve(sign):
        nonlocal x,z,heading
        cx=x-sign*radius*math.sin(heading);cz=z+sign*radius*math.cos(heading)
        start=heading-sign*math.pi/2
        count=math.ceil(radius*theta/2)
        for i in range(1,count+1):
            ang=start+sign*theta*i/count
            points.append({'x':cx+radius*math.cos(ang),'z':cz+radius*math.sin(ang)})
        x,z=points[-1]['x'],points[-1]['z'];heading+=sign*theta
    straight(first);curve(sgn)
    if center:straight(center)
    curve(-sgn);straight(last)
    assert math.hypot(x-b['x'],z-b['z'])<1e-7
    points[-1]=b.copy()
    return points,{'kind':'tangent-double-arc','radius':radius,'angle':math.degrees(theta),'lead':first,'trailing':last,'centerStraight':center,'profileCertified':False}

def build(tolerance_mm=2.5):
    with tempfile.TemporaryDirectory() as temp,contextlib.redirect_stdout(io.StringIO()):
        d=audit.audit(ROOT/'docs/jmri-layout/source.xml',Path(temp),tolerance_mm)
    source_nodes=d['normalizedGraph']['nodes'];nodes={n['id']:{'id':n['id'],**n['world'],'aliases':n['aliases'],'terminal':n['type']=='END_BUMPER'} for n in source_nodes}
    aliases={alias:n['id'] for n in source_nodes for alias in n['aliases']}
    # JMRI rounds to 1mm. The original PDF explicitly names R249/282/315,
    # with 45-degree pieces. Recover those nominal axes, recording every
    # submillimetre change rather than retaining slightly eccentric circles.
    rounding_fits=[]
    for n in nodes.values():
        incident=[s for s in d['segments'] if s['angle']==45 and n['id'] in [aliases[s['from']],aliases[s['to']]]]
        if not incident:continue
        radius=min([249,282,315],key=lambda r:abs(r-incident[0]['geometry']['radius']))
        cx=378 if n['x']<750 else 1122
        angle=round(math.atan2(n['z']-350,n['x']-cx)/(math.pi/4))*math.pi/4
        x,z=cx+radius*math.cos(angle),350+radius*math.sin(angle)
        change=math.hypot(x-n['x'],z-n['z'])
        if change>1.1:raise ValueError('Nominal Kato fit exceeds export rounding '+n['id'])
        if change>1e-8:rounding_fits.append({'node':n['id'],'original':{'x':n['x'],'z':n['z']},'fitted':{'x':x,'z':z},'distanceMm':change,'reason':'PDF nominal radius and 45-degree Kato piece; XML coordinate rounding'})
        n['x'],n['z']=x,z
    edges=[];controllers=[]
    def add(id,a,b,points=None,shape=None,**meta):
        a,b=aliases.get(a,a),aliases.get(b,b)
        pa,pb=({k:nodes[n][k] for k in ['x','z']} for n in [a,b])
        points=points or [pa,pb]
        points[0]=pa;points[-1]=pb
        length=sum(math.hypot(q['x']-p['x'],q['z']-p['z']) for p,q in zip(points,points[1:]))
        if length<1e-6:raise ValueError('Zero length runtime edge '+id)
        edges.append({'id':id,'from':a,'to':b,'points':points,'shape':shape or {'kind':'line'},'length':length,**meta})
    originals={s['id']:s for s in d['segments']}
    for e in d['normalizedGraph']['edges']:
        if e['kind']!='track':continue
        s=originals[e['id']];a,b=({k:nodes[n][k] for k in ['x','z']} for n in [e['from'],e['to']])
        if s['angle']:
            angle=s['angle']
            if angle==15:
                chord=math.hypot(b['x']-a['x'],b['z']-a['z'])
                angle=math.degrees(2*math.asin(chord/(2*481)))
            points,shape=arc(a,b,angle,s['flip'])
            shape['sourceAngle']=s['angle']
            if s['angle']==15:shape['nominalRadius']=481;shape['nominalAngle']=15
        else:points,shape=[a,b],{'kind':'line'}
        lane=None
        if s['angle']==45:lane=min(range(3),key=lambda i:abs([249,282,315][i]-shape['radius']))
        elif abs(a['z']-b['z'])<1e-6:
            for i,levels in enumerate([[101,599,566],[68,632],[35,665]]):
                if any(abs(a['z']-v)<1e-5 for v in levels):lane=i
        meta={'source':'XML','sourceIds':[e['id']],'confidence':'explicit','role':'yard'}
        if lane is not None:meta.update(lane=lane,role='mainline')
        if e['id'] in ['T40','T42']:meta.update(role='runaround-main',destination='Runaround · ramo principale')
        if e['id'] in ['T43','T44']:meta.update(role='runaround-alternate',destination='Runaround · aggiramento')
        terminal=next((n for n in [e['from'],e['to']] if nodes[n]['terminal']),None)
        if terminal:meta.update(terminal=terminal,destination={'A67':'Tronchino ovest alto','EB39':'Tronchino ovest centrale','EB49':'Tronchino ovest basso','EB52':'Tronchino est'}[terminal])
        add(e['id'],e['from'],e['to'],points,shape,**meta)
    mapping={'TO0':('Y-IN','Accesso merci ovest'),'TO1':('Y-R1','Runaround ovest'),'TO2':('Y-R2','Runaround est'),'TO3':('Y-3','Accesso merci est'),'TO4':('Y-4','Tronchino est'),'TO5':('Y-2','Bivio tronchini ovest')}
    for t in d['turnouts']:
        sw,name=mapping[t['id']];a,b,c=({k:nodes[aliases[t['ports'][p]]][k] for k in ['x','z']} for p in 'ABC')
        heading=math.atan2(b['z']-a['z'],b['x']-a['x']);dx,dz=c['x']-a['x'],c['z']-a['z']
        x=dx*math.cos(heading)+dz*math.sin(heading);y=-dx*math.sin(heading)+dz*math.cos(heading)
        nominal_radius=718 if t['straightLength']>180 else 481
        theta=2*math.asin(math.hypot(dx,dz)/(2*nominal_radius))
        points,shape=arc(a,c,math.degrees(theta),y<0)
        shape['nominalRadius']=nominal_radius;shape['nominalAngle']=15
        for port,pts,sh in [('B',[a,b],{'kind':'line'}),('C',points,shape)]:
            meta={'source':'JMRI ports + tangent circle fit','sourceIds':[t['id']],'confidence':'fitted-internal','unit':t['id'],'switchId':sw,'requiredState':port=='C','role':'yard'}
            if t['id'] in ['TO0','TO3'] and port=='B':meta.update(lane=0,role='mainline')
            if t['id'] in ['TO1','TO2'] or t['id']=='TO4' and port=='B':meta.update(role='runaround')
            add(t['id']+':A'+port,t['ports']['A'],t['ports'][port],pts,sh,**meta)
        ports={p:aliases[n] for p,n in t['ports'].items()}
        controllers.append({'id':sw,'sourceId':t['id'],'code':t['suggestedKatoCode'],'name':name,'ports':ports,'internal':[t['id']+':AB',t['id']+':AC'],'x':(a['x']+b['x'])/2,'z':(a['z']+b['z'])/2,'kind':'single'})
    for id,upperLeft,upperRight,lowerLeft,lowerRight,lanes in [
        ('WX-A','A7','A43','A25','A8',[1,0]),('WX-B','A40','A30','A42','A32',[2,1])]:
        internal=[]
        for label,a,b,lane in [('upper',upperLeft,upperRight,lanes[0]),('lower',lowerLeft,lowerRight,lanes[1])]:
            eid=id+':'+label;internal.append(eid)
            add(eid,a,b,source='PDF + BOM 20-210 + XML mouths',sourceIds=[a,b],confidence='inferred-validated-ports',unit=id,switchId=id,requiredState=False,lane=lane,role='mainline')
        for label,a,b,sourceLane,targetLane in [('down',upperLeft,lowerRight,*lanes),('up',lowerLeft,upperRight,*lanes[::-1])]:
            pa,pb=({k:nodes[n][k] for k in ['x','z']} for n in [a,b])
            # Secondary XTrackCAD numerical catalog: R22.960 inches, central
            # straight .7057 inches. Fit leads to the exact XML 310x33 mouths.
            points,shape=s_curve(pa,pb,583.184,None,center=17.924)
            eid=id+':'+label;internal.append(eid)
            add(eid,a,b,points,shape,source='documented secondary Kato profile fitted to XML mouths',sourceIds=[a,b],confidence='inferred-profile-unverified',unit=id,switchId=id,requiredState=True,fromLane=sourceLane,toLane=targetLane,role='crossover')
        controllers.append({'id':id,'sourceId':None,'code':'20-210','name':'WX310 '+('ovest' if id=='WX-A' else 'est'),'ports':{'UL':upperLeft,'UR':upperRight,'LL':lowerLeft,'LR':lowerRight},'internal':internal,'x':(nodes[upperLeft]['x']+nodes[upperRight]['x'])/2,'z':(nodes[upperLeft]['z']+nodes[lowerLeft]['z'])/2,'kind':'cross'})
    for id,a,b,c,e in [('WIDEN-L','A28','A44','A3','A46'),('WIDEN-R','A45','A23','A47','A2')]:
        pa,pb=({k:nodes[n][k] for k in ['x','z']} for n in [a,b])
        # PDF library shape: 42mm lead, R481/15deg reverse curves, 20mm exit.
        # Rounded XML has 33mm rise instead of 32.779mm. Keep R481; fit
        # sweep (~15.05deg) and the exit length, recording the profile limits.
        radius=481
        points,shape=s_curve(pa,pb,radius,42)
        if id=='WIDEN-R':
            # Mirror the complete left unit, not merely its vertical offset.
            points=[{'x':pa['x']+pb['x']-p['x'],'z':pa['z']+pb['z']-p['z']} for p in s_curve(pa,pb,radius,42)[0][::-1]]
            shape['lead'],shape['trailing']=shape['trailing'],shape['lead']
        shape['nominalRadius']=481;shape['nominalAngle']=15
        add(id+':offset',a,b,points,shape,source='PDF 20-051/052 + BOM + XML mouths; documented rounding fit',sourceIds=[a,b],confidence='inferred-profile-unverified',lane=0,role='mainline')
        add(id+':straight',c,e,source='PDF + BOM + XML mouths',sourceIds=[c,e],confidence='inferred-validated-ports',lane=1,role='mainline')
    adjacency={id:[] for id in nodes}
    for e in edges:
        adjacency[e['from']].append({'edge':e['id'],'end':0});adjacency[e['to']].append({'edge':e['id'],'end':1})
    seen=set();todo=[next(iter(nodes))]
    while todo:
        id=todo.pop()
        if id in seen:continue
        seen.add(id)
        for port in adjacency[id]:
            e=next(e for e in edges if e['id']==port['edge']);todo.append(e['to'] if port['end']==0 else e['from'])
    assert len(seen)==len(nodes)
    assert {id for id,ports in adjacency.items() if len(ports)==1}=={'A67','EB39','EB49','EB52'}
    result={'version':1,'sourceSha256':d['sourceSha256'],'transform':d['coordinateTransform'],'reconciliation':{'toleranceMm':tolerance_mm,'maximumTangentMismatchDegrees':5,'joins':d['amendments']['joins'],'nominalRadiusFits':rounding_fits,'zeroLengthAliases':[s for s in d['segments'] if s['zeroLength']],'fourthBuffer':'A67','parallelSeparationMm':33},'nodes':nodes,'aliases':aliases,'edges':edges,'controllers':controllers,'statistics':{'nodes':len(nodes),'edges':len(edges),'components':1,'cycleRank':len(edges)-len(nodes)+1,'terminals':4},'limitations':['XML does not encode the internal physical geometry of six single turnouts or the four missing double-track modules.','Turnout internals keep nominal R481/R718 and original A/B/C ports; small angle/tangent differences follow rounded source endpoints.','WX310 diagonal profiles use a documented secondary catalog fit; physical profile is not certified.','20-051/052 keep nominal R481; the small sweep/exit-length fit to rounded XML mouths is explicitly recorded.','Topological validation and physical manufacturing-profile certification are distinct.']}
    terminal_specs=[
        ('A67',['T50','T49'],'TO5:C',['S248','R481-15'],'TO5:AC'),
        ('EB39',['T30','T48','T29'],'TO5:B',['S62B-A','S124','S248'],'TO5:AB'),
        ('EB49',['T37','T38'],'TO1:A',['S62B-A','S62'],None),
        ('EB52',['T39','T46','T47'],'TO4:C',['S62B-A','S248','S248'],'TO4:AC')]
    by_id={e['id']:e for e in edges}
    result['terminals']=[]
    for terminal,chain,port,pieces,internal in terminal_specs:
        length=sum(by_id[id]['length'] for id in chain)
        result['terminals'].append({'id':terminal,'chainFromBuffer':chain,'pieceLabelsFromPdf':pieces,'firstTurnoutPort':port,'axisLengthToPortMm':length,'axisLengthToToeMm':length+(by_id[internal]['length'] if internal else 0),'foulingPoint':'not physically established; requires actual vehicle clearance envelope','simulationBudgetMm':max(0,length-30-10),'budgetAssumptions':{'setbackFromTurnoutPortMm':30,'bufferMarginMm':10},'physicalUsefulLengthCertified':False,'terminalConfidence':'inferred endpoint, confirmed by PDF branch' if terminal=='A67' else 'explicit END_BUMPER XML'})
    result['mainLoops']=[{'lane':lane,'edges':[e['id'] for e in edges if e.get('lane')==lane and not e.get('requiredState')],'length':sum(e['length'] for e in edges if e.get('lane')==lane and not e.get('requiredState'))} for lane in range(3)]
    result['sources']={'xml':'docs/jmri-layout/source.xml','pdf':'docs/jmri-layout/railmodeller-original.pdf','pdfSha256':hashlib.sha256((ROOT/'docs/jmri-layout/railmodeller-original.pdf').read_bytes()).hexdigest(),'dossier':'docs/consolidation/SerieN_Dossier_Tecnico_Codex_REV_A.pdf','dossierSha256':hashlib.sha256((ROOT/'docs/consolidation/SerieN_Dossier_Tecnico_Codex_REV_A.pdf').read_bytes()).hexdigest(),'partsList':'docs/phase-0/kato-parts.csv','secondaryWxProfile':{'url':'https://github.com/sharkcz/xtrkcad/blob/hg/app/lib/params/kato-n.xtp','warning':'Catalog explicitly describes adjusted geometry; numerical design facts only, not manufacturer certification','radiusInches':22.960,'centralStraightMm':17.924}}
    destination=ROOT/'src/canonical-layout.json';destination.write_text(json.dumps(result,separators=(',',':'))+'\n')
    (ROOT/'docs/jmri-layout/canonical-graph.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
    for annotated in [True,False]:
        fragments=['<rect width="1500" height="700" fill="#102a27"/>']
        active_layer=None
        for e in sorted(edges,key=lambda e:0 if e['confidence']=='explicit' else 2 if 'unverified' in e['confidence'] else 1):
            layer='explicit' if e['confidence']=='explicit' else 'profile-review' if 'unverified' in e['confidence'] else 'inferred'
            if layer!=active_layer:
                if active_layer:fragments.append('</g>')
                fragments.append(f'<g id="{layer}">');active_layer=layer
            path='M'+' L'.join(f'{p["x"]:.6f},{p["z"]:.6f}' for p in e['points'])
            color='#d3e4df' if e['confidence']=='explicit' else '#e78ba9' if 'unverified' in e['confidence'] else '#ecb765'
            fragments.append(f'<path id="{html.escape(e["id"])}" d="{path}" fill="none" stroke="{color}" stroke-width="2.5"><title>{html.escape(e["id"]+": "+e["confidence"])}</title></path>')
            if annotated:
                p=e['points'][len(e['points'])//2];fragments.append(f'<text x="{p["x"]+3:.2f}" y="{p["z"]-5:.2f}">{html.escape(e["id"])}</text>')
        fragments.append('</g><g id="unresolved"/>')
        for id,n in nodes.items():
            if n['terminal']:fragments.append(f'<circle cx="{n["x"]}" cy="{n["z"]}" r="7" fill="#e47792"/><text x="{n["x"]+10}" y="{n["z"]+17}">{id}</text>')
        if annotated:
            fragments.append('<g id="point-labels" style="display:none">')
            for node in nodes.values():
                label=html.escape(' / '.join(node['aliases']))
                fragments.append(f'<circle cx="{node["x"]}" cy="{node["z"]}" r="2.5" fill="#80c8d9"/><text x="{node["x"]+4}" y="{node["z"]+12}" fill="#80c8d9">{label}</text>')
            fragments.append('</g>')
            fragments.append('<text x="1000" y="85">T51 / T52: giunti a lunghezza zero, contratti</text>')
            for c in controllers:fragments.append(f'<text class="control" x="{c["x"]}" y="{c["z"]-19}">{c["id"]} · {c["sourceId"] or c["code"]}</text>')
            fragments+=['<text x="20" y="685">Bianco: XML · Ambra: connessioni ricostruite · Rosa: profili da verificare e 4 terminali</text>','<text x="800" y="525">Anello interno · R249 / allargamenti</text>','<text x="800" y="610">Anello centrale · R282</text>','<text x="800" y="652">Anello esterno · R315</text>','<text x="540" y="316">Runaround: T40/T42 + T43/TO4:AB/T44</text>']
        svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 700"><style>text{font:10px sans-serif;fill:#f2f0d5;paint-order:stroke;stroke:#102a27;stroke-width:3px}.control{font-size:13px;font-weight:bold}</style>'+''.join(fragments)+'</svg>'
        (ROOT/'docs/jmri-layout'/('layout-canonical.svg' if annotated else 'minimap-canonical.svg')).write_text(svg)
    print(json.dumps(result['statistics']))

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tolerance-mm',type=float,default=2.5)
    args=parser.parse_args();build(args.tolerance_mm)
