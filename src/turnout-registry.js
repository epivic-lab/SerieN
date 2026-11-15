import canonical from './canonical-layout.json' with {type:'json'};
import {createNetwork,validateNetwork} from './network.js';

// Compatibility exports describe the legacy profile only, never an active
// global layout. New domain consumers receive an instance registry explicitly.
export const TURNOUT_IDS = Object.freeze(canonical.controllers.map(c => c.id));
const owners = new WeakMap();
let legacyRegistry;

export function assertTurnoutRegistry(registry, network) {
  if (!owners.has(registry) || network && owners.get(registry) !== network) {
    throw new TypeError('Turnout registry does not belong to the selected network');
  }
  return registry;
}

export function isTurnoutId(id, registry = null) {
  return typeof id === 'string' && (registry === null
    ? TURNOUT_IDS.includes(id) : assertTurnoutRegistry(registry).has(id));
}

export function getLegacyTurnoutRegistry() {
  return legacyRegistry ??= createTurnoutRegistry(createNetwork());
}

/** Configuration validation, not artifact admission or movement clearance.
 * V06 callers must first admit the pinned R1A artifact with validateArtifact.
 * Networks/controllers are read-only for the lifetime of their consumers. */
export function createTurnoutRegistry(network) {
  validateNetwork(network);
  const metadata = network.metadata;
  const legacy = !metadata.schema && metadata.sourceSha256 === canonical.sourceSha256;
  const v06 = metadata.schema === 'serien-v06-operational-1' && metadata.layoutId === 'V06-R1A';
  const fail = () => { throw new TypeError('Invalid or mixed turnout profile'); };
  if (!legacy && !v06 || !Array.isArray(network.controllers) || !network.controllers.length) fail();
  const profileId = legacy ? 'legacy' : metadata.layoutId;
  const byId = new Map(), ownedEdges = new Set();
  const samePorts = (a,b) => a && Object.keys(a).length === Object.keys(b).length &&
    Object.keys(b).every(p => Object.hasOwn(a,p) && a[p] === b[p]);
  const sameInternal = (a,b) => Array.isArray(a) && a.length === b.length && a.every((id,i) => id === b[i]);
  for (const [order,control] of network.controllers.entries()) {
    const {id,kind} = control;
    if (typeof id !== 'string' || !id || byId.has(id) || !['single','cross'].includes(kind)) fail();
    const portNames = kind === 'single' ? ['A','B','C'] : ['UL','UR','LL','LR'];
    if (!control.ports || Object.keys(control.ports).length !== portNames.length ||
        !portNames.every(p => Object.hasOwn(control.ports,p) && Object.hasOwn(network.nodes,control.ports[p])) ||
        new Set(Object.values(control.ports)).size !== portNames.length ||
        !Array.isArray(control.internal) || control.internal.length !== (kind === 'single' ? 2 : 4)) fail();
    if (legacy) {
      const expected = canonical.controllers[order];
      if (!expected || id !== expected.id || kind !== expected.kind ||
          !samePorts(control.ports,expected.ports) || !sameInternal(control.internal,expected.internal)) fail();
    } else if (!(kind === 'cross' ? ['WX-A','WX-B'].includes(id) : id.startsWith('V06-')) ||
        !Object.values(control.ports).every(node => node.startsWith('V06-R01J')) ||
        !control.internal.every(edge => edge.startsWith('V06-P')) ||
        !control.states || Object.keys(control.states).length !== 2 ||
        control.states.false !== (kind === 'cross' ? 'N' : 'S0') ||
        control.states.true !== (kind === 'cross' ? 'X' : 'S1')) fail();
    const ports = Object.freeze({...control.ports});
    const paths = control.internal.map(id => {
      const edge = network.edges[id];
      if (!edge || ownedEdges.has(id) || edge.switchId !== control.id || typeof edge.requiredState !== 'boolean' ||
          edge.unit !== (legacy ? control.sourceId ?? control.id : control.id)) fail();
      const fromPort = portNames.find(p => ports[p] === edge.from), toPort = portNames.find(p => ports[p] === edge.to);
      if (!fromPort || !toPort || fromPort === toPort ||
          edge.fromPort !== undefined && edge.fromPort !== fromPort ||
          edge.toPort !== undefined && edge.toPort !== toPort) fail();
      ownedEdges.add(id);
      return Object.freeze({edge:id,fromPort,toPort,requiredState:edge.requiredState});
    });
    // Preserve the existing boolean/port contract, including complete WX units.
    for (const state of [false,true]) {
      const expected = kind === 'single' ? [['A',state ? 'C' : 'B']]
        : state ? [['UL','LR'],['LL','UR']] : [['UL','UR'],['LL','LR']];
      const selected = paths.filter(p => p.requiredState === state);
      if (selected.length !== expected.length || !expected.every(([a,b]) =>
        selected.some(p => p.fromPort === a && p.toPort === b || p.fromPort === b && p.toPort === a))) fail();
    }
    const states = Object.freeze({...control.states ?? (kind === 'cross' ? {false:'N',true:'X'} : {false:'S0',true:'S1'})});
    byId.set(id,Object.freeze({id,profileId,order,kind,ports,
      internal:Object.freeze([...control.internal]),paths:Object.freeze(paths),
      allowedStates:Object.freeze([false,true]),states,initialState:legacy ? false : control.initialState}));
  }
  if (legacy && byId.size !== canonical.controllers.length || Object.values(network.edges).some(edge =>
      edge.switchId != null && !ownedEdges.has(edge.id))) fail();
  const controllers = Object.freeze([...byId.values()]), ids = Object.freeze([...byId.keys()]);
  const registry = Object.freeze({profileId,ids,controllers,
    has:id => typeof id === 'string' && byId.has(id),
    get:id => typeof id === 'string' ? byId.get(id) ?? null : null,
    ownsNetwork:candidate => candidate === network,
    matchesSpecs:specs => Array.isArray(specs) && specs.length === ids.length && new Set(specs.map(s => s?.id)).size === ids.length &&
      specs.every(s => { const c = byId.get(s?.id); return c && (s.profileId === undefined || s.profileId === profileId) &&
        s.kind === c.kind && samePorts(s.ports,c.ports) && sameInternal(s.internal,c.internal); }),
    createSpecs:() => controllers.map(c => ({...network.controllers[c.order],profileId,ports:c.ports,internal:c.internal,on:c.initialState}))
  });
  owners.set(registry,network);
  return registry;
}
