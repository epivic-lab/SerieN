import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector2} from 'three';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {WebGLShaderCache} from '../node_modules/three/src/renderers/webgl/WebGLShaderCache.js';
import {disposePresentationPass} from '../src/presentation.js';

test('leaving Cinema releases the actual Bloom high-pass material from the renderer shader cache',()=>{
 const pass=new UnrealBloomPass(new Vector2(32,32)),cache=new WebGLShaderCache(),material=pass.materialHighPassFilter;
 // Register the material exactly as WebGLPrograms does when the real pass renders.
 cache.update(material);
 material.addEventListener('dispose',()=>cache.remove(material));
 assert.equal(cache.materialCache.has(material),true);
 disposePresentationPass(pass);
 assert.equal(cache.materialCache.size,0,'a discarded Bloom material must not remain strongly owned');
 assert.equal(cache.shaderCache.size,0,'its unused shader stages must be released');
});
