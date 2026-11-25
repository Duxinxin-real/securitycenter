window.initSettings=({vault,context,tab,web,setupVault})=>{
 const page=document.querySelector('#settings-page'),phone=document.querySelector('.phone');
 const byId=id=>document.getElementById(id);
 const icons={
  premium:'<path d="m12 2 8 4.5v7c0 4-3.5 7-8 8.5-4.5-1.5-8-4.5-8-8.5v-7L12 2Z"/><path d="m12 7 .95 2.55L15.5 10.5l-2.55.95L12 14l-.95-2.55-2.55-.95 2.55-.95L12 7Z"/>',
  shield:'<path d="m12 3 7 3.5v7c0 3.5-3 6-7 7.5-4-1.5-7-4-7-7.5v-7L12 3Z"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  chevron:'<path d="m9 5 7 7-7 7"/>',
  back:'<path d="m15 5-7 7 7 7"/>'
 };
 const icon=(name)=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
 const row=(label,id,kind)=>`<button class="sc-settings-row" id="${id}" type="button"><span class="sc-settings-icon ${kind}">${icon(kind)}</span><span>${label}</span><span class="sc-settings-chevron">${icon('chevron')}</span></button>`;
 const head=(title='')=>`<header class="sc-settings-header"><button class="detail-back" type="button" aria-label="Back">${icon('back')}</button>${title?`<h1>${title}</h1>`:''}</header>`;
 let screens=null,trigger=null,returnHash='',phase='',notice='',ownsHistory=false;
 function baseInert(){
  screens=new Map([phone.querySelector('.compact-header'),byId('clean-scroll'),byId('test-page'),byId('vault-page'),byId('privacy-page'),phone.querySelector('.tabbar')].filter(Boolean).map(el=>[el,el.inert]));
  for(const el of screens.keys())el.inert=true;
 }
 function setHash(route,push=false){
  if(push)history.pushState({scSettings:true},'',route);else history.replaceState(history.state,'',route);
 }
 function route(next){
  const nested=next==='membership'||next==='about';
  setHash(next==='membership'?'#settings/membership':next==='about'?'#settings/about':'#settings',nested&&phase==='settings');
 }
 function draw(next,move=true){
  phase=next;page.hidden=false;page.dataset.screen=next;context(next==='setup'||next==='unavailable'?'settings':next);
  if(next==='membership'){
   page.innerHTML=head()+`<div class="sc-membership-body"><img class="sc-membership-art" src="assets/settings/membership-hero.png" alt="" decoding="async"><div class="sc-membership-copy"><h1>More privacy,<br>less worry</h1><p>Safari ad blocking · Photo redaction<br>Private vault</p></div><div class="sc-membership-plan"><p><strong>$0.99</strong> for the first week</p><p>Then <strong>$9.99</strong> per week</p><p class="sc-membership-renewal">Auto-renews weekly. Cancel anytime.</p></div></div>`;
  }else if(next==='about'){
   page.innerHTML=head('About')+`<div class="sc-about"><span class="sc-settings-icon premium">${icon('premium')}</span><h2>SecurityCenter</h2></div>`;
  }else if(next==='setup'||next==='unavailable'){
   const setup=next==='setup';
   page.innerHTML=head('Change Passcode')+`<div class="sc-about"><span class="sc-settings-icon lock">${icon('lock')}</span><h2>${setup?'Set up Vault first':'Passcode change unavailable'}</h2>${setup?'<button id="sc-setup-vault" class="vault-primary" type="button">Set Up Vault</button>':''}</div>`;
   byId('sc-setup-vault')?.addEventListener('click',()=>{exit({preserveFocus:false,replace:true});setupVault();});
  }else{
   page.innerHTML=head('Settings')+`<div class="sc-settings-list"><button id="sc-membership" class="sc-premium" type="button"><span class="sc-premium-emblem">${icon('premium')}</span><span class="sc-premium-title">Membership</span><span class="sc-settings-chevron">${icon('chevron')}</span></button><div class="sc-settings-group">${row('Web Protection','sc-web','shield')}${row('Change Passcode','sc-passcode','lock')}</div><div class="sc-settings-group">${row('About','sc-about','info')}</div>${notice?'<p class="sc-settings-feedback" role="status">Passcode changed.</p>':''}</div>`;
   byId('sc-membership').onclick=()=>show('membership');
   byId('sc-about').onclick=()=>show('about');
   byId('sc-web').onclick=()=>{exit({preserveFocus:false,replace:true});web();};
   byId('sc-passcode').onclick=()=>{
    const result=vault.passcodeChangeStatus();
    if(result!=='ready'){draw(result);return;}
    const started=vault.changePasscode(changed=>{
     if(!screens)return;
     notice=changed?'changed':'';
     draw('settings',false);byId('sc-passcode').focus({preventScroll:true});
    },step=>{phase='changing';page.hidden=true;context('settings-passcode-'+step);});
    if(!started)draw('unavailable');
   };
  }
  const back=page.querySelector('.detail-back');back.onclick=goBack;if(move)back.focus({preventScroll:true});
 }
 function show(next){route(next);draw(next);}
 function exit({preserveFocus=true,replace=false}={}){
  if(!screens)return;
  vault.cancelPasscodeChange();page.hidden=true;page.replaceChildren();phase='';notice='';
  for(const [el,inert] of screens)el.inert=inert;
  screens=null;phone.classList.remove('settings-open');context(tab());
  if(replace)setHash(returnHash||'#'+tab());
  if(preserveFocus)trigger?.focus({preventScroll:true});
  trigger=null;
 }
 function goBack(){
  if(phase==='settings'){
   if(ownsHistory){history.back();return;}
   exit({replace:true});return;
  }
  if((phase==='membership'||phase==='about')&&history.state?.scSettings){history.back();return;}
  const prev=phase;setHash('#settings');draw('settings',false);
  byId(prev==='membership'?'sc-membership':prev==='about'?'sc-about':'sc-passcode')?.focus({preventScroll:true});
 }
 function open(button,routeName='settings'){
  if(screens)return;
  ownsHistory=!!button;trigger=button||phone.querySelector('#clean-scroll .settings-trigger');returnHash=button?location.hash:'#'+tab();notice='';
  baseInert();phone.classList.add('settings-open');
  if(button)setHash('#settings',true);
  draw(routeName);
 }
 window.addEventListener('popstate',()=>{
  if(location.hash==='#settings'||location.hash==='#settings/membership'||location.hash==='#settings/about'){
   const next=location.hash.slice(1).split('/')[1]||'settings';
   if(!screens){open(null,next);ownsHistory=!!history.state?.scSettings;}
   else{vault.cancelPasscodeChange();const old=phase;draw(next,next!=='settings');if(next==='settings')byId(old==='membership'?'sc-membership':old==='about'?'sc-about':'sc-passcode')?.focus({preventScroll:true});}
  }else if(screens)exit();
 });
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&screens&&phase==='changing'){
   vault.cancelPasscodeChange();draw('settings',false);
  }
 });
 window.addEventListener('pagehide',()=>vault.cancelPasscodeChange());
 page.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();goBack();}});
 return {open,isOpen:()=>!!screens};
};
