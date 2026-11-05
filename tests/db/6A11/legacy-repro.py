"""Reuse immutable 6A.6 network-none PG fixture; replace only the child test entrypoint."""
import sys
from pathlib import Path
fixture=Path(__file__).resolve().parents[1]/'6A6'/'run.py'
sys.path.insert(0,str(fixture.parent))
source=fixture.read_text()
old="['node','tests/db/6A6/integration.test.js',NAME,str(OUT)]"
assert source.count(old)==1
exec(compile(source.replace(old,"['node','tests/db/6A11/legacy-nonce.test.js',NAME,str(OUT)]"),str(fixture),'exec'),{'__file__':str(fixture),'__name__':'__main__'})
