"""Independent checks on the diagnostic import, not on the running simulator."""
import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('jmri_audit',ROOT/'scripts/analyze-jmri-layout.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class AuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory();cls.out=Path(cls.temp.name)
        cls.source=ROOT/'docs/jmri-layout/source.xml'
        with contextlib.redirect_stdout(io.StringIO()):cls.data=module.audit(cls.source,cls.out)
    @classmethod
    def tearDownClass(cls):cls.temp.cleanup()
    def test_source_is_preserved_and_counts_reconcile(self):
        self.assertEqual(self.source.read_bytes(),(self.out/'source.xml').read_bytes())
        self.assertEqual(self.data['sourceCounts'],{'trackSegments':53,'points':56,'turnouts':6,'explicitBumpers':3})
        self.assertEqual(self.data['catalogReconciliation']['representedPhysicalPieces'],57)
        self.assertEqual(self.data['catalogReconciliation']['bomTotalPieces'],61)
        self.assertEqual(self.data['catalogReconciliation']['missingPhysicalPieces'],4)
    def test_only_two_unambiguous_small_joins(self):
        pairs=self.data['amendments']['joins']
        self.assertEqual({(p['a'],p['b']) for p in pairs},{('A55','TO0:B'),('A60','TO4:B')})
        self.assertTrue(all(abs(p['distanceMm']-2)<1e-8 and p['tangentMismatchDegrees']<1 for p in pairs))
        self.assertEqual(self.data['rawGraph']['componentCount'],9)
        self.assertEqual(self.data['rawGraph']['cycleRank'],0)
        self.assertEqual(self.data['normalizedGraph']['componentCount'],8)
        self.assertEqual(self.data['normalizedGraph']['cycleRank'],1)
    def test_no_references_or_isolated_points_are_invented(self):
        self.assertEqual(self.data['unresolvedReferences'],[])
        self.assertEqual(self.data['reciprocalErrors'],[])
        self.assertEqual(self.data['rawGraph']['isolatedNodes'],[])
        singles=[c['edges'] for c in self.data['normalizedGraph']['components'] if len(c['edges'])==1]
        self.assertEqual(singles,[['T34'],['T35']])
        self.assertEqual(set(self.data['amendments']['zeroLengthConnectors']),{'T51','T52'})
    def test_fourth_buffer_is_the_only_xml_change(self):
        source=ET.parse(self.source);reviewed=ET.parse(self.out/'with-fourth-buffer.xml')
        left=list(source.getroot().iter());right=list(reviewed.getroot().iter())
        self.assertEqual(len(left),len(right));changes=[]
        for a,b in zip(left,right):
            self.assertEqual(a.tag,b.tag)
            if a.attrib!=b.attrib:changes.append((a.attrib,b.attrib))
        self.assertEqual(len(changes),1)
        a,b=changes[0];self.assertEqual(a['ident'],'A67');self.assertEqual(a['type'],'ANCHOR');self.assertEqual(b['type'],'END_BUMPER')
        self.assertEqual({k:v for k,v in a.items() if k!='type'},{k:v for k,v in b.items() if k!='type'})
        stops=[n['id'] for n in self.data['normalizedGraph']['nodes'] if n['type']=='END_BUMPER']
        self.assertEqual(set(stops),{'A67','EB39','EB49','EB52'})
    def test_turnout_ports_and_ui_mapping_remain_distinct(self):
        for t in self.data['turnouts']:
            self.assertEqual(set(t['ports']),{'A','B','C'})
            self.assertEqual(t['forbiddenTransition'],['B','C'])
        proposal=self.data['proposedControlMapping']
        self.assertEqual(len(proposal),8)
        self.assertEqual(len({p['xmlTurnout'] for p in proposal if p['xmlTurnout']}),6)
        self.assertFalse(self.data['controlMappingApplied']);self.assertFalse(self.data['simulatorIntegrated'])
    def test_svg_contains_only_exported_segments_and_one_transform(self):
        ns={'s':'http://www.w3.org/2000/svg'}
        original=ET.parse(self.out/'layout-original.svg').getroot()
        tracks=original.find('s:g[@id="xml-tracks"]',ns)
        self.assertEqual(len(tracks),51)
        self.assertEqual(sum(' A ' in p.attrib['d'] for p in tracks),27)
        self.assertEqual({p.attrib['id'] for p in tracks},{s['id'] for s in self.data['segments'] if not s['zeroLength']})
        mini=ET.parse(self.out/'minimap-reviewed.svg').getroot()
        self.assertEqual(mini.attrib['viewBox'],'0 0 1500 700')
        self.assertAlmostEqual(module.world({'x':56.3,'y':122.4})['x'],260)
        self.assertAlmostEqual(module.world({'x':56.3,'y':122.4})['z'],231)
        self.assertTrue(self.data['noTunnels'])
    def test_preserved_legacy_sources_match_the_historical_lock(self):
        lock=json.loads((ROOT/'docs/phase-0/network-lock.json').read_text())
        for file,key in [('network.js','networkSource'),('simulation.js','simulationSource')]:
            self.assertEqual(hashlib.sha256((ROOT/'docs/phase-0/baseline'/file).read_bytes()).hexdigest(),lock[key])

    def test_parser_rejects_invalid_source_references_and_duplicate_identifiers(self):
        for kind in ['reference','duplicate','turnout','dtd']:
            tree=ET.parse(self.source);editor=tree.getroot().find('LayoutEditor')
            if kind=='reference':editor.find('tracksegment').set('connect1name','UNKNOWN')
            if kind=='duplicate':editor.append(ET.fromstring(ET.tostring(editor.find('positionablepoint'))))
            if kind=='turnout':editor.find('layoutturnout').set('type','8')
            path=self.out/('bad-'+kind+'.xml');tree.write(path)
            if kind=='dtd':path.write_text('<!DOCTYPE layout-config SYSTEM "https://invalid.example/test.dtd">'+path.read_text())
            with self.assertRaises(ValueError):module.audit(path,self.out/('bad-output-'+kind))
        with self.assertRaises(ValueError):module.audit(self.source,self.out/'bad-tolerance',33)
    def test_canonical_artifact_is_the_exact_runtime_graph_and_all_sources_are_traceable(self):
        runtime=(ROOT/'src/canonical-layout.json').read_bytes()
        self.assertEqual(runtime,(ROOT/'docs/jmri-layout/canonical-graph.json').read_bytes())
        graph=json.loads(runtime)
        self.assertEqual(graph['statistics'],{'nodes':70,'edges':75,'components':1,'cycleRank':6,'terminals':4})
        self.assertEqual({t['id'] for t in graph['terminals']},{'A67','EB39','EB49','EB52'})
        self.assertTrue(all(not t['physicalUsefulLengthCertified'] for t in graph['terminals']))
        for key,hashkey in [('pdf','pdfSha256'),('dossier','dossierSha256')]:
            self.assertEqual(hashlib.sha256((ROOT/graph['sources'][key]).read_bytes()).hexdigest(),graph['sources'][hashkey])
        ns={'s':'http://www.w3.org/2000/svg'}
        svg=ET.parse(ROOT/'docs/jmri-layout/layout-canonical.svg').getroot()
        ids={path.attrib['id'] for path in svg.findall('.//s:path',ns)}
        self.assertEqual(ids,{e['id'] for e in graph['edges']})
        self.assertEqual(len(svg.find('s:g[@id="unresolved"]',ns)),0)
        self.assertIsNotNone(svg.find('s:g[@id="profile-review"]',ns))

if __name__=='__main__':unittest.main()
