/* Real QR decoding and offline domain lookup; Wi-Fi/device browser flows are labeled previews. */
(() => {
 const names={link:'Link Check',qr:'QR Code',wifi:'Wi-Fi Check',device:'Device Security'};
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let qrLibrary,activeDebug=null;
 function getQR(){return typeof window.jsQR==='function'?Promise.resolve(window.jsQR):(qrLibrary??=new Promise((resolve,reject)=>{const el=document.createElement('script');el.src='assets/vendor/jsQR-1.4.0.js';el.onload=()=>typeof window.jsQR==='function'?resolve(window.jsQR):reject(Error('Decoder unavailable'));el.onerror=()=>reject(Error('Decoder unavailable'));document.head.append(el);}).catch(e=>{qrLibrary=null;throw e;}));}
 function inspect(value){const raw=value.trim();if(!raw||raw.length>8192)return {error:'Enter a valid web address.'};try{const url=new URL(raw);return ['https:','http:'].includes(url.protocol)&&url.hostname?{url}:{error:'Use an http:// or https:// address.'};}catch{return {error:'Use a full address beginning with https://.'};}}
 window.safetyPreview={debug(mode){activeDebug?.(mode);}};
 window.initSafetyDetail=()=>{
  const page=document.querySelector('#test-detail'),phone=document.querySelector('.phone');let session=0;
  return (key,back)=>{
   const token=++session;let revision=0,stream=null,frame=0,cameraRequest=0,checking=false,latestText='',cameraMode='idle';
   const alive=()=>token===session,valid=n=>alive()&&revision===n;
   const stopCamera=()=>{cameraRequest++;cancelAnimationFrame(frame);stream?.getTracks().forEach(t=>t.stop());stream=null;const video=page.querySelector('video');if(video)video.srcObject=null;};
   const stop=()=>{revision++;stopCamera();};
   const finish=()=>{if(!alive())return;stop();session++;activeDebug=null;document.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',leaveDesktopPreview);page.hidden=true;page.replaceChildren();page.onkeydown=null;phone.classList.remove('detail-open');back();};
   page.className='safety-detail safety-'+key;page.hidden=false;phone.classList.add('detail-open');
   page.innerHTML=`<header class="detail-header"><button class="detail-back" aria-label="Back to Test"><span class="detail-icon-well"><img src="assets/test/detail-back.svg" alt=""></span></button><h1>${names[key]}</h1></header><div class="detail-body safety-body">${key!=='qr'?`<div class="safety-art"><span><img src="assets/test/${key}.svg" alt=""></span></div>`:''}${key==='link'?'<div class="safety-link-field"><label for="safety-entry">Web address</label><input id="safety-entry" type="url" inputmode="url" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="8192" placeholder="https://example.com"></div>':''}${key==='qr'?'<input type="file" id="safety-file" accept="image/*" hidden><div class="qr-viewfinder safety-art"><video playsinline muted hidden></video><img class="qr-still" alt="Selected QR image" hidden><img class="qr-demo-background" alt="" hidden><div class="qr-guide" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="qr-message"></div></div>':''}<div class="safety-result" role="status" aria-live="polite" hidden></div><p class="test-source" hidden></p><div class="safety-actions"></div></div><footer class="detail-footer safety-footer"><button class="test-again safety-run">${key==='link'?'Check Link':key==='qr'?'Upload Image':'Check Again'}</button></footer><div class="detail-home-indicator" aria-hidden="true"></div>`;
   const btn=page.querySelector('.safety-run'),result=page.querySelector('.safety-result'),source=page.querySelector('.test-source'),actions=page.querySelector('.safety-actions'),entry=page.querySelector('#safety-entry');
   page.querySelector('.detail-back').onclick=finish;page.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();finish();}};
   function action(text,fn,parent=actions){const b=document.createElement('button');b.className='safety-secondary';b.textContent=text;b.onclick=fn;parent.append(b);return b;}
   function show(title,rows=[],kind='neutral'){if(!alive())return;result.hidden=false;result.dataset.kind=kind;result.replaceChildren();if(title){const h=document.createElement('strong');h.textContent=title;result.append(h);}for(const row of rows){const p=document.createElement('p');if(Array.isArray(row)){p.className='safety-result-row';const a=document.createElement('span'),b=document.createElement('b');a.textContent=row[0];b.textContent=row[1];p.append(a,b);}else p.textContent=row;result.append(p);}}
   function attribution(text){source.hidden=!text;source.textContent=text;}
   function busy(value){checking=value;btn.disabled=value;if(entry)entry.disabled=value;}
   function clear(){actions.replaceChildren();attribution('');result.hidden=true;if(key==='qr'){page.querySelector('.qr-demo-background').hidden=true;page.querySelector('.qr-viewfinder').classList.remove('qr-demo-active');}}
   const afterFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
   async function linkCheck(raw,scenario){window.dispatchEvent(new CustomEvent('test-preview-mode',{detail:{sample:false}}));const n=++revision;clear();const parsed=inspect(raw);if(parsed.error){busy(false);show('Check the address',[parsed.error]);return;}const url=parsed.url;
    busy(true);show('',[[key==='qr'?'Link check':'Result','...']]);if(key==='qr')result.prepend(Object.assign(document.createElement('strong'),{textContent:url.href}));
    try{
     attribution('Offline domain reputation');const r=await window.checkLocalReputation(url);if(!valid(n))return;
     show(r.listed?'Risk found':r.stale?'Unable to determine':'No known risks found',[
      ['Domain',url.hostname],['Source',r.source],['Snapshot',new Date(r.snapshotAt).toISOString().slice(0,10)],
      r.listed?'Reported phishing domain. Avoid opening this link.':r.stale?'Reputation snapshot is out of date. No current verdict is available.':'No report in this snapshot. Not a safety guarantee.'
     ],r.listed?'risk':'neutral');attribution('Exact domain lookup only. Page content and redirects not checked. Link not opened.');
    }catch{if(valid(n)){show('Unable to determine',['Reputation data could not be loaded. Try again.']);attribution('Offline lookup unavailable');}}
    finally{if(valid(n)&&scenario!=='checking'){busy(false);if(key==='link')btn.textContent='Check Again';else action('Check Again',()=>linkCheck(raw));}}
   }
   function qrMessage(text,settings=false){if(text)page.querySelector('.qr-still').hidden=true;const box=page.querySelector('.qr-message');box.replaceChildren();box.hidden=false;if(text){const p=document.createElement('p');p.textContent=text;box.append(p);}if(settings)action('Open Settings',()=>{box.querySelector('p').textContent='Allow camera access in your browser site settings, then try again.';},box);}
   async function camera(){if(!alive())return;stopCamera();revision++;clear();busy(false);cameraMode='requesting';const req=cameraRequest;const video=page.querySelector('video');video.hidden=true;qrMessage('...');
    if(!navigator.mediaDevices?.getUserMedia){cameraMode='unavailable';qrMessage('Camera unavailable. Upload an image instead.');action('Scan Again',camera);return;}
    try{const qr=await getQR();if(!alive()||req!==cameraRequest)return;const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
     if(!alive()||req!==cameraRequest||document.hidden){media.getTracks().forEach(t=>t.stop());return;}stream=media;video.srcObject=media;video.hidden=false;await video.play();if(!alive()||req!==cameraRequest)return;cameraMode='scanning';page.querySelector('.qr-message').hidden=true;
     let last=0;const loop=t=>{if(!alive()||req!==cameraRequest)return;if(t-last>200&&video.readyState>=2){last=t;try{const data=decode(video,qr);if(data){decoded(data);return;}}catch{stopCamera();video.hidden=true;qrMessage('Could not scan. Upload an image instead.');action('Scan Again',camera);return;}}frame=requestAnimationFrame(loop);};frame=requestAnimationFrame(loop);
    }catch(e){if(alive()&&req===cameraRequest){stopCamera();video.hidden=true;cameraMode='denied';qrMessage(e.name==='NotAllowedError'?'Allow camera access':'Camera unavailable',e.name==='NotAllowedError');action('Scan Again',camera);}}
   }
   const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
   function decode(img,qr){const w=img.videoWidth||img.width,h=img.videoHeight||img.height;if(!w||!h)return null;const s=Math.min(1,1600/Math.max(w,h));canvas.width=Math.round(w*s);canvas.height=Math.round(h*s);ctx.drawImage(img,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);return qr(pixels.data,pixels.width,pixels.height,{inversionAttempts:'attemptBoth'})?.data||null;}
   function decoded(text){if(text&&canvas.width){const still=page.querySelector('.qr-still');still.src=canvas.toDataURL();still.hidden=false;}stopCamera();cameraMode='result';const video=page.querySelector('video');video.pause();video.hidden=true;busy(false);if(!text){video.hidden=true;qrMessage('No QR code found. Try another image.');action('Scan Again',camera);return;}
    latestText=text;qrMessage('');page.querySelector('.qr-message').hidden=true;
    if(inspect(text).url){linkCheck(text);}else{clear();show('QR Code',[text]);action('Copy',async()=>{try{await navigator.clipboard.writeText(latestText);if(alive())actions.querySelector('button').textContent='Copied';}catch{if(alive()){const area=document.createElement('textarea');area.value=latestText;area.readOnly=true;area.className='qr-copy-fallback';actions.append(area);area.select();}}});}
    action('Scan Again',camera);
   }
   async function upload(){const file=page.querySelector('#safety-file'),f=file.files?.[0];if(!f)return;stopCamera();const n=++revision;clear();busy(true);page.querySelector('video').hidden=true;qrMessage('...');let bitmap,url;
    try{if(f.size>20*1024*1024)throw Error('Choose an image smaller than 20 MB.');const qr=await getQR();if(!valid(n))return;
     if(typeof createImageBitmap==='function')bitmap=await createImageBitmap(f);else{url=URL.createObjectURL(f);bitmap=new Image();bitmap.src=url;await bitmap.decode();}
     if(!valid(n))return;if(bitmap.width*bitmap.height>24000000)throw Error('Choose a smaller image.');decoded(decode(bitmap,qr));
    }catch(e){if(valid(n)){qrMessage(e.message.startsWith('Choose')?e.message:'Could not read this image. Try another image.');action('Scan Again',camera);}}
    finally{bitmap?.close?.();if(url)URL.revokeObjectURL(url);if(valid(n))busy(false);}
   }
   const checkLabels=key==='wifi'?['Encrypted connection','HTTPS downgrade','Content integrity']:['System version','Device passcode'];
   async function check(scenario){const n=++revision;clear();busy(true);show('',checkLabels.map(l=>[l,'...']));const native=window.securityPlatform?.available()&&!scenario;window.dispatchEvent(new CustomEvent('test-preview-mode',{detail:{sample:Boolean(scenario)}}));
    if(scenario==='checking')return;
    try{
     let values,title='';
     if(native){const r=await window.securityPlatform.request(key==='wifi'?'wifi.securityStatus':'device.securityStatus');if(!valid(n))return;
      if(key==='wifi'){
       if(r?.connected===false){show('Not connected to Wi-Fi');btn.textContent='Retry';return;}
       const allowed=['passed','risk','unavailable'];const checks=['encryptedConnection','httpsDowngrade','contentIntegrity'].map(k=>allowed.includes(r?.checks?.[k]?.status)?r.checks[k]:{status:'unavailable'});
       values=checks.map(c=>c.status==='passed'?'Passed':c.status==='risk'?'Risk found':'Unavailable');title=checks.some(c=>c.status==='risk')?'Risk found':checks.some(c=>c.status==='unavailable')?'Unable to complete check':'No known risks found';show(title,checkLabels.map((l,i)=>[l,values[i]]),checks.some(c=>c.status==='risk')?'risk':'neutral');checks.filter(c=>c.status==='risk'&&c.reason).forEach(c=>result.append(Object.assign(document.createElement('p'),{textContent:c.reason})));return;
      }values=[typeof r?.systemVersion==='string'&&r.systemVersion.trim()?r.systemVersion:'Unavailable',r?.passcodeSet===true?'Enabled':r?.passcodeSet===false?'Not set':'Unavailable'];
     }else{
      await afterFrame();if(!valid(n))return;
      if(scenario==='offline'){show('Not connected to Wi-Fi');btn.textContent='Retry';return;}
      if(!scenario||scenario==='failure'||scenario==='unavailable'){show('Unable to complete check',checkLabels.map(l=>[l,'Unavailable']));btn.textContent='Retry';return;}
      values=key==='wifi'?['Passed',scenario==='risk'?'Risk found':'Not detected','Unchanged']:['iOS 26',scenario==='risk'?'Not set':'Enabled'];
      // Preview updates follow completed stages; no artificial waiting or percentage.
      for(let i=0;i<values.length;i++){await afterFrame();if(!valid(n))return;show('',checkLabels.map((l,j)=>[l,j<=i?values[j]:'...']));}
     }
     if(!valid(n))return;if(key==='wifi'){title=scenario==='risk'?'Risk found':'No known risks found';show(title,checkLabels.map((l,i)=>[l,values[i]]),scenario==='risk'?'risk':'neutral');if(scenario==='risk')result.append(Object.assign(document.createElement('p'),{textContent:'The test request was redirected to an unencrypted connection. Use another network.'}));}
     else{show(values.includes('Unavailable')?'Unable to complete check':'',checkLabels.map((l,i)=>[l,values[i]]),values[1]==='Not set'?'risk':'neutral');action('Settings guide',()=>{show('Settings', ['System version: Settings > General > Software Update','Passcode: Settings > Face ID & Passcode (or Touch ID & Passcode)']);actions.replaceChildren();action('Back to results',()=>check(scenario));});}
     btn.textContent='Check Again';
    }catch{if(valid(n)){show('Unable to complete check',checkLabels.map(l=>[l,'Unavailable']));btn.textContent='Retry';}}
    finally{if(valid(n))busy(false);}
   }
   function visibility(){if(document.hidden&&key==='qr'){stopCamera();if(cameraMode==='scanning'||cameraMode==='requesting'){cameraMode='paused';page.querySelector('video').hidden=true;qrMessage('Camera paused');actions.replaceChildren();action('Scan Again',camera);}}}
   function leaveDesktopPreview(){if(key==='qr'&&cameraMode==='preview'&&innerWidth<=700)camera();}
   document.addEventListener('visibilitychange',visibility);if(key==='qr')window.addEventListener('resize',leaveDesktopPreview);
   if(key==='link'){btn.onclick=()=>linkCheck(entry.value);entry.onkeydown=e=>{if(e.key==='Enter'&&!checking)btn.click();};}
   else if(key==='qr'){const file=page.querySelector('#safety-file');btn.onclick=()=>{file.value='';file.click();};file.onchange=upload;camera();}
   else{btn.onclick=()=>check();check();}
   activeDebug=mode=>{
    if(innerWidth<=700||!alive())return;
    if(key==='link'&&['clear','risk'].includes(mode)){
     revision++;clear();busy(false);entry.value='https://example.com';
     show(mode==='risk'?'Risk found':'No known risks found',[['Domain','example.com']],mode==='risk'?'risk':'neutral');
     window.dispatchEvent(new CustomEvent('test-preview-mode',{detail:{sample:true}}));
    }else if(key==='qr'&&['camera-preview','denied','text'].includes(mode)){
     stopCamera();revision++;clear();busy(false);page.querySelector('video').hidden=true;
     if(mode==='camera-preview'){cameraMode='preview';page.querySelector('.qr-still').hidden=true;page.querySelector('.qr-message').hidden=true;const bg=page.querySelector('.qr-demo-background');bg.src='assets/test/qr-camera-preview.png';bg.hidden=false;page.querySelector('.qr-viewfinder').classList.add('qr-demo-active');}
     else if(mode==='denied'){cameraMode='denied';qrMessage('Allow camera access',true);action('Scan Again',camera);}
     else {canvas.width=0;canvas.height=0;decoded('Meeting at 10:00');}
     window.dispatchEvent(new CustomEvent('test-preview-mode',{detail:{sample:true}}));
    }else if(['wifi','device'].includes(key)&&['complete','risk',...(key==='wifi'?['offline']:[])].includes(mode))check(mode);
   };
  };
 };
})();
