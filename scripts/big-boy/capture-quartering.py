"""Rasterize the measured-data SVG for review; this is not a GLB screenshot."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
out=ROOT/'docs/_active/rolling-stock/evidence/L02-F'
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),headless=True)
    page=browser.new_page(viewport={'width':1000,'height':610},device_scale_factor=1)
    errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto((out/'quartering.svg').as_uri())
    assert page.locator('text').count()==21
    page.screenshot(path=str(out/'quartering.png'))
    (out/'diagram-render.json').write_text(json.dumps({'browser':browser.version,'source':'quartering.svg','kind':'measured-data diagram, not a GLB rendering','pageErrors':errors},indent=2)+'\n')
    assert not errors
    browser.close()
