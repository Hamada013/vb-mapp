const assert=require('node:assert/strict');
const {create}=require('../assets/accounts.js');
const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
const a=create(storage),legacy={child:{name:'Legacy'},scores:{milestones:{m1:1}},history:[{date:'2026-01-01'}]};
a.migrate(legacy);const first=a.active();assert.equal(first.name,'Legacy');assert.deepEqual(first.workspace,legacy);
a.migrate({child:{name:'Wrong'}});assert.equal(a.read().children.length,1);
const second=a.add('Second');assert.equal(second.workspace,null);a.save(second.id,{child:{name:'Other'},scores:{milestones:{b:0}}});
a.select(first.id);assert.equal(a.active().workspace.scores.milestones.m1,1);assert.throws(()=>a.save(second.id,legacy));
const named=a.add('HAMADA');assert.notEqual(named.id,'hamada');assert.equal(a.read().children.length,3);
a.remove(second.id);assert.ok(a.read().deletedChildren[second.id]);assert.throws(()=>a.save(second.id,legacy));assert.equal(a.read().children.length,2);
a.remove(named.id);assert.equal(a.read().active,null);assert.throws(()=>a.remove(named.id));
a.select(first.id);assert.equal(a.active().workspace.history.length,1);
const unavailable=create({getItem:()=>null,setItem:()=>{throw Error('Quota');}});assert.throws(()=>unavailable.add('Child'));
// The retired built-in admin disappears when empty and survives as an ordinary account when it holds data.
const old=new Map([['vb-mapp-children-v1',JSON.stringify({schema:1,active:'hamada',children:[{id:'hamada',name:'Hamada',role:'admin',workspace:null},{id:'k',name:'Kid',workspace:null}]})]]),oldA=create({getItem:k=>old.get(k)||null,setItem:(k,v)=>old.set(k,v)});
assert.deepEqual(oldA.read().children.map(c=>c.id),['k']);assert.equal(oldA.read().active,null);
const kept=new Map([['vb-mapp-children-v1',JSON.stringify({schema:1,active:'hamada',children:[{id:'hamada',name:'Hamada',role:'admin',workspace:{child:{name:'Hamada'}}}]})]]),keptA=create({getItem:k=>kept.get(k)||null,setItem:(k,v)=>kept.set(k,v)});
assert.equal(keptA.read().children[0].role,undefined);keptA.remove('hamada');assert.equal(keptA.read().children.length,0);
console.log('PASS: migration, isolated workspaces, no built-in admin, any account deletable, stale saves and storage failure.');
