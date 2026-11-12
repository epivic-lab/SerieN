"""Historical lifecycle/U6 input adaptation: custom consent, explicit Edit and event-loop focus wait."""
import os,sys,json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[5];ev=Path(__file__).resolve().parent
which=sys.argv[1]
if which=='lifecycle':
 original=root/'tests/browser-train-project-lifecycle.py';source=original.read_text();old="page.once('dialog',lambda d:d.accept());page.locator('[data-project-action=\"cancel\"]').click()";assert old in source;source=source.replace(old,"page.locator('[data-project-action=\"cancel\"]').click();page.locator('dialog.u6-guard [data-confirm]').click()")
 os.environ['M2_LIFECYCLE_OUTPUT']=str(ev/'lifecycle-adapted')
else:
 original=root/'tests/browser-ui-v21-U6.py';source=original.read_text();source=source.replace("assert p.locator('#trainManagement').evaluate", "p.wait_for_function('document.activeElement===document.getElementById(\"trainManagement\")');assert p.locator('#trainManagement').evaluate")
 source=source.replace("pa('open-'+project_id);assert planned()==ids", "pa('open-'+project_id);pa('edit');assert planned()==ids")
 os.environ['U6_OUTPUT']=str(ev/'U6-adapted')
(ev/(which+'-adapter.json')).write_text(json.dumps({'original':str(original.relative_to(root)),'sha256':hashlib.sha256(original.read_bytes()).hexdigest(),'adaptation':'consent delivered via custom guard / explicit Edit after readonly selection / wait for native close focus event; original assertions retained'},indent=2))
exec(compile(source,str(original),'exec'),{'__name__':'__main__','__file__':str(original)})
