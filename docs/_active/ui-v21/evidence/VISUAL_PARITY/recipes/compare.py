"""Full-resolution screenshot comparison; only the shared dynamic canvas
interior is excluded from the quantitative diff. Every overlay remains tested.
No UI is removed, restyled or masked to improve the result.
"""
import json,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageChops,ImageOps
E=Path('/workspace/work/visual-parity/evidence');data={m:json.loads((E/(m+'-measurements.json')).read_text())for m in ['reference','baseline','current']}
rows=[];gallery=['# Visual parity — confronti definitivi','', 'Reference originale cf2c29a, font locali, qualità UI High. Runtime reale prima/dopo con bootstrap Auth locale dichiarato, scena ferroviaria inclusa e renderer software. Confronti a pari viewport e Day0; nessuna prova OAuth.','', 'Overlay: fusione 50/50 senza maschere. Diff: rosso dove la differenza supera 24/255; escluso soltanto l’interno dinamico comune della scena, con HUD/Bell/camera/log mantenuti. Nessun valore UI mascherato. Il diff completo resta visibile anche per gli adattamenti responsivi motivati.','']
def rectangle(b):return [round(b['x']),round(b['y']),round(b['x']+b['width']),round(b['y']+b['height'])]
def padding_image(img,size):
 p=Image.new('RGB',size,'#080e0b');p.paste(img,(0,0));return p
def compare(a,b,va,vb,name):
 size=(max(a.width,b.width),max(a.height,b.height));a=padding_image(a,size);b=padding_image(b,size)
 mask=Image.new('L',size,0);draw=ImageDraw.Draw(mask)
 ca=va['regions']['canvasViewport'][0];cb=vb['regions']['canvasViewport'][0]
 clip=[math.ceil(max(ca['x'],cb['x'])+2),math.ceil(max(ca['y'],cb['y'])+2),math.floor(min(ca['x']+ca['width'],cb['x']+cb['width'])-2),math.floor(min(ca['y']+ca['height'],cb['y']+cb['height'])-2)]
 if clip[2]>clip[0] and clip[3]>clip[1]:draw.rectangle(clip,fill=255)
 for view in [va,vb]:
  for region in ['hud','camera','bell','log']:
   for box in view['regions'].get(region,[]):
    if box['width']>0 and box['height']>0:draw.rectangle(rectangle(box),fill=0)
 diff=ImageChops.difference(a,b);channels=diff.split();magnitude=ImageChops.lighter(ImageChops.lighter(channels[0],channels[1]),channels[2]);changed=magnitude.point(lambda x:255 if x>24 else 0)
 visible=ImageOps.invert(mask);changed=ImageChops.multiply(changed,visible)
 eligible=sum(visible.histogram()[1:]);n=sum(changed.histogram()[1:])
 if name:
  Image.blend(a,b,.5).save(E/('overlay-'+name+'.png'))
  base=ImageOps.grayscale(b).convert('RGB').point(lambda x:round(x*.25));heat=Image.new('RGB',size,'#f34e45');Image.composite(heat,base,changed).save(E/('diff-'+name+'.png'));mask.save(E/('dynamic-mask-'+name+'.png'))
 return {'comparedPixels':eligible,'excludedDynamicPixels':sum(mask.histogram()[1:]),'changedPixelsThreshold24':n,'changedPercent':100*n/max(1,eligible)}
for i,corrected in enumerate(data['current']['viewports']):
 reference=data['reference']['viewports'][i];previous=data['baseline']['viewports'][i];w,h=corrected['width'],corrected['height'];key=f'{w}x{h}'
 assert (w,h)==(reference['width'],reference['height'])==(previous['width'],previous['height'])
 a=Image.open(E/reference['screenshot']).convert('RGB');b=Image.open(E/corrected['screenshot']).convert('RGB');old=Image.open(E/previous['screenshot']).convert('RGB')
 after=compare(a,b,reference,corrected,key);before=compare(a,old,reference,previous,None)
 deviations={}
 for region in ['header','viewport','sidebar','dock','plaque','edition','camera','hud','environment','switches','map','missions']:
  aa=reference['regions'][region][0];bb=corrected['regions'][region][0]
  deviations[region]={k:round(bb[k]-aa[k],3)for k in ['x','y','width','height']}
 desktop=w>=1024
 macro=max(abs(value)for name in ['header','viewport','sidebar','dock']for value in deviations[name].values())
 assert not corrected['overflow'] and corrected['canvas']==1
 if desktop:assert macro<=1.5,(key,deviations)
 row={'viewport':[w,h],'desktopMacroMaxErrorPx':macro if desktop else None,'macroGate':'PASS' if desktop else 'Responsive adaptation — see report','bodyHorizontalOverflow':corrected['overflow'],'canvasCount':corrected['canvas'],'regionDeviationPx':deviations,'before':before,'corrected':after};rows.append(row)
 gallery+=['## '+key,'', '| Claude originale | UI precedente | UI corretta |','| --- | --- | --- |',f'| [Apri]({reference["screenshot"]}) | [Apri]({previous["screenshot"]}) | [Apri]({corrected["screenshot"]}) |','',f'![UI corretta {key}]({corrected["screenshot"]})','',f'[Overlay 50/50](overlay-{key}.png) · [Diff UI completo](diff-{key}.png) · [Maschera dinamica ispezionabile](dynamic-mask-{key}.png)','',f'Pixel UI divergenti, soglia24: precedente {before["changedPercent"]:.2f}%; corretta {after["changedPercent"]:.2f}%. Il valore comprende contenuti/stati reali e adattamenti consentiti; non è una dichiarazione pixel-perfect.','']
(E/'comparison-results.json').write_text(json.dumps({'status':'PASS_MACRO_GEOMETRY_WITH_DOCUMENTED_ADAPTATIONS','referenceUIQuality':'High, original isolated demo only','maskMethod':'Intersection of dynamic canvas interiors minus every HUD/Bell/camera/log box from both images; no UI/text mask','viewports':rows},indent=2)+'\n')
(E/'GALLERY.md').write_text('\n'.join(gallery))
print(json.dumps([{'viewport':r['viewport'],'macroMaxError':r['desktopMacroMaxErrorPx'],'beforeDiffPercent':round(r['before']['changedPercent'],2),'correctedDiffPercent':round(r['corrected']['changedPercent'],2)}for r in rows],indent=2))
