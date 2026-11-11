"""M2 functional UI on the real minified bundle. Local auth fixture, on-demand
SwiftShader rendering; continuous native RAF is covered by the separate gate.
No cloud writes or changes to production auth. Outputs selectable by M2_OUTPUT.
"""
import hashlib
import json
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

out=Path(os.environ.get('M2_OUTPUT','work/m2-browser'));out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')
manifest=json.loads(Path('assets/rolling-stock-sides/manifest.json').read_text())
result={'result':'IN PROGRESS','bundleSHA256':hashlib.sha256(Path('dist/game.js').read_bytes()).hexdigest(),'profile':'minified; local auth fixture; on-demand render','checks':{},'pageErrors':[],'failedRequests':[],'httpFailures':[]}
def save(): (out/'browser.json').write_text(json.dumps(result,indent=2)+'\n')
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':1000},has_touch=True)
    page.set_default_timeout(30000)
    page.on('pageerror',lambda e:result['pageErrors'].append(str(e)))
    page.on('requestfailed',lambda r:result['failedRequests'].append({'url':r.url,'error':r.failure}))
    page.on('response',lambda r:result['httpFailures'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
    page.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
    page.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__m2Frame=cb;return 1;}return raf(cb);};")
    def action(name):return page.locator('[data-project-action="'+name+'"]')
    def state():return page.evaluate('({railway:__serienDiagnostics.railwayState(),stock:__serienDiagnostics.snapshot().stock})')
    def rows():return page.locator('[data-planned-vehicle]').evaluate_all('(rows)=>rows.map(r=>r.dataset.plannedVehicle)')
    def add(model):page.get_by_label('Catalog model',exact=True).select_option(model);action('add').click()
    def check(name):result['checks'][name]='PASS';save()
    def answer(accept):page.once('dialog',lambda d:d.accept() if accept else d.dismiss())
    try:
        page.goto(base+'?diagnostics=1',wait_until='domcontentloaded')
        page.wait_for_function('window.__serienDiagnostics!==undefined && window.__m2Frame!==undefined',timeout=90000)
        page.evaluate("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));document.getElementById('pause').click()")
        page.wait_for_function("document.querySelectorAll('.locomotiveThumbnail').length===3 && [...document.querySelectorAll('.locomotiveThumbnail')].every(i=>i.complete)")
        page.evaluate('__m2Frame(performance.now())')
        page.locator('#trainManagement').click();page.locator('[data-view="projects"]').click()
        initial=state();action('new').click();assert action('confirm').is_disabled()
        page.get_by_label('Project name',exact=True).fill('Regional project')
        add('native-steam');add('native-tank');add('native-tank');ids=rows();assert len(ids)==3 and len(set(ids))==3
        action('up-'+ids[2]).click();assert rows()==[ids[0],ids[2],ids[1]]
        action('flip-'+ids[1]).click();assert page.locator('[data-side-vehicle="'+ids[1]+'"]').get_attribute('data-orientation')=='model-reversed'
        assert 'scale(-1 1)' in page.locator('[data-side-vehicle="'+ids[1]+'"]').get_attribute('transform')
        action('remove-'+ids[1]).click();assert rows()==[ids[0],ids[2]]
        add('native-tank');add('native-coach');add('native-flat');add('native-open')
        assert len(rows())==6 and action('add').is_disabled()
        keys=page.locator('.sideStage image').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.sideKey)')
        expected=sum(manifest[k]['couplers']['front']['x']-manifest[k]['couplers']['back']['x'] for k in keys)
        assert abs(float(re.search(r'([0-9.]+) mm',page.locator('.sideSummary').inner_text())[1])-expected)<=.051
        assert '6 vehicles' in page.locator('.sideSummary').inner_text()
        page.locator('[data-zoom="in"]').click();page.locator('.sideViewport').evaluate('(v)=>{v.scrollLeft=v.scrollWidth;}')
        assert page.locator('.sideViewport').evaluate('(v)=>v.scrollLeft>0 && v.scrollWidth>v.clientWidth')
        page.locator('[data-fit]').click();assert page.locator('.sideViewport').evaluate('(v)=>v.scrollLeft===0 && v.scrollWidth<=v.clientWidth+1')
        page.locator('.projectEditor').scroll_into_view_if_needed();page.screenshot(path=str(out/'six-vehicle-project.png'))
        check('createAddRemoveReorderOrientationDuplicateModelsLimitPreviewZoomFit')
        # Keep the draft across navigation; rejecting close and Escape must preserve it.
        page.locator('[data-view="catalog"]').click();assert page.locator('.managementModel').count()==14
        page.locator('[data-view="projects"]').click();assert len(rows())==6
        answer(False);page.locator('dialog [data-close]').click();assert page.locator('dialog').evaluate('(d)=>d.open')
        answer(False);page.keyboard.press('Escape');assert len(rows())==6
        answer(False);action('new').click();assert page.get_by_label('Project name',exact=True).input_value()=='Regional project'
        page.locator('[data-view="layout"]').click();answer(False);page.get_by_role('button',name='Focus in 3D').click();assert page.locator('dialog').evaluate('(d)=>d.open')
        page.locator('[data-view="projects"]').click();assert len(rows())==6
        check('unsavedCloseEscapeNavigationReplacementGuards')
        assert state()==initial,'draft changes must not affect any railway state'
        action('confirm').click();assert page.locator('.projectList [data-project-id]').count()==1;assert state()==initial
        assert page.get_by_role('button',name='Edit project',exact=True).is_visible()
        check('confirmIndependentProjectWithoutRailwayEffects')
        page.get_by_role('button',name='Edit project',exact=True).click();page.get_by_label('Project name',exact=True).fill('Cancelled rename')
        action('flip-'+rows()[0]).click();answer(True);action('cancel').click()
        assert page.locator('.projectList [data-project-id]').inner_text()=='Regional project';assert state()==initial
        check('cancelRestoresConfirmedProject')
        page.get_by_role('button',name='Edit project',exact=True).click();page.get_by_label('Project name',exact=True).fill('<img src=x onerror=alert(1)>')
        action('confirm').click();assert page.locator('.projectList img').count()==0
        assert page.locator('.projectList [data-project-id]').inner_text()=='<img src=x onerror=alert(1)>'
        page.get_by_role('button',name='Edit project',exact=True).click();page.get_by_label('Project name',exact=True).fill('Regional project');action('confirm').click();check('projectNamesRemainPlainText')
        page.locator('[data-view="layout"]').click();page.locator('[data-composition="0"]').click();page.locator('[data-copy-train="0"]').click()
        assert page.locator('[data-comparison="matching"]').count()==1
        copied=rows();assert len(copied)==len(initial['railway']['identities']['trains'][0]);assert not set(copied)&set(initial['railway']['identities']['trains'][0])
        action('flip-'+copied[0]).click();assert page.locator('[data-comparison="different"]').count()==1
        action('flip-'+copied[0]).click();action('confirm').click();assert page.locator('.projectList [data-project-id]').count()==2
        assert state()==initial;check('copyRealTrainComparePlannedOrientationAndIndependentIdentities')
        # Actual external R1 commands, while the comparison stays open.
        page.evaluate("document.getElementById('uncouple').click();window.__m2Frame(performance.now())")
        assert page.locator('[data-comparison="changed"]').count()==1
        assert len(page.evaluate('__serienDiagnostics.railwayState().identities.detached'))==1
        page.screenshot(path=str(out/'external-change.png'));check('externalUncoupleChangesComparisonAndLeavesVehicleOnTrack')
        page.evaluate("document.getElementById('couple').click();window.__m2Frame(performance.now())")
        assert page.locator('[data-comparison="matching"]').count()==1
        assert state()['railway']==initial['railway'];check('actualRecouplingRestoresPhysicalIdentityAndComparison')
        # Selection via console, management and scene must remain shared.
        page.locator('[data-view="layout"]').click();page.locator('[data-composition="2"]').click()
        assert page.evaluate('__serienDiagnostics.snapshot().consoles.active')==2
        assert page.locator('.trainConsole.is-active').get_attribute('data-console-train')=='2'
        assert page.locator('.sideStage image').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.sideVehicle)')==page.evaluate('__serienDiagnostics.railwayState().identities.trains[2]')
        check('M1ConsoleSceneSelectionIdentitySynchronization')
        page.locator('[data-view="projects"]').click();page.get_by_role('button',name='Edit project',exact=True).click()
        for width,height,label in [(1440,1000,'desktop'),(1024,768,'tablet-landscape'),(768,1024,'tablet-portrait')]:
            page.set_viewport_size({'width':width,'height':height})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            assert page.locator('dialog').evaluate('(d)=>d.scrollWidth<=d.clientWidth')
            action('flip-'+rows()[0]).tap();action('flip-'+rows()[0]).tap()
            page.locator('[data-zoom="in"]').tap();page.locator('[data-fit]').tap()
            assert page.locator('.projectEditor button').evaluate_all('(nodes)=>nodes.every(n=>n.getBoundingClientRect().height>=44)')
            page.locator('.projectEditor').scroll_into_view_if_needed();page.screenshot(path=str(out/(label+'.png')))
        check('desktopTabletTouchOrientationFitAndNoOverflow')
        # Ensure reset invalidates even references to the reused locomotive group.
        answer(True);page.evaluate("document.getElementById('reset').click();window.__m2Frame(performance.now())")
        assert page.locator('[data-comparison="stale"]').count()==1
        assert page.locator('[data-planned-vehicle]').count()==len(copied)
        page.screenshot(path=str(out/'reset-stale.png'));check('resetInvalidatesReferencesPreservingIndependentDraft')
        # Whole-project mutations are never offered in the editor.
        assert page.locator('.managementProjects [data-command]').count()==0
        assert 'unsupported' in page.locator('.projectComparison').inner_text()
        check('noWholeCompositionApplyOrDirectRailwayCommands')
        action('cancel').click();action('new').tap();page.get_by_label('Project name',exact=True).fill('Tablet Kenney project')
        page.get_by_label('Catalog model',exact=True).select_option('kenney-diesel');action('add').tap()
        page.get_by_label('Catalog model',exact=True).select_option('kenney-box');action('add').tap();action('confirm').tap()
        assert page.locator('.projectList [data-project-id]').count()==3
        check('tabletTouchCreateAddConfirmKenneyProject')
        page.locator('dialog [data-close]').click()
        assert page.locator('#trainManagement').evaluate('(b)=>document.activeElement===b')
        assert not result['pageErrors'] and not result['failedRequests'] and not result['httpFailures'],result
        result['result']='PASS';save();print(json.dumps(result))
    except Exception:
        result['result']='FAIL';save();page.screenshot(path=str(out/'failure.png'));raise
    finally:
        browser.close()
