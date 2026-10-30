"""Plot recorded browser telemetry; requires the environment's matplotlib only.
No product dependency or model data is modified.
"""
import json,os
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
work=Path(os.environ.get('S5_WORK','/workspace/work/s5'));out=Path(os.environ.get('S5_PLOT_OUTPUT',str(work/'plots')));out.mkdir(parents=True,exist_ok=True)
r=json.loads((work/'browser-s5/browser.json').read_text());samples=r['cases']['predictive-stop-and-real-panel-recovery']['samples'];time=[s['timeSeconds'] for s in samples]
fig,axes=plt.subplots(2,1,figsize=(8.3,5.8),sharex=True,layout='constrained')
axes[0].plot(time,[abs(s['velocity']) for s in samples],color='#24528c',marker='o',markersize=3);axes[0].set_ylabel('Velocità assoluta (mm/s)');axes[0].set_title('S5 — frenata del convoglio nativo 2, ingresso Y-4 C')
axes[1].plot(time,[s['gap'] for s in samples],color='#24528c',marker='o',markersize=3,label='Respingente → porta ferroviaria')
axes[1].axhline(30,color='#bb3545',linestyle='--',label='Inizio area protetta esistente: 30 mm');axes[1].axhspan(0,30,color='#bb3545',alpha=.07);axes[1].set_ylim(26,84);axes[1].set_ylabel('Distanza ferroviaria (mm)');axes[1].set_xlabel('Tempo simulato (s)');axes[1].legend(loc='upper right',fontsize=8)
for ax in axes:ax.grid(True,alpha=.2)
fig.suptitle('Campioni browser ogni 10 tick + arresto al tick 108; passo 1/60 s',fontsize=10)
for extension in ['png','svg']:fig.savefig(out/f'braking.{extension}',dpi=150)
svg=out/'braking.svg';svg.write_text('\n'.join(line.rstrip() for line in svg.read_text().splitlines())+'\n')
plt.close(fig)
print('Plotted actual telemetry:',len(samples),'samples; final gap',samples[-1]['gap'])
