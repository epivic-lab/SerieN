import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Vector2 } from "three";
function presentation(renderer, scene, camera) {
  let composer = null;
  function dispose() {
    if (!composer) return;
    for (const pass of composer.passes) {
      pass.dispose?.();
      pass.ssaoMaterial?.dispose();
      pass.noiseTexture?.dispose();
    }
    composer.dispose();
    composer = null;
  }
  return {
    dispose,
    resize(w, h) {
      if (composer) {
        composer.setPixelRatio(renderer.getPixelRatio());
        composer.setSize(w, h);
      }
    },
    render(cinema) {
      if (!cinema) {
        dispose();
        renderer.render(scene, camera);
        return;
      }
      if (!composer) {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        const ao = new SSAOPass(scene, camera, 512, 512, 12);
        ao.kernelRadius = 12;
        ao.minDistance = 5e-4;
        ao.maxDistance = 0.012;
        const normalRender = ao.renderOverride.bind(ao);
        ao.renderOverride = (...args) => {
          const hidden = [];
          scene.traverse((o) => {
            if (o.isMesh && o.visible && (o.userData.foliage || o.material?.transparent || o.material?.alphaTest > 0)) {
              hidden.push(o);
              o.visible = false;
            }
          });
          try {
            normalRender(...args);
          } finally {
            hidden.forEach((o) => o.visible = true);
          }
        };
        composer.addPass(ao);
        const bloom = new UnrealBloomPass(new Vector2(512, 512), 0.16, 0.45, 1.05);
        composer.addPass(bloom);
        composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}", fragmentShader: "uniform sampler2D tDiffuse;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);vec2 d=(vUv-.5)*vec2(1.,.85);float vignette=1.-.28*smoothstep(.08,.52,dot(d,d));gl_FragColor=vec4(c.rgb*vignette,c.a);}" }));
        composer.addPass(new OutputPass());
      }
      composer.render();
    }
  };
}
export {
  presentation
};
