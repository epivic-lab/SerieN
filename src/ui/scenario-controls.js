import {createGuardModal} from './guard-modal.js';

export function mountScenarioControls({profile,scenic,management,stopAll,location=window.location}) {
  const settings=document.querySelector('#dlg .u2-settings');
  const label=document.createElement('label');label.className='u2-setting';label.textContent='Scenario';
  const select=document.createElement('select');select.id='scenarioProfile';select.setAttribute('aria-label','Scenario');
  for(const [id,name] of [['legacy','Legacy'],['v06','V06']]){const option=document.createElement('option');option.value=id;option.textContent=name;select.append(option);}
  select.value=profile.id;label.append(select);settings.append(label);
  const guard=createGuardModal({title:'Change scenario?',confirmLabel:'Change and reload',titleId:'scenarioGuardTitle',guardClass:'scenario-guard'});
  let disposed=false;
  const change=()=>{
    const target=select.value;select.value=profile.id;
    if(target===profile.id||!['legacy','v06'].includes(target))return;
    const generation=JSON.stringify(management.sessionSummary);
    guard.request({origin:select,message:'Changing scenario starts a new session. Trains, projects and Depot records from this session will be lost.',
      valid:()=>!disposed&&JSON.stringify(management.sessionSummary)===generation,
      confirm:()=>{stopAll();const url=new URL(location.href);url.searchParams.set('scenario',target);location.assign(url.href);}});
  };
  select.addEventListener('change',change);
  let technicalLabel,technical,toggle;
  if(profile.id==='v06') {
    technicalLabel=document.createElement('label');technicalLabel.className='u2-setting';
    technical=document.createElement('input');technical.type='checkbox';technical.id='scenarioTechnical';
    technicalLabel.append(technical,document.createTextNode(' Track axes and reference markers'));
    toggle=()=>scenic.setTechnical(technical.checked);technical.addEventListener('change',toggle);settings.append(technicalLabel);
  }
  return {dispose(){disposed=true;guard.dispose();select.removeEventListener('change',change);label.remove();technical?.removeEventListener('change',toggle);technicalLabel?.remove();}};
}
