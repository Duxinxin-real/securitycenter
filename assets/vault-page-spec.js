(() => {
  const phone=document.querySelector('.phone'), right=document.querySelector('.preview-right'), pin=document.querySelector('#vault-pin-page'), main=document.querySelector('#vault-page'), modal=document.querySelector('#modal-root');
  if(!phone||!right||!pin||!main||!modal)return;
  const rows={
    "dismiss":["页面不可用",[["读取失败","保留已有资料。点 Try Again 再试。"]]],
    "intro":["Vault 介绍",[["功能","将照片放入私密空间。"],["Continue","查看两种密码的用途。"]]],
    "education":["两种密码",[["主密码","打开主空间。"],["备用密码","可选。输入不同的密码打开独立的备用空间。"],["开始设置","点 Set Main Passcode 设置六位主密码。"]]],
    "unlock":["解锁保险箱",[["输入密码","输入六位数字后才能点 Unlock。Delete 删除最后一位。"],["解锁","直接打开该密码对应的图片网格。"],["输入错误","提示重试；连续五次错误后需等 30 秒。"]]],
    "set":["设置密码",[["输入","输入六位数字，点 Continue 进入确认。"],["备用密码","可跳过；若设置，须与主密码不同。"]]],
    "confirm":["确认密码",[["再次输入","输入相同的六位密码后保存。"],["两次不一致","保留当前步骤，重新输入。"]]],
    "empty":["Vault 空状态",[["初次解锁","没有照片时显示 No photos yet。"],["Add Photos","一次点击打开选图；成功原页显示图片，取消或无效选择保持空态。"],["锁定","点右上角锁定。离开页面或进入后台时也会锁定。"]]],
    "photos":["Vault 图片",[["查看图片","直接显示当前密码对应的图片网格。"],["添加","Add Photos直接打开选图，仅新增图片；成功后原页更新。"],["锁定","点右上锁定；再次查看时需输入密码。"]]],
    "photo":["查看内容",[["查看","显示选中的照片；既有视频仍可播放。"],["返回","返回当前Vault图片网格，保留已有内容。"]]]
  };
  let phase='', scheduled=false;
  const add=(parent,tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;parent.appendChild(el);return el;};
  const isShown=(n)=>n&&!n.hidden;
  const active=()=>{
    if(phone.dataset.tab!=='vault'||main.hidden)return '';
    const heading=pin.querySelector('h1')?.textContent||'';
    if(isShown(modal))return '';
    if(isShown(pin)){
      if(pin.querySelector('.vault-photo-header')) return 'photo';
      if(heading==='Two Ways In')return 'education';
      if(heading==='Unlock Vault')return 'unlock';
      if(heading.startsWith('Confirm'))return 'confirm';
      if(heading.startsWith('Set'))return 'set';
      if(pin.querySelector('#vault-retry'))return 'dismiss';
    }
    if(isShown(main.querySelector('#vault-albums')))return isShown(main.querySelector('#vault-empty-state'))?'empty':'photos';
    if(isShown(main.querySelector('#vault-trust')))return 'intro';
    return '';
  };
  function render(force=false){
    const next=active();if(!next){phase='';return;}
    if(next===phase&&!force)return;phase=next;
    const [title,items]=rows[next];right.replaceChildren();
    add(right,'h2',title);
    const table=add(right,'table');table.className='spec-states';
    const heading=add(add(table,'thead'),'tr');add(heading,'th','功能');add(heading,'th','页面说明');
    const body=add(table,'tbody');
    items.forEach(([a,b])=>{const row=add(body,'tr');add(row,'td',a);add(row,'td',b);});
    right.scrollTop=0;
  }
  function delay(force=false){if(scheduled&&!force)return;scheduled=true;queueMicrotask(()=>{scheduled=false;render(force);});}
  const watcher=new MutationObserver(()=>delay());watcher.observe(pin,{attributes:true,attributeFilter:['hidden'],childList:true});watcher.observe(main,{attributes:true,attributeFilter:['hidden'],subtree:true});watcher.observe(modal,{attributes:true,attributeFilter:['hidden'],childList:true,subtree:true});
  window.addEventListener('preview-context',()=>delay(true));delay(true);
})();
