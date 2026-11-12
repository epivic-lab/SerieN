// U3 presentation only. Existing camera nodes, HUD projections, log and Bell own their behavior.
export function mountViewportOverlays({host, guardedStops, getCameraPreset}) {
  const find = id => document.getElementById(id);
  const disposers = [];
  let disposed = false;
  const on = (node, type, listener, options) => {
    node.addEventListener(type, listener, options);
    disposers.push(() => node.removeEventListener(type, listener, options));
  };
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const region = node => node.classList.add('u2-region', 'u3-region', 'm');
  const layer = element('div', 'u3-overlays');
  host.append(layer);
  const canvas = host.querySelector('canvas');
  if (canvas) host.prepend(canvas);

  const camera = host.querySelector('.cameraToolbar');
  region(camera);
  camera.id = 'cam';
  const controls = find('viewControls');
  controls.classList.add('mi');
  const primary = element('div', 'u3-camera-primary');
  const tools = element('div', 'u3-camera-tools');
  tools.id = 'u3CameraTools';
  tools.hidden = true;
  const toggle = element('button', 'bt d', 'View ▴');
  toggle.type = 'button';
  toggle.id = 'camt';
  toggle.setAttribute('aria-controls', tools.id);
  toggle.setAttribute('aria-expanded', 'false');
  const free = element('span', 'u3-camera-state');
  on(toggle, 'click', () => {
    if (!tools.hidden) closeTools();
    else {
      tools.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      coordinateTools();
    }
  });
  on(window, 'resize', coordinateTools);
  on(window, 'orientationchange', coordinateTools);
  on(layer, 'keydown', event => {
    if (event.key === 'Escape' && !tools.hidden) {
      event.stopPropagation();
      closeTools();
      toggle.focus();
    }
  });
  on(canvas, 'pointerdown', closeTools);
  for (const [id,icon,label] of [['viewZoomIn','zp','Zoom'],['viewZoomOut','zm','Zoom'],['viewHome','home','Recenter']]) {
    const control=find(id);control.innerHTML=`<svg class="ic" aria-hidden="true"><use href="./ui/assets/svg/serien-sprite.svg#i-${icon}"/></svg><small>${label}</small>`;primary.append(control);
  }
  primary.append(toggle, free);
  const select = find('cameraView');
  select.dataset.ctrl = 'CTRL-008';
  select.setAttribute('aria-label', 'Camera preset');
  const label = camera.querySelector('label');
  label.textContent = 'Camera preset';
  label.append(select);
  tools.append(label);
  const presets = element('div', 'u3-presets');
  presets.setAttribute('role', 'group');
  presets.setAttribute('aria-label', 'Camera presets');
  for (const value of ['overview', 'station', 'yard', 'follow']) {
    const option = select.querySelector(`option[value="${value}"]`);
    const button = element('button', 'bt d', option.textContent);
    button.type = 'button';
    button.dataset.preset = value;
    button.dataset.ctrl = 'CTRL-008';
    on(button, 'click', () => {
      select.value = value;
      select.dispatchEvent(new Event('change'));
      update();
    });
    presets.append(button);
  }
  tools.append(presets);
  const actions = element('div', 'u3-camera-actions');
  for (const id of ['viewPan', 'viewOrbit', 'viewFollow', 'routePreview']) actions.append(find(id));
  tools.append(actions);
  controls.replaceChildren(primary, tools);
  camera.replaceChildren(controls);
  camera.querySelectorAll('button').forEach(button => button.classList.add('bt', 'd'));
  for (const [id, ctrl] of Object.entries({viewZoomIn:'009', viewZoomOut:'009', viewPan:'010', viewOrbit:'010', viewHome:'011', viewFollow:'011', routePreview:'007'})) find(id).dataset.ctrl = `CTRL-${ctrl}`;
  layer.append(camera);

  const hud = find('nextSwitchHUD');
  region(hud);
  hud.dataset.ctrl = 'CTRL-052';
  const hudSurface = element('div', 'mi');
  while (hud.firstChild) hudSurface.append(hud.firstChild);
  hud.append(hudSurface);
  hud.querySelector('button').classList.add('bt', 'd');
  // Match the reference's compact initial HUD through its existing view action.
  // Warning text remains in the original HUD and guarded-stop status surfaces.
  if (!hud.classList.contains('has-warning') && !hud.classList.contains('is-minimized')) hud.querySelector('button').click();
  layer.append(hud);

  // Reuse the actual status and mute nodes; never derive hazards in this adapter.
  const {root: status, mute, text} = guardedStops.ui;
  status.removeAttribute('style');
  text.removeAttribute('style');
  region(status);
  status.id = 'guardedStopStatus';
  text.dataset.ctrl = 'CTRL-047';
  mute.id = 'bellChip';
  mute.dataset.ctrl = 'CTRL-046';
  mute.classList.add('bt', 'd');
  const statusSurface = element('div', 'mi');
  statusSurface.append(mute, text);
  status.replaceChildren(statusSurface);
  layer.append(status);
  const bellMenu = element('button', 'bt d');
  bellMenu.type = 'button';
  bellMenu.id = 'bellSeg';
  bellMenu.dataset.ctrl = 'CTRL-046';
  find('dlg').querySelector('.u2-settings').append(bellMenu);
  on(bellMenu, 'click', () => { mute.click(); update(); });
  on(mute, 'click', update);

  const log = find('log');
  const logPlate = log.closest('.activity');
  region(logPlate);
  logPlate.classList.add('u3-operations');
  log.dataset.ctrl = 'CTRL-062';
  log.setAttribute('role', 'status');
  log.setAttribute('aria-live', 'polite');
  log.setAttribute('aria-atomic', 'true');
  const logSurface = element('details', 'mi');
  const logSummary=element('summary','','Operations log');
  const logPreview=element('span','u3-log-preview');
  logSummary.append(logPreview);logSurface.append(logSummary,log);
  // The complete current engine message stays visible in the compact summary.
  // Opening the disclosure also exposes the original diagnostic node verbatim.
  const updateLog=()=>{logPreview.textContent=log.textContent;};updateLog();
  const logObserver=new MutationObserver(updateLog);logObserver.observe(log,{childList:true,subtree:true,characterData:true});disposers.push(()=>logObserver.disconnect());
  logPlate.replaceChildren();
  logPlate.append(logSurface);
  layer.append(logPlate);

  // Presentation-only ownership: the original HUD button remains its sole
  // state controller. A user HUD action cancels our temporary restoration.
  const narrow = window.matchMedia('(max-width:700px), (max-height:480px)');
  const minimize = hud.querySelector('.nextSwitchMinimize');
  const warning = hud.querySelector('.nextSwitchWarning');
  const warningHome = warning.parentElement;
  let restoreExpanded = false;
  let coordinated = false;
  let hudCommand = false;
  const expanded = () => minimize.getAttribute('aria-expanded') === 'true';
  const setExpanded = value => {
    if (expanded() === value) return;
    hudCommand = true;
    try { minimize.click(); } finally { hudCommand = false; }
  };
  function releaseHUD(restore = true) {
    if (!coordinated) return;
    coordinated = false;
    warningHome.append(warning);
    layer.classList.remove('is-camera-coordinated');
    status.style.removeProperty('top');
    if (restore && restoreExpanded) setExpanded(true);
    restoreExpanded = false;
  }
  function closeTools(restore = true) {
    const returnFocus = tools.contains(document.activeElement);
    tools.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    releaseHUD(restore);
    if (returnFocus) toggle.focus();
  }
  function coordinateTools() {
    if (disposed || tools.hidden) return;
    if (narrow.matches && !coordinated) {
      restoreExpanded = expanded();
      coordinated = true;
      setExpanded(false);
      // Keep the original, engine-updated warning outside the hidden HUD body.
      hudSurface.append(warning);
      layer.classList.add('is-camera-coordinated');
    } else if (!narrow.matches) releaseHUD();
    const top = layer.getBoundingClientRect().top;
    let reserved = 0;
    if (coordinated) {
      status.style.top = `${hud.getBoundingClientRect().bottom - top + 6}px`;
      reserved = status.getBoundingClientRect().bottom - top + 8;
    }
    tools.style.maxHeight = `${Math.max(44, Math.min(280, camera.getBoundingClientRect().top - top - reserved - 8))}px`;
  }
  on(minimize, 'click', () => {
    if (!hudCommand && coordinated) closeTools(false);
  }, true); // Close View before the original target listener expands the HUD.
  const overlaySizes = new ResizeObserver(coordinateTools);
  overlaySizes.observe(hud);
  overlaySizes.observe(status);
  disposers.push(() => overlaySizes.disconnect());

  function update() {
    if (disposed) return;
    const {muted} = guardedStops.bell.snapshot;
    mute.textContent = muted ? 'Bell: muted' : 'Bell: on';
    mute.setAttribute('aria-pressed', String(muted));
    mute.setAttribute('aria-label', muted ? 'Unmute railway warning bell' : 'Mute railway warning bell');
    bellMenu.textContent = muted ? 'Railway warning bell: muted' : 'Railway warning bell: on';
    bellMenu.setAttribute('aria-pressed', String(muted));
    status.classList.toggle('has-warning', !text.hidden);
    const nextName=hud.querySelector('.nextSwitchName').textContent;
    const heading=hud.querySelector('.nextSwitchHead>span:first-child');
    if(heading.textContent!==nextName)heading.textContent=nextName;
    const preset = getCameraPreset();
    free.textContent = preset === 'manual' ? 'Free camera' : select.querySelector(`option[value="${preset}"]`)?.textContent ?? '';
    for (const button of presets.children) button.setAttribute('aria-pressed', String(button.dataset.preset === preset));
  }
  update();
  return {update, dispose() {
    if (disposed) return;
    disposed = true;
    closeTools();
    disposers.splice(0).forEach(dispose => dispose());
    bellMenu.remove();
    layer.remove();
  }};
}
