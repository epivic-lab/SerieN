"""Final production bundle: native four-train gate plus real Composer copy/flip/confirm during movement."""
from pathlib import Path
import os,json,hashlib
root=Path(__file__).resolve().parents[5];ev=Path(__file__).resolve().parent;original=root/'tests/browser-ui-v21-U5-native.py';s=original.read_text();anchor='  # Select fourth from sidebar\'s real shared selection, then focus carousel to issue Space.'
assert anchor in s
s=s.replace(anchor,"  p.locator('#trainManagement').click();p.locator('[data-composition=\"0\"]').click();p.locator('[data-copy-train=\"0\"]').click()\n  planned=p.locator('[data-planned-vehicle]').evaluate_all('(es)=>es.map(e=>e.dataset.plannedVehicle)');assert len(planned)==4\n  p.locator('[data-project-action=\"flip-'+planned[0]+'\"]').click(force=True);p.locator('[data-project-action=confirm]').click(force=True)\n  assert p.locator('[data-comparison=different]').count()==1 and p.locator('[data-project-action=name]').count()==0\n  p.locator('dialog.trainManagement [data-close]').click()\n"+anchor)
os.environ['U5_NATIVE_OUTPUT']=str(ev/'native-final');os.environ['SERIEN_URL']='http://127.0.0.1:8034/'
(ev/'native-final-provenance.json').write_text(json.dumps({'source':str(original.relative_to(root)),'sha256':hashlib.sha256(original.read_bytes()).hexdigest(),'delta':'Native Composer copy/flip/confirm inserted; original four-train motion/selection/Space/stopAll/latch/pause/resume assertions unchanged'},indent=2))
exec(compile(s,'U7-final-native','exec'),{'__name__':'__main__'})
