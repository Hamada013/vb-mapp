/* Child accounts: drawn head avatars, search, sort and a simple list. */
(()=>{
 const tr=(en,ar)=>document.documentElement.lang==='en'?en:ar;
 const root=window,A=window.VBAccounts,AVATAR_KEY='vb-mapp-account-avatars-v1';
 // Drawn heads live in avatars.js (25 animals and creatures).
 const AVATAR_DRAWINGS=window.VB_AVATARS||{};
 const AVATAR_ICONS=Object.keys(AVATAR_DRAWINGS);
 const avatarMemory=new WeakMap(),unavailableStorage={};
 function* avatarChoices(){
  yield* AVATAR_ICONS;
  // Large account lists continue with unique pairs, then larger combinations.
  // Never reuse a child's complete avatar or put the same icon twice in one.
  for(let size=2;size<=AVATAR_ICONS.length;size++){
   const indexes=Array.from({length:size},(_,i)=>i);
   while(true){
    yield indexes.map(index=>AVATAR_ICONS[index]).join(' ');
    let at=size-1;while(at>=0&&indexes[at]===AVATAR_ICONS.length-size+at)at--;
    if(at<0)break;indexes[at]++;for(let i=at+1;i<size;i++)indexes[i]=indexes[i-1]+1;
   }
  }
 }
 function assignAvatars(storage,children,random=Math.random){
  const memoryKey=storage||unavailableStorage;
  let saved=avatarMemory.get(memoryKey)||{},raw=null;
  try{raw=storage?.getItem(AVATAR_KEY);const record=JSON.parse(raw);if(record?.schema===1&&record.icons&&typeof record.icons==='object')saved={...saved,...record.icons};}catch{}
  const kids=children.filter(child=>child?.id),assigned=new Map(),used=new Set();
  const valid=value=>{
   if(typeof value!=='string')return false;
   const indexes=value.split(' ').map(icon=>AVATAR_ICONS.indexOf(icon));
   return indexes.every((index,i)=>index>=0&&(i===0||index>indexes[i-1]));
  };
  for(const child of kids){const icon=saved[child.id];if(valid(icon)&&!used.has(icon)){assigned.set(child.id,icon);used.add(icon);}}
  const missing=kids.filter(child=>!assigned.has(child.id)),free=AVATAR_ICONS.filter(icon=>!used.has(icon));
  if(missing.length){
   if(free.length<missing.length)for(const icon of avatarChoices()){if(icon.includes(' ')&&!used.has(icon))free.push(icon);if(free.length>=missing.length)break;}
   for(let i=free.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[free[i],free[j]]=[free[j],free[i]];}
   for(const child of missing)assigned.set(child.id,free.pop());
  }
  const icons={...saved,...Object.fromEntries(assigned)};
  avatarMemory.set(memoryKey,icons);
  const next=JSON.stringify({schema:1,icons});
  if(raw!==next)try{storage?.setItem(AVATAR_KEY,next);}catch{}
  return assigned;
 }
 const normalizeName=name=>String(name||'').normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').trim().toLocaleLowerCase();
 function orderedChildren(children,query='',sort='oldest'){
  const collator=new Intl.Collator('ar',{sensitivity:'base',numeric:true}),needle=normalizeName(query);
  const list=children.map((child,index)=>({...child,position:index})).filter(child=>normalizeName(child.name).includes(needle));
  return list.sort((a,b)=>sort==='alphabet'?collator.compare(a.name,b.name)||a.position-b.position:(sort==='newest'?-1:1)*(((Date.parse(a.created)||0)-(Date.parse(b.created)||0))||a.position-b.position));
 }

 let openSort,sortSerial=0,avatars=new Map();
 const glyph=path=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
 function avatar(child){
  const icon=avatars.get(child.id)||'cat',parts=icon.split(' ').filter(part=>AVATAR_DRAWINGS[part]),circle=document.createElement('span');
  circle.className='suite-account-avatar';circle.dir='ltr';circle.dataset.avatar=icon;circle.setAttribute('aria-hidden','true');
  circle.style.background=AVATAR_DRAWINGS[parts[0]]?.[0]||'#eef4f7';circle.style.setProperty('--avatar-columns',String(Math.ceil(Math.sqrt(parts.length||1))));
  for(const part of parts.length?parts:['cat']){const symbol=document.createElement('span');symbol.innerHTML=`<svg viewBox="0 0 64 64" aria-hidden="true">${AVATAR_DRAWINGS[part]?.[1]||''}</svg>`;circle.append(symbol);}
  return circle;
 }
 function sortControl(onChange){
  const choices=[['oldest',tr('Oldest first','الأقدم أولًا'),'<path d="M5 4v15m-3-3 3 3 3-3M11 6h10M11 12h7M11 18h4"/>'],['newest',tr('Newest first','الأحدث أولًا'),'<path d="M5 20V5M2 8l3-3 3 3M11 6h4M11 12h7M11 18h10"/>'],['alphabet',tr('Alphabetical','حسب الأبجدية'),'<path d="M5 4v15m-3-3 3 3 3-3M13 4v5m-2 0h4m-2 6c-3 0-4 4-1 4h5m-2-6h.01"/>']];
  const wrap=document.createElement('div');wrap.className='suite-account-sort-wrap';
  const trigger=document.createElement('button');trigger.type='button';trigger.className='suite-account-sort';trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-label',tr('Sort accounts: ','ترتيب الحسابات: ')+choices[0][1]);
  const label=document.createElement('span');label.textContent=choices[0][1];
  trigger.innerHTML=glyph('<path d="M4 6h16M4 12h11M4 18h6"/>');trigger.append(label);trigger.insertAdjacentHTML('beforeend',glyph('<path d="m7 10 5 5 5-5"/>'));
  const list=document.createElement('div');list.id='suite-account-sort-'+(++sortSerial);list.className='suite-account-sort-menu';list.setAttribute('role','listbox');list.setAttribute('aria-label',tr('Sort accounts','ترتيب الحسابات'));list.hidden=true;trigger.setAttribute('aria-controls',list.id);
  let value='oldest';
  const close=(restore=false)=>{list.hidden=true;trigger.setAttribute('aria-expanded','false');if(openSort?.wrap===wrap)openSort=null;if(restore)trigger.focus();};
  const options=choices.map(([id,text,path])=>{
   const option=document.createElement('button');option.type='button';option.className='suite-account-sort-option';option.dataset.sortValue=id;option.setAttribute('role','option');option.setAttribute('aria-selected',String(id===value));option.tabIndex=-1;
   option.innerHTML=glyph(path);const name=document.createElement('span');name.textContent=text;option.append(name);option.insertAdjacentHTML('beforeend',glyph('<path d="m5 12 4 4L19 6"/>'));
   option.onclick=()=>{value=id;label.textContent=text;trigger.setAttribute('aria-label',tr('Sort accounts: ','ترتيب الحسابات: ')+text);options.forEach(item=>item.setAttribute('aria-selected',String(item===option)));close(true);onChange(value);};list.append(option);return option;
  });
  const show=(focus=true)=>{
   openSort?.close();list.hidden=false;trigger.setAttribute('aria-expanded','true');openSort={wrap,close};
   // Open upwards when the surrounding modal has too little space below.
   list.classList.remove('suite-account-sort-above');const bounds=wrap.closest('dialog')?.getBoundingClientRect(),rect=list.getBoundingClientRect();
   if(rect.bottom>Math.min(root.innerHeight,bounds?.bottom||root.innerHeight)-12&&wrap.getBoundingClientRect().top-rect.height>(bounds?.top||0)+12)list.classList.add('suite-account-sort-above');
   if(focus)options.find(option=>option.dataset.sortValue===value).focus({preventScroll:true});
  };
  trigger.onclick=()=>list.hidden?show():close();
  trigger.onkeydown=event=>{if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();show();if(event.key==='Home')options[0].focus();if(event.key==='End')options.at(-1).focus();}};
  wrap.onkeydown=event=>{
   if(list.hidden)return;
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}
   else if(event.key==='Tab')close();
   else if(event.target!==trigger&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
    event.preventDefault();const index=options.indexOf(document.activeElement),next=event.key==='Home'?0:event.key==='End'?options.length-1:(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;options[next].focus();
   }
  };
  wrap.onfocusout=event=>{if(!wrap.contains(event.relatedTarget))close();};
  wrap.append(trigger,list);return wrap;
 }
 document.addEventListener('pointerdown',event=>{if(openSort&&!openSort.wrap.contains(event.target))openSort.close();});

 const dialog=document.getElementById('accountDialog'),host=document.getElementById('accountList'),form=document.getElementById('accountForm'),error=document.getElementById('accountError');
 function draw(){
  const data=A.read();avatars=assignAvatars(localStorage,data.children);host.replaceChildren();
  const search=document.createElement('input');search.type='search';search.placeholder=tr('Search by name','ابحث بالاسم');search.setAttribute('aria-label',tr('Search accounts by name','البحث عن حساب بالاسم'));search.className='suite-account-search';
  let order='oldest';const sort=sortControl(value=>{order=value;update();}),filters=document.createElement('div');filters.className='suite-account-filters';filters.append(search,sort);host.append(filters);
  const count=document.createElement('p');count.className='suite-account-count';host.append(count);
  const grid=document.createElement('div');grid.className='suite-account-grid';grid.setAttribute('role','list');host.append(grid);
  const when=iso=>{try{return new Intl.DateTimeFormat(document.documentElement.lang==='en'?'en-GB':'ar-SY-u-nu-latn',{day:'numeric',month:'short',year:'numeric'}).format(new Date(iso));}catch{return '';}};
  function row(child){
   const row=document.createElement('div');row.className='suite-account-row';row.dataset.accountId=child.id;row.setAttribute('role','listitem');
   const current=child.id===data.active;row.classList.toggle('is-current',current);
   const button=document.createElement('button');button.type='button';button.className='suite-account-select';button.setAttribute('aria-pressed',String(current));button.setAttribute('aria-label',child.name);
   const text=document.createElement('span');text.className='suite-account-text';
   const label=document.createElement('span');label.className='suite-account-name';label.textContent=child.name;
   const meta=document.createElement('span');meta.className='suite-account-meta';meta.textContent=current?tr('Open now','مفتوح الآن'):(child.created?tr('Added ','أضيف ')+when(child.created):'');
   text.append(label,meta);button.append(avatar(child),text);button.onclick=()=>window.VBApp.selectAccount(child.id);row.append(button);
   {
    const tools=document.createElement('div');tools.className='suite-account-tools';const remove=document.createElement('button');remove.type='button';remove.className='suite-delete';remove.setAttribute('aria-label',tr('Delete account of ','حذف حساب ')+child.name);remove.title=tr('Delete','حذف');remove.innerHTML=glyph('<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>');
    remove.onclick=()=>{document.getElementById('deleteAccountName').textContent=child.name;document.getElementById('deleteAccountError').textContent='';const confirm=document.getElementById('deleteAccountDialog');confirm.showModal();document.getElementById('confirmDeleteAccount').onclick=()=>{try{const wasActive=child.id===A.read().active;A.remove(child.id);confirm.close();if(wasActive){location.reload();return;}draw();}catch(e){document.getElementById('deleteAccountError').textContent=tr('Could not delete the account. Try again.','تعذّر حذف الحساب. أعد المحاولة.');}};};tools.append(remove);row.append(tools);
   }return row;
  }
  function update(){const list=orderedChildren(data.children,search.value,order);grid.replaceChildren(...list.map(row));count.textContent=data.children.length?tr(`${data.children.length} children`,`عدد الأطفال: ${data.children.length}`):'';if(!list.length){const empty=document.createElement('p');empty.className='suite-account-empty';empty.textContent=data.children.length?tr('No matching names.','لا يوجد اسم مطابق.'):tr('No children yet. Add the first one above.','لا يوجد أطفال بعد. أضف أول طفل في الأعلى.');grid.append(empty);}}search.oninput=update;update();
 }
 async function open(first=false){
  try{if(!first && (A.read().children.length || A.active())){if(!await window.ChildAccountGate.request())return;}draw();error.textContent='';dialog.showModal();document.getElementById('accountName').focus();}catch(e){document.getElementById('appStatus').textContent=tr('Could not read saved accounts. No data was deleted.','تعذّر قراءة الحسابات المحفوظة. لم تُحذف البيانات.');}
 }
 form.onsubmit=event=>{event.preventDefault();try{window.VBApp.createAccount(document.getElementById('accountName').value);}catch(e){error.textContent=e.message||tr('Could not save the account. Try again.','تعذّر حفظ الحساب. أعد المحاولة.');}};
 document.getElementById('accounts').onclick=()=>open();
 dialog.addEventListener('cancel',event=>{if(!A.active())event.preventDefault();});
 document.getElementById('closeAccounts').onclick=()=>{if(A.active())dialog.close();};
 if(!A.active())open(true);
})();
