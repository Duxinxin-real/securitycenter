/* Calendar prototype: explicit local fixtures only; never reads the user's calendar. */
(() => {
 const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const categories={links:['Links','assets/test/link.svg'],promotions:['Promotions','assets/calendar/message.svg'],duplicates:['Duplicates','assets/test/detail-layers.svg']};
 const key='clean-calendar-fixture-v2',day=86400000;
 function fixtures(){const now=Date.now();return [
 {id:'a',title:'Account expires today',start:now-4*day,allDay:true,calendar:'Promotions',category:'links',note:'Review your account at https://example.invalid/account',reason:'Account warning with an external link.',writable:true},
 {id:'b',title:'Claim your reward',start:now-5*day,calendar:'Promotions',category:'promotions',note:'Claim your reward before it expires.',reason:'Prize-claim wording with an external link.',writable:true},
 {id:'c',title:'Weekly catch-up',start:now-6*day,calendar:'Personal',category:'duplicates',note:'Team catch-up',reason:'Same title and time as another event.',writable:true,recurring:true,seriesId:'weekly'},
 {id:'future',title:'Weekly catch-up',seriesId:'weekly',recurring:true,start:now+day,calendar:'Personal',category:'links',writable:true},
 {id:'old',title:'Old event',start:now-100*day,calendar:'Personal',category:'links',writable:true}];}
 let data=fixtures(),permission='notDetermined';try{const s=JSON.parse(localStorage.getItem(key));if(Array.isArray(s?.data))data=s.data;if(['notDetermined','fullAccess','denied','restricted'].includes(s?.permission))permission=s.permission;}catch{}
 function persist(){try{localStorage.setItem(key,JSON.stringify({data,permission}));return true;}catch{return false;}}
 let fixtureNote='';
 let page,stage='ready',events=[],selected=new Set(),filter='all',detailId=null,timer,run=0,removed=0,error='',scenario='content',deleteMode='success',guide,settingsFail=false;
 const inertBefore=new Map(),icon=k=>`<img src="${categories[k]?.[1]||categories.links[1]}" alt="">`;
 const date=e=>new Date(e.start).toLocaleDateString('en-US',{month:'short',day:'numeric'})+' · '+(e.allDay?'All day':e.id==='b'?'9:00 AM':'10:00 AM');
 const fullDate=e=>new Date(e.start).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})+' · '+(e.allDay?'All day':e.id==='b'?'9:00 AM':'10:00 AM');
 const allowed=e=>e.writable!==false;
 function publish(){window.dispatchEvent(new CustomEvent('preview-context',{detail:{key:'calendar',stage,permission,state:'模拟日历 · '+stage,scenario,fixtureNote}}));}
 function stop(){clearInterval(timer);run++;}
 function open(keep=false){if(!page){page=document.createElement('section');page.id='calendar-page';$('.phone').append(page);}page.hidden=false;for(const el of $('.phone').children)if(el!==page&&!el.classList.contains('statusbar')&&!inertBefore.has(el)){inertBefore.set(el,el.inert);el.inert=true;}$('.phone').classList.add('detail-open');if(!keep)stage=permission==='denied'?'denied':permission==='restricted'?'restricted':'ready';render();}
 function close(){stop();page.hidden=true;for(const [el,v] of inertBefore)el.inert=v;inertBefore.clear();$('.phone').classList.remove('detail-open');$('[data-tool="calendar"]').focus({preventScroll:true});window.dispatchEvent(new CustomEvent('preview-context',{detail:{key:'clean'}}));}
 function set(s){stop();stage=s;render();}
 const action=(text,a,disabled=false,cls='')=>`<button data-cal="${a}" class="${cls}" ${disabled?'disabled':''}>${text}</button>`;
 const art='<img class="cal-recovery-art" src="assets/calendar/scanning-card.png" alt="">';
 function render(){page.dataset.stage=stage;publish();let body='',footer='',overlay='';
 if(['ready','permission'].includes(stage)){
 body=`<div class="cal-intro"><img src="assets/icons/calendar.png" alt=""><h2>Review your calendar</h2><p>Past 90 days</p><div class="cal-categories">${Object.keys(categories).map(k=>`<div>${icon(k)}<span>${categories[k][0]}</span></div>`).join('')}</div><p>You choose what to delete.</p></div>`;footer=action('Scan Calendar','scan');
 if(stage==='permission')overlay=`<div class="cal-overlay"><div role="dialog" aria-modal="true" aria-label="Calendar permission demonstration" class="cal-dialog"><strong>“Clean Web” Would Like Full Access to Your Calendar</strong><p>Find suspicious calendar events and delete only those you confirm.</p>${action('Allow Full Access','allow')}${action('Don’t Allow','deny')}</div></div>`;
 }else if(stage==='scanning'){
 body=`<div class="cal-scanning"><img class="cal-scanning-art" src="assets/calendar/scanning-card.png" alt=""><h2>Scanning calendar…</h2><progress id="cal-progress" max="100" value="0" aria-label="Calendar scan progress"></progress><p id="cal-progress-copy" role="status">Preparing events…</p><p class="cal-range">Past 90 days</p></div>`;footer=action('Cancel Scan','cancel',false,'secondary');
 }else if(['results','confirm','deleting'].includes(stage)){
 const shown=events.filter(e=>filter==='all'||e.category===filter),selectable=shown.filter(allowed),all=selectable.length&&selectable.every(e=>selected.has(e.id));
 body=`<div class="cal-summary"><h2>${error?events.length+' event'+(events.length===1?'':'s')+' left':shown.length+' matches'}</h2><button data-cal="all" ${!selectable.length?'disabled':''}>${all?'Deselect All':'Select All'}</button></div><div class="cal-filters" role="tablist">${['all',...Object.keys(categories)].map(k=>`<button role="tab" aria-selected="${filter===k}" data-filter="${k}">${k==='all'?'All':categories[k][0]}</button>`).join('')}</div><div class="cal-list">${shown.map(e=>`<article class="cal-row"><button class="cal-event" data-event="${esc(e.id)}"><span class="cal-icon">${icon(e.category)}</span><span><strong>${esc(e.title)}</strong><small>${esc(date(e))}${!allowed(e)?' · Read-only':''}</small></span></button><button class="cal-check ${selected.has(e.id)?'checked':''}" aria-label="Select ${esc(e.title)}" aria-pressed="${selected.has(e.id)}" data-select="${esc(e.id)}" ${!allowed(e)?'disabled':''}>${selected.has(e.id)?'<img src="assets/icons/check.svg" alt="">':''}</button></article>`).join('')||'<p class="cal-empty">No matches in this category.</p>'}</div>${error?`<p class="cal-error" role="status">${esc(error)}</p>`:''}`;
 footer=error?action('Try Again','confirm',!selected.size)+action('Done','done',false,'quiet'):action(`Delete Selected (${selected.size})`,'confirm',!selected.size);
 if(['confirm','deleting'].includes(stage)){const chosen=events.filter(e=>selected.has(e.id));overlay=`<div class="cal-overlay"><div class="cal-dialog cal-delete-dialog" role="dialog" aria-modal="true" aria-label="Delete selected events"><strong>${stage==='deleting'?'Deleting event…':chosen.length===1?'Delete this event?':`Delete ${chosen.length} events?`}</strong><div class="cal-confirm-events">${chosen.map(e=>`<p><b>${esc(e.title)}</b><br>${esc(fullDate(e))}<br>${esc(e.calendar)}</p>`).join('')}</div><p class="cal-delete-scope">${chosen.some(e=>e.recurring)?'Only this occurrence. The series stays.':'Only the selected events will be deleted.'}</p>${stage==='deleting'?action('Deleting…','delete',true):action(chosen.length===1?'Delete Event':'Delete Events','delete',false,'danger')+action('Cancel','dismiss')}</div></div>`;}
 }else if(stage==='detail'){
 const e=events.find(x=>x.id===detailId);if(!e)return set('results');body=`<div class="cal-detail-category">${icon(e.category)}</div><h2 class="cal-event-title">${esc(e.title)}</h2><div class="cal-facts"><p><span>Date</span><b>${esc(fullDate(e))}</b></p><p><span>Calendar</span><b>${esc(e.calendar)}</b></p><p><span>Repeat</span><b>${e.recurring?'Weekly':'Does not repeat'}</b></p></div><p class="cal-reason">${!allowed(e)?'This calendar is read-only.':esc(e.reason)}</p>`;footer=allowed(e)?action(selected.has(e.id)?'Deselect Event':'Select Event','select-detail'):action('Done','review');
 }else{
 let title,copy,buttons;
 if(stage==='done'){title=`${removed} event${removed===1?'':'s'} deleted`;copy='Other events were kept.';buttons=(events.length?action('Review Remaining Events','review'):'')+action('Done','done',false,events.length?'quiet':'');}
 else if(stage==='empty'||stage==='empty-calendar'){title=stage==='empty'?'No matches found':'No events found';copy='Past 90 days';buttons=action('Scan Again','scan')+action('Done','done',false,'quiet');}
 else if(stage==='restricted'){title='Calendar access restricted';copy='Access is restricted by your device settings.';buttons=action('Done','done');}
 else if(stage==='denied'){title='Calendar access is off';copy='Allow Full Access in Settings.';buttons=action('Open Settings','settings');}
 else if(stage==='delete-failed'){title='Could not delete events';copy='Your calendar was not changed.';buttons=action('Review Events','review')+action('Done','done',false,'quiet');}
 else{title='Could not scan';copy='Your calendar was not changed.';buttons=action('Try Again','scan');}
 body=`<div class="cal-recovery">${art}<h2>${title}</h2><p>${copy}</p>${error&&stage==='denied'?`<p class="cal-error">${esc(error)}</p>`:''}</div>`;footer=buttons;
 }
 page.innerHTML=`<header class="detail-header"><button class="detail-back" data-cal="back" aria-label="Back" ${stage==='deleting'?'disabled':''}><span class="detail-icon-well"><img src="assets/test/detail-back.svg" alt=""></span></button><h1>Calendar Clean</h1></header><div class="cal-body">${body}</div><footer class="cal-footer">${footer}</footer>${overlay}`;
 if(overlay){page.querySelector('.cal-body').inert=true;page.querySelector('.cal-footer').inert=true;page.querySelector('.cal-overlay button:not(:disabled)')?.focus({preventScroll:true});}
 }
 function scan(){stop();error='';selected.clear();filter='all';if(permission==='notDetermined')return set('permission');if(permission!=='fullAccess')return set(permission==='restricted'?'restricted':'denied');scanning();}
 function scanning(){set('scanning');const token=run,now=Date.now(),within=data.filter(e=>e.start<=now&&e.start>=now-90*day);let n=0;timer=setInterval(()=>{if(token!==run)return;n+=10;$('#cal-progress').value=n;$('#cal-progress-copy').textContent=`${Math.round(within.length*n/100)} of ${within.length} events checked`;if(n>=100){if(scenario==='scan-failed'){scenario='content';return set('scan-failed');}events=within.filter(e=>categories[e.category]);set(events.length?'results':within.length?'empty':'empty-calendar');}},180);}
 function remove(){if(stage!=='confirm')return;const ids=[...selected].filter(id=>events.some(e=>e.id===id&&allowed(e)));set('deleting');const token=run;timer=setTimeout(()=>{if(token!==run)return;if(permission!=='fullAccess')return set('denied');const targets=deleteMode==='failure'?[]:deleteMode==='partial'?ids.slice(0,Math.max(0,ids.length-1)):ids;
 const previous=data;data=data.filter(e=>!targets.includes(e.id));if(!persist()){data=previous;deleteMode='success';return set('delete-failed');}removed=targets.length;events=events.filter(e=>!targets.includes(e.id));selected=new Set(ids.filter(id=>!targets.includes(id)));deleteMode='success';if(!removed)return set('delete-failed');if(selected.size){error=selected.size===1?'Could not delete this event.':`${selected.size} events could not be deleted.`;set('results');}else set('done');},650);}
 function back(){if(stage==='deleting')return;if(stage==='confirm')return set('results');if(stage==='permission')return set('ready');if(['detail','delete-failed'].includes(stage))return set('results');if(stage==='scanning'){stop();stage='ready';}close();}
 document.addEventListener('click',e=>{if(!page||page.hidden||!page.contains(e.target))return;const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.filter){filter=b.dataset.filter;render();return;}if(b.dataset.event){detailId=b.dataset.event;set('detail');return;}if(b.dataset.select){const id=b.dataset.select;selected.has(id)?selected.delete(id):selected.add(id);render();return;}const a=b.dataset.cal;
 if(a==='back')back();else if(a==='scan')scan();else if(a==='allow'){permission='fullAccess';persist();scanning();}else if(a==='deny'){permission='denied';persist();set('denied');}else if(a==='cancel')set('ready');else if(a==='all'){const list=events.filter(e=>(filter==='all'||e.category===filter)&&allowed(e)),all=list.length&&list.every(e=>selected.has(e.id));list.forEach(e=>all?selected.delete(e.id):selected.add(e.id));render();}else if(a==='confirm'&&selected.size)set('confirm');else if(a==='dismiss')set('results');else if(a==='delete')remove();else if(a==='select-detail'){selected.has(detailId)?selected.delete(detailId):selected.add(detailId);set('results');}else if(a==='review')set('results');else if(a==='done'){$('[data-tool="calendar"] .tool-copy > span').textContent=events.length?events.length+' to review':'Scanned';close();}else if(a==='settings'){if(settingsFail){settingsFail=false;error='Could not open Settings. Try again.';return render();}close();guide('calendar',()=>open());}});
 document.addEventListener('keydown',e=>{if(!page||page.hidden)return;const modal=page.querySelector('.cal-overlay');if(modal&&e.key==='Tab'){const list=[...modal.querySelectorAll('button:not(:disabled)')];if(!list.length){e.preventDefault();return;}if(e.shiftKey&&document.activeElement===list[0]){e.preventDefault();list.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===list.at(-1)){e.preventDefault();list[0].focus();}}if(e.key==='Escape'){e.preventDefault();back();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&stage==='scanning'&&page&&!page.hidden)set('ready');});
 window.calendarPreview={fixture(id){
 // Sidebar fixtures never grant access, scan, navigate into details, or delete.
 if(!page||page.hidden)return;
 fixtureNote='';
 if(['ready','denied','restricted'].includes(stage)&&id==='reset-permission'){stop();permission='notDetermined';persist();return set('ready');}
 if(stage==='ready'&&id==='restricted'){permission='restricted';persist();return set('restricted');}
 if(stage==='ready'&&permission==='fullAccess'){
  if(['content','empty','empty-calendar'].includes(id)){data=id==='content'?fixtures():id==='empty'?[{id:'normal',title:'Lunch',start:Date.now()-day,calendar:'Personal',writable:true}]:[];scenario='content';fixtureNote='已配置样例，请点击 App 内 Scan Calendar。';persist();publish();return;}
  if(id==='scan-failed'){scenario=id;fixtureNote='下次读取将失败，请点击 App 内 Scan Calendar。';publish();return;}
 }
 if(stage==='detail'&&id==='readonly'){const event=events.find(e=>e.id===detailId);if(event){event.writable=!event.writable;selected.delete(detailId);render();}return;}
 if(stage==='confirm'&&['success','partial','failure'].includes(id)){deleteMode=id;fixtureNote='已配置'+({success:'正常',partial:'部分失败',failure:'全部失败'}[id])+'回执，仍须在 App 内确认删除。';publish();}
 },init(fn){guide=fn;},open,close,snapshot:()=>({stage,permission,events:events.map(e=>({...e})),selected:[...selected],data:data.map(e=>({...e}))}),debug(s){stop();if(!page||page.hidden)open();error='';filter='all';selected.clear();deleteMode='success';scenario='content';
 if(s==='reset'){data=fixtures();permission='notDetermined';persist();events=[];return set('ready');}
 if(s==='unauthorized'){permission='notDetermined';persist();return set('ready');}if(s==='permission'){permission='notDetermined';return set('permission');}if(s==='denied'||s==='restricted'){permission=s;persist();return set(s);}if(s==='settings-failed'){permission='denied';settingsFail=true;return set('denied');}
 permission='fullAccess';persist();if(s==='ready')return set('ready');if(['empty','empty-calendar'].includes(s)){data=s==='empty'?[{id:'normal',title:'Lunch',start:Date.now()-day,calendar:'Personal',writable:true}]:[];persist();events=[];return set(s);}
 if(s==='scan-failed'){scenario='scan-failed';return scanning();}if(s==='scanning')return scanning();
 data=fixtures();persist();events=data.filter(e=>e.start<=Date.now()&&e.start>=Date.now()-90*day);
 if(s==='detail'||s==='readonly'){detailId='c';if(s==='readonly'){events.find(e=>e.id==='c').writable=false;events.find(e=>e.id==='c').calendar='Holidays';}return set('detail');}
 if(['confirm','deleting','partial','delete-failed'].includes(s)){selected=new Set(s==='partial'?['a','b','c']:['c']);deleteMode=s==='partial'?'partial':s==='delete-failed'?'failure':'success';set('confirm');if(s==='deleting')remove();return;}
 if(s==='done'){data=data.filter(e=>e.id!=='c');persist();events=events.filter(e=>e.id!=='c');removed=1;return set('done');}set('results');}};
})();
