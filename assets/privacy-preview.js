/* Desktop-only explicit photo collection; all tools use real processing. */
(() => {
 const bridge=()=>window.privacyPreviewBridge;
 let context='',active='',notice='',sequence=0,timer,picker=false,loading=false;
 const collection=[['live-license-plate-sample.jpg','车牌 · 1SAM123'],['live-lake-test-metadata.jpg','湖景 · 模拟相机和时间'],['live-citizencard-sample.png','CitizenCard 官网样卡']];
 async function loadCollection(index){
  const info=bridge()?.info();if(!info?.visible||info.stage!=='empty'||info.sample||info.busy||innerWidth<=700||loading)return;
  if(info.kind==='redact'&&index===undefined){picker=!picker;mount();return;}
  stopTimer();const ticket=sequence;loading=true;notice='正在载入本地样例照片…';mount();
  try{
   const chosen=info.kind==='redact'?[collection[index]]:collection;
   const actual=await Promise.all(chosen.map(async([name])=>{const response=await fetch('assets/privacy/samples/'+name);if(!response.ok)throw Error('照片加载失败，请重试');return new File([await response.blob()],name,{type:name.endsWith('.png')?'image/png':'image/jpeg'});}));
   const now=bridge().info();if(ticket!==sequence||now.kind!==info.kind||now.stage!=='empty'||now.sample||innerWidth<=700)return;
   notice='';picker=false;await bridge().loadFiles(actual);
  }catch(error){notice=error.message;}finally{loading=false;mount();}
 }
 const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
 function stopTimer(){clearTimeout(timer);sequence++;}
 function restore(){stopTimer();active='';notice='';bridge()?.restore();mount();}
 function mount(){
  const left=document.querySelector('.preview-left'),info=bridge()?.info();if(!left)return;
  if(!['scan','redact','metadata'].includes(context)||innerWidth<=700||!info?.visible){delete left.dataset.privacyDebug;return;}
  left.dataset.privacyDebug='true';left.hidden=false;const buttons=left.querySelector('.debug-buttons');if(!buttons)return;buttons.replaceChildren();left.querySelectorAll('.privacy-sample-note').forEach(e=>e.remove());
  const note=node('p','privacy-sample-note',notice||(info.collection?'样例正在本地处理：车牌、湖景和证件。请复核识别结果；头像可手动遮盖。':'载入 3 张样例：车牌、湖景和 CitizenCard 官网样卡。'));left.querySelector('h2').after(note);
  const add=(text,fn,id)=>{const b=node('button','',text);if(id){b.dataset.privacySample=id;b.setAttribute('aria-pressed',String(info.sample&&active===id));}b.onclick=fn;buttons.append(b);};
  // Every Privacy tool uses the real selection and processing pipeline.
  if(info.sample){restore();return;}
  if(info.stage==='empty'){
   if(!info.sample){add('载入样例照片',()=>loadCollection(),'collection');buttons.lastElementChild.disabled=loading;
    if(picker&&info.kind==='redact'){const gallery=node('div','privacy-collection');collection.forEach(([file,title],index)=>{const b=node('button');b.type='button';b.disabled=loading;b.setAttribute('aria-label',title);const img=node('img');img.src='assets/privacy/samples/'+file;img.alt='';b.append(img,node('span','',title));b.onclick=()=>loadCollection(index);gallery.append(b);});buttons.append(gallery);}
   }
   return;
  }
  left.hidden=true;
 }
 window.addEventListener('preview-context',event=>{context=event.detail.key;queueMicrotask(mount);});
 window.addEventListener('resize',()=>{if(innerWidth<=700&&bridge()?.info().sample)restore();else mount();});
 const style=document.createElement('link');style.rel='stylesheet';style.href='assets/privacy-preview.css';document.head.append(style);context=bridge()?.info().kind||'';mount();
})();
