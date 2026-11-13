"""R0.1 metrology and static figures; optional master SVG source is read-only.
Requires numpy/matplotlib for scientific plots, Inkscape only for original SVG render.
"""
from pathlib import Path
import json, math, argparse, hashlib, xml.etree.ElementTree as ET, re, bisect
import os
os.environ.setdefault("MPLCONFIGDIR", "/tmp/serien-r01-matplotlib")
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'docs/_active/scenario-v06';E=BASE/'evidence/R01'

def distances(points,line):
    a=np.array(line[:-1]);v=np.diff(np.array(line),axis=0);den=np.sum(v*v,axis=1);out=[]
    for chunk in np.array_split(np.array(points),max(1,len(points)//300)):
        w=chunk[:,None,:]-a;t=np.clip(np.sum(w*v,axis=2)/den,0,1)
        out.extend(np.sqrt(np.min(np.sum((w-t[:,:,None]*v)**2,axis=2),axis=1)).tolist())
    return out

def extract_master(path):
    assert hashlib.sha256(path.read_bytes()).hexdigest()=='868751dc5d17885161e7ff1a7dac46d556d2af2dee578c787db80a6f5e489022'
    root=ET.parse(path).getroot();g=next(e for e in root if e.get('clip-path')=='url(#clipMain)')
    rails=[e for e in g if e.tag.endswith('path') and e.get('stroke')=='#3b3631' and e.get('stroke-width')=='0.13']
    assert len(rails)==152
    refs=[]
    for i in range(0,len(rails),2):
        aa=[np.array(list(map(float,re.findall(r'-?\d*\.?\d+',e.get('d'))))).reshape(-1,2) for e in rails[i:i+2]]
        assert aa[0].shape==aa[1].shape
        center=((aa[0]+aa[1])/2-[20,30])/.3733
        # Reference decimation only; original endpoints included, max step ~2mm.
        center=np.vstack([center[::4],center[-1]]) if len(center)%4!=1 else center[::4]
        refs.append({'svg_rail_pair_index':i//2,'points':center.tolist()})
    selected=[r for r in refs if r['svg_rail_pair_index'] in [12,13,16,17,56,57,58,59]]
    # Pair indices in the SVG are not automatically piece IDs. Match by known mouths later.
    data={'source_sha256':'868751dc5d17885161e7ff1a7dac46d556d2af2dee578c787db80a6f5e489022',
          'transform':'PLAN = (paper_mm - [20,30]) / 0.3733','rail_pair_centerlines':refs,
          'precision_note':'SVG coordinates rounded 0.01 paper mm = 0.02679 plan mm; pair-center averaging; no topology inferred'}
    (E/'masterplan-rail-reference.json').write_text(json.dumps(data,separators=(',',':'))+'\n')

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--master-svg',type=Path);ap.add_argument('--master-png',type=Path);args=ap.parse_args()
    if args.master_svg:extract_master(args.master_svg)
    c=json.loads((BASE/'candidate/R01/track.json').read_text());raw=json.loads((E/'source-axes.json').read_text());p={q['piece']:q for q in c['pieces']};r={q['piece']:q for q in raw['pieces']}
    ref=json.loads((E/'masterplan-rail-reference.json').read_text());refs=ref['rail_pair_centerlines']
    metrics={'gap_corrections':[],'wx_comparison':[]}
    for q in p.values():
        if 'reconciliation' not in q:continue
        m=q['reconciliation'];ps=r[q['piece']]['points'];ss=[0.]
        for a,b in zip(ps,ps[1:]):ss.append(ss[-1]+math.dist(a,b))
        L=m['support_original_arclength_mm'];sign=1 if m['end']=='E' else -1
        delta=np.array(m['delta_mm']);dv=np.array(m['displacement_derivative_SE']);curv=[];speed=[]
        # Analytic displacement derivatives on smooth interiors of source segments.
        for t in np.linspace(0,1,4001):
            s=ss[-1]-L+L*t if m['end']=='E' else L-L*t
            i=min(len(ps)-2,max(0,bisect.bisect_right(ss,s)-1));v=np.subtract(ps[i+1],ps[i])/(ss[i+1]-ss[i])
            hp=30*t*t-60*t**3+30*t**4;gp=-12*t*t+28*t**3-15*t**4
            hpp=60*t-180*t*t+120*t**3;gpp=-24*t+84*t*t-60*t**3
            first=v+sign/L*(delta*hp+sign*L*dv*gp);second=(delta*hpp+sign*L*dv*gpp)/(L*L)
            vnorm=np.linalg.norm(first);speed.append(float(vnorm));curv.append(float(abs(first[0]*second[1]-first[1]*second[0])/vnorm**3))
        metrics['gap_corrections'].append({'piece':q['piece'],**m,'length_before_mm':ss[-1],'length_after_mm':q['length_mm'],
            'max_added_smooth_segment_curvature_per_mm':max(curv),'minimum_radius_smooth_interiors_mm':1/max(curv),
            'min_speed_in_original_arclength_parameter':min(speed),'caveat':'excludes inherited source polygon corners; displacement is C2, source is not'})
    for i in [12,13,16,17]:
        before=np.array(r[i]['points']);after=np.array(p[i]['points']);lo,hi=sorted(before[:,0]);overlap=after[(after[:,0]>=lo)&(after[:,0]<=hi)]
        reference=min(refs,key=lambda q:math.dist(q['points'][0],before[0])+math.dist(q['points'][-1],before[-1]))
        assert max(distances(before,reference['points']))<.03
        metrics['wx_comparison'].append({'piece':i,'master_rail_pair':reference['svg_rail_pair_index'],
            'source_to_SVG_max_mm':max(distances(before,reference['points'])),
            'candidate_overlap_to_original_core_max_mm':max(distances(overlap,before)),
            'original_core_endpoints_to_candidate_max_mm':max(distances(before,after)),
            'length_before_mm':math.dist(*before),'length_after_mm':p[i]['length_mm'],
            'source_core_angle_deg':math.degrees(math.atan2(abs(before[0,1]-before[1,1]),abs(before[0,0]-before[1,0]))),
            'profile':{k:v for k,v in p[i]['profile'].items() if k!='primitives'}})
    (E/'metrology.json').write_text(json.dumps(metrics,indent=2)+'\n')
    plt.rcParams.update({'font.size':9,'axes.grid':True,'grid.alpha':.2})
    def draw(ax,q,**kwargs):a=np.array(q['points']);ax.plot(a[:,0],a[:,1],**kwargs)
    fig,ax=plt.subplots(figsize=(15,7.6))
    for q in r.values():draw(ax,q,color='#c24040',lw=1.8,alpha=.6)
    for q in p.values():draw(ax,q,color='#087f8c',lw=.8)
    for g in c['gaps']:ax.annotate(g['id'],g['joint_mm'],xytext=(12,12),textcoords='offset points',arrowprops={'arrowstyle':'->'})
    ax.set(xlim=(0,1500),ylim=(700,0),xlabel='PLAN X (mm)',ylabel='PLAN Y (mm)',title='R0.1 — Original export (red) / offline candidate (teal) — no runtime integration')
    ax.set_aspect('equal');fig.tight_layout();fig.savefig(E/'overview-before-after.png',dpi=150);plt.close(fig)
    fig,axes=plt.subplots(3,2,figsize=(12,10))
    for row,(g,ids) in enumerate(zip(c['gaps'],[(27,48),(38,40),(70,71)])):
        xy=np.array(g['joint_mm'])
        for col in [0,1]:
            ax=axes[row,col]
            for i in ids:draw(ax,r[i],color='#bd3838',lw=2,linestyle='--');draw(ax,p[i],color='#087f8c',lw=1.2)
            for i in ids:
                m=p[i]['reconciliation'];a=m['original_mm'];b=m['new_mm'];ax.plot(*a,'o',color='#bd3838',ms=3);ax.plot(*b,'o',color='#087f8c',ms=3)
            span=35 if col==0 else 3
            ax.set(xlim=(xy[0]-span,xy[0]+span),ylim=(xy[1]+span,xy[1]-span),title=f'{g["id"]} — '+('local support' if col==0 else 'joint detail')+' (mm)');ax.set_aspect('equal')
    fig.suptitle('Named gaps only — dashed red: source; teal: candidate; points at true scale');fig.tight_layout();fig.savefig(E/'gaps-before-after.png',dpi=160);plt.close(fig)
    fig,axes=plt.subplots(2,1,figsize=(14,6))
    for ax,(label,ids) in zip(axes,[('WX-A',[59,60,12,13]),('WX-B',[61,62,16,17])]):
        for i in ids:
            draw(ax,r[i],color='#bd3838',lw=1.4,linestyle='--');draw(ax,p[i],color='#087f8c',lw=1.3)
            if i in [12,13,16,17]:
                m=next(v for v in metrics['wx_comparison'] if v['piece']==i);reference=next(v for v in refs if v['svg_rail_pair_index']==m['master_rail_pair']);a=np.array(reference['points']);ax.plot(a[:,0],a[:,1],color='#b07809',lw=.8,alpha=.7)
        ax.invert_yaxis();ax.set_aspect('equal');ax.set_title(f'{label} — red/gold: source/SVG core; teal: fitted catalog candidate; center crossing has no node')
    fig.tight_layout();fig.savefig(E/'wx-before-after.png',dpi=170);plt.close(fig)
    if args.master_png:
        image=plt.imread(args.master_png);h,w=image.shape[:2];x0,x1=int(20/594*w),int(579.95/594*w);y0,y1=int(30/420*h),int(291.31/420*h)
        cropped=image[y0:y1,x0:x1];plt.imsave(E/'masterplan-board.png',cropped)
    if (E/'masterplan-board.png').exists():
        image=plt.imread(E/'masterplan-board.png');fig,ax=plt.subplots(figsize=(16,8));ax.imshow(image,extent=[0,1500,700,0])
        for q in p.values():draw(ax,q,color='#00d6ee',lw=.7,alpha=.95)
        ax.set(xlim=(0,1500),ylim=(700,0),title='V06 masterplan original SVG (board crop) + R0.1 candidate centerlines (cyan)');ax.set_aspect('equal');fig.tight_layout();fig.savefig(E/'masterplan-overlay.png',dpi=170);plt.close(fig)
    print(json.dumps({'gap_radius_mm':{m['piece']:m['minimum_radius_smooth_interiors_mm'] for m in metrics['gap_corrections']},'wx':[{k:v for k,v in m.items() if k!='profile'} for m in metrics['wx_comparison']]},indent=2))
if __name__=='__main__':main()
