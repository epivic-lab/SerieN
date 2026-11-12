"""Run unchanged historical assertions against the current minified bundle.
Only local auth and on-demand rendering are substituted; outputs live in a new
scratch cwd. Engine steps/assertions stay unchanged. Native RAF gate is separate.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re

parser=argparse.ArgumentParser();parser.add_argument('suite',choices=['railway','deck','phase-zero']);args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
name={'railway':'browser-phase-five-close.py','deck':'browser-train-deck.py','phase-zero':'browser-phase-zero.py'}[args.suite]
source=(root/'tests'/name).read_text()
match=re.search(r'^( +)page.goto\(',source,re.M);assert match,'Review source boundary'
indent=match[1]
setup=["page.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body=\"document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');\"))",
       "page.add_init_script(\"const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__m2RegressionFrame=cb;return 1;}return raf(cb);};\")"]
source=source[:match.start()]+''.join(indent+line+'\n' for line in setup)+source[match.start():]
out=Path(os.environ.get('M2_REGRESSION_OUTPUT',root/'work/m2-regressions'))/args.suite;out.mkdir(parents=True,exist_ok=True)
(out/'provenance.json').write_text(json.dumps({'source':name,'sourceSHA256':hashlib.sha256((root/'tests'/name).read_bytes()).hexdigest(),'bundleSHA256':hashlib.sha256((root/'dist/game.js').read_bytes()).hexdigest(),'method':'unchanged assertions, local auth fixture, on-demand renderer, deterministic diagnostic stepping'},indent=2)+'\n')
os.chdir(out)
exec(compile(source,str(root/'tests'/name),'exec'),{'__file__':str(root/'tests'/name),'__name__':'__main__'})
