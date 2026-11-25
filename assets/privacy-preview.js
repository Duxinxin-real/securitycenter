/* Desktop-only simulated states plus explicit real-pipeline photo collection. */
(() => {
 const bridge=()=>window.privacyPreviewBridge;
 const regions={phone:{type:'phone',x:.085,y:.81,width:.58,height:.05},email:{type:'email',x:.085,y:.75,width:.58,height:.05},qr:{type:'qr',x:.75,y:.75,width:.18,height:.135},face:{type:'face',x:.40,y:.025,width:.20,height:.23}};
 const fields={gps:[['latitude','0'],['longitude','0']],camera:[['Make','Example'],['Model','Sample Camera']],time:[['DateTimeOriginal','2026-01-01T12:00:00.000Z']]};
 let context='',active='',notice='',sequence=0,timer,type='mixed',picker=false,loading=false;const files=new Map();
 const collection=[['live-flower-test.jpg','花朵 · 合成测试联系字段'],['live-lake-test-metadata.jpg','湖景 · 模拟相机和时间'],['live-fictional-id.jpg','示意身份证 · SAMPLE / TEST ONLY']];
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
 async function fixture(base=false){
  const key=base?'photo':'fields';if(files.has(key))return files.get(key);
  const promise=(async()=>{const response=await fetch('assets/privacy/samples/statue-iphone.jpg');if(!response.ok)throw Error('样例照片加载失败，请重试');const blob=await response.blob();
   if(base)return new File([blob],'sample-iphone-photo.jpg',{type:'image/jpeg'});
   const image=await createImageBitmap(blob);const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1600;const x=canvas.getContext('2d');x.drawImage(image,0,0);image.close();
   // Actual photographic pixels, with explicitly fictional typeset test fields only.
   x.fillStyle='#fffdf4';x.fillRect(60,1170,1080,360);x.fillStyle='#223d31';x.font='44px sans-serif';x.fillText('demo@example.com',110,1258);x.fillText('+1 (202) 555-0147',110,1354);
   x.fillStyle='#172e24';for(let row=0;row<9;row++)for(let col=0;col<9;col++)if((row*7+col*3)%5<3)x.fillRect(900+col*24,1200+row*24,22,22);
   const result=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));canvas.width=canvas.height=1;return new File([result],'sample-photo-fictional-fields.png',{type:'image/png'});
  })();files.set(key,promise);try{return await promise;}catch(error){files.delete(key);throw error;}
 }
 async function makeState(kind,id){
  const file=await fixture(kind==='metadata'||id==='face'||id==='none');const item=()=>({file,preview:file,width:1200,height:1600,marks:[],history:[],selected:null,confirmed:false,status:'pending'});
  const state={items:id==='empty'||id==='reselect'?[]:[item()],editor:null,group:null,busy:false,message:'',selectionError:'',output:null};
  if(!state.items.length)return state;
  const first=state.items[0];if(kind==='redact')state.editor=0;
  if(kind==='metadata')first.fields=Object.values(fields).flat();
  const types=regions[id]?[id]:['email','phone','qr','face'];
  if(['phone','email','qr','face','mixed','review','confirmed','output','exporting','export-failed','partial','edit','undo'].includes(id)){
   first.status='complete';if(kind!=='metadata')first.marks=types.map(t=>({...regions[t]}));
  }
  if(kind==='metadata'&&fields[id])first.fields=fields[id].map(v=>[...v]);
  if(id==='none'){first.status='complete';first.fields=[];if(kind==='redact')first.note='Face not checked';}
  if(id==='incomplete'){first.status='incomplete';first.note='Face not checked';}
  if(id==='read-failed'){first.status='incomplete';first.openError='Could not open this photo. Choose another image.';if(kind==='metadata'){first.error=first.openError;first.fields=null;}}
  if(id==='detect-failed'){first.status='incomplete';first.failed=true;first.note='Could not finish detection.';}
  if(id==='review'){state.editor=0;}
  if(['manual','edit','undo'].includes(id)){state.editor=0;first.status='incomplete';first.history=[[]];first.marks=[{...regions.email}];first.selected=id==='manual'?null:0;}
  if(id==='confirmed'){first.confirmed=true;state.items.push({...item(),status:'incomplete'});}
  if(id==='cancelled'){first.status='incomplete';state.message='Cancelled. Originals unchanged.';}
  if(['loading','working','exporting'].includes(id)||(kind==='metadata'&&id==='selected')){state.busy=true;first.status='working';state.message=id==='loading'?'Opening photos…':id==='exporting'?(kind==='metadata'?'Cleaning 1 of 1':'Preparing 1 of 1'):kind==='metadata'?'Reading 1 of 1':'Scanning 1 of 1';}
  if(id==='export-failed'){first.exportError=true;state.message='Could not prepare copies. Retry or choose another photo.';if(kind==='scan')first.confirmed=true;}
  if(['output','partial'].includes(id)){
   first.confirmed=true;if(kind==='scan'&&id==='output')state.items.push({...item(),marks:[{...regions.email}],status:'complete',confirmed:true});
   state.output=await bridge().sampleOutput(state.items,kind==='metadata');
   if(id==='partial'){const failed={...item(),confirmed:true,status:'complete',exportError:true};state.items.push(failed);state.message='1 photo failed. Return to photos and retry.';}
  }
  return state;
 }
 // Buttons only vary the current level. Normal in-phone actions perform transitions.
 const stageOptions={
  selection:[['selected','照片已选'],['read-failed','读取失败']],
  summary:[['mixed','Found'],['none','No findings（完整检查示意）'],['incomplete','Incomplete'],['confirmed','Confirmed']],
  group:[['mixed','可复核照片'],['read-failed','读取失败']],
  editor:[['candidates','有候选'],['none','无候选'],['detect-failed','识别失败'],['read-failed','读取失败']],
  fields:[['fields','有可清理字段'],['none','无可清理字段'],['read-failed','读取失败']],
  processing:[['running','进行中'],['failed','处理失败'],['cancelled','已取消']],
  output:[['output','副本就绪'],['partial','部分失败']]
 };
 function stopTimer(){clearTimeout(timer);sequence++;}
 function allowed(){const i=bridge()?.info();if(!i?.visible||innerWidth<=700)return false;if(!i.sample&&i.busy){notice='真实处理正在进行，未切换或修改真实选择。';mount();return false;}return true;}
 function cloneSample(){const s=bridge().sampleState();return s?{...s,items:s.items.map(i=>({...i,marks:i.marks.map(r=>({...r})),history:i.history.map(h=>h.map(r=>({...r})))}))}:null;}
 async function show(id){
  if(!allowed())return;stopTimer();const ticket=sequence,info=bridge().info(),stage=info.stage;notice='';
  try{
   let state;
   if(stage==='processing'){
    state=cloneSample()||await makeState(info.kind,'working');state.samplePhase='processing';state.busy=id==='running';state.output=null;state.message=id==='running'?'Processing…':id==='failed'?'Could not finish processing. Retry or choose another photo.':'Cancelled. Originals unchanged.';
    if(!state.busy)state.items.forEach(i=>{i.status='pending';i.failed=id==='failed';if(info.kind==='metadata')i.error=id==='failed'?'Could not read this photo. Retry or choose another.':null;});
   }else if(stage==='output'){
    state=await makeState(info.kind,id==='partial'&&info.kind==='scan'?'partial':'output');
   }else{
    const source=id==='candidates'?type:id==='fields'?type:id;
    state=await makeState(info.kind,source);
    state.busy=false;state.message='';state.output=null;
    if(stage==='editor'){state.editor=0;state.items[0].status=id==='none'?'incomplete':state.items[0].status;}
    if(stage==='selection'){state.editor=null;state.items.forEach(i=>i.status='pending');}
    if(stage==='group'){state.editor=null;state.group='Found';state.items[0].marks=[{...regions.email}];state.items[0].status='complete';}
    if(stage==='fields'){state.editor=null;state.items[0].fields=id==='none'?[]:id==='read-failed'?null:(fields[type]||Object.values(fields).flat());}
   }
   if(ticket!==sequence||bridge().info().kind!==info.kind||bridge().info().stage!==stage)return;
   if(bridge().enter(state)){active=id;mount();}
  }catch(error){notice=error.message;mount();}
 }
 function restore(){stopTimer();active='';notice='';bridge()?.restore();mount();}
 async function loadSample(){
  if(!allowed())return;stopTimer();const ticket=sequence,kind=bridge().info().kind;notice='';
  try{const state=await makeState(kind,kind==='scan'?'selected':kind==='metadata'?'selected':'working');if(ticket!==sequence||bridge().info().kind!==kind)return;if(!bridge().enter(state))return;active='';if(kind!=='scan')finishLater(kind,kind==='metadata'?'metadata':'scan');mount();}catch(error){notice=error.message;mount();}
 }
 function finishLater(kind,operation,items,clean){
  const ticket=sequence;timer=setTimeout(async()=>{if(ticket!==sequence||!bridge().info().sample||bridge().info().kind!==kind)return;
   try{let state;if(operation==='export'){const output=await bridge().sampleOutput(items,clean);state={items,editor:null,group:null,busy:false,message:'',output};}else state=await makeState(kind,'mixed');
    if(ticket===sequence&&bridge().info().sample){bridge().enter(state);active='';mount();}
   }catch(error){notice=error.message;mount();}
  },1400);
 }
 function mount(){
  const left=document.querySelector('.preview-left'),info=bridge()?.info();if(!left)return;
  if(!['scan','redact','metadata'].includes(context)||innerWidth<=700||!info?.visible){delete left.dataset.privacyDebug;return;}
  left.dataset.privacyDebug='true';left.hidden=false;const buttons=left.querySelector('.debug-buttons');if(!buttons)return;buttons.replaceChildren();left.querySelectorAll('.privacy-sample-note').forEach(e=>e.remove());
  const note=node('p','privacy-sample-note',notice||(info.sample?'照片为 CC0 iPhone 实拍；字段、框与状态为模拟。雕像代替真人脸，不执行识别或下载。':info.collection?'样例正在走真实本地处理：花朵含测试电话/邮箱，湖景含模拟相机/时间，证件为 示意身份证 · SAMPLE / TEST ONLY。姓名、证件号码与头像请手动核对遮盖。':'载入 3 张样例进行真实本地处理：两张 CC0 手机实拍及一张 示意身份证 · SAMPLE / TEST ONLY，仅供私有预览。花朵与湖景测试字段为合成，模拟状态另行进入。'));left.querySelector('h2').after(note);
  const add=(text,fn,id)=>{const b=node('button','',text);if(id){b.dataset.privacySample=id;b.setAttribute('aria-pressed',String(info.sample&&active===id));}b.onclick=fn;buttons.append(b);};
  if(info.sample)add('返回真实选择 / 本地处理',restore);
  if(info.stage==='empty'){
   add('选择真实照片',()=>{restore();const input=document.querySelector('#privacy-detail input[type=file]');if(input){input.value='';input.click();}});
   if(!info.sample){add('载入样例照片',()=>loadCollection(),'collection');buttons.lastElementChild.disabled=loading;
    if(picker&&info.kind==='redact'){const gallery=node('div','privacy-collection');collection.forEach(([file,title],index)=>{const b=node('button');b.type='button';b.disabled=loading;b.setAttribute('aria-label',title);const img=node('img');img.src='assets/privacy/samples/'+file;img.alt='';b.append(img,node('span','',title));b.onclick=()=>loadCollection(index);gallery.append(b);});buttons.append(gallery);}
   }
   add('进入模拟状态',loadSample,'load');return;
  }
  if(info.stage==='editor'||info.stage==='fields'){
   const label=node('label','privacy-sample-type',info.stage==='editor'?'样例检测类别':'样例字段类型');const select=node('select');select.setAttribute('aria-label',label.textContent);
   const options=info.stage==='editor'?[['mixed','混合'],['phone','Phone'],['email','Email'],['qr','QR Code'],['face','Face（雕像示意）']]:[['mixed','混合'],['gps','定位（模拟）'],['camera','相机（模拟）'],['time','时间（模拟）']];
   if(!options.some(([id])=>id===type))type='mixed';for(const [value,text]of options){const option=node('option','',text);option.value=value;select.append(option);}select.value=type;select.onchange=()=>{type=select.value;show(info.stage==='editor'?'candidates':'fields');};label.append(select);buttons.append(label);
  }
  const options=(stageOptions[info.stage]||[]).filter(([id])=>id!=='partial'||info.kind==='scan');for(const [id,label]of options)add('样例：'+label,()=>show(id),id);
 }
 window.privacySamples={action:async(action,items,clean)=>{
  if(!bridge()?.info().sample)return;stopTimer();const kind=bridge().info().kind,ticket=sequence;
  if(action==='select')return loadSample();
  if(action==='cancel'){
   const state=await makeState(kind,kind==='metadata'?'mixed':'selected');state.busy=false;state.message='Cancelled. Originals unchanged.';if(ticket===sequence)bridge().enter(state);return;
  }
  let state=cloneSample();delete state.samplePhase;state.busy=true;state.output=null;state.message=action==='export'?(clean?'Cleaning 1 of 1':'Preparing 1 of 1'):kind==='metadata'?'Reading 1 of 1':'Scanning 1 of 1';state.items.forEach(i=>{delete i.openError;delete i.error;i.status='working';});bridge().enter(state);finishLater(kind,action,items,clean);
 }};
 window.addEventListener('preview-context',event=>{context=event.detail.key;queueMicrotask(mount);});
 window.addEventListener('resize',()=>{if(innerWidth<=700&&bridge()?.info().sample)restore();else mount();});
 const style=document.createElement('link');style.rel='stylesheet';style.href='assets/privacy-preview.css';document.head.append(style);context=bridge()?.info().kind||'';mount();
})();
