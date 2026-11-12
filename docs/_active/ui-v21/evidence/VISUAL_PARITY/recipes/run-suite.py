"""Retain historical domain assertions; adapt only the documented Menu launcher.
The copied recipe and its source/adapted hashes are part of the evidence.
"""
import sys,os,json,hashlib
from pathlib import Path
root=Path('/workspace/SerieN');path=root/sys.argv[1];out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
source=path.read_text();adapted=source
adapted=adapted.replace("p.locator('#trainManagement').click()", "p.locator('.top').get_by_role('button',name='Menu',exact=True).click();p.locator('#trainManagement').click()")
marker="check('three-moving-real-trains-permitted-fourth-and-exact-scene-identity')"
adapted=adapted.replace(marker,marker+"\n  p.locator('.dock-previous').click();assert js('__serienDiagnostics.snapshot().consoles.active')==2;p.locator('.dock-next').click();assert js('__serienDiagnostics.snapshot().consoles.active')==3;check('trusted-side-arrows-reach-the-fourth-real-train')")
(out/'adapted-test.py').write_text(adapted)
(out/'provenance.json').write_text(json.dumps({'source':str(path.relative_to(root)),'sourceSHA256':hashlib.sha256(source.encode()).hexdigest(),'adaptedSHA256':hashlib.sha256(adapted.encode()).hexdigest(),'changes':['Open the real Menu before the trusted Train Management launcher click','Additional trusted previous/next arrow assertions include the fourth real train'] if adapted!=source else [],'domainAssertionsChanged':False},indent=2)+'\n')
os.environ['SERIEN_URL']='http://127.0.0.1:8041/'
os.environ['U9_NATIVE_OUTPUT']=str(out)
exec(compile(adapted,str(path),'exec'),{'__name__':'__main__','__file__':str(path)})
