import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
Path('work').mkdir(exist_ok=True)
result={'devices':{p:os.path.exists(p) for p in ['/dev/dri','/dev/nvidia0','/sys/class/drm']}}
with sync_playwright() as p:
 for kind,args in [('default',[]),('software-enabled',['--enable-unsafe-swiftshader'])]:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox',*args])
  session=browser.new_browser_cdp_session();gpu=session.send('SystemInfo.getInfo')['gpu']
  page=browser.new_page();context=page.evaluate("""()=>{const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2');if(!gl)return null;const info=gl.getExtension('WEBGL_debug_renderer_info');return {vendor:gl.getParameter(info?info.UNMASKED_VENDOR_WEBGL:gl.VENDOR),renderer:gl.getParameter(info?info.UNMASKED_RENDERER_WEBGL:gl.RENDERER),version:gl.getParameter(gl.VERSION),nativeRAF:requestAnimationFrame.toString()};}""")
  result[kind]={'gpu':gpu,'webgl':context,'browserVersion':browser.version}
  browser.close()
Path('work/m1-v1-gpu.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:({p:v.get(p) for p in ['webgl','browserVersion']} if isinstance(v,dict) and 'webgl' in v else v) for k,v in result.items()},indent=2))
