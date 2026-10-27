"""Capture comparable phase-0 views; run against npm start.

python3 tests/capture-baseline.py docs/phase-0/before
Uses a fixed Low profile, 960x820 viewport, DPR 1, daylight 48, stopped trains.
SwiftShader measurements describe the test environment, not desktop/iPad GPU FPS.
"""
import json
import hashlib
import os
import statistics
import subprocess
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

output = Path(sys.argv[1])
output.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'),
        headless=True, args=['--no-sandbox', '--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width':650, 'height':820}, device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(os.environ.get('SERIEN_URL', 'http://127.0.0.1:8000/') + '?diagnostics=1', wait_until='domcontentloaded')
    page.wait_for_function('window.__serienDiagnostics !== undefined', timeout=90000)
    page.evaluate("""() => {
        const q=document.getElementById('quality');q.value='low';q.dispatchEvent(new Event('change'));
        document.getElementById('pause').click();
    }""")
    page.set_viewport_size({'width':960, 'height':820})
    page.wait_for_timeout(1500)
    metadata = {'commit': subprocess.check_output(['git','rev-parse','HEAD'], text=True).strip(),
        'appVersion':json.loads(Path('package.json').read_text())['version'],
        'bundleSha256':hashlib.sha256(Path('dist/game.js').read_bytes()).hexdigest(),
        'workingTreeChanges':subprocess.check_output(['git','diff','--name-only'],text=True).splitlines(),
        'browser':browser.version, 'viewport':[960,820], 'dpr':1, 'quality':'low', 'day':48,
        'motion':'paused; initial train positions', 'renderer':'Chromium headless / SwiftShader (software)',
        'timingNote':'Short idle sample, includes frame scheduling; not a hardware FPS certification.', 'views':{}}
    for preset in ['overview', 'station', 'yard']:
        page.evaluate("""v=>{const e=document.getElementById('cameraView');e.value=v;e.dispatchEvent(new Event('change'));}""", preset)
        page.wait_for_timeout(2500)
        intervals = page.evaluate("""() => new Promise(resolve => {
            const values=[]; let previous;
            function frame(t){if(previous!==undefined)values.push(t-previous);previous=t;
                if(values.length===8)resolve(values);else requestAnimationFrame(frame)}
            requestAnimationFrame(frame);
        })""")
        snapshot = page.evaluate('__serienDiagnostics.snapshot()')
        metadata['views'][preset] = {'camera':snapshot['camera'], 'render':snapshot['render'],
            'samples':len(intervals), 'medianFrameMs':round(statistics.median(intervals),2),
            'p95FrameMs':round(sorted(intervals)[int(len(intervals)*.95)-1],2),
            'averageFps':round(1000/statistics.mean(intervals),2)}
        (output/'metrics.json').write_text(json.dumps(metadata, indent=2)+'\n')
        print(preset, metadata['views'][preset], flush=True)
        page.screenshot(path=str(output / (preset+'.png')), timeout=60000)
    assert not errors, errors
    metadata['errors'] = errors
    (output/'metrics.json').write_text(json.dumps(metadata, indent=2)+'\n')
    browser.close()
