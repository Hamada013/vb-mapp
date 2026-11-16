/* VB-MAPP owns its device-local accounts; no VSS or other app data is changed. */
((root)=>{
 'use strict';
 const KEY='vb-mapp-children-v1',LEGACY='vb-mapp-workspace-v2';
 const nameKey=name=>String(name||'').normalize('NFKC').trim().toLocaleLowerCase();
 function create(storage){
  function read(){
   const raw=storage.getItem(KEY);
   if(raw){
    const data=JSON.parse(raw);if(data.schema!==1||!Array.isArray(data.children))throw Error('Invalid saved accounts');
    // The former built-in admin is retired: drop it when empty, otherwise keep its data as an ordinary account.
    data.children=data.children.filter(child=>child.role!=='admin'||child.workspace).map(child=>{if(child.role==='admin'){child={...child};delete child.role;}return child;});
    if(data.active&&!data.children.some(child=>child.id===data.active))data.active=null;
    return data;
   }
   return {schema:1,active:null,children:[],deletedChildren:{}};
  }
  const write=data=>storage.setItem(KEY,JSON.stringify(data));
  const active=()=>{const data=read();return data.children.find(child=>child.id===data.active)||null;};
  function add(name,workspace){
   name=String(name||'').normalize('NFKC').trim().slice(0,100);if(!name)throw Error('أدخل اسم الطفل');
   const data=read();let child=data.children.find(child=>nameKey(child.name)===nameKey(name));
   if(!child){child={id:root.crypto.randomUUID(),name,created:new Date().toISOString(),workspace:null};data.children.push(child);}
   if(!child.workspace&&workspace){child.workspace=JSON.parse(JSON.stringify(workspace));child.workspace.child.name=child.name;}
   data.active=child.id;write(data);return child;
  }
  function select(id){const data=read();if(!data.children.some(child=>child.id===id))throw Error('Account unavailable');data.active=id;write(data);}
  function save(id,workspace){
   const data=read(),child=data.children.find(child=>child.id===id);
   if(!child||data.active!==id||data.deletedChildren?.[id])throw Error('Account changed. Reopen the app.');
   const value=JSON.parse(JSON.stringify(workspace)),saved=child.workspace;
   if(saved?.assessmentId&&value.assessmentId){
    if(saved.assessmentId!==value.assessmentId&&(!value.history?.some(v=>v.assessmentId===saved.assessmentId&&v.completedAt===saved.completedAt)||saved.history?.some(v=>v.assessmentId===value.assessmentId)))throw Error('Assessment changed. Reopen the profile.');
    if(saved.completedAt&&saved.assessmentId===value.assessmentId){
     if(value.completedAt!==saved.completedAt)throw Error('Assessment finished. Reopen the profile.');
     // Completed results are immutable; report presentation remains adjustable.
     const preferences=['lang','reportLang','reportScope','reportLayout','reportLayouts','reportDetails','includeUnassessed'];
     const result=JSON.parse(JSON.stringify(saved));for(const key of preferences)if(key in value)result[key]=value[key];
     result.child.name=child.name;child.workspace=result;write(data);return;
    }
   }
   value.child.name=child.name;child.workspace=value;write(data);
  }
  // Any account may be deleted; the UI asks the parent gate and a confirmation first.
  function remove(id){
   const data=read();if(!data.children.some(child=>child.id===id))throw Error('Account unavailable');
   data.children=data.children.filter(child=>child.id!==id);data.deletedChildren={...data.deletedChildren,[id]:new Date().toISOString()};
   if(data.active===id)data.active=null;write(data);
   try{storage.removeItem?.('vb-mapp-photos-v1:'+id);}catch(e){/* photos are optional */}
  }
  // Preserve the legacy workspace untouched; copy it into a named account once.
  function migrate(workspace){
   if(storage.getItem(KEY))return;
   const data=read();
   if(workspace?.child?.name?.trim()){
    const name=workspace.child.name.trim(),child={id:root.crypto.randomUUID(),name,created:new Date().toISOString()};
    child.workspace=JSON.parse(JSON.stringify(workspace));child.workspace.child.name=child.name;
    data.children.push(child);data.active=child.id;
   }
   write(data);
  }
  return {KEY,LEGACY,read,active,add,select,save,remove,migrate};
 }
 if(typeof module!=='undefined')module.exports={create};
 if(root.document)root.VBAccounts=create(root.localStorage);
})(globalThis);
