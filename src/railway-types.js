/**
 * Shared structural contracts. Type-only imports must not initialize Three.js,
 * the DOM, or another application state owner.
 * @typedef {{x:number,y?:number,z?:number}} CouplerPoint
 * @typedef {{front:CouplerPoint,back:CouplerPoint}} Couplers
 * @typedef {{couplers?:Couplers,assetDimensions?:object,stock?:object}} VehicleData
 * @typedef {{userData:VehicleData}} Vehicle
 * @typedef {{x:number,z:number,angle:number,edge:string,s:number}} RailwayPoint
 * @typedef {import('./simulation.js').Journey} Journey
 * @typedef {{id:number,name:string,group:Vehicle,carObjs:Vehicle[],cars:number,
 * journey:Journey,velocity:number,dir:number,speed:number,lights:boolean}} Train
 * @typedef {{point:RailwayPoint,group:Vehicle}} DetachedVehicle
 * @typedef {{edge:string,min:number,max:number}} OccupiedRange
 * @typedef {{offsets:number[],tail:number}} ConsistLayout
 * @typedef {{blocked:boolean,kind:string,message:string}} SwitchSafety
 * @typedef {{preview:object,velocity:number,leadingExtent:number}} MovingTrainView
 * @typedef {{occupied:OccupiedRange[],moving:MovingTrainView[]}} RailwaySnapshot
 * @typedef {ReturnType<typeof import('./network.js').createNetwork>} RailwayNetwork
 * @typedef {ReturnType<typeof import('./next-switch.js').createSwitchTopology>} SwitchTopology
 * @typedef {{id:string,on:boolean}} SwitchControl
 * @typedef {{network:RailwayNetwork,switchTopology:SwitchTopology,trains:Train[],
 * detached:DetachedVehicle[],selected:number,switchSpecs:SwitchControl[],route:Function}} AssistanceContext
 * selected is the fleet array index, as in the v0.12 contract; IDs are not remapped.
 */
export {};
