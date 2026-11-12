"""Inspect the prepared package, never resolve an asset in the source checkout."""
import hashlib
import json
import pathlib
import re
import struct
import urllib.parse
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parents[5]
OUT = pathlib.Path(__file__).resolve().parent
SITE = ROOT / '_site'
ORIGIN = 'http://127.0.0.1:8765'
BASE = ORIGIN + '/SerieN/'
refs, external = [], []
targets = set()


def reference(value, source, base=None):
    if not value or value.startswith(('data:', 'blob:', '#', 'mailto:', 'javascript:')):
        return
    url = urllib.parse.urljoin(base or BASE + source, value)
    parsed = urllib.parse.urlsplit(url)
    if parsed.netloc != '127.0.0.1:8765':
        external.append({'source': source, 'url': url})
        return
    assert parsed.path.startswith('/SerieN/'), (source, value, url)
    path = urllib.parse.unquote(parsed.path.removeprefix('/SerieN/'))
    assert (SITE / path).is_file(), ('MISSING IN PACKAGE', source, value, path)
    if parsed.fragment and path.endswith('.svg'):
        ids = {e.get('id') for e in ET.parse(SITE / path).iter()}
        assert parsed.fragment in ids, ('MISSING SVG SYMBOL', url)
    targets.add(path)
    refs.append({'source': source, 'reference': value, 'resolved': parsed.path,
                 'fragment': parsed.fragment})


class HTMLReferences(HTMLParser):
    def handle_starttag(self, tag, attributes):
        for key, value in attributes:
            if key in ('src', 'href', 'poster'):
                reference(value, 'index.html')


HTMLReferences().feed((SITE / 'index.html').read_text())
# Include every shipped stylesheet, including the frozen non-runtime copies.
css_paths = [SITE / 'style.css', *sorted((SITE / 'ui/css').glob('*.css'))]
for path in css_paths:
    css = re.sub(r'/\*.*?\*/', '', path.read_text(), flags=re.S)
    pattern = r'''url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]*))\s*\)'''
    for match in re.finditer(pattern, css):
        value = next(v for v in match.groups() if v is not None)
        reference(value, path.relative_to(SITE).as_posix())
    for value in re.findall(r'''@import\s+["']([^"']+)["']''', css):
        reference(value, path.relative_to(SITE).as_posix())

# Local module imports in the shipped Auth boundary and resource literals in the bundle.
for name in ['auth-gate.js', 'auth-gate-core.js', 'dist/game.js']:
    code = (SITE / name).read_text()
    if name != 'dist/game.js':
        for value in re.findall(r'''(?:from\s*|import\s*\()\s*["']([^"']+)["']''', code):
            reference(value, name)
    for value in re.findall(r'''["'`]((?:\./)?(?:ui|assets|docs)/[^"'`<>\s]+)["'`]''', code):
        if '${' not in value:
            reference(value, name, BASE)

# Dynamic asset families: catalog-derived previews and the six mapped GLB models.
manifest = json.loads((SITE / 'assets/rolling-stock-sides/manifest.json').read_text())
locomotives = {'steam', 'diesel', 'shunter'}
for key, item in manifest.items():
    reference(item['url'], 'assets/rolling-stock-sides/manifest.json', BASE)
    kind = key.split('-', 1)[1]
    folder = 'locomotive' if kind in locomotives else 'rolling-stock'
    reference(f'./assets/{folder}-thumbnails/{key}.png', 'catalog dynamic expansion', BASE)
models = ['train-locomotive-a', 'train-diesel-a', 'train-diesel-box-a',
          'train-carriage-lumber', 'train-carriage-tank', 'train-carriage-box']
for model in models:
    name = f'assets/kenney/{model}.glb'
    reference('./' + name, 'Kenney dynamic expansion', BASE)
    data = (SITE / name).read_bytes()
    assert data[:4] == b'glTF'
    length, kind = struct.unpack_from('<II', data, 12)
    assert kind == 0x4E4F534A
    gltf = json.loads(data[20:20 + length])
    for item in gltf.get('buffers', []) + gltf.get('images', []):
        if item.get('uri'):
            reference(item['uri'], name)

inventory = []
for group in ['ui', 'assets', 'dist']:
    for path in sorted((SITE / group).rglob('*')):
        if path.is_file():
            relative = path.relative_to(SITE).as_posix()
            # Packaged copies of all non-doc assets are compared byte for byte.
            assert path.read_bytes() == (ROOT / relative).read_bytes(), relative
            targets.add(relative)
            inventory.append({'path': relative, 'bytes': path.stat().st_size,
                              'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
for name in ['index.html', 'style.css', 'auth-gate.js', 'auth-gate-core.js',
             'legacy-v0.1.html', '.nojekyll']:
    assert (SITE / name).read_bytes() == (ROOT / name).read_bytes()
    targets.add(name)

fonts = json.loads((SITE / 'ui/fonts/manifest.json').read_text())['fonts']
for font in fonts:
    file = SITE / font['staged_file']
    license_file = SITE / font['license_staged']
    assert file.read_bytes()[:4] == b'wOF2'
    assert hashlib.sha256(file.read_bytes()).hexdigest() == font['woff2']['sha256']
    assert hashlib.sha256(license_file.read_bytes()).hexdigest() == font['license_sha256']
    assert 'SIL OPEN FONT LICENSE' in license_file.read_text()

for path in ['app.js', 'src', 'node_modules', 'work', '.git']:
    assert not (SITE / path).exists(), path
assert not any(p.is_symlink() for p in SITE.rglob('*')), 'Unexpected symlink'
google_fonts = [r for r in external if re.search(r'fonts\.(googleapis|gstatic)\.com', r['url'])]
assert not google_fonts, google_fonts
result = {'status': 'PASS', 'base': '/SerieN/', 'missingAssets': [],
          'references': refs, 'externalReferences': external,
          'externalGoogleFonts': google_fonts, 'runtimeInventory': inventory,
          'httpTargets': sorted(targets), 'fontsAndLicensesVerified': len(fonts),
          'sourceDirectoriesExcluded': ['app.js', 'src', 'node_modules', 'work', '.git'],
          'dynamicFamilies': {'catalogKeys': sorted(manifest), 'kenneyModels': models},
          'scope': 'runtime closure; historical documentation links are not application dependencies'}
(OUT / 'package-audit.json').write_text(json.dumps(result, indent=2) + '\n')
print('PASS', len(refs), 'references;', len(inventory), 'asset files;',
      len(targets), 'HTTP targets;', len(fonts), 'fonts + licenses')
