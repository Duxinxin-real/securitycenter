window.initVault=({open,close})=>{
 const $=s=>document.querySelector(s),page=$('#vault-page'),panel=$('#vault-pin-page'),phone=$('.phone');
 const modes=['private','decoy'],store='clean-vault-v1',encoder=new TextEncoder();
 // Explicit opt-in, fixed for this document. Never open persistent Vault storage in this mode.
 const previewValues=new URLSearchParams(location.search).getAll('vault-preview');
 const publicPreview=location.host.toLowerCase()==='duxinxin-real.github.io';
 const onboardingPreview=publicPreview||(previewValues.length===1&&previewValues[0]==='onboarding');
 const transient={profiles:{},catalogs:new Map(),media:new Map()};
 const readProfiles=()=>onboardingPreview?structuredClone(transient.profiles):JSON.parse(localStorage.getItem(store)||'{}');
 const saveProfiles=profiles=>{if(onboardingPreview)transient.profiles=structuredClone(profiles);else localStorage.setItem(store,JSON.stringify(profiles));};
 const samples={private:[['personal','Personal'],['documents','Documents'],['travel','Travel'],['videos','Videos']],decoy:[['everyday','Everyday'],['trips','Trips'],['personal','Favorites'],['videos','Videos']]};
 const state={profile:{},key:null,active:null,album:null,version:0,revision:null,transactions:new Set(),urls:[],data:{private:[],decoy:[]}};
 let profileError=false;
 try{const p=readProfiles();if(!p||Array.isArray(p)||typeof p!=='object')throw Error('Invalid profile');for(const m of modes)if(p[m]){if(!p[m].salt||!p[m].iv||!p[m].proof)throw Error('Invalid profile');state.profile[m]=p[m];}}catch{profileError=true;}
 const emptyAlbums=m=>(publicPreview?[]:onboardingPreview?samples[m].slice(0,m==='private'?2:1):samples[m]).map(([cover,name])=>({id:crypto.randomUUID(),cover,name,items:[]}));
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const ready=()=>Boolean(crypto.subtle),bytes=x=>new Uint8Array(x),vector=()=>crypto.getRandomValues(new Uint8Array(12));
 const back='<button class="detail-back" aria-label="Back"><img src="assets/test/detail-back.svg" alt=""></button>';
 const icon=(file)=>`<img src="assets/vault/${file}" alt="">`;
 const current=()=>state.data[state.active]?.find(a=>a.id===state.album);
 function release(){state.urls.forEach(URL.revokeObjectURL);state.urls=[];}
 function url(blob){const u=URL.createObjectURL(blob);state.urls.push(u);return u;}
 async function derive(pin,salt){const base=await crypto.subtle.importKey('raw',encoder.encode(pin),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:600000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
 async function verify(m,pin){const p=state.profile[m];if(!p)return null;try{const k=await derive(pin,bytes(p.salt));const d=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(p.iv)},k,bytes(p.proof));return new TextDecoder().decode(d)==='vault:'+m?k:null;}catch{return null;}}
 // IndexedDB contains only authenticated ciphertext and opaque random record IDs.
 let databasePromise;
 function database(){if(onboardingPreview)throw Error('Persistent storage is not used in this preview.');if(databasePromise)return databasePromise;databasePromise=new Promise((resolve,reject)=>{
  let request;try{request=indexedDB.open('clean-vault-encrypted-v1',1);}catch(e){reject(e);return;}
  request.onupgradeneeded=()=>{const db=request.result;db.createObjectStore('catalogs',{keyPath:'id'});db.createObjectStore('media',{keyPath:'id'});};
  request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Storage is busy. Close other tabs and try again.'));
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();databasePromise=null;};resolve(db);};
 }).catch(()=>{databasePromise=null;throw Error('Browser storage is unavailable. Try again.');});return databasePromise;}
 async function readRecord(table,id){if(onboardingPreview)return structuredClone(transient[table].get(id));const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction(table,'readonly'),request=tx.objectStore(table).get(id);let result;request.onsuccess=()=>result=request.result;tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(tx.error||Error('Storage unavailable.'));});}
 async function seal(key,value,id){const iv=vector();const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(id)},key,value);return {id,iv,data:new Blob([data])};}
 async function unseal(key,record){if(!record)throw Error('Stored data is unavailable.');return crypto.subtle.decrypt({name:'AES-GCM',iv:record.iv,additionalData:encoder.encode(record.id)},key,await record.data.arrayBuffer());}
 async function writeCatalog(id,key,albums,revision,media,valid){
  const record=await seal(key,encoder.encode(JSON.stringify(albums)),id);record.revision=(revision||0)+1;
  if(onboardingPreview){if(!valid())throw Error('Vault locked.');const actual=transient.catalogs.get(id);if((revision===null&&actual)||(revision!==null&&actual?.revision!==revision))throw Error('Albums changed. Lock and unlock to reload.');transient.catalogs.set(id,structuredClone(record));for(const item of media)transient.media.set(item.id,structuredClone(item));return record.revision;}
  const db=await database();if(!valid())throw Error('Vault locked.');
  await new Promise((resolve,reject)=>{const tx=db.transaction(['catalogs','media'],'readwrite');state.transactions.add(tx);let failure;
   const request=tx.objectStore('catalogs').get(id);request.onsuccess=()=>{if(!valid()){failure=Error('Vault locked.');tx.abort();return;}const actual=request.result;
    if((revision===null&&actual)||(revision!==null&&actual?.revision!==revision)){failure=Error('Albums changed in another tab. Lock and unlock to reload.');tx.abort();return;}
    tx.objectStore('catalogs').put(record);for(const item of media)tx.objectStore('media').put(item);
   };
   tx.oncomplete=()=>{state.transactions.delete(tx);resolve();};tx.onabort=tx.onerror=()=>{state.transactions.delete(tx);reject(failure||Error('Could not save. Check available storage and try again.'));};
  }).catch(e=>{if(e.message==='Vault locked.'||e.message==='Albums changed in another tab. Lock and unlock to reload.')throw e;throw Error('Could not save. Check available storage and try again.');});return record.revision;
 }
 async function loadCatalog(m,key,valid){const p=state.profile[m];
  // Legacy versions never persisted albums or media. Initialize only after a valid PIN.
  // Once a catalog ID exists, missing/corrupt data is an error, never a reset.
  if(!p.catalogId){const id=crypto.randomUUID(),albums=emptyAlbums(m);await writeCatalog(id,key,albums,null,[],valid);if(!valid())throw Error('Vault locked.');const profiles={...state.profile,[m]:{...p,catalogId:id}};saveProfiles(profiles);state.profile=profiles;return {albums,revision:1};}
  const record=await readRecord('catalogs',p.catalogId);const decoded=await unseal(key,record);const albums=JSON.parse(new TextDecoder().decode(decoded));
  if(!Array.isArray(albums)||albums.some(a=>typeof a.id!=='string'||typeof a.name!=='string'||!Array.isArray(a.items)))throw Error('Stored data could not be opened.');
  return {albums,revision:record.revision};
 }
 async function configure(m,pin,valid){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=vector(),key=await derive(pin,salt);const proof=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode('vault:'+m));if(!valid())return null;
  const catalogId=crypto.randomUUID();await writeCatalog(catalogId,key,emptyAlbums(m),null,[],valid);if(!valid())return null;
  const latest=readProfiles();if(latest[m])throw Error('Passcode settings changed. Reload and unlock to continue.');const profile={...latest,[m]:{salt:[...salt],iv:[...iv],proof:[...bytes(proof)],catalogId}};try{saveProfiles(profile);}catch{throw Error('Could not save passcode. Check browser storage and try again.');}state.profile=profile;return key;
 }
 function hidePanel(){state.version++;panel.hidden=true;panel.replaceChildren();panel.onkeydown=null;page.inert=false;phone.classList.remove('detail-open');}
 function lock(show=true){for(const tx of state.transactions){try{tx.abort();}catch{}}close();release();state.data={private:[],decoy:[]};state.revision=null;state.key=null;state.active=null;state.album=null;hidePanel();$('#vault-grid').replaceChildren();$('#vault-albums').hidden=true;$('#vault-trust').hidden=true;$('#vault-lock').hidden=true;if(show&&!page.hidden)enter();}
 function enter(){if(profileError){hidePanel();panel.hidden=false;phone.classList.add('detail-open');panel.innerHTML='<div class="vault-pin-header"><h1>Vault</h1><p>Could not open stored data.</p><button class="vault-primary" id="vault-retry">Try Again</button></div>';$('#vault-retry').onclick=()=>location.reload();return;}if(state.active)return;$('#vault-lock').hidden=true;if(state.profile.private)unlockPrompt();else{hidePanel();$('#vault-trust').hidden=false;phone.classList.remove('vault-onboarding');}}
 async function unlock(m,key){const version=state.version,valid=()=>state.version===version;let stored;
  try{stored=await loadCatalog(m,key,valid);}catch(e){if(valid())throw Error(e.message==='Vault locked.'?e.message:'Could not open stored albums. Check browser storage and try again.');return;}if(!valid())return;
  hidePanel();phone.classList.remove('vault-onboarding');state.data={private:[],decoy:[]};state.data[m]=stored.albums;state.revision=stored.revision;state.active=m;state.key=key;state.album=null;$('#vault-trust').hidden=true;$('#vault-albums').hidden=false;$('#vault-lock').hidden=false;render();$('#vault-lock').focus({preventScroll:true});
 }
 function prompt({title,hint='',action,handler,onBack,skip}){
  close();release();hidePanel();const version=state.version;phone.classList.add('detail-open','vault-onboarding');page.inert=true;panel.hidden=false;
  panel.innerHTML=`<header class="vault-pin-header">${back}<h1>${title}</h1>${hint?`<p>${hint}</p>`:''}</header><div class="vault-pin-body"><div class="pin-dots" role="status" aria-label="0 of 6 digits entered">${'<span></span>'.repeat(6)}</div><p class="vault-pin-error" role="alert"></p><div class="pin-keypad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button data-digit="${n}">${n}</button>`).join('')}<span></span><button data-digit="0">0</button><button class="pin-delete">Delete</button></div></div><footer class="vault-pin-footer"><button class="vault-primary pin-submit" disabled>${action}</button>${skip?'<button class="vault-skip">Not Now</button>':''}</footer>`;
  let value='',busy=false;const submit=panel.querySelector('.pin-submit'),error=panel.querySelector('.vault-pin-error');const valid=()=>version===state.version&&!panel.hidden;
  function update(){panel.querySelectorAll('.pin-dots span').forEach((d,i)=>d.classList.toggle('filled',i<value.length));panel.querySelector('.pin-dots').setAttribute('aria-label',value.length+' of 6 digits entered');submit.disabled=busy||value.length!==6||!ready();panel.querySelectorAll('[data-digit],.pin-delete,.detail-back,.vault-skip').forEach(b=>b.disabled=busy);}
  function edit(d){if(busy)return;value=d==='delete'?value.slice(0,-1):value.length<6?value+d:value;error.textContent='';update();}
  panel.querySelectorAll('[data-digit]').forEach(b=>b.onclick=()=>edit(b.dataset.digit));panel.querySelector('.pin-delete').onclick=()=>edit('delete');
  const navigate=async fn=>{if(busy)return;busy=true;update();try{await fn();}catch(e){if(valid())error.textContent=e.message||'Please try again.';}finally{if(valid()){busy=false;update();}}};panel.querySelector('.detail-back').onclick=()=>navigate(onBack);panel.querySelector('.vault-skip')?.addEventListener('click',()=>navigate(skip));
  panel.onkeydown=e=>{if(/^\d$/.test(e.key)){e.preventDefault();edit(e.key);}else if(e.key==='Backspace'){e.preventDefault();edit('delete');}else if(e.key==='Enter'){e.preventDefault();submit.click();}else if(e.key==='Escape'){e.preventDefault();navigate(onBack);}};
  submit.onclick=async()=>{if(submit.disabled)return;busy=true;update();try{await handler(value,valid);}catch(e){if(valid()){value='';error.textContent=e.message||'Please try again.';}}finally{if(valid()){busy=false;update();}}};
  if(!ready())error.textContent='Passcodes are unavailable in this browser.';panel.querySelector('.detail-back').focus({preventScroll:true});
 }
 function twoWays(){
  if(state.profile.private)return enter();
  close();release();hidePanel();$('#vault-trust').hidden=true;page.inert=true;panel.hidden=false;phone.classList.add('detail-open','vault-onboarding');
  const miniature=(main)=>`<div class="vault-mini-album"><div class="vault-mini-header"><span></span>${icon('lock-transparent.svg')}${icon('plus-transparent.svg')}</div><div class="vault-mini-photos">${main?'<span class="vault-mini-id"></span><span class="vault-mini-selfie"></span>':'<span class="vault-mini-sea"></span>'}</div></div>`;
  panel.innerHTML=`<div class="vault-two-ways"><header class="vault-pin-header">${back}<h1>Two Ways In</h1></header><div class="vault-flow" aria-label="A main passcode and a decoy passcode open separate albums"><div class="vault-flow-code" aria-hidden="true">${icon('lock-transparent.svg')}<div>${'<span></span>'.repeat(6)}</div></div><div class="vault-flow-branches" aria-hidden="true"><span></span><img class="branch-left" src="assets/vault/arrow-down.svg" alt=""><img class="branch-right" src="assets/vault/arrow-down.svg" alt=""></div><div class="vault-flow-columns"><div><h2>Main Passcode</h2><img class="vault-flow-arrow" src="assets/vault/arrow-down.svg" alt="">${miniature(true)}</div><div><h2>Decoy Passcode</h2><img class="vault-flow-arrow" src="assets/vault/arrow-down.svg" alt="">${miniature(false)}</div></div></div><footer class="vault-pin-footer"><button class="vault-primary" id="vault-start-main">Set Main Passcode</button></footer></div>`;
  panel.querySelector('.detail-back').onclick=enter;$('#vault-start-main').onclick=()=>setup('private');panel.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();enter();}};
  panel.querySelector('.detail-back').focus({preventScroll:true});
 }
 function setup(mode,mainKey){const secondary=mode==='decoy';
  prompt({title:secondary?'Set Backup Passcode':'Set Passcode',hint:secondary?'Opens a separate set of albums.':'Enter 6 digits',action:'Continue',onBack:()=>secondary?unlock('private',mainKey):twoWays(),skip:secondary?()=>unlock('private',mainKey):null,handler:async(pin,valid)=>{
   if(secondary&&await verify('private',pin)){if(valid())throw Error('Choose a different passcode.');return;}if(!valid())return;
   prompt({title:'Confirm Passcode',hint:'Enter the same 6 digits again',action:'Save Passcode',onBack:()=>setup(mode,mainKey),handler:async(confirm,valid)=>{if(confirm!==pin)throw Error('Passcodes do not match.');const key=await configure(mode,pin,valid);if(!key||!valid())return;if(secondary)await unlock('private',mainKey);else setup('decoy',key);}});
  }});
 }
 let attempts=0,until=0;
 function unlockPrompt(){prompt({title:'Unlock Vault',action:'Unlock',onBack:()=>{lock(false);phone.classList.remove('vault-onboarding');$('#clean-tab').click();},handler:async(pin,valid)=>{
  if(Date.now()<until)throw Error('Wait 30 seconds, then try again.');
  // Always evaluate both configured records before reporting one neutral result.
  const keys=await Promise.all(modes.map(m=>verify(m,pin)));if(!valid())return;const i=keys.findIndex(Boolean);
  if(i>=0){attempts=0;until=0;await unlock(modes[i],keys[i]);return;}if(++attempts>=5){until=Date.now()+30000;attempts=0;}throw Error('Incorrect passcode.');
 }});}
 function render(){if(!state.active)return;release();const albums=state.data[state.active],empty=!albums.length;$('#vault-albums').classList.toggle('is-empty',empty);$('#vault-empty-state').hidden=!empty;$('#vault-grid').hidden=empty;$('#vault-grid').innerHTML=albums.map(a=>`<button class="vault-album" data-album="${a.id}"><span class="vault-cover ${a.cover==='videos'?'vault-video-cover':''}"><img src="assets/vault/${esc(a.cover)}.png" alt=""></span><strong>${esc(a.name)}</strong><span class="album-count">${a.items.length} ${a.items.length===1?'item':'items'}</span></button>`).join('');}
 async function showAlbum(id){if(!state.active)return;close();release();hidePanel();state.album=id;const a=current();if(!a)return;const version=state.version,key=state.key;panel.hidden=false;page.inert=true;phone.classList.add('detail-open');
  panel.innerHTML=`<header class="vault-album-header">${back}<h1>${esc(a.name)}</h1><button class="vault-icon" id="vault-more" aria-label="Album options"><img src="assets/vault/more.svg" alt=""></button></header><div class="vault-media" id="vault-media">${a.items.length?'':'<p class="vault-empty">No photos or videos yet</p>'}</div><footer class="vault-pin-footer"><button class="vault-primary" id="vault-album-add">${icon('plus-transparent.svg')}Add Media</button></footer>`;
  panel.querySelector('.detail-back').onclick=()=>{close();hidePanel();state.album=null;render();};$('#vault-more').onclick=()=>{open('<div id="vault-menu"><h2 id="sheet-title" class="vault-sheet-title">Album options</h2><button class="sheet-action" id="vault-rename">Rename Album</button><button class="sheet-action secondary" data-action="close">Cancel</button></div>');$('#vault-rename').onclick=()=>nameForm(a);};$('#vault-album-add').onclick=()=>addMedia(a);
  for(const item of a.items){try{const record=await readRecord('media',item.id);const data=await unseal(key,record);if(version!==state.version||state.album!==id)return;const media=document.createElement(item.type.startsWith('video/')?'video':'img');media.src=url(new Blob([data],{type:item.type}));media.alt='Album photo';if(media.tagName==='VIDEO'){media.controls=true;media.preload='metadata';}$('#vault-media').append(media);}catch{if(version===state.version){const p=document.createElement('p');p.textContent='Could not open an item.';$('#vault-media').append(p);}}}
 }
 function nameForm(album){const mode=state.active,version=state.version;if(!mode)return;open(`<button class="close-button" data-action="close">Cancel</button><h2 id="sheet-title">${album?'Rename Album':'New Album'}</h2><form id="vault-name-form"><label for="vault-name">Album name</label><input id="vault-name" autocomplete="off" maxlength="60" value="${esc(album?.name||'')}" placeholder="Album name"><p id="vault-name-error" role="alert"></p><button class="sheet-action" type="submit" id="vault-name-save">Save</button></form>`);
  const input=$('#vault-name'),save=$('#vault-name-save');const update=()=>save.disabled=!input.value.trim();input.oninput=update;update();setTimeout(()=>{if(input.isConnected){input.focus();input.select();}},0);
  $('#vault-name-form').onsubmit=async e=>{e.preventDefault();const valid=()=>state.active===mode&&state.version===version&&input.isConnected;if(!valid()||save.disabled)return;const name=input.value.trim();if(!name)return;if(state.data[mode].some(a=>a.id!==album?.id&&a.name.toLocaleLowerCase()===name.toLocaleLowerCase())){$('#vault-name-error').textContent='An album with this name already exists.';return;}
   const next=structuredClone(state.data[mode]);if(album)next.find(a=>a.id===album.id).name=name;else next.push({id:crypto.randomUUID(),name,cover:'personal',items:[]});save.disabled=true;input.disabled=true;
   try{const revision=await writeCatalog(state.profile[mode].catalogId,state.key,next,state.revision,[],valid);if(!valid())return;state.data[mode]=next;state.revision=revision;close();album?showAlbum(album.id):render();}
   catch(e){if(valid())$('#vault-name-error').textContent=e.message||'Could not save. Try again.';}finally{if(valid()){input.disabled=false;update();}}
  };
 }
 function addMedia(album){if(!state.active)return;const mode=state.active,key=state.key,version=state.version,all=state.data[mode],first=!album&&!all.length?{id:crypto.randomUUID(),name:'Personal',cover:'personal',items:[]}:null;
  open(`<button class="close-button" data-action="close">Cancel</button><h2 id="sheet-title">Add Media</h2>${album||first?'':`<label for="vault-destination">Album</label><select id="vault-destination">${all.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select>`}<button class="sheet-action" id="vault-choose">Choose Media</button><input type="file" id="vault-files" accept="image/*,video/*" multiple hidden><p id="vault-import-status" role="status"></p>`);
  const input=$('#vault-files'),choose=$('#vault-choose'),status=$('#vault-import-status');choose.onclick=()=>input.click();input.onchange=async()=>{
   const valid=()=>state.active===mode&&version===state.version&&status.isConnected;const target=album||first||all.find(a=>a.id===$('#vault-destination').value);if(!target||!valid())return;choose.disabled=true;let skipped=0;
   const next=structuredClone(state.data[mode]);if(first&&!next.some(a=>a.id===first.id))next.push(structuredClone(first));const destination=next.find(a=>a.id===target.id),encrypted=[];
   try{for(const f of input.files){if(!valid())return;if(!/^(image|video)\//.test(f.type)||f.size>40*1024*1024){skipped++;continue;}const id=crypto.randomUUID(),record=await seal(key,await f.arrayBuffer(),id);if(!valid())return;encrypted.push(record);destination.items.push({id,type:f.type});}
    if(!valid())return;if(encrypted.length){const revision=await writeCatalog(state.profile[mode].catalogId,key,next,state.revision,encrypted,valid);if(!valid())return;state.data[mode]=next;state.revision=revision;}
    if(skipped){status.textContent='Some files could not be added. Try media under 40 MB.';return;}close();album?showAlbum(album.id):render();
   }catch(e){if(valid())status.textContent=e.message||'Could not save media. Try again.';}finally{if(valid()){choose.disabled=false;input.value='';}}
  };
 }
 $('#vault-intro-next').onclick=twoWays;$('#vault-new').onclick=()=>nameForm();$('#vault-add').onclick=()=>addMedia();$('#vault-lock').onclick=()=>lock();$('#vault-grid').onclick=e=>{const b=e.target.closest('[data-album]');if(b)showAlbum(b.dataset.album);};
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&!page.hidden)lock();});window.addEventListener('pagehide',()=>{if(!page.hidden)lock(false);});window.addEventListener('popstate',()=>{if(!page.hidden&&!/^#vault(?:\/|$)/.test(location.hash))lock();});
 // Desktop-only companion controls live outside the app and outside preview.js draw().
 if(!document.getElementById('vault-trial-tools')){
  const tools=document.createElement('aside');tools.id='vault-trial-tools';tools.hidden=true;tools.setAttribute('aria-label','Vault 试玩入口');
  const restore=document.createElement('button');restore.id='vault-restore-onboarding';restore.textContent='恢复新人';
  const ordinary=new URL(location.href);ordinary.searchParams.delete('vault-preview');ordinary.hash='vault';
  const trial=new URL(ordinary.href);trial.searchParams.set('vault-preview','onboarding');
  restore.onclick=()=>{if(location.href===trial.href)location.reload();else location.assign(trial.href);};tools.append(restore);
  if(onboardingPreview&&!publicPreview){const original=document.createElement('button');original.id='vault-return-original';original.textContent='返回原 Vault';original.onclick=()=>location.assign(ordinary.href);tools.append(original);}
  document.body.append(tools);let externalContext=phone.dataset.tab||'clean';
  const position=()=>{
   const rect=phone.getBoundingClientRect(),scale=rect.width/393,gap=Math.round(34*scale),width=Math.round(180*scale),left=rect.left-gap-width;
   tools.hidden=externalContext!=='vault'||phone.dataset.tab!=='vault'||page.hidden||innerWidth<=700||left<12;
   if(tools.hidden)return;
   tools.style.width=width+'px';
   tools.style.left=left+'px';
   tools.style.top=(rect.top+60*scale)+'px';
  };
  window.addEventListener('preview-context',e=>{externalContext=e.detail.key;queueMicrotask(position);});
  window.addEventListener('resize',position);window.addEventListener('scroll',position,{passive:true});new ResizeObserver(position).observe(phone);new MutationObserver(position).observe(phone,{attributes:true,attributeFilter:['data-tab']});queueMicrotask(position);
 }
 // BFCache restores an old document; a full return to this explicit trial starts fresh too.
 if(onboardingPreview)window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
 return {lock,enter,release:()=>{if(state.active&&panel.hidden)render();}};
};
