"""S1 contract, actual panel/marker dispatch and S0 geometry preservation.

Build the normal production site and a TEMPORARY S0 build-observer.mjs bundle.
S1_BUNDLE selects that observer; it must never be installed in dist. Output is
written beneath S1_OUTPUT or the caller's cwd, not historic phase evidence.
"""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
out = Path(os.environ.get('S1_OUTPUT', 'turnout-s1'))
out.mkdir(parents=True, exist_ok=True)
bundle = os.environ['S1_BUNDLE']
expected = json.loads((root/'docs/_active/turnouts/evidence/S0/geometry.json').read_text())
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                                args=['--no-sandbox', '--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width':960, 'height':820}, device_scale_factor=1)
    errors, failed = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('requestfailed', lambda r: failed.append(r.url))
    page.route('**/dist/game.js*', lambda r: r.fulfill(path=bundle, content_type='application/javascript'))
    page.goto(os.environ.get('SERIEN_URL', 'http://127.0.0.1:8000/')+'?diagnostics=1',
              wait_until='domcontentloaded', timeout=120000)
    page.wait_for_function('window.__serienProfile && window.__s0Originals', timeout=180000)
    page.evaluate("__serienProfile.stop();document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'))")
    geometry = page.evaluate('''async()=>{
      const digest=async v=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))].map(x=>x.toString(16).padStart(2,'0')).join('');
      const edges=Object.values(__serienProfile.network.edges);let ri=0,bi=0;const result=[];
      for(const m of __s0Originals){const rail=m.kind==='rail',edge=edges[rail?Math.floor(ri/2):bi++];
        const positions=m.attributes.position.array,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
        for(let i=0;i<positions.length;i++){const k=i%3;min[k]=Math.min(min[k],positions[i]);max[k]=Math.max(max[k],positions[i]);}
        result.push({kind:m.kind,id:rail?edge.id+':'+(ri++%2===0?'-1':'+1'):edge.id,
          position:m.position,quaternion:m.quaternion,scale:m.scale,matrix:m.matrix,bounds:{min,max},
          vertices:positions.length/3,indexCount:m.index?.length??0,
          geometrySha256:await digest({attributes:m.attributes,index:m.index}),endpoints:[edge.points[0],edge.points.at(-1)]});
      }return {meshes:result,controllers:__serienProfile.network.controllers,statistics:__serienProfile.network.metadata.statistics};}''')
    assert geometry == expected, 'Rail/bed/controller geometry differs from S0'
    print('PASS: 150 rail meshes + 75 beds exactly match S0 fingerprints', flush=True)
    page.evaluate('''()=>{
      const api=__serienDiagnostics;
      window.__s1Setup=(id,on)=>{api.setSwitches(on?[id]:[]);['T12','T0','T16'].forEach((e,i)=>api.placeTrain(i,e,150));api.step(0);};
      window.__s1State=()=>{const s=api.snapshot();return {states:s.switchIndicators.states.map(c=>[c.id,c.on]),stock:s.stock.map(t=>({journey:t.journey,speed:t.speed,velocity:t.velocity,dir:t.dir,odometer:t.odometer})),occupied:api.railwayState().occupied};};
      window.__s1Marker=id=>{const p=__serienProfile,c=api.indicatorState().states.find(c=>c.id===id),[x,,z]=c.position;
        p.controls.enableDamping=false;p.controls.target.set(x,14,z);p.camera.position.set(x+100,274,z+150);p.controls.update();p.camera.updateMatrixWorld();
        p.effects.render(false);p.renderer.getContext().finish();
        const v=p.camera.position.clone().set(x,14,z).project(p.camera),r=p.renderer.domElement.getBoundingClientRect();
        return {x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height};};
    }''')
    controls = page.evaluate('__serienDiagnostics.indicatorState().states.map(c=>c.id)')
    cases = []
    for index, control in enumerate(controls):
        for on in [False, True]:
            page.evaluate('([id,on])=>__s1Setup(id,on)', [control,on])
            button = page.locator(f'[data-switch="{index}"]')
            assert not button.is_disabled(), control
            button.click()
            panel = page.evaluate('__s1State()')
            page.evaluate('([id,on])=>__s1Setup(id,on)', [control,on])
            target = page.evaluate('id=>__s1Marker(id)', control)
            page.mouse.click(target['x'],target['y'])
            device = page.evaluate('__s1State()')
            assert device == panel, (control,on,'different panel/device outcome')
            assert dict(device['states'])[control] is not on, (control,on,'no actual marker toggle')
            view = page.evaluate('id=>__serienDiagnostics.turnoutView(id)', control)
            assert view['state'] is not on and not view['unknown']
            assert len(view['activePaths']) == (2 if control.startswith('WX') else 1)
            cases.append({'id':control,'before':on,'after':not on,'samePanelDeviceState':True,
                          'activePaths':[p['edge'] for p in view['activePaths']]})
            print('PASS: panel / actual marker',control,on,flush=True)
    # Use a bare locomotive: the initial long consist cannot fit on this
    # branch in the false configuration, and diagnostic placement rejects it.
    page.evaluate('''__s1Setup('Y-4',false);document.querySelector('[data-train="0"]').click();
      for(let i=0;i<5;i++)document.getElementById('uncouple').click();
      __serienDiagnostics.placeTrain(0,'TO4:AB',100)''')
    before = page.evaluate('__s1State()')
    assert page.locator('[data-switch="7"]').is_disabled()
    denied = page.evaluate("['panel','device'].map(origin=>__serienDiagnostics.requestToggle('Y-4',origin))")
    assert all(not r['changed'] and r['reason']=='occupied' for r in denied)
    target = page.evaluate("__s1Marker('Y-4')")
    page.mouse.click(target['x'],target['y'])
    assert page.evaluate('__s1State()') == before, 'Occupied marker command changed state'
    invalid = page.evaluate("[NaN,Infinity,-1,null,'__proto__','WX-C'].map(id=>__serienDiagnostics.requestToggle(id,'device').changed)")
    assert not any(invalid) and page.evaluate('__s1State()') == before
    result = {'result':'PASS','cases':cases,'actualPanelAndMarkerPairs':len(cases),
              'occupiedRejectedBothSurfaces':True,'invalidIdsRejected':True,
              'geometryIdenticalToS0':True,'railMeshes':150,'trackBeds':75,
              'errors':errors,'failedRequests':failed,'browser':browser.version,
              'note':'Temporary observer, actual DOM and marker clicks; physical touch/GPU not certified'}
    assert not errors and not failed, result
    (out/'contract.json').write_text(json.dumps(result,indent=2)+'\n')
    browser.close()
