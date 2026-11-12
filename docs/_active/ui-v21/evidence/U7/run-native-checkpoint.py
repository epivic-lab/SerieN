from pathlib import Path
s=Path('docs/_active/ui-v21/evidence/U7/run-native-final.py').read_text().replace("ev/'native-final'","ev/'native-checkpoint'").replace("ev/'native-final-provenance.json'","ev/'native-checkpoint-provenance.json'")
exec(compile(s,'U7-native-checkpoint','exec'),{'__file__':str(Path('docs/_active/ui-v21/evidence/U7/run-native-final.py').resolve()),'__name__':'__main__'})
