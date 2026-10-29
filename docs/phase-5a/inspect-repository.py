"""Read-only architecture inventory. Run from repository root; metadata only."""
import json,re,subprocess
from pathlib import Path
paths=[Path('app.js'),*sorted(Path('src').glob('*.js'))]
graph={};stats={}
for p in paths:
 s=p.read_text();deps=re.findall(r'(?:from\s+|import\s*)[\"\']([^\"\']+)[\"\']',s)
 graph[str(p)]=[str((p.parent/d).resolve().relative_to(Path.cwd())) for d in deps if d.startswith('.')]
 stats[str(p)]={'lines':len(s.splitlines()),'bytes':len(s.encode()),'imports':len(deps),'longestLine':max(map(len,s.splitlines()),default=0)}
cycles=[];visited=set();stack=[]
def visit(p):
 if p in stack:cycles.append(stack[stack.index(p):]+[p]);return
 if p in visited:return
 stack.append(p)
 for d in graph.get(p,[]):visit(d)
 stack.pop();visited.add(p)
for p in graph:visit(p)
files=subprocess.check_output(['git','ls-files','-z']).decode().split('\0');groups={}
for f in filter(None,files):
 p=Path(f)
 if p.suffix not in {'.js','.mjs','.py','.html','.css','.yml','.yaml'}:continue
 group='app' if f in ['app.js','index.html','style.css'] or f.startswith('src/') else 'tests' if f.startswith('tests/') else 'scripts' if f.startswith('scripts/') else 'CI' if f.startswith('.github/') else 'historical/documentation'
 groups[group]=groups.get(group,0)+len(p.read_text().splitlines())
result={'head':subprocess.check_output(['git','rev-parse','HEAD']).decode().strip(),'scope':'static relative ESM imports in app.js and src/*.js; excludes dynamic loaders and third-party internals','graph':graph,'cycles':cycles,'modules':stats,'lineCounts':groups}
Path('docs/phase-5a/dependencies.json').write_text(json.dumps(result,indent=2)+'\n')
print('App modules:',len(paths),'Cycles:',len(cycles),'Lines:',groups)
