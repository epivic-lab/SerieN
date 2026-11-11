// U3 presentation only. Existing camera nodes, HUD projections, log and Bell own their behavior.
export function mountViewportOverlays({host, guardedStops, getCameraPreset}) {
  const find = id => document.getElementById(id);
  const disposers = [];
  let disposed = false;
  const on = (node, type, listener) => {
    node.addEventListener(type, listener);
    disposers.push(() => node.removeEventListener(type, listener));
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
  const closeTools = () => {
    tools.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  };
  on(toggle, 'click', () => {
    tools.hidden = !tools.hidden;
    toggle.setAttribute('aria-expanded', String(!tools.hidden));
  });
  on(camera, 'keydown', event => {
    if (event.key === 'Escape' && !tools.hidden) {
      event.stopPropagation();
      closeTools();
      toggle.focus();
    }
  });
  on(canvas, 'pointerdown', closeTools);
  for (const id of ['viewZoomIn', 'viewZoomOut', 'viewHome']) primary.append(find(id));
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
  const logSurface = element('div', 'mi');
  while (logPlate.firstChild) logSurface.append(logPlate.firstChild);
  logPlate.append(logSurface);
  layer.append(logPlate);

  function update() {
    if (disposed) return;
    const {muted} = guardedStops.bell.snapshot;
    mute.textContent = muted ? 'Bell: muted' : 'Bell: on';
    mute.setAttribute('aria-pressed', String(muted));
    mute.setAttribute('aria-label', muted ? 'Unmute railway warning bell' : 'Mute railway warning bell');
    bellMenu.textContent = muted ? 'Railway warning bell: muted' : 'Railway warning bell: on';
    bellMenu.setAttribute('aria-pressed', String(muted));
    status.classList.toggle('has-warning', !text.hidden);
    const preset = getCameraPreset();
    free.textContent = preset === 'manual' ? 'Free camera' : select.querySelector(`option[value="${preset}"]`)?.textContent ?? '';
    for (const button of presets.children) button.setAttribute('aria-pressed', String(button.dataset.preset === preset));
  }
  update();
  return {update, dispose() {
    if (disposed) return;
    disposed = true;
    disposers.splice(0).forEach(dispose => dispose());
    bellMenu.remove();
    layer.remove();
  }};
}
