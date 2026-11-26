(() => {
 const context=key=>window.dispatchEvent(new CustomEvent('preview-context',{detail:{key}}));
 const definitions=[['ads','Ads'],['popups','Pop-ups'],['trackers','Trackers'],['malicious','Malicious sites'],['mining','Mining scripts']];
 const state={permission:false,enabled:{ads:true,popups:true,trackers:true,malicious:false,mining:false}};
 let webBusy=false,webError='',webUnknown=false,webFailNext=false,webPending=null,webTimer;
 try{const saved=JSON.parse(localStorage.getItem('clean-web-preview-v2'));if(saved){state.permission=saved.permission===true;for(const k of Object.keys(state.enabled))if(typeof saved.enabled?.[k]==='boolean')state.enabled[k]=saved.enabled[k];}}catch{}
 function saveWeb(){localStorage.setItem('clean-web-preview-v2',JSON.stringify(state));}
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 const scroll=$('#clean-scroll'),root=$('#modal-root'),content=$('#sheet-content');let returnFocus=null,currentSheet='',cancelPrivacy=()=>{},vaultController=null,settingsController=null;
 let activeTab='clean';
 const testScroll=$('#test-scroll'),positions={clean:0,test:0,vault:0,privacy:0};
 const activeScroll=()=>activeTab==='privacy'?$('#privacy-scroll'):activeTab==='vault'?$('#vault-scroll'):activeTab==='test'?testScroll:scroll;
 const count=()=>definitions.filter(([k])=>state.permission&&state.enabled[k]).length;
 const controls=(items=definitions)=>items.map(([k,title])=>`<div class="control-row"><img class="row-icon" src="assets/icons/${k}.png" alt=""><span class="row-label">${title}</span><button class="switch ${state.permission&&state.enabled[k]?'on':''}" role="switch" aria-label="${title}" aria-checked="${!!(state.permission&&state.enabled[k])}" data-control="${k}"></button></div>`).join('');
 function render(){
  const n=count(),label=webBusy?'Updating':webUnknown?'Check Setup':!state.permission?'Set Up':n===0?'Web Off':n===5?'Web On':'Partial';
  $('#web-controls').innerHTML='<div class="control-card">'+controls()+'</div>';
  $('#hero-switch').classList.toggle('on',n>0);$('#hero-switch').setAttribute('aria-checked',String(n>0));
  $('.hero').classList.toggle('inactive',n===0);$('#hero-state-text').textContent=webBusy?'Updating protection…':webUnknown?'Could not confirm setup':n?'Blocking enabled':state.permission?'Blocking disabled':'Set up Safari protection';
  let feedback=$('#web-feedback');if(!feedback){feedback=document.createElement('div');feedback.id='web-feedback';feedback.setAttribute('role','status');$('.hero').after(feedback);}feedback.replaceChildren();if(webError){const msg=document.createElement('p');msg.textContent=webError;const retry=document.createElement('button');retry.textContent='Try Again';retry.onclick=()=>commitWeb(webPending||state.enabled);feedback.append(msg,retry);}feedback.hidden=!webError;
  $('#hero-switch').disabled=webBusy;$('#web-master').disabled=webBusy;$$('[data-control]').forEach(b=>b.disabled=webBusy);
  $('#master-label').textContent=label;$('#web-master').className='master '+(!state.permission?'setup':n===0?'off':n===5?'all':'partial');$('#web-master').setAttribute('aria-label','Web protection: '+label);
  $('#web-master img').src=n===5?'assets/icons/shield-check.svg':'assets/icons/shield.png';
  $('.hero-art').src=n?'assets/hero-on.webp':'assets/hero-off.webp';
  $('.hero-art').alt=n?'Browser protected with ad and pop-up blocking':'';
  if(currentSheet==='manage')renderManage();
 }
 function open(html,type){if(root.hidden)returnFocus=document.activeElement;currentSheet=type;content.innerHTML=html;root.hidden=false;activeScroll().style.overflow='hidden';requestAnimationFrame(()=>content.querySelector('button')?.focus());}
 function close(){if(currentSheet==='privacy')cancelPrivacy();if(currentSheet==='vault')vaultController?.release();root.hidden=true;currentSheet='';content.innerHTML='';scroll.style.overflow='';testScroll.style.overflow='';$('#vault-scroll').style.overflow='';$('#privacy-scroll').style.overflow='';returnFocus?.focus({preventScroll:true});}
 const closeHTML='<button class="close-button" data-action="close">Close</button>';
 function renderManage(){content.innerHTML=closeHTML+'<h2 id="sheet-title">Web Protection</h2><div class="control-card">'+controls()+'</div><button class="sheet-action" data-action="all-on">Turn On All</button><button class="sheet-action secondary" data-action="all-off">Turn Off All</button>';}
 function manage(){if(!state.permission)return setup();open('','manage');renderManage();}
 // Settings navigation alone must not grant simulated or native authorization.
 document.addEventListener('guide-settings-return',({detail})=>{if(detail.feature==='web')render();});
 const rawGuide=window.initCleanGuide();const cleanGuide=(k,back)=>{context(k);rawGuide(k,back);};window.smsController.init(cleanGuide);window.callController.init(cleanGuide);window.calendarPreview.init(cleanGuide);
 function setup(){cleanGuide('web');}
 function confirmOff(){open('<h2 id="sheet-title">Turn Off Web Protection?</h2><p>Your Safari blocking controls will be turned off.</p><button class="sheet-action danger" data-action="confirm-off">Turn Off</button><button class="sheet-action secondary" data-action="close">Cancel</button>','confirm');}
 function commitWeb(next){if(webBusy)return;webPending={...next};webBusy=true;webError='';render();clearTimeout(webTimer);webTimer=setTimeout(()=>{const old={...state.enabled};try{if(webFailNext){webFailNext=false;throw Error('reload');}state.enabled={...webPending};saveWeb();webPending=null;}catch{state.enabled=old;webError='Could not update protection.';}webBusy=false;render();},400);}
 function setAll(v){commitWeb(Object.fromEntries(definitions.map(([k])=>[k,v])));}
 document.addEventListener('click',e=>{
  const control=e.target.closest('[data-control]');if(control){if(!state.permission)return setup();if(webBusy)return;const k=control.dataset.control;commitWeb({...state.enabled,[k]:!state.enabled[k]});const scope=root.hidden?$('#web-controls'):content;scope.querySelector(`[data-control="${k}"]`)?.focus({preventScroll:true});return;}
  const action=e.target.closest('[data-action]')?.dataset.action;
  if(action==='close')close();
  if(action==='all-on'){setAll(true);close();}
  if(action==='all-off')confirmOff();
  if(action==='confirm-off'){setAll(false);close();}
  if(action==='reset'){state.permission=false;state.enabled={ads:true,popups:true,trackers:true,malicious:false,mining:false};render();close();scroll.scrollTo({top:0,behavior:'smooth'});}
  if(action==='revoke'){state.permission=false;setAll(false);close();}
  if(action==='manage'){close();manage();}
 });
 $('#manage').onclick=()=>cleanGuide('web');
 $('#web-master').onclick=()=>{if(webUnknown)return setup();if(!state.permission)return setup();if(count()===0){setAll(true);return;}if(count()===5)return confirmOff();manage();};
 $('#hero-switch').onclick=()=>{if(webUnknown)return setup();if(!state.permission)return setup();count()?confirmOff():setAll(true);};
 $$('[data-tool]').forEach(b=>b.onclick=()=>b.dataset.tool==='calendar'?window.calendarPreview.open():b.dataset.tool==='sms'?window.smsController.show():b.dataset.tool==='call'?window.callController.show():cleanGuide(b.dataset.tool));
 $('.scrim').onclick=close;
 document.addEventListener('keydown',e=>{if(root.hidden)return;if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const f=[...content.querySelectorAll('button')];if(!f.length)return;const first=f[0],last=f[f.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 scroll.addEventListener('scroll',()=>{$('.phone').classList.toggle('is-scrolled',scroll.scrollTop>72);$('.compact-header').setAttribute('aria-hidden',String(scroll.scrollTop<=72));$('.compact-header').inert=scroll.scrollTop<=72;},{passive:true});
 function phoneVaultCleanup(){document.querySelector('.phone').classList.remove('vault-onboarding');}
 function selectTab(tab){
  if(settingsController?.isOpen())return;
  context(tab);
  if(tab===activeTab){activeScroll().scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});return;}
  if(!root.hidden)close();
  positions[activeTab]=activeScroll().scrollTop;if(activeTab==='vault')vaultController?.lock(false);phoneVaultCleanup();activeTab=tab;
  scroll.hidden=tab!=='clean';$('#test-page').hidden=tab!=='test';$('#vault-page').hidden=tab!=='vault';$('#privacy-page').hidden=tab!=='privacy';$('.phone').dataset.tab=tab;
  ['clean','test','vault','privacy'].forEach(t=>{const b=$('#'+t+'-tab');b.classList.toggle('active',t===tab);if(t===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  $('#clean-tab img').src=tab==='clean'?'assets/icons/tab-clean.png':'assets/test/tab-clean-inactive.png';
  $('#test-tab img').src=tab==='test'?'assets/test/tab-test-active.png':'assets/icons/tab-test.png';
  $('#vault-tab img').src=tab==='vault'?'assets/vault/lock-transparent.svg':'assets/icons/tab-vault.png';
  activeScroll().scrollTop=positions[tab];
  $('.compact-header').inert=tab!=='clean'||scroll.scrollTop<=72;
  history.replaceState(null,'','#'+tab);
  if(tab==='vault')vaultController?.enter();
 }
 $('#clean-tab').onclick=()=>selectTab('clean');
 $('#test-tab').onclick=()=>selectTab('test');
 $('#vault-tab').onclick=()=>selectTab('vault');
 $('#privacy-tab').onclick=()=>selectTab('privacy');
 const privacy=window.initPrivacy();cancelPrivacy=privacy.cancel;
 function showPrivacy(mode,record=true){
  context(mode);
  $('#privacy-page').hidden=true;if(record&&location.hash!=='#privacy/'+mode)history.pushState(null,'','#privacy/'+mode);
  privacy.show(mode,()=>{context('privacy');$('#privacy-page').hidden=false;history.replaceState(null,'','#privacy');$('[data-privacy="'+mode+'"]').focus({preventScroll:true});});
 }
 $$('[data-privacy]').forEach(b=>b.onclick=()=>showPrivacy(b.dataset.privacy));
 // Existing links and browser history must update the visible Privacy tool too.
 window.addEventListener('hashchange',()=>{
  if(settingsController?.isOpen())return;
  const route=location.hash,match=route.match(/^#privacy(?:\/(scan|redact|metadata))?$/);
  if(!match&&!/^#(clean|test|vault)$/.test(route))return;
  const apply=()=>{history.replaceState(null,'',route);if(match){selectTab('privacy');$('#privacy-page').hidden=false;history.replaceState(null,'',route);if(match[1])showPrivacy(match[1],false);}else selectTab(route.slice(1));};
  if(!$('#privacy-detail').hidden){const current='#privacy/'+$('#privacy-detail').dataset.mode;history.replaceState(null,'',current);privacy.requestExit(apply);}else apply();
 });
 vaultController=window.initVault({open:html=>open(html,'vault'),close});
 settingsController=window.initSettings({vault:vaultController,context,tab:()=>activeTab,setupVault:()=>selectTab('vault')});
 $$('.settings-trigger').forEach(b=>b.onclick=()=>settingsController.open(b));
 function showPerformance(key){
  context(key);
  $('#test-page').hidden=true;
  if(!location.hash.startsWith('#test/'+key+'/history'))history.replaceState(null,'','#test/'+key);
  window.testDetailController.open(key,()=>{context('test');$('#test-page').hidden=false;history.replaceState(null,'','#test');$('[data-test="'+key+'"]').focus({preventScroll:true});},html=>open(html,'test-history'));
 }
 const safetyDetail=window.initSafetyDetail();
 function showSafety(key){
  context(key);
  $('#test-page').hidden=true;history.replaceState(null,'','#test/'+key);
  safetyDetail(key,()=>{context('test');$('#test-page').hidden=false;history.replaceState(null,'','#test');$('[data-test="'+key+'"]').focus({preventScroll:true});});
 }
 $$('[data-test]').forEach(b=>b.onclick=()=>{const key=b.dataset.test;if(['speed','cpu','display'].includes(key))return showPerformance(key);showSafety(key);});
 document.addEventListener('wheel',e=>{if(!root.hidden||e.target.closest('.phone,.preview-panel'))return;activeScroll().scrollTop+=e.deltaY;e.preventDefault();},{passive:false});
 window.previewApp={webSnapshot:()=>({...state,enabled:{...state.enabled},busy:webBusy,error:webError,unknown:webUnknown}),web(mode){clearTimeout(webTimer);webBusy=false;webError='';webUnknown=false;if(mode==='save-failed'){state.permission=true;webFailNext=true;commitWeb({...state.enabled,ads:!state.enabled.ads});return;}if(mode==='unknown'){webUnknown=true;render();return;}state.permission=mode!=='setup';definitions.forEach(([k],i)=>state.enabled[k]=mode==='on'||(mode==='partial'&&i<3));try{saveWeb();}catch{}render();window.dispatchEvent(new CustomEvent('preview-context',{detail:{key:'clean',state:mode}}));},lockVault(){vaultController.lock();context('vault');}};
 function fit(){if(innerWidth<=440){document.documentElement.style.setProperty('--scale',1);$('.device-wrap').style.height='';$('.device-wrap').style.width='';return;}const s=Math.min(1,(innerHeight-40)/844);document.documentElement.style.setProperty('--scale',s);$('.device-wrap').style.height=(844*s)+'px';$('.device-wrap').style.width=(393*s)+'px';}addEventListener('resize',fit);fit();render();const initialRoute=location.hash;if(initialRoute.startsWith('#privacy'))selectTab('privacy');if(initialRoute.startsWith('#vault'))selectTab('vault');if(initialRoute.startsWith('#test')){selectTab('test');history.replaceState(null,'',initialRoute);}const initialDetail=initialRoute.split('/')[1];if(['speed','cpu','display'].includes(initialDetail))showPerformance(initialDetail);else if(['link','qr','wifi','device'].includes(initialDetail))showSafety(initialDetail);else if(initialRoute.startsWith('#privacy/')&&['scan','redact','metadata'].includes(initialDetail))showPrivacy(initialDetail);if(/^#settings(?:\/(?:membership|about|privacy-policy|terms-of-use))?$/.test(initialRoute))settingsController.open(null,initialDetail||'settings');
})();
