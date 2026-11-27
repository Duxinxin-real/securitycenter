window.initVault=({open,close})=>{
 const $=s=>document.querySelector(s),page=$('#vault-page'),panel=$('#vault-pin-page'),phone=$('.phone');
 const modes=['private','decoy'],store='clean-vault-v1',encoder=new TextEncoder();
 // Explicit opt-in, fixed for this document. Never open persistent Vault storage in this mode.
 const previewValues=new URLSearchParams(location.search).getAll('vault-preview');
 const sampleAlbums=previewValues.length===1&&previewValues[0]==='albums';
 const publicPreview=location.host.toLowerCase()==='duxinxin-real.github.io';
 const onboardingPreview=sampleAlbums||publicPreview||(previewValues.length===1&&previewValues[0]==='onboarding');
 const transient={profiles:{},catalogs:new Map(),media:new Map()};
 const readProfiles=()=>onboardingPreview?structuredClone(transient.profiles):JSON.parse(localStorage.getItem(store)||'{}');
 const saveProfiles=profiles=>{if(onboardingPreview)transient.profiles=structuredClone(profiles);else localStorage.setItem(store,JSON.stringify(profiles));};
 const samples={private:[['personal','Personal'],['documents','Documents'],['travel','Travel'],['videos','Videos']],decoy:[['everyday','Everyday'],['trips','Trips'],['personal','Favorites'],['videos','Videos']]};
 const state={profile:{},key:null,active:null,album:null,version:0,revision:null,transactions:new Set(),urls:[],data:{private:[],decoy:[]}};
 let profileError=false;
 try{const p=readProfiles();if(!p||Array.isArray(p)||typeof p!=='object')throw Error('Invalid profile');for(const m of modes)if(p[m]){if(!p[m].salt||!p[m].iv||!p[m].proof)throw Error('Invalid profile');state.profile[m]=p[m];}}catch{profileError=true;}
 const emptyAlbums=()=>[];
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
  if(onboardingPreview){if(!valid())throw Error('Vault locked.');const actual=transient.catalogs.get(id);if((revision===null&&actual)||(revision!==null&&actual?.revision!==revision))throw Error('Photos changed. Lock and unlock to reload.');transient.catalogs.set(id,structuredClone(record));for(const item of media)transient.media.set(item.id,structuredClone(item));return record.revision;}
  const db=await database();if(!valid())throw Error('Vault locked.');
  await new Promise((resolve,reject)=>{const tx=db.transaction(['catalogs','media'],'readwrite');state.transactions.add(tx);let failure;
   const request=tx.objectStore('catalogs').get(id);request.onsuccess=()=>{if(!valid()){failure=Error('Vault locked.');tx.abort();return;}const actual=request.result;
    if((revision===null&&actual)||(revision!==null&&actual?.revision!==revision)){failure=Error('Photos changed in another tab. Lock and unlock to reload.');tx.abort();return;}
    tx.objectStore('catalogs').put(record);for(const item of media)tx.objectStore('media').put(item);
   };
   tx.oncomplete=()=>{state.transactions.delete(tx);resolve();};tx.onabort=tx.onerror=()=>{state.transactions.delete(tx);reject(failure||Error('Could not save. Check available storage and try again.'));};
  }).catch(e=>{if(e.message==='Vault locked.'||e.message==='Photos changed in another tab. Lock and unlock to reload.')throw e;throw Error('Could not save. Check available storage and try again.');});return record.revision;
 }
 async function loadCatalog(m,key,valid){const p=state.profile[m];
  // Legacy versions never persisted albums or media. Initialize only after a valid PIN.
  // Once a catalog ID exists, missing/corrupt data is an error, never a reset.
  if(!p.catalogId){const id=crypto.randomUUID(),albums=emptyAlbums(m);await writeCatalog(id,key,albums,null,[],valid);if(!valid())throw Error('Vault locked.');const profiles={...state.profile,[m]:{...p,catalogId:id}};saveProfiles(profiles);state.profile=profiles;return {albums,revision:1};}
  const record=await readRecord('catalogs',p.catalogId);const decoded=await unseal(key,record);const albums=JSON.parse(new TextDecoder().decode(decoded));
  if(!Array.isArray(albums)||albums.some(a=>typeof a.id!=='string'||typeof a.name!=='string'||!Array.isArray(a.items)))throw Error('Stored data could not be opened.');
  return {albums,revision:record.revision};
 }
 async function initialCatalog(m,key,id,valid){
  const albums=emptyAlbums(),media=[];
  if(sampleAlbums){const bucket={id:crypto.randomUUID(),name:'Photos',cover:'personal',items:[]};
   for(const [cover] of samples[m].slice(0,m==='private'?2:1)){const response=await fetch('assets/vault/'+cover+'.png');if(!response.ok)throw Error('Could not load photos. Try again.');const file=await response.blob();if(!valid())return;const mediaId=crypto.randomUUID();media.push(await seal(key,await file.arrayBuffer(),mediaId));bucket.items.push({id:mediaId,type:'image/png'});}
   albums.push(bucket);
  }
  return writeCatalog(id,key,albums,null,media,valid);
 }
 async function configure(m,pin,valid){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=vector(),key=await derive(pin,salt);const proof=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode('vault:'+m));if(!valid())return null;
  const catalogId=crypto.randomUUID();await initialCatalog(m,key,catalogId,valid);if(!valid())return null;
  const latest=readProfiles();if(latest[m])throw Error('Passcode settings changed. Reload and unlock to continue.');const profile={...latest,[m]:{salt:[...salt],iv:[...iv],proof:[...bytes(proof)],catalogId}};try{saveProfiles(profile);}catch{throw Error('Could not save passcode. Check browser storage and try again.');}state.profile=profile;return key;
 }
 function hidePanel(){state.version++;panel.hidden=true;panel.replaceChildren();panel.onkeydown=null;page.inert=false;phone.classList.remove('detail-open');}
 function lock(show=true){importing=false;$('#vault-add').disabled=false;$('#vault-files').value='';$('#vault-import-status').textContent='';for(const tx of state.transactions){try{tx.abort();}catch{}}close();release();state.data={private:[],decoy:[]};state.revision=null;state.key=null;state.active=null;state.album=null;hidePanel();$('#vault-grid').replaceChildren();$('#vault-albums').hidden=true;$('#vault-trust').hidden=true;$('#vault-lock').hidden=true;if(show&&!page.hidden)enter();}
 function enter(){if(profileError){hidePanel();panel.hidden=false;phone.classList.add('detail-open');panel.innerHTML='<div class="vault-pin-header"><h1>Vault</h1><p>Could not open stored data.</p><button class="vault-primary" id="vault-retry">Try Again</button></div>';$('#vault-retry').onclick=()=>location.reload();return;}if(state.active)return;$('#vault-lock').hidden=true;if(state.profile.private)unlockPrompt();else{hidePanel();$('#vault-trust').hidden=false;phone.classList.remove('vault-onboarding');}}
 async function unlock(m,key){const version=state.version,valid=()=>state.version===version;let stored;
  try{stored=await loadCatalog(m,key,valid);}catch(e){if(valid())throw Error(e.message==='Vault locked.'?e.message:'Could not open stored photos. Check available storage and try again.');return;}if(!valid())return;
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
  panel.innerHTML=`<div class="vault-two-ways"><header class="vault-pin-header">${back}<h1>Two Ways In</h1></header><div class="vault-flow" aria-label="A main passcode and a decoy passcode open separate private spaces"><div class="vault-flow-code" aria-hidden="true">${icon('lock-transparent.svg')}<div>${'<span></span>'.repeat(6)}</div></div><div class="vault-flow-branches" aria-hidden="true"><span></span><img class="branch-left" src="assets/vault/arrow-down.svg" alt=""><img class="branch-right" src="assets/vault/arrow-down.svg" alt=""></div><div class="vault-flow-columns"><div><h2>Main Passcode</h2><img class="vault-flow-arrow" src="assets/vault/arrow-down.svg" alt="">${miniature(true)}</div><div><h2>Decoy Passcode</h2><img class="vault-flow-arrow" src="assets/vault/arrow-down.svg" alt="">${miniature(false)}</div></div></div><footer class="vault-pin-footer"><button class="vault-primary" id="vault-start-main">Set Main Passcode</button></footer></div>`;
  panel.querySelector('.detail-back').onclick=enter;$('#vault-start-main').onclick=()=>setup('private');panel.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();enter();}};
  panel.querySelector('.detail-back').focus({preventScroll:true});
 }
 function setup(mode,mainKey){const secondary=mode==='decoy';
  prompt({title:secondary?'Set Backup Passcode':'Set Passcode',hint:secondary?'Opens a separate private space.':'Enter 6 digits',action:'Continue',onBack:()=>secondary?unlock('private',mainKey):twoWays(),skip:secondary?()=>unlock('private',mainKey):null,handler:async(pin,valid)=>{
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
 // Public preview only: prepare all ciphertext off to the side before a single in-memory commit.
 // The persistent preview uses IndexedDB and a different commit protocol; never touch it here.
 let changing=false;
 function cancelPasscodeChange(){if(!changing)return;changing=false;hidePanel();phone.classList.remove('vault-onboarding');}
 function passcodeChangeStatus(){return !onboardingPreview||profileError||!ready()?'unavailable':state.profile.private?'ready':'setup';}
 function changePasscode(onReturn,stage){
  if(passcodeChangeStatus()!=='ready'||changing||state.active)return false;
  changing=true;
  const done=changed=>{cancelPasscodeChange();onReturn(changed);};
  const start=()=>{
   stage('verify');
   prompt({title:'Enter Current Passcode',action:'Continue',onBack:()=>done(false),handler:async(pin,valid)=>{
    if(Date.now()<until)throw Error('Wait 30 seconds, then try again.');
    const keys=await Promise.all(modes.map(m=>verify(m,pin)));if(!valid())return;
    const index=keys.findIndex(Boolean);
    if(index<0){if(++attempts>=5){until=Date.now()+30000;attempts=0;}throw Error('Incorrect passcode.');}
    attempts=0;until=0;
    const mode=modes[index],oldKey=keys[index],profile=state.profile[mode];
    enterNew(mode,oldKey,profile);
   }});
  };
  const enterNew=(mode,oldKey,profile)=>{
   stage('new');
   prompt({title:'Enter New Passcode',action:'Continue',onBack:start,handler:async(newPin,valid)=>{
    const duplicates=await Promise.all(modes.map(m=>verify(m,newPin)));if(!valid())return;
    if(duplicates.some(Boolean))throw Error('Choose a different passcode.');
    stage('confirm');
    prompt({title:'Confirm New Passcode',action:'Save Passcode',onBack:()=>enterNew(mode,oldKey,profile),handler:async(confirm,validConfirm)=>{
     if(confirm!==newPin)throw Error('Passcodes do not match.');
     if(!validConfirm()||!changing)return;
     try{
      const currentRecord=await readRecord('catalogs',profile.catalogId);
      const plainCatalog=await unseal(oldKey,currentRecord);
      const albums=JSON.parse(new TextDecoder().decode(plainCatalog));
      if(!Array.isArray(albums)||albums.some(a=>!Array.isArray(a.items)))throw Error('Invalid catalog.');
      if(!validConfirm()||!changing)return;
      const salt=crypto.getRandomValues(new Uint8Array(16)),iv=vector(),key=await derive(newPin,salt);
      const proof=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode('vault:'+mode));
      if(!validConfirm()||!changing)return;
      const catalog=await seal(key,plainCatalog,currentRecord.id);
      catalog.revision=currentRecord.revision+1;
      const media=new Map();
      for(const {id} of albums.flatMap(a=>a.items)){
       if(media.has(id))continue;
       const record=await readRecord('media',id);
       const plain=await unseal(oldKey,record);
       if(!validConfirm()||!changing)return;
       media.set(id,await seal(key,plain,id));
      }
      if(!validConfirm()||!changing)return;
      const existing=transient.catalogs.get(profile.catalogId);
      if(state.profile[mode]!==profile||existing?.revision!==currentRecord.revision)throw Error('Concurrent change.');
      const profiles={...state.profile,[mode]:{...profile,salt:[...salt],iv:[...iv],proof:[...bytes(proof)]}};
      const nextProfiles=structuredClone(profiles),nextCatalogs=new Map(transient.catalogs),nextMedia=new Map(transient.media);
      nextCatalogs.set(catalog.id,catalog);for(const [id,record] of media)nextMedia.set(id,record);
      Object.assign(transient,{profiles:nextProfiles,catalogs:nextCatalogs,media:nextMedia});state.profile=profiles;
      done(true);
     }catch{if(validConfirm()&&changing)throw Error('Could not change the passcode. Your current passcode still works.');}
    }});
   }});
  };
  start();
  return true;
 }
 let rendering=0,importing=false;
 const mediaItems=()=>state.data[state.active]?.flatMap(a=>a.items)||[];
 async function mediaBlob(item,key){const record=await readRecord('media',item.id);return new Blob([await unseal(key,record)],{type:item.type});}
 async function render(){if(!state.active)return;release();const ticket=++rendering,version=state.version,key=state.key,items=mediaItems(),empty=!items.length;
  $('#vault-albums').classList.toggle('is-empty',empty);$('#vault-empty-state').hidden=!empty;const grid=$('#vault-grid');grid.hidden=empty;grid.replaceChildren();
  for(const [index,item] of items.entries()){const button=document.createElement('button');button.className='vault-photo';button.dataset.photo=item.id;button.setAttribute('aria-label',(item.type.startsWith('video/')?'Open video ':'Open photo ')+(index+1));grid.append(button);
   try{const blob=await mediaBlob(item,key);if(ticket!==rendering||version!==state.version||!state.active)return;const media=document.createElement(item.type.startsWith('video/')?'video':'img');media.src=url(blob);media.alt='Private photo';if(media.tagName==='VIDEO'){media.preload='metadata';media.muted=true;}button.append(media);}catch{if(ticket===rendering&&version===state.version)button.textContent='Could not open item';}
  }
 }
 async function showPhoto(id){if(importing)return;const item=mediaItems().find(i=>i.id===id);if(!item)return;close();release();hidePanel();state.album=id;const version=state.version,key=state.key;panel.hidden=false;page.inert=true;phone.classList.add('detail-open');
  panel.innerHTML=`<header class="vault-photo-header">${back}<h1>${item.type.startsWith('video/')?'Video':'Photo'}</h1></header><div class="vault-photo-view" id="vault-photo-view"></div>`;
  panel.querySelector('.detail-back').onclick=()=>{hidePanel();state.album=null;render();};
  try{const blob=await mediaBlob(item,key);if(version!==state.version||state.album!==id)return;const media=document.createElement(item.type.startsWith('video/')?'video':'img');media.src=url(blob);media.alt='Private photo';if(media.tagName==='VIDEO')media.controls=true;$('#vault-photo-view').append(media);}catch{if(version===state.version)$('#vault-photo-view').textContent='Could not open this item. Return and try again.';}
 }
 async function readablePhoto(file){if(!file.type.startsWith('image/')||file.size>40*1024*1024)return false;try{if(typeof createImageBitmap==='function'){const bitmap=await createImageBitmap(file);const ok=bitmap.width>0&&bitmap.height>0;bitmap.close();return ok;}const source=URL.createObjectURL(file);try{const image=new Image();image.src=source;await image.decode();return image.naturalWidth>0&&image.naturalHeight>0;}finally{URL.revokeObjectURL(source);}}catch{return false;}}
 const input=$('#vault-files'),add=$('#vault-add'),status=$('#vault-import-status');
 add.onclick=()=>{if(!state.active||importing)return;input.value='';input.click();};
 input.onchange=async()=>{const files=[...input.files];if(!files.length||!state.active||importing)return;const mode=state.active,key=state.key,version=state.version;const valid=()=>state.active===mode&&version===state.version;importing=true;add.disabled=true;status.textContent='';
  try{const next=structuredClone(state.data[mode]),encrypted=[],items=[];let skipped=0;
   for(const file of files){if(!valid())return;if(!await readablePhoto(file)){skipped++;continue;}const id=crypto.randomUUID();encrypted.push(await seal(key,await file.arrayBuffer(),id));items.push({id,type:file.type});}
   if(!valid())return;if(items.length){if(!next.length)next.push({id:crypto.randomUUID(),name:'Photos',cover:'personal',items:[]});next[0].items.push(...items);const revision=await writeCatalog(state.profile[mode].catalogId,key,next,state.revision,encrypted,valid);if(!valid())return;state.data[mode]=next;state.revision=revision;render();}
   status.textContent=skipped?'Some photos could not be added. Choose valid images under 40 MB.':'';
  }catch{if(valid())status.textContent='Could not save photos. Try again.';}finally{if(valid()){importing=false;add.disabled=false;input.value='';}}
 };
 $('#vault-intro-next').onclick=twoWays;$('#vault-lock').onclick=()=>lock();$('#vault-grid').onclick=e=>{const button=e.target.closest('[data-photo]');if(button)showPhoto(button.dataset.photo);};
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&!page.hidden)lock();});window.addEventListener('pagehide',()=>{if(!page.hidden)lock(false);});window.addEventListener('popstate',()=>{if(!page.hidden&&!/^#vault(?:\/|$)/.test(location.hash))lock();});
 // Desktop-only companion controls live outside the app and outside preview.js draw().
 if(!document.getElementById('vault-trial-tools')){
  const tools=document.createElement('aside');tools.id='vault-trial-tools';tools.hidden=true;tools.setAttribute('aria-label','Vault 试玩入口');
  const restore=document.createElement('button');restore.id='vault-restore-onboarding';restore.textContent='恢复新人';
  const ordinary=new URL(location.href);ordinary.searchParams.delete('vault-preview');ordinary.hash='vault';
  const trial=new URL(ordinary.href);trial.searchParams.set('vault-preview','onboarding');
  restore.onclick=()=>{if(location.href===trial.href)location.reload();else location.assign(trial.href);};tools.append(restore);
  const albumsURL=new URL(ordinary.href);albumsURL.searchParams.set('vault-preview','albums');const albums=document.createElement('a');albums.id='vault-sample-albums';albums.textContent='查看样例图片';albums.href=albumsURL.href;albums.target='_blank';albums.rel='noopener';tools.append(albums);
  const note=document.createElement('p');note.textContent='样例图片在独立临时页面打开；恢复新人返回正常空态流程。';tools.append(note);
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
 return {lock,enter,passcodeChangeStatus,changePasscode,cancelPasscodeChange,release:()=>{if(state.active&&panel.hidden)render();}};
};
