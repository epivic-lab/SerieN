import os,runpy
os.environ['SERIEN_URL']='http://127.0.0.1:8033/'
os.environ['U2_OUTPUT']='docs/_active/ui-v21/evidence/U6/U2-smoke'
runpy.run_path('tests/browser-ui-v21-U2.py',run_name='__main__')
