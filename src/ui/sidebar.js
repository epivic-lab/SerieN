import {MAP_VIEWBOX, railwayMapPath, locomotivePoint} from '../train-deck-state.js';

// U4 owns DOM presentation only. Original switch/daylight/mission handlers remain attached.
export function mountSidebar({host, network, controlOrder, getSwitches, getTrains, getSelected, onFocus}) {
  const find = id => document.getElementById(id);
  const create = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const setText = (node, text) => { if (node.textContent !== text) node.textContent = text; };
  const setAttribute = (node, name, value) => {
    if (node.getAttribute(name) !== String(value)) node.setAttribute(name, String(value));
  };
  const disposers = [];
  let disposed = false;
  const on = (node, event, listener) => {
    node.addEventListener(event, listener);
    disposers.push(() => node.removeEventListener(event, listener));
  };
  const panels = [];
  function panel(className, nodes) {
    const plate = create('section', 'm '+className);
    const surface = create('div', 'mi');
    surface.append(...nodes);
    plate.append(surface);
    panels.push(plate);
    return plate;
  }
  const headers = [...host.querySelectorAll(':scope > .sectionHeader')];
  const list = find('switchList');
  const switches = getSwitches();
  const tiles = controlOrder.map(id => {
    const index = switches.findIndex(s => s.id === id);
    const button = list.querySelector(`[data-switch="${index}"]`);
    if (!button) throw new Error('Missing canonical switch tile: '+id);
    const cell = button.closest('.switchCell');
    cell.dataset.switchId = id;
    button.dataset.switchId = id;
    button.dataset.ctrl = 'CTRL-012';
    const position = create('span', 'u4-switch-position');
    const straight=create('span','u4-route-straight','Straight'),diverging=create('span','u4-route-diverging','Diverging'),positionText=create('span','sr-only');
    straight.setAttribute('aria-hidden','true');diverging.setAttribute('aria-hidden','true');position.append(straight,diverging,positionText);
    const lamp = create('i', 'lp');lamp.setAttribute('aria-hidden','true');button.prepend(lamp);
    button.append(position);
    const reason = create('p', 'u4-switch-reason');
    reason.id = 'switchReason-'+id;
    reason.hidden = true;
    button.setAttribute('aria-describedby', reason.id);
    cell.setAttribute('aria-describedby', reason.id);
    cell.append(reason);
    return {id, button, cell, position, positionText, straight, diverging, reason};
  });
  const switchNote = host.querySelector(':scope > .note');
  switchNote.classList.add('sr-only');
  const infrastructure = panel('m-sw', [headers[0], list, switchNote]);
  const day = find('day');
  day.dataset.ctrl = 'CTRL-013';
  const environmentValue = create('output', 'u4-day-value');
  environmentValue.id = 'dayValue';
  environmentValue.setAttribute('for', 'day');
  headers[1].querySelector('h2').textContent='Environment';
  const modes=create('div','sg environment-modes');modes.setAttribute('role','group');modes.setAttribute('aria-label','Daylight presets');
  for(const [label,value] of [['Day',0],['Sunset',48],['Night',100]]){const b=create('button','',label);b.type='button';b.dataset.day=value;on(b,'click',()=>{day.value=String(value);day.dispatchEvent(new Event('input',{bubbles:true}));});modes.append(b);}
  const environment = panel('m-env', [headers[1], day, environmentValue, modes]);
  const rollingLabel=host.querySelector('.rollingLabel');rollingLabel?.remove();
  const nextMission = find('nextMission');
  const instructions=create('details','mission-instructions');instructions.append(create('summary','','Mission instructions'),find('missionText'));
  find('dlg').querySelector('.u2-settings').append(instructions);
  const missions = panel('m-ms', [headers[2], find('missionName'),
    find('missionStatus'), nextMission]);
  nextMission.classList.add('bt');
  nextMission.dataset.ctrl = 'CTRL-015';
  const mapHead = create('div', 'sectionHeader');
  const mapTitle = create('h2', '', 'Railway map');
  const mapCount = create('span', 'pill');
  mapCount.id = 'sidebarTrainCount';
  mapHead.append(mapTitle, mapCount);
  const mapFrame = create('div', 'mapw');
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.id = 'sidebarRailwayMap';
  svg.setAttribute('viewBox', MAP_VIEWBOX);
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', 'Canonical railway map; focus a real train');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', railwayMapPath(network));
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', '#695337');
  path.setAttribute('stroke-width', '5');
  svg.append(path);
  mapFrame.append(svg);
  const legend = create('div', 'u4-map-trains');
  legend.setAttribute('role', 'group');
  legend.setAttribute('aria-label', 'Focus a train on the layout');
  mapFrame.append(legend);
  const map = panel('m-lg', [mapHead, mapFrame]);
  const markers = new Map();
  function focus(event) {
    const target = event.target.closest('[data-map-train]');
    if (!target) return;
    const id = Number(target.dataset.mapTrain);
    if (getTrains().some(train => train.id === id && locomotivePoint(train))) onFocus(id);
  }
  on(svg, 'click', focus);
  on(svg, 'keydown', event => {
    if (event.target.matches('[data-map-train]') && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation(); // Space on a marker must not stop the selected train.
      focus(event);
    }
  });
  on(legend, 'click', focus);
  on(day, 'input', updateEnvironment);
  function updateEnvironment() {
    const glyph = find('sun').textContent;
    const label = {'☀':'Day', '◐':'Sunset', '☾':'Night'}[glyph] ?? '';
    setText(environmentValue, `${day.value}% · ${label}`);
    // Original material lighting is a projection of the real daylight input;
    // CSS never writes the simulator's state or substitutes for its lighting.
    const frame=host.closest('.app');
    frame.style.setProperty('--n',String(Math.max(0,Math.min(1,(Number(day.value)-35)/65))));
    frame.classList.toggle('nt',Number(day.value)>=72);
    for(const b of modes.children){b.classList.toggle('on',b.textContent===label);setAttribute(b,'aria-pressed',b.textContent===label);}
  }
  host.classList.add('u2-region', 'u4-region', 'side');
  host.replaceChildren(environment, infrastructure, map, missions);
  // Initialize only after the original #sun node is reconnected to the document.
  day.dispatchEvent(new Event('input'));
  function update() {
    if (disposed) return;
    const states = getSwitches();
    for (const tile of tiles) {
      const state = states.find(s => s.id === tile.id)?.on;
      setText(tile.positionText, state === true ? 'Diverging' : state === false ? 'Straight' : 'Unknown');
      tile.straight.classList.toggle('on',state===false);tile.diverging.classList.toggle('on',state===true);
      setAttribute(tile.button,'aria-pressed',state===true);
      // The original HUD binding owns disabled/title; this is its visible, exact reason.
      const blocked = tile.button.disabled;
      tile.cell.classList.toggle('is-blocked',blocked);
      tile.reason.hidden = !blocked;
      setText(tile.reason, blocked ? tile.button.title : '');
    }
    updateEnvironment();
    const trains = getTrains();
    const ids = new Set(trains.map(train => train.id));
    for (const [id, entry] of markers) if (!ids.has(id)) {
      entry.marker.remove(); entry.button.remove(); markers.delete(id);
    }
    for (const train of trains) {
      let entry = markers.get(train.id);
      if (!entry) {
        const marker = document.createElementNS(ns, 'circle');
        marker.dataset.mapTrain = train.id;
        marker.dataset.ctrl = 'CTRL-053';
        marker.setAttribute('r', '20');
        marker.setAttribute('role', 'button');
        marker.setAttribute('tabindex', '0');
        const button = create('button', 'bt d');
        button.type = 'button'; button.dataset.mapTrain = train.id; button.dataset.ctrl = 'CTRL-053';
        svg.append(marker); legend.append(button);
        entry = {marker, button}; markers.set(train.id, entry);
      }
      const point = locomotivePoint(train);
      entry.marker.style.display = point ? '' : 'none';
      entry.button.disabled = !point;
      const selected = train.id === getSelected();
      setText(entry.button, train.name);
      for (const node of [entry.marker, entry.button]) {
        setAttribute(node, 'aria-label', 'Focus '+train.name);
        setAttribute(node, 'aria-pressed', selected);
      }
      if (point) {
        setAttribute(entry.marker, 'cx', point.x);
        setAttribute(entry.marker, 'cy', point.z);
      }
    }
    setText(mapCount, `${trains.length} trains`);
  }
  update();
  return {update, dispose() {
    if (disposed) return;
    disposed = true;
    disposers.splice(0).forEach(dispose => dispose());
    panels.forEach(plate => plate.remove());
    markers.clear();
  }};
}
