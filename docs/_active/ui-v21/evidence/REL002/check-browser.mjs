// Run from the repository root. Playwright is an isolated verification tool only.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {readFile, writeFile, stat} from 'node:fs/promises';
import {dirname, extname, resolve, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const evidence = dirname(fileURLToPath(import.meta.url));
const root = resolve(evidence, '../../../../..');
const site = resolve(root, '_site');
const {chromium} = await import(pathToFileURL(process.env.REL002_PLAYWRIGHT ||
  '/opt/codex/cua_node/lib/node_modules/playwright/index.mjs'));
const audit = JSON.parse(await readFile(resolve(evidence, 'package-audit.json')));
const origin = 'http://127.0.0.1:8765';
const mime = {'.html':'text/html', '.css':'text/css', '.js':'text/javascript',
  '.svg':'image/svg+xml', '.woff2':'font/woff2', '.jpg':'image/jpeg',
  '.png':'image/png', '.json':'application/json', '.txt':'text/plain', '.xml':'application/xml', '.pdf':'application/pdf'};
const served = [], responses = [], failed = [], external = [], pageErrors = [], consoleErrors = [];
const server = createServer(async (req, res) => {
  const url = new URL(req.url, origin);
  let status = 200;
  try {
    assert(url.pathname.startsWith('/SerieN/'));
    const relative = decodeURIComponent(url.pathname.slice('/SerieN/'.length)) || 'index.html';
    const file = resolve(site, relative);
    assert(file.startsWith(site + sep));
    assert((await stat(file)).isFile());
    const bytes = await readFile(file);
    res.writeHead(200, {'Content-Type': mime[extname(file)] || 'application/octet-stream',
      'Cache-Control':'no-store'});
    res.end(bytes);
  } catch {
    status = 404;
    res.writeHead(status); res.end('Not in prepared Pages package');
  }
  served.push({path:url.pathname, status});
});
await new Promise(resolve => server.listen(8765, '127.0.0.1', resolve));
let browser;
let result = {status:'FAIL', base:'/SerieN/', serverRoot:'_site only; no source fallback',
  oauth:'NOT VERIFIED; Auth module replaced only in browser fixture',
  served, responses, failed, external, pageErrors, consoleErrors};
try {
  const http = [];
  for (const path of [...new Set([...audit.httpTargets, ...JSON.parse(await readFile(resolve(evidence, 'whitelist.json'))).map(x => x.path)])]) {
    const response = await fetch(origin + '/SerieN/' + path);
    const data = Buffer.from(await response.arrayBuffer());
    const local = await readFile(resolve(site, path));
    assert.equal(response.status, 200, path);
    assert(data.equals(local), path);
    http.push({path:'/SerieN/' + path, status:response.status, bytes:data.length,
      sha256:createHash('sha256').update(data).digest('hex')});
  }
  await writeFile(resolve(evidence, 'http-assets.json'), JSON.stringify(http, null, 2) + '\n');
  browser = await chromium.launch({executablePath:'/usr/bin/chromium', headless:true,
    args:['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader']});
  const context = await browser.newContext({viewport:{width:1440,height:900}, serviceWorkers:'block'});
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    external.push(route.request().url()); return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);
  // No Auth/Supabase file is edited. All original HTML, CSS, bundle and assets
  // come from _site. This synthetic bootstrap is deliberately not an OAuth test.
  await page.route(origin + '/SerieN/auth-gate.js?v=1', route => route.fulfill({
    contentType:'text/javascript', body:`
      document.body.classList.remove('auth-locked');
      document.getElementById('authGate').hidden = true;
      document.getElementById('signOut').hidden = false;
      await import('./dist/game.js?v=0.12.0');
      window.__REL002_READY__ = true;
    `}));
  page.on('response', r => responses.push({url:r.url(),status:r.status()}));
  page.on('requestfailed', r => failed.push({url:r.url(),error:r.failure()?.errorText}));
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await page.goto(origin + '/SerieN/', {waitUntil:'load', timeout:120000});
  await page.waitForFunction(() => window.__REL002_READY__ === true, null, {timeout:120000});
  await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('700 20px "Cinzel Decorative"'),
      document.fonts.load('400 20px Federo'),
      document.fonts.load('400 20px "Cutive Mono"')]);
    await document.fonts.ready;
  });
  const inspect = () => page.evaluate(() => {
    const plaque = document.querySelector('.edp');
    const text = plaque.querySelector('span');
    const style = getComputedStyle(text), material = getComputedStyle(plaque);
    return {
      documentBase:document.baseURI,
      stylesheets:[...document.styleSheets].map(s => ({href:s.href,rules:s.cssRules.length})),
      fonts:[...document.fonts].map(f => ({family:f.family,weight:f.weight,status:f.status})),
      plaque:{text:text.textContent,fontFamily:style.fontFamily,fontWeight:style.fontWeight,
        fontSize:style.fontSize,color:style.color,height:material.height,
        backgroundImage:material.backgroundImage,textShadow:style.textShadow,
        visible:plaque.getBoundingClientRect().height > 0,
        textFits:text.scrollWidth <= text.clientWidth + 1,
        sprite:plaque.querySelector('use').getAttribute('href')},
      canvasCount:document.querySelectorAll('canvas').length,
      trainCards:document.querySelectorAll('#trainDeck .trainConsole').length,
      webgl:!!document.querySelector('canvas')?.getContext('webgl2')
    };
  });
  result.desktop = await inspect();
  assert.equal(result.desktop.stylesheets.filter(s => s.href?.includes('/ui/css/')).length, 5);
  assert(result.desktop.stylesheets.every(s => s.rules > 0));
  assert(result.desktop.fonts.length === 3 && result.desktop.fonts.every(f => f.status === 'loaded'));
  assert(result.desktop.plaque.fontFamily.includes('Federo'));
  assert(result.desktop.plaque.backgroundImage.includes('/SerieN/ui/assets/textures/brass-brushed.jpg'));
  assert(result.desktop.plaque.visible && result.desktop.plaque.textFits);
  const cdp = await context.newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const {root:doc} = await cdp.send('DOM.getDocument');
  const {nodeId} = await cdp.send('DOM.querySelector', {nodeId:doc.nodeId,selector:'.edp span'});
  result.plaquePlatformFonts = await cdp.send('CSS.getPlatformFontsForNode', {nodeId});
  assert(result.plaquePlatformFonts.fonts.some(f => f.familyName === 'Federo' && f.isCustomFont && f.glyphCount > 0));
  // Clip the actual rendered header directly. Element screenshot stabilization
  // can time out while the unchanged simulator renders on software WebGL.
  await page.screenshot({clip:await page.locator('.top').boundingBox(),
    path:resolve(evidence, 'autumn-railways-desktop.png'), timeout:120000});
  await page.setViewportSize({width:390,height:844});
  result.mobile = await inspect();
  assert(result.mobile.plaque.visible && result.mobile.plaque.textFits);
  await page.screenshot({clip:await page.locator('.top').boundingBox(),
    path:resolve(evidence, 'autumn-railways-mobile.png'), timeout:120000});
  result.navigation = [];
  for (const viewport of [{width:1440,height:900},{width:390,height:844}]) {
    await page.setViewportSize(viewport);
    assert.equal(await page.locator('#trainDeck .trainConsole').count(), 3);
    await page.screenshot({path:resolve(evidence, `shell-${viewport.width}.png`), timeout:120000});
    const menu = viewport.width === 390 ? page.locator('.u2-mobile').getByRole('button', {name:'Menu',exact:true}) : page.locator('.top').getByRole('button', {name:'Menu',exact:true});
    await menu.click(); assert(await page.locator('#dlg').evaluate(e=>e.open));
    await page.locator('#dlg').getByRole('button',{name:'Close',exact:true}).click();
    if(viewport.width===390) await page.locator('.u2-mobile').getByRole('button',{name:'Track plan',exact:true}).click();
    else await page.locator('#planBtn').click();
    const popupPromise = page.waitForEvent('popup');
    await page.locator('#planModal a.scenicMapLink').click();
    const doc = await popupPromise;
    doc.on('pageerror',e=>pageErrors.push(String(e)));
    doc.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
    await doc.waitForLoadState('load');
    await doc.waitForFunction(()=>document.querySelectorAll('#terminals tr').length===4);
    assert(await doc.locator('#plan').evaluate(e=>!!e.contentDocument?.querySelector('svg')));
    const links=await doc.locator('a[href]').evaluateAll(es=>es.map(e=>e.href));
    for(const url of links){const response=await fetch(url);assert.equal(response.status,200,url);}
    result.navigation.push({viewport,menu:'PASS',trainCards:3,publicPage:doc.url(),terminalRows:4,svgLoaded:true,links});
    await doc.screenshot({path:resolve(evidence, `public-doc-${viewport.width}.png`), timeout:120000});
    await doc.close();await page.locator('#planModal [data-close]').click();
  }
  assert(result.desktop.webgl && result.mobile.webgl);
  for (const font of ['CinzelDecorative-700','Federo-400','CutiveMono-400']) {
    assert(responses.some(r => r.url.endsWith('/ui/fonts/' + font + '.woff2') && r.status === 200));
  }
  assert(responses.some(r => r.url.endsWith('/ui/assets/textures/brass-brushed.jpg') && r.status === 200));
  assert(responses.some(r => r.url.endsWith('/ui/assets/svg/serien-sprite.svg') && r.status === 200));
  assert.equal(external.length, 0);
  assert.equal(failed.length, 0);
  assert.equal(pageErrors.length, 0);
  assert.equal(consoleErrors.length, 0);
  assert(responses.every(r => r.status === 200));
  assert(served.every(r => r.status === 200));
  // Expected negative probes use Node HTTP, separate from runtime browser errors.
  result.excludedHttp=[];
  for(const item of JSON.parse(await readFile(resolve(evidence,'excluded-files.json')))){
    const response=await fetch(origin+'/SerieN/'+item.path);assert.equal(response.status,404,item.path);
    result.excludedHttp.push({path:item.path,status:response.status});
  }
  assert.equal((await fetch(origin+'/app.js')).status,404);
  result.status = 'PASS';
  result.httpAssetsVerified = http.length;
  result.browserVersion = browser.version();
  console.log('PASS package HTTP, CSS, three decoded local fonts, brass texture, SVG and real compiled header');
} catch (error) {
  result.failure = String(error.stack || error);
  process.exitCode = 1;
  console.error(result.failure);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
  await writeFile(resolve(evidence, 'browser-results.json'), JSON.stringify(result, null, 2) + '\n');
}
