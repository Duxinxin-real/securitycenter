/* App-specific tutorial illustrations. Editable HTML, not captured iOS screens. */
window.renderGuideScene=(key,step)=>{
 const titles={web:'Safari',sms:'Messages',call:'Phone',calendar:'Calendars'};
 const chevron='<img class="scene-chevron" src="assets/test/chevron.svg" alt="">';
 const check='<img class="scene-check" src="assets/icons/check.svg" alt="">';
 const tap=key==='web'?'<span class="scene-tap-guide" aria-hidden="true"><span class="scene-tap-ripple"></span><span class="scene-tap-hand"></span></span>':'';
 const row=(text,{active=false,toggle=false,selected=false,icon=null}={})=>`<div class="scene-row ${active?'scene-target':''}">${icon?`<img class="scene-app-icon" src="${icon}" alt="">`:''}<span>${text}</span>${toggle?'<span class="scene-toggle" aria-hidden="true"></span>':selected?check:chevron}${active?tap:''}</div>`;
 const group=rows=>'<div class="scene-group">'+rows.join('')+'</div>';
 let title,body;
 if(step===0){title='Settings';body=group([row('General'),row('Accessibility'),row('Privacy & Security',{active:key==='calendar'})])+group([row('Apps',{active:key!=='calendar'})]);}
 else if(step===1){title=key==='calendar'?'Privacy & Security':'Apps';body=key==='calendar'?group([row('Contacts'),row('Calendars',{active:true}),row('Photos')]):group([row('Mail'),row('Messages',{active:key==='sms'}),row('Phone',{active:key==='call'}),row('Safari',{active:key==='web'})]);}
 else if(step===2){title=titles[key];body=key==='calendar'?group([row('Clean Web',{active:true,icon:'assets/icons/calendar.png'})]):key==='web'?group([row('Search Engine'),row('AutoFill'),row('Extensions',{active:true})]):key==='sms'?group([row('Notifications'),row('Send & Receive')])+group([row('Unknown & Spam',{active:true})]):group([row('Incoming Calls'),row('Call Blocking & Identification',{active:true})]);}
 else if(key==='sms'){title='Unknown & Spam';body='<p class="scene-caption">TEXT MESSAGE FILTERING</p>'+group([row('None'),row('Clean Web',{active:true,selected:true,icon:'assets/icons/sms.png'})]);}
 else if(key==='call'){title='Call Blocking & Identification';body=group([row('Clean Web',{active:true,toggle:true,icon:'assets/icons/call.png'})]);}
 else if(key==='calendar'){title='Clean Web';body=group([row('None'),row('Add Events Only'),row('Full Access',{active:true,selected:true})]);}
 else {title='Extensions';body=group([row('SecurityCenter',{active:true,toggle:true,icon:'assets/icons/shield-check.svg'})]);}
 return `<div class="guide-scene" aria-label="${key==='web'?'SecurityCenter':'Clean Web'} settings illustration: ${title}"><div class="scene-navigation"><img src="assets/test/detail-back.svg" alt=""><strong>${title}</strong></div><div class="scene-content">${body}</div></div>`;
};
