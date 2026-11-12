"""Deliver explicit consent to migrated UI in historical suites. Domain assertions retained."""
import os,sys,json,hashlib
from pathlib import Path
from playwright.sync_api import Locator,Page
root=Path(__file__).resolve().parents[5];evidence=Path(__file__).resolve().parent;name=sys.argv[1]
(root/'work').mkdir(exist_ok=True)
files={'depot':'browser-depot.py','lifecycle':'browser-depot-lifecycle.py','runtime':'browser-depot-runtime.py','U7':'browser-ui-v21-U7.py','U6':'browser-ui-v21-U6.py','U5':'browser-ui-v21-U5.py'}
original=root/'tests'/files[name];source=original.read_text()
# Removed transfer buttons are now noninteractive explanations, same exclusion asserted.
source=source.replace("da('assign-'+a).is_disabled() and da('enter').is_disabled() and da('exit').is_disabled()", "da('assign-'+a).is_disabled() and page.locator('.depotTransferGate button').count()==0 and page.locator('.u8-unavailable').count()==2")
# U7/U6 already test custom draft Cancel; keep their intended cancellation semantics.
if name=='U6':
 source=source.replace("pa('open-'+project_id);assert planned()==ids", "pa('open-'+project_id);pa('edit');assert planned()==ids")
 source=source.replace("assert p.locator('#trainManagement').evaluate", "p.wait_for_function('document.activeElement===document.getElementById(\"trainManagement\")');assert p.locator('#trainManagement').evaluate")
confirm_all=name in ['depot','lifecycle','runtime']
evaluate=Page.evaluate

def settle(page):
 if not confirm_all:return
 found=evaluate(page,"Boolean(document.querySelector('dialog.u6-guard[open],dialog.u5-guard[open]'))")
 if found:
  if name=='runtime':
   xy=evaluate(page,"()=>{const e=document.querySelector('dialog.u6-guard[open],dialog.u5-guard[open]').querySelector('[data-confirm]'),r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}}")
   session=page.context.new_cdp_session(page)
   session.send('Input.dispatchMouseEvent',{'type':'mousePressed','button':'left','clickCount':1,**xy});session.send('Input.dispatchMouseEvent',{'type':'mouseReleased','button':'left','clickCount':1,**xy});session.detach()
  else:evaluate(page,"document.querySelector('dialog.u6-guard[open],dialog.u5-guard[open]').querySelector('[data-confirm]').click()")
for n in ['click','tap','evaluate']:
 method=getattr(Locator,n)
 def wrapper(self,*args,__method=method,**kwargs):
  result=__method(self,*args,**kwargs);settle(self.page);return result
 setattr(Locator,n,wrapper)
def evaluate_and_settle(self,*args,**kwargs):
 result=evaluate(self,*args,**kwargs);settle(self);return result
Page.evaluate=evaluate_and_settle
# Native runtime coordinates use CDP then assert state: consent is a real trusted input too.
if name=='runtime':
 anchor="   cdp.send('Input.dispatchMouseEvent',{'type':'mousePressed','button':'left','clickCount':1,**xy});cdp.send('Input.dispatchMouseEvent',{'type':'mouseReleased','button':'left','clickCount':1,**xy})"
 # Locate exact helper below; generic insertion at the end of its function.
 source=source.replace("  page.wait_for_timeout(3000)","  page.wait_for_timeout(3000)")
 source=source.replace("  cdp=page.context.new_cdp_session(page);", "  cdp=page.context.new_cdp_session(page);")
 # Locator.evaluate calls settle before native events, so add a settlement after each native action call using source lines.
 lines=source.splitlines();patched=[]
 for line in lines:
  patched.append(line)
  if line.startswith('  ') and not line.startswith('   ') and 'click_native(' in line and 'def click_native' not in line:
   # Existing same-line asserts require insertion before assertion, handled below.
   patched[-1]=line.replace(';assert ', ';__settle(page);assert ')
   patched.append('  __settle(page)')
 source='\n'.join(patched)+'\n'
os.environ['SERIEN_URL']='http://127.0.0.1:8035/'
key={'depot':'M3_OUTPUT','lifecycle':'M3_LIFECYCLE_OUTPUT','runtime':'M3_RUNTIME_OUTPUT','U7':'U7_OUTPUT','U6':'U6_OUTPUT','U5':'U5_OUTPUT'}[name];out=evidence/(name+os.environ.get('U8_RUN_SUFFIX','')+'-adapted');out.mkdir(exist_ok=True);os.environ[key]=str(out)
(out/'adapter.json').write_text(json.dumps({'original':str(original.relative_to(root)),'sha256':hashlib.sha256(original.read_bytes()).hexdigest(),'delta':'Explicit custom modal consent replacing formerly immediate operations; noninteractive transfer plaques instead of disabled buttons; assertions of domain behavior retained'},indent=2)+'\n')
exec(compile(source,str(original),'exec'),{'__name__':'__main__','__file__':str(original),'__settle':settle})
