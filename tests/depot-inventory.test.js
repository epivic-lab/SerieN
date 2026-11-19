import test from 'node:test';
import assert from 'node:assert/strict';
import {createDepotInventory,projectSlots,railwayInventoryView} from '../src/depot-inventory.js';
import {createTrainProjects,PROJECT_CATALOG} from '../src/train-projects.js';
function fixture(){let p=0,d=0;const projects=createTrainProjects({newId:()=>`planned-${++p}`}),depot=createDepotInventory({newId:()=>`depot:${++d}`,getProjects:()=>projects.projects});return {projects,depot};}
function consist(s){s.begin('Freight');s.add('native-br01-engine');s.add('native-br01-tender');s.add('native-br01-tender');return s.confirm();}
const physical=()=>({id:0,name:'BR 01',modelKey:'br01-engine',group:{uuid:'physical-loco',userData:{stock:{kind:'br01-engine',length:114.3}}},carObjs:[{uuid:'physical-tank',userData:{stock:{kind:'br01-tender',length:62.5}}}]});
test('catalog definitions, planned vehicles, physical groups and duplicate off-scene records never share identities or state',()=>{
 const {projects,depot}=fixture(),p=consist(projects),t=physical(),before=structuredClone(t);
 const a=depot.add('native-br01-tender'),b=depot.add('native-br01-tender');assert.notEqual(a.id,b.id);assert.notEqual(a.code,b.code);assert.equal(depot.size,2);
 assert.ok(depot.items.every(v=>v.category==='off-scene-virtual'&&v.state==='available'&&!('point' in v)&&!('group' in v)));
 assert.ok(!p.vehicles.some(v=>[a.id,b.id].includes(v.id)));assert.deepEqual(t,before);assert.equal(PROJECT_CATALOG.length,3);
 const exposed=depot.items;exposed[0].assignment={projectId:p.id,vehicleId:p.vehicles[1].id};assert.equal(depot.items[0].assignment,null);
 depot.remove(a.id);const c=depot.add('native-br01-tender');assert.equal(c.code,'D003');assert.notEqual(c.id,a.id);
});
test('reservations are exclusive for an exact confirmed project slot, with same-model instances independent',()=>{
 const {projects,depot}=fixture(),p=consist(projects),before=projects.projects,a=depot.add('native-br01-tender'),b=depot.add('native-br01-tender');
 depot.assign(a.id,p.id,p.vehicles[1].id);assert.equal(depot.items[0].state,'reserved');assert.throws(()=>depot.assign(b.id,p.id,p.vehicles[1].id));
 depot.assign(b.id,p.id,p.vehicles[2].id);assert.equal(depot.items.filter(v=>v.state==='reserved').length,2);assert.deepEqual(projects.projects,before);
 assert.throws(()=>depot.remove(a.id));assert.throws(()=>depot.assign(a.id,p.id,p.vehicles[2].id));depot.release(a.id);depot.remove(a.id);assert.equal(depot.size,1);assert.equal(depot.items[0].id,b.id);
});
test('invalid models, identities, wrong model and non-confirmed targets reject without partial mutations',()=>{
 const {projects,depot}=fixture();assert.throws(()=>depot.add('__proto__'));assert.equal(depot.size,0);projects.begin();projects.add('native-br01-engine');const draft=projects.draft,item=depot.add('native-br01-engine');
 const before=depot.items;assert.throws(()=>depot.assign(item.id,draft.id,draft.vehicles[0].id));assert.deepEqual(depot.items,before);
 const p=projects.confirm();const wrong=depot.add('native-br01-tender');const saved=depot.items;
 for(const action of [()=>depot.assign(wrong.id,p.id,p.vehicles[0].id),()=>depot.assign(item.id,'missing','missing'),()=>depot.release('physical-loco'),()=>depot.remove('physical-tank'),()=>depot.assign('native-br01-engine',p.id,p.vehicles[0].id)]){assert.throws(action);assert.deepEqual(depot.items,saved);}
});
test('cancelled M2 edits keep reservations; confirmed reorder, name and orientation retain the original slot identity',()=>{
 const {projects,depot}=fixture(),p=consist(projects),item=depot.add('native-br01-tender');depot.assign(item.id,p.id,p.vehicles[1].id);
 projects.open(p.id);projects.remove(p.vehicles[1].id);assert.deepEqual(depot.reconcile(),[]);assert.equal(depot.items[0].state,'reserved');projects.cancel();assert.deepEqual(depot.reconcile(),[]);
 projects.open(p.id);projects.move(p.vehicles[1].id,1);projects.rename('Renamed');projects.flip(p.vehicles[1].id);projects.confirm();assert.deepEqual(depot.reconcile(),[]);
 const slot=projectSlots(projects.projects).find(v=>v.vehicleId===p.vehicles[1].id);assert.equal(slot.position,3);assert.equal(slot.projectName,'Renamed');assert.equal(depot.items[0].assignment.vehicleId,p.vehicles[1].id);
});
test('confirmed removal releases only obsolete references and never rebinds to an identical model',()=>{
 const {projects,depot}=fixture(),p=consist(projects),a=depot.add('native-br01-tender'),b=depot.add('native-br01-tender');depot.assign(a.id,p.id,p.vehicles[1].id);depot.assign(b.id,p.id,p.vehicles[2].id);
 projects.open(p.id);projects.remove(p.vehicles[1].id);projects.add('native-br01-tender');projects.confirm();assert.deepEqual(depot.reconcile(),[a.id]);assert.equal(depot.items[0].state,'available');assert.match(depot.items[0].notice,/removed or changed/);assert.equal(depot.items[1].state,'reserved');
});
test('a missing project or changed model releases a reservation without changing project data',()=>{
 let projects=[{id:'p',name:'P',vehicles:[{id:'v',modelId:'native-br01-tender'}]}];const depot=createDepotInventory({newId:()=> 'depot:one',getProjects:()=>projects}),item=depot.add('native-br01-tender');depot.assign(item.id,'p','v');
 projects=[{id:'p',name:'P',vehicles:[{id:'v',modelId:'native-br01-engine'}]}];const before=structuredClone(projects);assert.deepEqual(depot.reconcile(),[item.id]);assert.deepEqual(projects,before);
 projects=[{id:'p',name:'P',vehicles:[{id:'v',modelId:'native-br01-tender'}]}];depot.assign(item.id,'p','v');projects=[];assert.deepEqual(depot.reconcile(),[item.id]);
});
test('copied real projects keep physical source references while the depot holds only a virtual planning relation',()=>{
 const {projects,depot}=fixture(),t=physical(),realBefore=structuredClone(t);projects.copy(t,0);const p=projects.confirm(),before=projects.projects,item=depot.add('native-br01-tender');depot.assign(item.id,p.id,p.vehicles[1].id);
 assert.deepEqual(projects.projects,before);assert.deepEqual(t,realBefore);assert.equal(projects.projects[0].vehicles[1].sourceVehicleId,'physical-tank');assert.deepEqual(depot.items[0].assignment,{projectId:p.id,vehicleId:p.vehicles[1].id});
});
test('railway projection preserves UUID through detach/recouple and reset refreshes generations, without absorbing real stock',()=>{
 const {projects,depot}=fixture(),p=consist(projects),item=depot.add('native-br01-tender');depot.assign(item.id,p.id,p.vehicles[1].id);const inventory=depot.items,t=physical(),before=structuredClone(t);
 const onTrain=railwayInventoryView([t],[],0);assert.equal(onTrain[1].id,'physical-tank');assert.equal(onTrain[1].state,'on-train');assert.deepEqual(t,before);
 const detached={group:t.carObjs.pop(),point:{edge:'T0',dir:1}};const parked=railwayInventoryView([t],[detached],0);assert.equal(parked[1].id,'physical-tank');assert.equal(parked[1].state,'detached-on-track');assert.equal(parked[1].edge,'T0');
 t.carObjs.push(detached.group);assert.deepEqual(railwayInventoryView([t],[],0),onTrain);t.carObjs=[{uuid:'reset-tank',userData:{stock:{kind:'br01-tender',length:62.5}}}];
 const reset=railwayInventoryView([t],[],1);assert.equal(reset[0].id,'physical-loco');assert.equal(reset[0].generation,1);assert.equal(reset[1].id,'reset-tank');assert.ok(!reset.some(v=>v.id==='physical-tank'));
 assert.deepEqual(depot.items,inventory);assert.deepEqual(depot.reconcile(),[]);
});
test('duplicate/generated wrong-namespace IDs are rejected atomically and dispose releases inventory state',()=>{
 const bad=createDepotInventory({newId:()=> 'physical-id'});assert.throws(()=>bad.add('native-br01-engine'));assert.equal(bad.size,0);
 const depot=createDepotInventory({newId:()=> 'depot:one'});depot.add('native-br01-engine');assert.throws(()=>depot.add('native-br01-engine'));assert.equal(depot.size,1);depot.dispose();assert.equal(depot.size,0);assert.deepEqual(depot.items,[]);assert.throws(()=>depot.add('native-br01-tender'));assert.throws(()=>depot.reconcile());depot.dispose();
});
