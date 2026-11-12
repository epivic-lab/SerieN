"""Run an unchanged historical test in its own output directory and local Auth fixture.
Retarget obsolete local server ports. Optional observer only exposes real app objects.
No railway assertions or production source are rewritten by this harness.
"""
import json, os, runpy, sys
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import Browser, Page

root = Path(__file__).resolve().parents[5]
test = root/sys.argv[1]
output = Path(sys.argv[2]).resolve()
output.mkdir(parents=True, exist_ok=True)
base = os.environ.get('SERIEN_URL', 'http://127.0.0.1:8033/')
observer = os.environ.get('U4_OBSERVER')
new_page, goto, screenshot = Browser.new_page, Page.goto, Page.screenshot

def fixture(browser, *args, **kwargs):
    page = new_page(browser, *args, **kwargs)
    page.route('**/auth-gate.js*', lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
    page.add_init_script("const raf=requestAnimationFrame.bind(window);window.__regressionNative=false;window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__regressionFrame=cb;if(!window.__regressionNative)return 1;}return raf(cb);};")
    return page

def local_goto(page, url, *args, **kwargs):
    parsed = urlsplit(url)
    if parsed.hostname in ['127.0.0.1','localhost']:
        url = base.rstrip('/')+parsed.path+('?' + parsed.query if parsed.query else '')
    response = goto(page, url, *args, **kwargs)
    if observer:
        page.wait_for_function('Boolean(window.__serienProfile)', timeout=180000)
    return response

def capture(page, *args, **kwargs):
    page.evaluate('window.__regressionFrame?.(performance.now())')
    return screenshot(page, *args, **kwargs)

Browser.new_page, Page.goto, Page.screenshot = fixture, local_goto, capture
os.environ['SERIEN_URL'] = base
if observer:
    os.environ['S6_BUNDLE'] = observer
    os.environ['S2_BUNDLE'] = observer
    os.environ['S5_BUNDLE'] = observer
os.environ['S6_OUTPUT'] = str(output/'guarded-stop')
os.environ['S2_OUTPUT'] = str(output/'interaction')
os.environ['S5_OUTPUT'] = str(output/'railway-guard')
os.chdir(output)
(output/'provenance.json').write_text(json.dumps({'test':str(test.relative_to(root)), 'localAuthFixture':True,'observer':observer,'RAF':'on-demand; existing deterministic steps preserved','URL':base,'assertionsRewritten':False},indent=2)+'\n')
runpy.run_path(str(test), run_name='__main__')
