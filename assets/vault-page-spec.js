(() => {
  const phone=document.querySelector('.phone'), right=document.querySelector('.preview-right'), pin=document.querySelector('#vault-pin-page'), main=document.querySelector('#vault-page'), modal=document.querySelector('#modal-root');
  if(!phone||!right||!pin||!main||!modal)return;
  const rows={
    dismiss:['页面不可用',[['读取失败','保留已有资料。点 Try Again 再试。']]],
    intro:['Vault 介绍',[['功能','将照片和视频放入私密相册。'],['Continue','查看两种密码的用途。']]],
    education:['两种密码',[['主密码','打开主相册空间。'],['备用密码','可选。输入不同的密码打开另一套相册。'],['开始设置','点 Set Main Passcode 设置六位主密码。']]],
    unlock:['解锁保险箱',[['输入密码','输入六位数字后才能点 Unlock。Delete 删除最后一位。'],['解锁','打开该密码对应的相册。'],['输入错误','提示重试；连续五次错误后需等 30 秒。']]],
    set:['设置密码',[['输入','输入六位数字，点 Continue 进入确认。'],['备用密码','可跳过；若设置，须与主密码不同。']]],
    confirm:['确认密码',[['再次输入','输入相同的六位密码后保存。'],['两次不一致','保留当前步骤，重新输入。']]],
    empty:['Vault 空状态',[['初次解锁','没有相册时显示 No albums yet，不预建相册。'],['Add Media','选择照片或视频，成功导入后创建第一个相册；取消不会创建。'],['锁定','点右上角锁定。离开页面或浏览器进入后台时也会锁定。']]],
    albums:['Vault 相册',[['查看相册','显示相册封面、名称及媒体数量。'],['添加','点加号新建相册，或点 Add Media 选择照片或视频。'],['锁定','点右上锁定；再次查看时需输入密码。']]],
    album:['相册内容',[['查看','打开照片或播放视频；没有内容时显示 No photos or videos yet。'],['添加与改名','点 Add Media 添加；相册菜单可改名。']]],
    name:['相册名称',[['输入名称','输入非空名称后保存。'],['保存失败','保留当前输入，可重新保存。']]],
    media:['添加媒体',[['选择','选择目标相册和照片或视频。'],['结果','导入成功后更新相册数量；不支持的文件会提示，并保留其他成功项。']]],
    options:['相册菜单',[['可用操作','重命名当前相册，或取消。']]]
  };
  let phase='', scheduled=false;
  const add=(parent,tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;parent.appendChild(el);return el;};
  const isShown=(n)=>n&&!n.hidden;
  const active=()=>{
    if(phone.dataset.tab!=='vault'||main.hidden)return '';
    const heading=pin.querySelector('h1')?.textContent||'';
    if(isShown(modal)){
      const name=modal.querySelector('#sheet-title')?.textContent||'';
      if(/Album Options/i.test(name))return 'options';
      if(/New Album|Rename Album/i.test(name))return 'name';
      if(/Add Media/i.test(name))return 'media';
      if(modal.querySelector('#vault-menu'))return 'options';
      return '';
    }
    if(isShown(pin)){
      if(pin.querySelector('.vault-album-header')) return 'album';
      if(heading==='Two Ways In')return 'education';
      if(heading==='Unlock Vault')return 'unlock';
      if(heading.startsWith('Confirm'))return 'confirm';
      if(heading.startsWith('Set'))return 'set';
      if(pin.querySelector('#vault-retry'))return 'dismiss';
    }
    if(isShown(main.querySelector('#vault-albums')))return isShown(main.querySelector('#vault-empty-state'))?'empty':'albums';
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
