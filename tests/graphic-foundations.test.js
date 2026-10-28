import test from 'node:test';import assert from 'node:assert/strict';
import {DirectionalLight,NoColorSpace,SRGBColorSpace,Vector3,PerspectiveCamera} from 'three';
import {surfaceMaps,createRailMaterial,railColor,fitSunShadow} from '../src/graphic-foundations.js';
import {CAMERA_PRESETS} from '../src/navigation.js';
test('Home framing contains all eight physical base corners, including the previously clipped lower right corner',()=>{
  for(const [w,h] of [[1390,680],[1140,751],[759,651],[768,614],[390,405]]){
    const aspect=w/h,camera=new PerspectiveCamera(Math.max(35,Math.min(65,49/aspect)),aspect,1,6500);
    camera.position.fromArray(CAMERA_PRESETS.overview.position);camera.lookAt(new Vector3(...CAMERA_PRESETS.overview.target));camera.updateMatrixWorld();
    for(const x of [-10,1510])for(const y of [-34,0])for(const z of [-10,710]){
      const p=new Vector3(x,y,z).project(camera);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,`${w}x${h}: ${p.toArray()}`);
    }
  }
});
test('polished rail heads and weathered webs have distinct PBR properties without moving rail geometry',()=>{
  const material=createRailMaterial(),map=material.roughnessMap,bytes=map.image.data,size=map.image.width;
  assert.equal(material.vertexColors,true);assert.equal(map,material.metalnessMap);assert.equal(map.colorSpace,NoColorSpace);
  assert.ok(bytes[1]>bytes[(size-1)*4+1]);assert.ok(bytes[2]<bytes[(size-1)*4+2]);
  assert.ok(railColor(5.95).r>railColor(4.5).r);map.dispose();material.dispose();
});
test('ballast and terrain textures are reproducible and distinguish sRGB albedo from linear height/roughness',()=>{
  for(const kind of ['ballast','terrain']){
    const a=surfaceMaps(kind),b=surfaceMaps(kind);assert.deepEqual(a.albedo.image.data,b.albedo.image.data);
    assert.equal(a.albedo.colorSpace,SRGBColorSpace);assert.equal(a.detail.colorSpace,NoColorSpace);
    assert.ok(new Set(a.albedo.image.data).size>30);assert.ok(a.detail.image.data.some((v,i)=>i%4===0&&v>100));
    Object.values(a).forEach(t=>t.dispose());Object.values(b).forEach(t=>t.dispose());
  }
});
test('tightened shadow camera contains the complete table and tallest scenery with a low contact bias',()=>{
  const light=new DirectionalLight();light.position.set(-280,1000,150);light.target.position.set(750,0,350);fitSunShadow(light);
  const camera=light.shadow.camera;camera.updateMatrixWorld();
  for(const x of [-20,1520])for(const y of [-40,160])for(const z of [-20,720]){
    const p=new Vector3(x,y,z).project(camera);assert.ok(Math.abs(p.x)<=1&&Math.abs(p.y)<=1&&Math.abs(p.z)<=1);
  }
  assert.ok(camera.right-camera.left<2300);assert.ok(camera.top-camera.bottom<1900);assert.ok(light.shadow.normalBias<.8);
});
