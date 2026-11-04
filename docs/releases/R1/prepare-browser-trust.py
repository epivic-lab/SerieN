"""Trust the managed OS proxy CA only in a disposable Chromium profile.
Uses Chromium's ServerCertificate schema and CertificateMetadata proto (trust=3),
constrained to the release hostname. Never disables TLS or changes the global store.
Schema: chromium/components/server_certificate_database/server_certificate_database.proto.
"""
import argparse,hashlib,json,sqlite3,ssl
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('profile',type=Path);parser.add_argument('--url',default='https://epivic-lab.github.io/SerieN/');args=parser.parse_args();profile=args.profile.resolve();host=urlparse(args.url).hostname;assert host
ca=Path('/usr/local/share/ca-certificates/environment-proxy-ca.crt');proxy=json.loads(Path('/etc/codex/network-policy.json').read_text())['http_proxy']
with sync_playwright()as pw:
 c=pw.chromium.launch_persistent_context(str(profile),executable_path='/usr/bin/chromium',headless=True,proxy={'server':proxy},args=['--no-sandbox','--enable-unsafe-swiftshader']);p=c.pages[0];p.goto('chrome://certificate-manager/localcerts/usercerts');p.wait_for_timeout(1000);c.close()
def varint(v):
 b=bytearray()
 while v>127:b.append((v&127)|128);v>>=7
 b.append(v);return bytes(b)
def field(n,b):return varint(n*8+2)+varint(len(b))+b
der=ssl.PEM_cert_to_DER_cert(ca.read_text());metadata=field(1,b'\x08\x03')+field(2,field(1,host.encode()))
con=sqlite3.connect(profile/'Default/ServerCertificate');con.execute('INSERT OR REPLACE INTO certificates VALUES(?,?,?)',(hashlib.sha256(der).hexdigest(),der,metadata));con.commit();con.close();print('Temporary browser CA trust configured for',host)
