(() => {
 const guides={
  web:{title:'Browsing Protection',path:'Settings › Apps › Safari › Extensions',steps:[
   ['Open Apps in Settings'],['Choose Safari'],['Tap Extensions'],['Enable SecurityCenter']
  ]},
  calendar:{title:'Calendar Clean',path:'Settings › Privacy & Security › Calendars › Your app',steps:[
   ['Open Privacy & Security'],['Tap Calendars'],['Choose Clean Web'],['Choose Full Access']
  ]},
  sms:{title:'SafeSMS',path:'Settings › Apps › Messages › Unknown & Spam › Select your SMS filter',steps:[
   ['Open Apps'],['Choose Messages'],['Open Unknown & Spam'],['Select Clean Web']
  ]},
  call:{title:'SafeCall',path:'Settings › Apps › Phone › Call Blocking &amp; Identification',steps:[
   ['Open Settings → Apps'],['Choose Phone'],['Open Call Blocking & Identification'],['Enable Clean Web']
  ]}
 };
 window.initCleanGuide=()=>{
  const page=document.querySelector('#clean-guide-detail'),phone=document.querySelector('.phone');
  const prefers=matchMedia('(prefers-reduced-motion: reduce)'), paths=new Map();
  const decode=s=>s.replace(/&amp;/g,'&');
  let originBack=null,key,step=0,timer=0,selected=false,returnFocus,generation=0,failNext=false;
  const interval=2200;
  // Key row positions measured from the existing tutorial artwork, not new crops.
  const focusRows={web:[.93,.88,.68,.36],sms:[.94,.35,.95,.40],call:[.92,.25,.62,.21],calendar:[.46,.36,.52,.32]};
  // Browsing Protection only: rectangles measured in each source image's pixels.
  // Decorative, pointer-transparent annotations; never simulated Settings controls.
  const webTargets=[
   {x:44,y:1542,width:849,height:70}, // settings.png: Apps
   {x:44,y:1433,width:849,height:88}, // apps.png: Safari, between Reminders and Shortcuts
   {x:44,y:1207,width:764,height:94}, // web-filter.png: Extensions
   {x:659,y:609,width:126,height:85} // web-enable.png: Allow Extension switch only
  ];
  // Source-pixel fingertip anchors; row right edges keep the gesture off labels.
  const webTapPoints=[{x:800,y:1577,size:90},{x:800,y:1477,size:116},{x:735,y:1254,size:116},{x:748,y:638,size:100,angle:-60}];
  let observedVisual;
  function frameKeyRow(){
   const img=page.querySelector('.guide-shot'),visual=page.querySelector('.guide-visual');
   if(!img?.naturalWidth||!visual||page.hidden)return;
   const w=visual.clientWidth,h=visual.clientHeight;
   // Fill the shared tutorial canvas without distorting the source artwork.
   const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight);
   const iw=img.naturalWidth*scale,ih=img.naturalHeight*scale;
   const focus=focusRows[key]?.[step]??.5;
   const y=(h-ih)/2;
   Object.assign(img.style,{width:iw+'px',height:ih+'px',left:(w-iw)/2+'px',top:y+'px'});
   const highlight=visual.querySelector('.web-guide-target');
   if(key==='web'&&highlight){
    const target=webTargets[step];
    Object.assign(highlight.style,{
     left:((w-iw)/2+target.x*scale)+'px',top:(y+target.y*scale)+'px',
     width:(target.width*scale)+'px',height:(target.height*scale)+'px'
    });
    const hand=visual.querySelector('.web-guide-hand'),ripple=visual.querySelector('.web-guide-tap');
    if(hand&&ripple){
     const point=webTapPoints[step],size=point.size*scale;
     const tx=(w-iw)/2+point.x*scale,ty=y+point.y*scale;
     // Official SVG fingertip is (6.75, 0) in its 16 × 16 viewBox.
     Object.assign(hand.style,{width:size+'px',height:size+'px',left:(tx-size*6.75/16)+'px',top:ty+'px',transform:`rotate(${point.angle??-30}deg)`});
     Object.assign(ripple.style,{left:tx+'px',top:ty+'px',width:(58*scale)+'px',height:(58*scale)+'px'});
     if(!hand.dataset.presented){
      hand.dataset.presented='true';
      if(!prefers.matches){
       hand.animate([{transform:`translate(9px, 12px) rotate(${point.angle??-30}deg)`},{transform:`translate(0, 0) rotate(${point.angle??-30}deg)`}],{duration:300,easing:'ease-out',iterations:1});
       ripple.animate([{transform:'translate(-50%, -50%) scale(.4)',opacity:.85},{transform:'translate(-50%, -50%) scale(1.8)',opacity:0}],{delay:220,duration:520,easing:'ease-out',iterations:1});
      }
     }
    }
   }
  }
  const imageFrameObserver=new ResizeObserver(frameKeyRow);
  function stop(){clearTimeout(timer);timer=0;}
  function arm(){
   stop();
   if(page.hidden||!page.querySelector('.guide-shot, .guide-scene')||selected||document.hidden||prefers.matches)return;
   timer=setTimeout(()=>{step=(step+1)%guides[key].steps.length;draw();arm();},interval);
  }
  function draw(){
   page.dataset.guide=key;page.dataset.step=String(step+1);
   const [label]=guides[key].steps[step];
   const visual=page.querySelector('.guide-visual');
   visual.innerHTML=window.renderGuideScene(key,step);
   page.querySelector('.guide-instruction').textContent=key==='web'?decode(label):'';
   page.querySelector('.guide-step-count').textContent=`${step+1} / ${guides[key].steps.length}`;
   page.querySelectorAll('[data-guide-step]').forEach((b,i)=>i===step?b.setAttribute('aria-current','step'):b.removeAttribute('aria-current'));
  }
  function select(index){
   const count=guides[key].steps.length;
   step=(index+count)%count;selected=false;draw();arm();
  }
  function leave(returnToOrigin=true){
   window.dispatchEvent(new CustomEvent("preview-context",{detail:{key:"clean"}}));
   generation++;stop();imageFrameObserver.disconnect();observedVisual=null;page.hidden=true;page.replaceChildren();phone.classList.remove('detail-open');
   for(const [node,inert] of paths)node.inert=inert;
   paths.clear();returnFocus?.focus({preventScroll:true});const callback=originBack;originBack=null;if(returnToOrigin)callback?.();
  }
  async function openSettingsAndHome(){
   const feature=key,button=page.querySelector('footer button'),help=page.querySelector('.guide-settings-help');
   if(button.disabled)return;button.disabled=true;const epoch=generation;
   const native=window.securityPlatform.available();
   try{
    if(failNext){failNext=false;throw Error('settings');}
    if(native)await window.securityPlatform.request(feature==='call'?'call.openSettings':'openSettings',{feature});
    if(epoch!==generation||page.hidden)return;
    if(feature==='calendar'){leave(true);return;}
    leave(false);
    document.dispatchEvent(new CustomEvent('guide-settings-return',{detail:{feature,native}}));
    document.querySelector('#clean-tab').click();
    document.querySelector('#clean-scroll').scrollTo({top:0,behavior:'instant'});
   }catch{
    if(epoch!==generation||page.hidden)return;
    if(help){help.hidden=false;help.textContent='Could not open Settings. Try again.';}
    button.disabled=false;
   }
  }
  function show(name,onBack){
   if(!page.hidden)leave();
   originBack=onBack||null;returnFocus=document.activeElement;
   key=Object.hasOwn(guides,name)?name:'web';step=0;selected=false;
   const g=guides[key], stages=g.steps.map((_,i)=>`<button type="button" data-guide-step="${i}" aria-label="Step ${i+1}"><span></span></button>`).join('');
   for(const node of phone.children){if(node===page||node.classList.contains('statusbar'))continue;paths.set(node,node.inert);node.inert=true;}
   phone.classList.add('detail-open');page.hidden=false;page.classList.remove('guide-fullscreen');
   page.innerHTML=`<header class="detail-header guide-header">
     <button type="button" class="detail-back" data-guide-back aria-label="Back"><span class="detail-icon-well"><img src="assets/test/detail-back.svg" alt=""></span></button>
     <h1>${g.title}</h1>
    </header>
    <div class="guide-body">
     <div class="guide-stage">
      <div class="guide-step-count"></div>
      <div class="guide-visual"></div>
      <h2 class="guide-instruction"></h2>
      <nav class="guide-stages" aria-label="Tutorial steps">${stages}</nav>
     </div>
     <div class="guide-settings-help" hidden role="status"></div>
    </div>
    <footer class="guide-footer"><button type="button" class="test-again" data-guide-settings>Open Settings</button></footer>`;
   const visual=page.querySelector('.guide-visual');let gesture=null;
   visual.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')gesture={id:e.pointerId,x:e.clientX,y:e.clientY};});
   visual.addEventListener('pointerup',e=>{if(!gesture||e.pointerId!==gesture.id)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;gesture=null;if(Math.abs(dx)>42&&Math.abs(dx)>Math.abs(dy)*1.5)select(step+(dx<0?1:-1));});
   visual.addEventListener('pointercancel',()=>{gesture=null;});
   window.dispatchEvent(new CustomEvent('preview-context',{detail:{key:['sms','call','calendar'].includes(key)?key+'-guide':key}}));
   draw();arm();page.querySelector('[data-guide-back]').focus({preventScroll:true});
  }
  page.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();leave();return;}
   if(!e.target.closest('.guide-stages')||!['ArrowLeft','ArrowRight'].includes(e.key))return;
   e.preventDefault();select(step+(e.key==='ArrowRight'?1:-1));
   page.querySelector('[data-guide-step][aria-current]')?.focus();
  });
  page.addEventListener('click',e=>{
   if(e.target.closest('[data-guide-back]')){leave();return;}
   const dot=e.target.closest('[data-guide-step]');
   if(dot){select(Number(dot.dataset.guideStep));return;}
   if(e.target.closest('[data-guide-settings]')){
    openSettingsAndHome();
   }
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else arm();});
  prefers.addEventListener('change',arm);
  prefers.addEventListener('change',()=>{
   if(prefers.matches&&key==='web')page.querySelectorAll('.web-guide-hand,.web-guide-tap').forEach(node=>node.getAnimations().forEach(animation=>animation.cancel()));
  });
  window.cleanGuidePreview={fail(){failNext=true;},step:select,close:leave,show,snapshot:()=>({key,step,hidden:page.hidden})};
  return show;
 };
})();
