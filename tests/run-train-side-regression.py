"""Retain M1.1 assertions; let the native swipe finish before the Fit tap."""
from pathlib import Path
import hashlib,json,os
root=Path(__file__).resolve().parents[1]
original=root/'tests/browser-train-side.py';source=original.read_text()
anchor="    touch.locator('[data-fit]').tap()"
assert source.count(anchor)==1
settle='''    touch.wait_for_function("""()=>{const e=document.querySelector('.sideViewport'),now=performance.now();let s=window.__sideScrollObservation;if(!s||s.left!==e.scrollLeft){s={left:e.scrollLeft,since:now};window.__sideScrollObservation=s;}return now-s.since>=250;}""",timeout=10000)
'''
source=source.replace(anchor,settle+anchor)
out=Path(os.environ.get('M11_OUTPUT','work/m2-side-settled'));out.mkdir(parents=True,exist_ok=True)
(out/'provenance.json').write_text(json.dumps({'source':'tests/browser-train-side.py','sourceSHA256':hashlib.sha256(original.read_bytes()).hexdigest(),'adjustment':'Wait for 250 ms of stable native scroll before Fit tap; all original assertions retained.','bundleSHA256':hashlib.sha256((root/'dist/game.js').read_bytes()).hexdigest()},indent=2)+'\n')
exec(compile(source,str(original),'exec'),{'__file__':str(original),'__name__':'__main__'})
