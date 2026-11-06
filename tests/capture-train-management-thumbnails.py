"""Regenerate M1 wagon previews with the existing renderer capture helper. Requires a local server on :8000."""
import base64
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
Path('work').mkdir(exist_ok=True)
subprocess.run(['node_modules/.bin/esbuild','scripts/capture-stock-thumbnails.js','--bundle','--format=esm','--outfile=work/capture-stock-bundle.js'],check=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page()
 page.goto('http://127.0.0.1:8000/work/')
 page.evaluate("const base=document.createElement('base');base.href='http://127.0.0.1:8000/';document.head.append(base)")
 page.add_script_tag(url='http://127.0.0.1:8000/work/capture-stock-bundle.js',type='module')
 page.wait_for_function('window.captureStock!==undefined')
 result=page.evaluate('captureStock()')
 out=Path('assets/rolling-stock-thumbnails');out.mkdir(exist_ok=True)
 for key,value in result.items(): (out/(key+'.png')).write_bytes(base64.b64decode(value.split(',')[1]))
 b.close()
 print('Generated',len(result),'previews using existing stock and capture helper')
