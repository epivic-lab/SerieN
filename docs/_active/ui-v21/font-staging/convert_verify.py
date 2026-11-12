"""Isolated format conversion with installed FontTools and Node built-in Brotli.
No install, global font registration, app import or dependency modification.
"""
from pathlib import Path
import hashlib,json,subprocess,types
from fontTools.ttLib import TTFont,woff2
from fontTools.pens.recordingPen import RecordingPen
import fontTools
ROOT=Path(__file__).resolve().parent
NODE="""const z=require('node:zlib'),fs=require('node:fs');const b=fs.readFileSync(0);process.stdout.write(process.argv[1]==='compress'?z.brotliCompressSync(b,{params:{[z.constants.BROTLI_PARAM_MODE]:z.constants.BROTLI_MODE_FONT,[z.constants.BROTLI_PARAM_QUALITY]:11}}):z.brotliDecompressSync(b));"""
def codec(op,data):return subprocess.run(['node','-e',NODE,op],input=data,check=True,capture_output=True).stdout
woff2.brotli=types.SimpleNamespace(MODE_FONT=2,compress=lambda data,**kw:codec('compress',data),decompress=lambda data:codec('decompress',data));woff2.haveBrotli=True
manifest=json.loads((ROOT/'manifest.json').read_text());results=[]
for rec in manifest['fonts']:
 p=ROOT/rec['slug']/rec['source_ttf'];out=p.with_suffix('.woff2');f=TTFont(p,recalcTimestamp=False);f.flavor='woff2';f.save(out)
 a=TTFont(p,recalcTimestamp=False);b=TTFont(out,recalcTimestamp=False,checkChecksums=2)
 def outlines(font):
  gs=font.getGlyphSet();d={}
  for g in font.getGlyphOrder():
   pen=RecordingPen();gs[g].draw(pen);d[g]=pen.value
  return d
 checks={'signature':out.read_bytes()[:4]==b'wOF2','family':b['name'].getDebugName(1)==rec['family'],'weight':a['OS/2'].usWeightClass==b['OS/2'].usWeightClass==rec['weight'],'style':b['name'].getDebugName(2)==('Bold' if rec['weight']==700 else 'Regular'),'embeddable_fsType_0':b['OS/2'].fsType==0,'name_table_preserved':a['name'].compile(a)==b['name'].compile(b),'cmap_preserved':a.getBestCmap()==b.getBestCmap(),'metrics_preserved':a['hmtx'].metrics==b['hmtx'].metrics,'all_glyph_outlines_preserved':outlines(a)==outlines(b),'layout_tables_preserved':all(a[t].compile(a)==b[t].compile(b) for t in ['GPOS','GSUB','GDEF','kern'] if t in a)}
 data=out.read_bytes();rec.update({'version':b['name'].getDebugName(5),'postscript_name':b['name'].getDebugName(6),'copyright_font':b['name'].getDebugName(0),'license_font':b['name'].getDebugName(13),'license_url_font':b['name'].getDebugName(14),'woff2':{'file':str(out.relative_to(ROOT)),'size':len(data),'sha256':hashlib.sha256(data).hexdigest()},'conversion':'TTF → WOFF2 container only; no subset, synthetic weight, name, metrics or glyph edits; standard WOFF2 transform bookkeeping only','future_destination':'ui/fonts/'+rec['family'].replace(' ','')+'-'+str(rec['weight'])+'.woff2','glyph_count':len(b.getGlyphOrder()),'checks':checks})
 results.append({'family':rec['family'],'status':'PASS' if all(checks.values()) else 'FAIL','checks':checks})
manifest['tools']={'fonttools':fontTools.__version__,'node':subprocess.check_output(['node','--version'],text=True).strip(),'brotli':subprocess.check_output(['node','-p','process.versions.brotli'],text=True).strip(),'codec':'node:zlib Brotli quality 11 MODE_FONT, no new dependencies'}
manifest['status']='PASS' if all(r['status']=='PASS' for r in results) else 'FAIL'
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n');(ROOT/'conversion-validation.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results,indent=2))
if manifest['status']!='PASS':raise SystemExit(1)
