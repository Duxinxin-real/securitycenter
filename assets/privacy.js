window.initPrivacy=()=>{
 const names={scan:'Privacy Scan',redact:'Auto Redact',metadata:'Metadata Clean'},page=document.querySelector('#privacy-detail'),phone=document.querySelector('.phone');
 let urls=[],run=0; let state,kind,returnTo,sample=false,realState=null; const sessions={};
 const breathe=()=>new Promise(resolve=>setTimeout(resolve,0));
 let resizeObserver; function free(){resizeObserver?.disconnect();urls.forEach(URL.revokeObjectURL);urls=[];}
 function cancel(){if(sample){state=realState;realState=null;sample=false;}run++;window.privateOCR?.stop();if(state){state.busy=false;state.items.forEach(i=>{if(i.status==='working')i.status='incomplete';});}free();}
 const objectURL=x=>{const url=URL.createObjectURL(x);urls.push(url);return url;};
 const isHEIC=file=>/image\/hei[cf]/i.test(file.type)||/\.hei[cf]$/i.test(file.name||'');
 const supported=file=>/^(image\/(jpeg|png|heic|heif))$/i.test(file.type)||(!file.type&&/\.(jpe?g|png|hei[cf])$/i.test(file.name||''));
 function deadline(promise,ms,text,onTimeout=()=>{}){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>{onTimeout();reject(Error(text));},ms);})]).finally(()=>clearTimeout(timer));}
 async function withImage(file,fn){
  if(file.type==='image/png'){
   const data=new DataView(await file.arrayBuffer());
   for(let at=8;at+12<=data.byteLength;){const size=data.getUint32(at),type=data.getUint32(at+4);if(type===0x6163544c)throw Error('Animated PNG is not supported');if(size>data.byteLength-at-12)break;at+=size+12;}
  }
  let source,release=()=>{};
  try{
   if(typeof createImageBitmap==='function'){
    let expired=false;try{source=await deadline(createImageBitmap(file,{imageOrientation:'from-image'}).then(bitmap=>{if(expired){bitmap.close();throw Error('Photo decoding timed out.');}return bitmap;}),20000,'Photo decoding timed out.',()=>{expired=true;});release=()=>source.close();}catch{/* Image.decode can support formats unavailable to createImageBitmap. */}
   }
   if(!source){const url=URL.createObjectURL(file);release=()=>URL.revokeObjectURL(url);source=new Image();source.src=url;try{await deadline(source.decode(),20000,'Photo decoding timed out.');}catch{throw Error(isHEIC(file)?'This browser could not open HEIC/HEIF. Export a JPEG or PNG from Photos, then choose it here. No photo was uploaded.':'Could not open this photo. Choose a valid still JPEG or PNG, or try selecting it again.');}}
   const w=source.naturalWidth||source.width,h=source.naturalHeight||source.height;if(!w||!h||w*h>24000000)throw Error('This photo exceeds the 24 MP limit. Choose a smaller copy; the original is unchanged.');
   return await fn(source,w,h);
  }finally{release();}
 }
 function encode(file,rects){
  return withImage(file,async(source,width,height)=>{
   const canvas=Object.assign(document.createElement('canvas'),{width,height}),ctx=canvas.getContext('2d');
   try{ctx.drawImage(source,0,0);ctx.fillStyle='#000';for(const r of rects){const x=Math.floor(r.x*width),y=Math.floor(r.y*height),w=Math.ceil((r.x+r.width)*width)-x,h=Math.ceil((r.y+r.height)*height)-y;ctx.fillRect(x,y,w,h);}
    return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Export failed')),'image/png'));
   }finally{canvas.width=canvas.height=1;}
  });
 }
 const signal=value=>new RegExp('(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}|(?:\\+?\\d[ .()-]?){7,})','i').test(value);
 // Plate candidates come only from OCR text and geometry, never the image name.
 function isPlateLine(line,w,h){
  const b=line.bbox,text=String(line.text||'').trim();
  if(!b||!/^[A-Z0-9]+(?:[ -][A-Z0-9]+)*$/.test(text)||!(line.confidence>=20))return false;
  const code=text.replace(/[ -]/g,''),bw=b.x1-b.x0,bh=b.y1-b.y0;
  if(bw<18||bh<8||bw/bh<2||bw>.97*w||bh>.68*h)return false;
  return /^(?:[0-9]{1,2}[A-Z]{2,3}[0-9]{2,4}|[A-Z]{2,3}[0-9]{2,4}|[0-9]{2,4}[A-Z]{2,3}|[A-Z]{2}[0-9]{2}[A-Z]{3})$/.test(code);
 }
 const ocrText=line=>String(line.text||'').trim().replace(/\s+/g,' ');
 const ocrWords=line=>(line.words||[]).filter(q=>q.bbox&&ocrText(q));
 const mergeOCR=boxes=>({x0:Math.min(...boxes.map(b=>b.x0)),y0:Math.min(...boxes.map(b=>b.y0)),x1:Math.max(...boxes.map(b=>b.x1)),y1:Math.max(...boxes.map(b=>b.y1))});
 const identityDoc=/\b(?:proof\s+of\s+age\s+card|identity\s+card|identification\s+card|national\s+id|driver'?s?\s+licen[cs]e|passport)\b/i;
 const birthField=/\b(?:d\.?o\.?b\.?|date\s+of\s+birth|birth\s+date)\b/i;
 const cardDate=/\b(?:[0-3]?\d\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(?:19|20)\d{2}|(?:19|20)\d{2}[-/.][01]?\d[-/.][0-3]?\d|[0-3]?\d[-/.][0-3]?\d[-/.](?:19|20)\d{2})\b/i;
 function validCNID(code){
  if(!/^[1-9]\d{16}[\dX]$/.test(code))return false;
  const y=+code.slice(6,10),m=+code.slice(10,12),d=+code.slice(12,14);
  const date=new Date(Date.UTC(y,m-1,d)),weights=[7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2];
  return y>=1900&&y<=new Date().getUTCFullYear()&&date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d&&'10X98765432'[weights.reduce((n,v,i)=>n+v*+code[i],0)%11]===code[17];
 }
 function documentFields(rows,h){
  const result=[],doc=rows.find(r=>identityDoc.test(ocrText(r))),proof=doc&&/proof\s+of\s+age/i.test(ocrText(doc));
  const dates=[];
  for(const r of rows){
   const text=ocrText(r),words=ocrWords(r);
   if(!r.bbox)continue;
   const numbers=words.map((q,i)=>({q,i,text:ocrText(q).replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/gi,'')}));
   for(let a=0;a<numbers.length;a++){
    let code='';
    for(let b=a;b<numbers.length&&b<a+7;b++){
     if(!/^\d[\dXx-]*$/.test(numbers[b].text))break;
     code+=numbers[b].text.replace(/-/g,'').toUpperCase();
     if(code.length>18)break;
     const labelled=/\b(?:document|card|passport|licen[cs]e|id)\s*(?:no\.?|number|#)\s*[:#-]?/i.test(text);
     if(validCNID(code)||(doc&&((proof&&code.length===16&&/^\d+$/.test(code))||(labelled&&code.length>=6&&code.length<=16&&/^\d+$/.test(code))))){
      result.push({bbox:mergeOCR(numbers.slice(a,b+1).map(v=>v.q.bbox)),type:'id-number'});a=b;break;
     }
    }
   }
   if(doc&&cardDate.test(text)){
    let dateBox=r.bbox;
    outer:for(let i=0;i<words.length;i++){
     for(let j=i;j<words.length&&j<i+4;j++){
      if(cardDate.test(words.slice(i,j+1).map(ocrText).join(' '))){dateBox=mergeOCR(words.slice(i,j+1).map(v=>v.bbox));break outer;}
     }
    }
    const v={bbox:dateBox,type:birthField.test(text)?'birth-date':'id-date'};dates.push(v);result.push(v);
   }
   if(doc&&/^\s*(?:(?:full|given|first|last)\s+)?(?:name|surname)\s*[:.-]?\s+[A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,4}\s*$/.test(text)){
    const where=words.findIndex(q=>/^(?:name|surname)[:.-]?$/i.test(ocrText(q)));
    if(where>=0&&where<words.length-1)result.push({bbox:mergeOCR(words.slice(where+1).map(q=>q.bbox)),type:'id-name'});
   }
  }
  // On an identified proof-of-age card, adjacent title-case lines aligned above the date are a name candidate.
  if(proof&&dates.length){
   const first=dates.sort((a,b)=>a.bbox.y0-b.bbox.y0)[0].bbox;
   const names=rows.filter(r=>r.bbox&&r.confidence>=10&&/^[A-Z][a-z'-]{2,}(?: [A-Z][a-z'-]{2,}){0,2}$/.test(ocrText(r))&&
    r.bbox.y1<first.y0&&first.y0-r.bbox.y1<h*.28&&r.bbox.y0>doc.bbox.y1&&Math.abs(r.bbox.x0-first.x0)<3*(first.y1-first.y0));
   if(names.length===2&&names.some(r=>r.confidence>=86)&&Math.abs(names[0].bbox.x0-names[1].bbox.x0)<(first.y1-first.y0))result.push({bbox:mergeOCR(names.map(r=>r.bbox)),type:'id-name'});
  }
  return result;
 }
 async function detect(file){
  return withImage(file,async(source,ow,oh)=>{
   const canvas=document.createElement('canvas');
   const raster=(scale)=>{canvas.width=Math.round(ow*scale);canvas.height=Math.round(oh*scale);canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);};
   const lines=data=>(data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>p.lines||[]));
   const overlaps=(r,q)=>{
    const w=Math.max(0,Math.min(r.x+r.width,q.x+q.width)-Math.max(r.x,q.x)),h=Math.max(0,Math.min(r.y+r.height,q.y+q.height)-Math.max(r.y,q.y));
    return w*h>.55*Math.min(r.width*r.height,q.width*q.height);
   };
   const collect=(rows,secondary)=>{
    const w=canvas.width,h=canvas.height;
    const rect=(b,type,pad)=>{
     const x=Math.max(0,b.x0-pad),y=Math.max(0,b.y0-pad),right=Math.min(w,b.x1+pad),bottom=Math.min(h,b.y1+pad);
     return right>x&&bottom>y?{x:x/w,y:y/h,width:(right-x)/w,height:(bottom-y)/h,...(type?{type}:{})}:null;
    };
    const doc=documentFields(rows,h).map(r=>rect(r.bbox,r.type,4)).filter(Boolean);
    const text=rows.flatMap(line=>{
     const b=line.bbox,plate=isPlateLine(line,w,h);
     if(!b||(!plate&&(secondary||!signal(line.text))))return [];
     const mark=rect(b,plate?'plate':null,plate?Math.max(3,Math.round((b.y1-b.y0)*.065)):3);
     return mark&&!doc.some(q=>overlaps(mark,q))?[mark]:[];
    });
    return [...doc,...text];
   };
   try{
    const initial=Math.min(1,1800/Math.max(ow,oh));raster(initial);
    const first=await deadline((async()=>{const worker=await window.privateOCR.get();return {worker,pass:await worker.recognize(canvas,{}, {blocks:true,text:false})};})(),60000,'Text recognition timed out. Retry or cover manually.',()=>window.privateOCR?.stop());
    const initialRows=lines(first.pass.data),regular=collect(initialRows,false);
    if((regular.some(r=>r.type==='plate')&&!initialRows.some(r=>identityDoc.test(ocrText(r))))||ow<140||oh<45)return regular;
    raster(Math.min(2,1800/Math.max(ow,oh)));
    // Sparse layout helps high-contrast lettering on coloured, bordered plates.
    // Restore the standard mode before another photo uses the worker.
    let platePass;
    try{platePass=await deadline((async()=>{
     await first.worker.setParameters({tessedit_pageseg_mode:'11'});
     try{return await first.worker.recognize(canvas,{}, {blocks:true,text:false});}
     finally{await first.worker.setParameters({tessedit_pageseg_mode:'6'});}
    })(),15000,'Document text recognition timed out.',()=>window.privateOCR?.stop());}
    catch(error){if(regular.length)return regular;throw error;}
    const extra=collect(lines(platePass.data),true);
    const docExtra=extra.filter(r=>r.type.startsWith('id-')||r.type==='birth-date');
    const keep=regular.filter(r=>!docExtra.some(q=>overlaps(r,q)));
    return [...keep,...extra.filter(r=>!keep.some(q=>overlaps(r,q)))];
   }finally{canvas.width=canvas.height=1;}
  });
 }
 let metadataLibrary;
 function readMetadata(file){
  metadataLibrary??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='assets/vendor/exifr-7.1.3.js';script.onload=resolve;script.onerror=()=>{metadataLibrary=null;reject(Error('Metadata reader unavailable.'));};document.head.append(script);});
  return metadataLibrary.then(()=>window.exifr.parse(file,{tiff:true,xmp:true,iptc:true,icc:false,jfif:false,ihdr:false,translateValues:true})).then(data=>{
   const structural=new Set(['ImageWidth','ImageHeight','ExifImageWidth','ExifImageHeight','Orientation','XResolution','YResolution','ResolutionUnit','ColorSpace','ComponentsConfiguration','ExifVersion','FlashpixVersion','YCbCrPositioning']);
   return Object.entries(data||{}).filter(([k,v])=>!structural.has(k)&&v!=null).map(([k,v])=>[k,v instanceof Date?v.toISOString():typeof v==='object'?JSON.stringify(v):String(v)]);
  });
 }
 // Native contract is optional; standalone browsers never claim to use Vision.
 let qrLibrary;
 function qr(){return window.jsQR?Promise.resolve():qrLibrary??=(new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='assets/vendor/jsQR-1.4.0.js';s.onload=resolve;s.onerror=reject;document.head.append(s);})).catch(e=>{qrLibrary=null;throw e;});}
 async function regions(file){
  if(window.securityPlatform?.available()){
   const dataURL=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
   const result=await window.securityPlatform.request('privacy.detect',{dataURL,categories:['phone','email','face','qr'],coordinates:'upright-normalized-top-left'});
   if(result?.engine!=='apple-vision'||!Array.isArray(result.regions)||!Array.isArray(result.completed))throw Error('Invalid native result');
   const boxes=result.regions.map(r=>{if(!['phone','email','face','qr'].includes(r.type)||![r.x,r.y,r.width,r.height].every(Number.isFinite)||r.x<0||r.y<0||r.width<=0||r.height<=0||r.x+r.width>1||r.y+r.height>1)throw Error('Invalid region');if(r.type==='face'){const x=Math.max(0,r.x-r.width*.1),y=Math.max(0,r.y-r.height*.15),right=Math.min(1,r.x+r.width*1.1),bottom=Math.min(1,r.y+r.height*1.15);return {...r,x,y,width:right-x,height:bottom-y};}return {...r};});
   return {boxes,complete:['phone','email','face','qr'].every(x=>result.completed.includes(x)),note:''};
  }
  let boxes=[],failed=[];
  try{boxes=await detect(file);}catch{failed.push('text');}
  try{await qr();await withImage(file,async(source,w,h)=>{
   const scale=Math.min(1,2000/Math.max(w,h));const c=document.createElement('canvas');c.width=Math.round(w*scale);c.height=Math.round(h*scale);const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0,c.width,c.height);
   try{for(let n=0;n<16;n++){const data=ctx.getImageData(0,0,c.width,c.height),hit=window.jsQR(data.data,data.width,data.height);if(!hit)break;const pts=Object.values(hit.location).filter(p=>p&&Number.isFinite(p.x));const left=Math.max(0,Math.min(...pts.map(p=>p.x))-8),top=Math.max(0,Math.min(...pts.map(p=>p.y))-8),right=Math.min(c.width,Math.max(...pts.map(p=>p.x))+8),bottom=Math.min(c.height,Math.max(...pts.map(p=>p.y))+8);boxes.push({x:left/c.width,y:top/c.height,width:(right-left)/c.width,height:(bottom-top)/c.height,type:'qr'});ctx.fillStyle='#fff';ctx.fillRect(left,top,right-left,bottom-top);}}finally{c.width=c.height=1;}
  });}catch{failed.push('QR');}
  return {boxes,complete:false,failed:!!failed.length,note:failed.length?'Could not finish '+failed.join(' and ')+' detection.':'Face not checked'};
 }
 const copy=x=>x.map(r=>({...r}));
 const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 const button=(text,fn,cls='privacy-button')=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
 function displayFields(fields){
  const values=Object.fromEntries(fields||[]),rows=[],used=new Set();
  const add=(label,keys,format=v=>v.join(' '))=>{const present=keys.filter(k=>values[k]);if(present.length){rows.push([label,format(present.map(k=>values[k]))]);present.forEach(k=>used.add(k));}};
  add('Camera',['Make','Model']);add('Lens',['LensModel']);
  const captured=['DateTimeOriginal','CreateDate'].find(k=>values[k]);
  if(captured){const d=new Date(values[captured]);rows.push(['Captured',isNaN(d)?values[captured]:d.toLocaleString('en-US',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})]);used.add(captured);}
  add('GPS',['latitude','longitude'],v=>v.map(x=>Number(x).toFixed(5)).join(', '));
  for(const [key,value] of fields||[]){if(used.has(key)||(used.has('latitude')&&key.startsWith('GPS')))continue;rows.push([key==='ModifyDate'?'Modified':key.replace(/([a-z])([A-Z])/g,'$1 $2'),value]);}return rows;
 }
 function message(text){state.message=text;render();}
 function invalidate(item){item.confirmed=false;state.output=null;state.message='';}
 function remember(item){item.history.push(copy(item.marks));invalidate(item);}
 function stop(){if(sample)return window.privacySamples.action('cancel');run++;window.privateOCR?.stop();state.busy=false;state.items.forEach(i=>{if(i.status==='working')i.status='incomplete';});state.message='Cancelled. Originals unchanged.';render();}
 function hide(){cancel();page.hidden=true;page.replaceChildren();phone.classList.remove('detail-open');}
 function leave(){hide();returnTo();}
 function show(next,back){cancel();kind=next;returnTo=back;state=sessions[kind]??={items:[],editor:null,busy:false,message:'',output:null};page.hidden=false;phone.classList.add('detail-open');render();}
 function defaultCover(item){
  if(!item||item.selected!=null||!item.marks.length)return;
  item.selected=item.marks.reduce((best,region,i)=>{const old=item.marks[best];return region.y<old.y||(region.y===old.y&&region.x<old.x)?i:best;},0);
 }
 function openReview(index){state.editor=index;defaultCover(state.items[index]);state.message='';render();}
 function photo(item,editable=false,onChange=()=>{}){
  const card=el('div','privacy-image-card'+(editable?' privacy-editor-image':'')),img=el('img');img.src=objectURL(item.preview||item.file);img.alt=item.file.name;if(item.width&&item.height){img.width=item.width;img.height=item.height;card.style.aspectRatio=item.width+'/'+item.height;}card.append(img);
  const draw=()=>{const existing=[...card.querySelectorAll('.privacy-region')];existing.slice(item.marks.length).forEach(x=>x.remove());for(const [i,r] of item.marks.entries()){
   const mark=existing[i]||el(editable?'button':'span');mark.className='privacy-region '+(editable||item.confirmed?'opaque':'outline')+(editable&&item.selected===i?' selected':'');Object.assign(mark.style,{left:r.x*100+'%',top:r.y*100+'%',width:r.width*100+'%',height:r.height*100+'%'});
   if(editable){mark.type='button';mark.setAttribute('aria-label','Select cover '+(i+1));mark.setAttribute('aria-pressed',String(item.selected===i));mark.onpointerdown=e=>{e.stopPropagation();item.selected=i;item.adding=false;start(e,'move',i);};mark.onclick=e=>{e.stopPropagation();item.selected=i;onChange();};if(item.selected!==i)mark.querySelector('.privacy-resize')?.remove();if(item.selected===i&&!mark.querySelector('.privacy-resize')){const handle=el('span','privacy-resize');handle.onpointerdown=e=>{e.stopPropagation();start(e,'resize',i);};mark.append(handle);}}if(!mark.isConnected)card.append(mark);
  }};
  if(editable){let drag=null;const point=e=>{const b=img.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-b.left)/b.width)),y:Math.max(0,Math.min(1,(e.clientY-b.top)/b.height))};};
   var start=(e,action,index)=>{if(state.busy||!img.naturalWidth)return;e.preventDefault();drag={action,index,p:point(e),before:copy(item.marks),confirmed:item.confirmed};card.setPointerCapture(e.pointerId);};
   card.onpointerdown=e=>start(e,'add',item.marks.length);
   card.onpointermove=e=>{if(!drag)return;const p=point(e),d=drag;if(d.action==='add'){item.marks=[...copy(d.before),{x:Math.min(d.p.x,p.x),y:Math.min(d.p.y,p.y),width:Math.abs(p.x-d.p.x),height:Math.abs(p.y-d.p.y)}];}else{const r=d.before[d.index],dx=p.x-d.p.x,dy=p.y-d.p.y;item.marks=copy(d.before);item.marks[d.index]=d.action==='move'?{...r,x:Math.max(0,Math.min(1-r.width,r.x+dx)),y:Math.max(0,Math.min(1-r.height,r.y+dy))}:{...r,width:Math.max(.008,Math.min(1-r.x,r.width+dx)),height:Math.max(.008,Math.min(1-r.y,r.height+dy))};}draw();};
   card.onpointerup=()=>{if(!drag)return;const d=drag;drag=null;if(d.action==='add'&&item.marks[d.index]&&(item.marks[d.index].width<.008||item.marks[d.index].height<.008))item.marks=copy(d.before);if(JSON.stringify(item.marks)!==JSON.stringify(d.before)){item.history.push(d.before);invalidate(item);}item.selected=d.index<item.marks.length?d.index:null;item.adding=false;onChange();};
   card.onpointercancel=()=>{if(drag){item.marks=drag.before;drag=null;onChange();}};
  }card.refresh=draw;draw();if(!editable&&item.width&&item.height)card.style.maxWidth=(kind==='metadata'?300:130)*item.width/item.height+'px';if(editable){requestAnimationFrame(()=>{if(!card.isConnected)return;const body=card.closest('.privacy-detail-body');const fit=()=>{if(!item.width||!item.height)return;const style=getComputedStyle(body),padding=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom);let occupied=padding;for(const sibling of body.children){if(sibling===card)continue;const css=getComputedStyle(sibling);occupied+=sibling.getBoundingClientRect().height+parseFloat(css.marginTop)+parseFloat(css.marginBottom);}const availableHeight=Math.max(160,body.clientHeight-occupied);card.style.maxWidth=availableHeight*item.width/item.height+'px';};fit();resizeObserver=new ResizeObserver(fit);resizeObserver.observe(body);for(const sibling of body.children)if(sibling!==card)resizeObserver.observe(sibling);});}return card;
 }
 function render(){
  free();page.replaceChildren();page.dataset.mode=kind;page.dataset.sample=String(sample);page.dataset.empty=String(!state.items.length);page.dataset.editing=String(state.editor!==null&&!state.output);window.dispatchEvent(new CustomEvent('preview-context',{detail:{key:kind}}));
  const header=el('header','detail-header'),back=button('',()=>{if(state.editor!==null&&kind==='scan'){state.editor=null;state.group=null;render();}else if(state.group){state.group=null;render();}else leave();},'detail-back');back.setAttribute('aria-label',(state.editor!==null||state.group)&&kind==='scan'?'Back to scan results':'Back to Privacy');back.innerHTML='<span class="detail-icon-well"><img src="assets/test/detail-back.svg" alt=""></span>';header.append(back,el('h1','',names[kind]));page.append(header);page.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();back.click();}};
  const body=el('div','detail-body privacy-detail-body'),footer=el('footer','detail-footer privacy-detail-footer');page.append(body,footer);
  const input=el('input');input.type='file';input.id='privacy-files';input.accept='image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif';input.multiple=kind!=='redact';input.className='privacy-file-input';input.tabIndex=-1;input.setAttribute('aria-label','Choose photos');input.onchange=()=>{const files=[...input.files];input.value='';if(files.length)select(files);};page.append(input);
  const choose=()=>{if(sample)return window.privacySamples.action('select');input.value='';input.click();};
  if(kind==='redact'&&state.items.length&&!state.busy&&!state.output&&!state.items[state.editor]?.openError){const replace=button('',choose,'privacy-replace');replace.setAttribute('aria-label','Choose Another Photo');replace.title='Choose Another Photo';const icon=el('img');icon.src='assets/vault/more.svg';icon.alt='';replace.append(icon);header.append(replace);}
  if(state.selectionError)body.append(el('p','privacy-status',state.selectionError));
  if(state.message)body.append(el('p','privacy-status',state.message));
  if(state.busy){const bar=el('div','privacy-progress');bar.setAttribute('role','status');bar.setAttribute('aria-label','Processing');bar.append(el('span'));body.append(bar);footer.append(button('Cancel',stop));}
  if(state.output){const out=el('section','privacy-output');out.append(el('h2','',state.output.count===1?'Copy Ready':state.output.count+' Copies Ready'));const a=el('a','privacy-button',state.output.count>1?'Save '+state.output.count+' Copies':'Save Copy');a.href=objectURL(state.output.blob);a.download=state.output.name;if(sample){a.removeAttribute('href');a.removeAttribute('download');a.setAttribute('aria-disabled','true');a.onclick=e=>e.preventDefault();}const previews=el('div','privacy-preview-grid');for(const entry of state.output.entries){const pic=el('img');pic.src=objectURL(entry.blob);pic.alt=entry.name;previews.append(pic);}out.append(previews);if(state.output.clean){const fields=el('dl','privacy-fields');for(const key of state.output.removed){fields.append(el('dt','',key),el('dd','','Removed'));}out.append(fields);}footer.append(a);body.append(out);if(!state.busy)footer.append(button('Done',()=>{state.output=null;state.message='';render();},'privacy-button secondary'));return;}
  if(!state.items.length){const empty=el('div','privacy-empty');const im=el('img');im.src=kind==='scan'?'assets/privacy/empty-scan-approved.png':kind==='redact'?'assets/privacy/empty-redact.png':'assets/privacy/home-approved-metadata.png';im.alt='';if(kind==='redact'){const frame=el('div','privacy-empty-redact-photo'),cover=el('span','privacy-empty-cover');cover.setAttribute('aria-hidden','true');for(let i=0;i<4;i++)cover.append(el('i'));frame.append(im,cover);empty.append(frame);}else empty.append(im);body.append(empty);footer.append(button(kind==='redact'?'Choose Photo':'Select Photos',choose));return;}
  if(state.editor!==null){const item=state.items[state.editor];if(item.openError){body.append(el('p','privacy-status',item.openError));if(!state.busy)footer.append(button('Retry',()=>select([item.file])),button('Choose Another Photo',choose,'privacy-button secondary'));return;}const refresh=()=>{picture.refresh();controls.children[1].disabled=!item.history.length;controls.children[2].disabled=item.selected==null;};const picture=photo(item,true,()=>refresh());body.append(picture);if(item.note&&(kind!=='scan'||item.failed))body.append(el('p','privacy-status',item.note));const controls=el('div','redact-tools');
   controls.append(button('Add Cover',()=>{remember(item);const offset=(item.marks.length%5)*.035;item.marks.push({x:.35+offset,y:.40+offset,width:.25,height:.12});item.selected=item.marks.length-1;item.adding=false;refresh();},'privacy-button secondary'+(item.adding?' active':'')),button('Undo',()=>{if(item.history.length){item.marks=item.history.pop();item.selected=null;invalidate(item);refresh();}},'privacy-button secondary'),button('Remove Cover',()=>{if(item.selected!==null&&item.marks[item.selected]){remember(item);item.marks.splice(item.selected,1);item.selected=null;refresh();}},'privacy-button secondary'));
   controls.children[1].disabled=!item.history.length;controls.children[2].disabled=item.selected==null;controls.children[0].setAttribute('aria-pressed',String(!!item.adding));body.append(controls);if(kind==='redact')controls.classList.add('privacy-editor-actions');
   if(!state.busy){if(kind==='scan')footer.append(button('Confirm Photo',()=>{item.confirmed=true;state.editor=null;state.group=null;state.message='';render();}));else controls.append(button('Save Copy',()=>exportItems([item])));if(item.failed||item.status==='pending')body.append(button(item.failed?'Retry':'Find Regions',()=>scan([item]),'privacy-text-button'));}
  }else{
   const groups=kind==='scan'&&state.items.some(i=>i.status!=='pending')?[
    ['Confirmed',i=>i.confirmed],['Found',i=>!i.confirmed&&i.marks.length>0],['No findings',i=>!i.confirmed&&!i.marks.length&&i.status==='complete'],['Incomplete',i=>!i.confirmed&&!i.marks.length&&i.status!=='complete']
   ]:[['',()=>true]];
   for(const [name,match] of groups){const items=state.items.filter(match);if(!items.length)continue;if(name&&!state.busy&&!state.group){const row=button('',()=>{state.group=name;render();},'privacy-group-card');row.setAttribute('aria-label',name+' '+items.length);const icon=el('img','privacy-group-icon');icon.src=name==='Found'?'assets/icons/shield-check.svg':name==='Incomplete'?'assets/test/detail-clock.svg':'assets/icons/check.svg';icon.alt='';row.append(icon,el('strong','',name+' '+items.length));const thumbnails=el('span','privacy-group-thumbs');for(const item of items.slice(0,2)){const im=el('img');im.src=objectURL(item.preview||item.file);im.alt='';thumbnails.append(im);}const arrow=el('img','privacy-group-arrow');arrow.src='assets/test/chevron.svg';arrow.alt='';row.append(thumbnails,arrow);body.append(row);continue;}if(state.group&&name!==state.group)continue;const grid=el('div','privacy-preview-grid');body.append(grid);
    for(const item of items){const cell=el('section','privacy-photo');if(!item.openError)cell.append(photo(item));else cell.append(el('p','privacy-status',item.openError));cell.setAttribute('aria-label',item.file.name);
     if(kind==='metadata'){if(item.fields){const dl=el('dl','privacy-fields');for(const [k,v] of displayFields(item.fields)){dl.append(el('dt','',k),el('dd','',v));}cell.append(item.fields.length?dl:el('p','privacy-status','No removable fields'));}if(item.error&&!item.openError)cell.append(el('p','privacy-status',item.error));if(!state.busy&&item.error)cell.append(button('Retry',()=>metadata([item]),'privacy-text-button'));}
     else{if(item.exportError)cell.append(el('p','privacy-status','Copy failed. Retry export.'));if(!state.busy){const review=button('',()=>openReview(state.items.indexOf(item)),'privacy-photo-open');review.setAttribute('aria-label',(item.confirmed?'Edit ':'Review ')+item.file.name);cell.append(review);if(item.failed)cell.append(button('Retry',()=>scan([item]),'privacy-text-button'));}}grid.append(cell);
    }
   }
   if(!state.busy){if(kind==='scan'&&!state.group&&state.items.some(i=>i.status!=='pending')&&!sample&&!window.securityPlatform?.available())body.append(el('p','privacy-status','Face not checked'));if(kind==='metadata'){const ready=state.items.filter(i=>i.fields?.length&&!i.error);const b=button('Clean '+ready.length+' '+(ready.length===1?'Photo':'Photos'),()=>exportItems(ready,true));if(ready.length)footer.append(b);}else{const n=state.items.filter(i=>i.confirmed).length;const reviewed=state.items.some(i=>i.status!=='pending');footer.append(button(n?'Export '+n+' Confirmed '+(n===1?'Copy':'Copies'):reviewed?'Review Photos':'Scan Photos',()=>{if(n)exportItems(state.items.filter(i=>i.confirmed));else if(reviewed){const selectedGroup=groups.find(([name])=>name===state.group);openReview(selectedGroup?state.items.findIndex(selectedGroup[1]):0);}else scan(state.items);}));}footer.append(button('Select Other Photos',choose,'privacy-button secondary'));}
  }
  if(state.busy)body.querySelectorAll('button').forEach(b=>b.disabled=true);
 }
 async function select(files,collection=false){
  if(sample)return window.privacySamples.action('select');
  if(!files.length)return;
  cancel();state.items=[];state.editor=null;state.group=null;state.output=null;state.message='';state.selectionError='';state.collection=collection;
  const valid=files.filter(f=>supported(f)&&f.size<=20*1024*1024).slice(0,kind==='redact'?1:12);
  if(valid.length!==files.length)state.selectionError='Some files were skipped. Choose up to 12 still JPEG, PNG or supported HEIC photos, no more than 20 MB each.';
  state.items=valid.map(file=>({file,marks:[],history:[],selected:null,confirmed:false,status:'pending'}));const token=++run;state.busy=!!valid.length;state.message=valid.length?'Opening photos…':'';render();
  for(const item of state.items){try{item.preview=await encode(item.file,[]);await withImage(item.preview,(_s,w,h)=>{item.width=w;item.height=h;});}catch(error){item.openError=error.message||'Could not open this photo. Choose another image.';item.status='incomplete';}if(token!==run)return;}
  state.busy=false;state.message='';if(kind==='redact'&&valid.length)state.editor=0;render();
  if(kind==='metadata'&&valid.length)await metadata(state.items);else if(kind==='redact'&&valid.length&&!state.items[0].openError)await scan(state.items);
 }
 async function scan(items){if(sample)return window.privacySamples.action('scan');const token=++run;state.busy=true;state.output=null;
  for(const [index,item] of items.entries()){if(token!==run)return;if(item.openError)continue;item.status='working';state.message='Scanning '+(index+1)+' of '+items.length;render();
   try{await withImage(item.file,()=>{});const result=await regions(item.file);if(token!==run)return;// Detection establishes a baseline, never an undoable manual edit. Retain existing covers on retry.
   const withCandidates=marks=>[...marks,...result.boxes.filter(box=>!marks.some(mark=>JSON.stringify(mark)===JSON.stringify(box)))];item.marks=withCandidates(item.marks);item.history=item.history.map(withCandidates);invalidate(item);item.note=result.note;item.failed=!!result.failed;item.status=result.complete?'complete':'incomplete';defaultCover(item);}
   catch{if(token!==run)return;item.status='incomplete';item.failed=true;item.note='Could not finish detection.';}
  }if(token!==run)return;state.busy=false;state.message='';render();
 }
 async function metadata(items){if(sample)return window.privacySamples.action('metadata');const token=++run;state.busy=true;state.output=null;
  for(const [index,item]of items.entries()){state.message='Reading '+(index+1)+' of '+items.length;render();try{await withImage(item.file,()=>{});const fields=await readMetadata(item.file);if(token!==run)return;item.fields=fields;item.error=null;}catch{if(token!==run)return;item.fields=null;item.error=item.openError||'Could not read this photo. Retry or choose another.';}}
  if(token!==run)return;state.busy=false;state.message='';render();
 }
 // Store-only ZIP: one browser download for the confirmed batch, with CRC-32.
 async function zip(entries,token){const table=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);return c>>>0;});let offset=0;const local=[],central=[];const bytes=s=>new TextEncoder().encode(s);const header=n=>new Uint8Array(n);const put=(b,p,v,n=4)=>new DataView(b.buffer).setUint32(p,v,true);
  for(const e of entries){const data=new Uint8Array(await e.blob.arrayBuffer()),name=bytes(e.name);let crc=0xffffffff;for(let n=0;n<data.length;n++){crc=(crc>>>8)^table[(crc^data[n])&255];if((n&1048575)===0){await breathe();if(token!==run)return null;}}crc=(crc^0xffffffff)>>>0;const l=header(30),lv=new DataView(l.buffer);put(l,0,0x04034b50);lv.setUint16(4,20,true);lv.setUint16(6,0x800,true);put(l,14,crc);put(l,18,data.length);put(l,22,data.length);lv.setUint16(26,name.length,true);local.push(l,name,data);const c=header(46),cv=new DataView(c.buffer);put(c,0,0x02014b50);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);put(c,16,crc);put(c,20,data.length);put(c,24,data.length);cv.setUint16(28,name.length,true);put(c,42,offset);central.push(c,name);offset+=30+name.length+data.length;}
  const end=header(22),v=new DataView(end.buffer);put(end,0,0x06054b50);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);put(end,12,central.reduce((n,b)=>n+b.length,0));put(end,16,offset);return new Blob([...local,...central,end],{type:'application/zip'});
 }
 async function exportItems(items,clean=false){if(sample)return window.privacySamples.action('export',items,clean);if(state.busy)return;const token=++run;state.busy=true;state.output=null;const entries=[];let failed=0;
  for(const [index,item]of items.entries()){if(token!==run)return;state.message=(clean?'Cleaning ':'Preparing ')+(index+1)+' of '+items.length;render();try{const blob=await encode(item.file,clean?[]:copy(item.marks));if(token!==run)return;if(clean&&(await readMetadata(blob)).length)throw Error('Metadata remains');if(token!==run)return;entries.push({blob,name:String(index+1).padStart(2,'0')+'-'+item.file.name.replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|]/g,'_')+(clean?'-clean':'-redacted')+'.png'});item.exportError=false;}catch{if(token!==run)return;item.exportError=true;failed++;}}
  if(token!==run)return;const blob=entries.length>1?await zip(entries,token):entries[0]?.blob;if(token!==run)return;state.busy=false;state.message=failed?failed+' '+(failed===1?'photo failed.':'photos failed.')+' Return to photos and retry.':'';if(blob)state.output={blob,entries,clean,removed:[...new Set(items.filter(i=>!i.exportError).flatMap(i=>displayFields(i.fields).map(([k])=>k)))],count:entries.length,name:entries.length>1?'privacy-copies.zip':entries[0].name};else state.message='Could not prepare copies. Retry or choose another photo.';render();
 }
 document.querySelectorAll('#privacy-page .privacy-art').forEach((im,i)=>{const key=['scan','redact','metadata'][i];im.src='assets/privacy/home-approved-'+key+'.png';im.className='privacy-approved-art';const card=im.closest('.privacy-card'),trigger=card.querySelector('[data-privacy]');card.querySelector('p')?.remove();trigger.replaceChildren();trigger.removeAttribute('aria-label');trigger.setAttribute('aria-labelledby',card.querySelector('h2').id);const arrow=el('span','privacy-home-arrow'),icon=el('img');icon.src='assets/test/chevron.svg';icon.alt='';arrow.append(icon);trigger.append(arrow);});
 // Desktop-only samples retain real state by reference; never enter during real work.
 window.privacyPreviewBridge={
  info:()=>({kind,sample,collection:!!state?.collection,busy:!!state?.busy,visible:!page.hidden,stage:state?.samplePhase||(state?.output?'output':state?.busy?'processing':!state?.items.length?'empty':state.editor!==null?'editor':kind==='metadata'?'fields':state.group?'group':state.items.every(i=>i.status==='pending')?'selection':'summary')}),
  loadFiles:async files=>{if(innerWidth<=700||page.hidden||sample||state?.busy||state?.items.length)return false;await select(files,true);return true;},
  sampleState:()=>sample?state:null,
  enter:()=>false,
  restore:()=>{if(!sample)return;state=realState;realState=null;sample=false;render();},
  sampleOutput:async(items,clean)=>{const entries=[];for(const item of items){const blob=await encode(item.file,clean?[]:item.marks);entries.push({blob,name:item.file.name});}return {blob:entries[0]?.blob,entries,clean,removed:[...new Set(items.flatMap(i=>displayFields(i.fields).map(([k])=>k)))],count:entries.length,name:'sample-only.png'};}
 };
 if(!document.querySelector('script[data-privacy-samples]')){const script=document.createElement('script');script.src='assets/privacy-preview.js?v=privacy-real-only-2';script.dataset.privacySamples='true';document.head.append(script);}
 return {show,cancel,hide};
};
