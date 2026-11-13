import {routing} from './simulation.js';
import {createTurnoutRegistry,assertTurnoutRegistry} from './turnout-registry.js';
export {TURNOUT_IDS,isTurnoutId} from './turnout-registry.js';

// A local selection is not a clearance. Immutable geometry comes from the
// canonical edges; legal entrances are projected by the existing router.
export function createTurnoutModel(network, registry = createTurnoutRegistry(network)) {
  assertTurnoutRegistry(registry,network);
  const units = new Map();
  for (const control of registry.controllers) {
    const {id} = control;
    const ports = Object.freeze({...control.ports});
    const portFor = node => Object.keys(ports).find(port => ports[port] === node);
    const paths = control.internal.map(edgeId => {
      const edge = network.edges[edgeId];
      return Object.freeze({edge:edgeId,fromPort:portFor(edge.from),toPort:portFor(edge.to),
        from:0,to:edge.length,points:Object.freeze(edge.points.map(p => Object.freeze({...p})))});
    });
    const selections = [false,true].map(on => {
      const entrances = {};
      for (const [port,node] of Object.entries(ports)) {
        const external = network.nodes[node].filter(p => !control.internal.includes(p.edge));
        const results = external.map(incoming => {
          const edge = network.edges[incoming.edge];
          // Touching turnouts share a port. The local view assumes arrival on
          // this actual incoming edge, aligning that neighbour only for this
          // read-only query. Journey remains the authority for global arrival.
          const route = routing(network, key => key === id ? on : key === edge.switchId ? edge.requiredState : false);
          const choices = network.nodes[node].filter(p => p.edge !== incoming.edge);
          const next = route(incoming.edge,choices);
          if (!next) return {status:route.reason(incoming.edge,choices) === 'misaligned' ? 'BLOCKED' : 'UNKNOWN'};
          const path = paths.find(p => p.edge === next.edge);
          if (!path) return {status:'UNKNOWN'};
          return {status:'ROUTABLE',edge:next.edge,incomingPort:port,
            outgoingPort:next.end ? path.fromPort : path.toPort,
            from:next.end ? path.to : 0,to:next.end ? 0 : path.to,sign:next.end ? -1 : 1,
            points:next.end ? Object.freeze([...path.points].reverse()) : path.points};
        });
        const first = results[0];
        const consistent = first && results.every(r => r.status === first.status && r.edge === first.edge && r.outgoingPort === first.outgoingPort);
        entrances[port] = Object.freeze(consistent ? {incomingPort:port,...first} : {incomingPort:port,status:'UNKNOWN'});
      }
      const unknown = Object.values(entrances).some(e => e.status === 'UNKNOWN');
      const activePaths = unknown ? [] : paths.filter(p => Object.values(entrances).some(e => e.edge === p.edge));
      return Object.freeze({unknown,entrances:Object.freeze(entrances),activePaths:Object.freeze(activePaths)});
    });
    units.set(id,{ports,paths:Object.freeze(paths),selections});
  }
  return Object.freeze({
    registry,
    /** Fresh context, immutable cached paths. No state/graph/Journey mutations.
     * operationLock and hazardStatus are observations supplied by the engine;
     * ROUTABLE only means local connectivity, never permission to move. */
    read(controlId,on,{incomingPort=null,incomingEdge=null,incomingEnd=null,choose=null,
      operationLock=null,hazardStatus='UNKNOWN'} = {}) {
      const unit = registry.has(controlId) ? units.get(controlId) : null;
      const selection = unit && typeof on === 'boolean' ? unit.selections[Number(on)] : null;
      let approach = selection && typeof incomingPort === 'string' && Object.hasOwn(selection.entrances,incomingPort)
        ? selection.entrances[incomingPort] : null;
      const networkEntry = incomingEdge !== null || incomingEnd !== null;
      if (networkEntry) {
        approach = null;
        const edge = typeof incomingEdge === 'string' && Object.hasOwn(network.edges,incomingEdge) ? network.edges[incomingEdge] : null;
        // The historical router coerces state to Boolean. Its raw state hook
        // must remain boolean for both this unit and an adjacent incoming unit;
        // coercion of UNKNOWN cannot establish a network approach.
        const statesKnown = selection && edge && (typeof choose?.controlState !== 'function' ||
          [controlId,edge.switchId].filter(Boolean).every(id => typeof choose.controlState(id) === 'boolean'));
        if (selection && edge && statesKnown && [0,1].includes(incomingEnd) && typeof choose === 'function') {
          const node = incomingEnd ? edge.to : edge.from;
          const port = Object.keys(unit.ports).find(p => unit.ports[p] === node);
          const local = selection.entrances[port];
          if (local && !unit.paths.some(p => p.edge === incomingEdge) && (incomingPort === null || incomingPort === port)) {
            const choices = network.nodes[node].filter(p => p.edge !== incomingEdge);
            const next = choose(incomingEdge,choices);
            if (!next) {
              const reason = choose.reason?.(incomingEdge,choices);
              if (reason === 'misaligned' || reason === 'no-route') approach = Object.freeze({incomingPort:port,status:'BLOCKED',reason});
            } else if (local.status === 'ROUTABLE' && next.edge === local.edge && next.end === (local.sign > 0 ? 0 : 1)) approach = local;
          }
        }
      }
      const hasEntry = incomingPort !== null || networkEntry;
      const unknown = !selection || selection.unknown || (hasEntry && !approach);
      const lockKnown = typeof operationLock?.blocked === 'boolean' &&
        (operationLock.blocked || operationLock.kind === 'unlocked');
      return Object.freeze({controlId:registry.has(controlId) ? controlId : null,
        state:typeof on === 'boolean' ? on : null,position:selection ? on ? 'diverging' : 'straight' : 'unknown',
        unknown,routeStatus:unknown ? 'UNKNOWN' : 'KNOWN',
        reason:!unit ? 'invalid-control' : !selection ? 'unknown-state' : unknown ? 'unknown-entry' : null,
        ports:unit?.ports ?? null,paths:unit?.paths ?? Object.freeze([]),
        activePaths:unknown ? Object.freeze([]) : selection.activePaths,
        approachScope:networkEntry ? 'NETWORK' : 'LOCAL_SELECTION',
        approach:!hasEntry ? null : unknown ? Object.freeze({status:'UNKNOWN'}) : approach,
        operationLock:!lockKnown ? 'UNKNOWN' : operationLock.blocked ? 'LOCKED' : 'UNLOCKED',
        lockReason:lockKnown ? operationLock.kind : 'unknown',
        hazardStatus:['SAFE','UNSAFE','UNKNOWN'].includes(hazardStatus) ? hazardStatus : 'UNKNOWN'});
    }
  });
}
