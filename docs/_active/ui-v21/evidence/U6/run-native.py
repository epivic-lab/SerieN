"""Reuse U5's production native RAF assertions, adding real TM consultation while all four move."""
from pathlib import Path
import os,hashlib,json
root=Path(__file__).resolve().parents[5];ev=Path(__file__).resolve().parent
source=(root/'tests/browser-ui-v21-U5-native.py').read_text();anchor="  # Select fourth from sidebar's real shared selection, then focus carousel to issue Space."
assert source.count(anchor)==1
source=source.replace(anchor,"  p.locator('#trainManagement').click();assert p.locator('dialog.trainManagement').count()==1\n  p.locator('[data-composition=\"2\"]').click();assert js('__serienDiagnostics.snapshot().consoles.active')==2\n  p.locator('dialog.trainManagement [data-close]').click()\n"+anchor)
os.environ['U5_NATIVE_OUTPUT']=str(ev/os.environ.get('U6_NATIVE_NAME','native'));(ev/(os.environ.get('U6_NATIVE_NAME','native')+'-provenance.json')).write_text(json.dumps({'original':'tests/browser-ui-v21-U5-native.py','sha256':hashlib.sha256((root/'tests/browser-ui-v21-U5-native.py').read_bytes()).hexdigest(),'adaptation':'one TM open/select/close during actual native motion; all original railway assertions kept'},indent=2))
exec(compile(source,'U6-native','exec'),{'__name__':'__main__'})
