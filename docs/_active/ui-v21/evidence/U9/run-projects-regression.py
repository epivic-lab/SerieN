"""Translate historical native consent input to the custom UI; keep domain assertions verbatim."""
import os,json,hashlib
from pathlib import Path
from playwright.sync_api import Locator,Keyboard,Page
root=Path(__file__).resolve().parents[5];ev=Path(__file__).resolve().parent
original=root/'tests/browser-train-projects.py';source=original.read_text();answer={'value':None}
old="def answer(accept):page.once('dialog',lambda d:d.accept() if accept else d.dismiss())"
assert old in source;source=source.replace(old,"def answer(accept):__answer['value']=accept")
evaluate=Page.evaluate

def settle(page):
 if answer['value'] is None:return
 choice='data-confirm' if answer['value'] else 'data-cancel'
 found=evaluate(page,"Boolean(document.querySelector('dialog.u6-guard[open],dialog.u5-guard[open]'))")
 if found:
  answer['value']=None;evaluate(page,"key=>document.querySelector('dialog.u6-guard[open],dialog.u5-guard[open]').querySelector('['+key+']').click()",choice)
for name in ['click','tap']:
 method=getattr(Locator,name)
 def wrapped(self,*a,__method=method,**kw):
  r=__method(self,*a,**kw);settle(self.page);return r
 setattr(Locator,name,wrapped)
press=Keyboard.press
# Keyboard has no public Page accessor; this test uses one Page.
newpage=None
original_goto=Page.goto

def goto(self,*a,**kw):
 global newpage
 newpage=self;return original_goto(self,*a,**kw)
Page.goto=goto

def key(self,*a,**kw):
 r=press(self,*a,**kw)
 if newpage:settle(newpage)
 return r
Keyboard.press=key

def evaluate_with_consent(self,expression,*a,**kw):
 r=evaluate(self,expression,*a,**kw);settle(self);return r
Page.evaluate=evaluate_with_consent
out=Path(os.environ.get('M2_OUTPUT',ev/'M2'));os.environ['M2_OUTPUT']=str(out);out.mkdir(parents=True,exist_ok=True)
(out/'adapter-provenance.json').write_text(json.dumps({'original':str(original.relative_to(root)),'sha256':hashlib.sha256(original.read_bytes()).hexdigest(),'adaptation':'Explicit native accept/dismiss input translated to custom modal click, all original assertions retained'},indent=2))
exec(compile(source,str(original),'exec'),{'__name__':'__main__','__file__':str(original),'__answer':answer})
