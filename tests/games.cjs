// Touch-game data integrity: pictures, clips, milestones and the generated sound script stay in step.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),c={console,crypto:require('node:crypto')};c.window=c;vm.createContext(c);
for(const f of ['data','stimuli','review','manual-data','manual','model','stimulus-data','examples-data','games-data'])vm.runInContext(fs.readFileSync(path.join(root,`assets/${f}.js`),'utf8'),c);
const G=c.VB_GAMES,cards=c.VB_PICTURE_DATA.cards,M=c.VBModel,items=new Map(M.allMilestones(c.VB_DATA).map(i=>[i.id,i]));
const pool=Object.values(G.groups).flatMap(g=>g.cards);
for(const id of pool){assert.ok(cards[id],`missing picture ${id}`);assert.ok(fs.existsSync(path.join(root,cards[id].src)),`missing file ${cards[id].src}`);}
assert.equal(new Set(pool.map(id=>cards[id].label.ar)).size,new Set(pool).size,'pool labels are distinct');
const numbers=G.clips.map(x=>x.n);assert.equal(new Set(numbers).size,numbers.length,'clip numbers are unique');
for(const x of G.clips){assert.ok(Number.isInteger(x.n)&&x.n>0&&x.n<1000);assert.ok(x.ar.trim());}
for(const bank of ['fillIns','wh','sounds','foodDrink'])for(const q of G[bank]){assert.ok(pool.includes(q.answer),`${bank} answer ${q.answer} in pool`);assert.ok(numbers.includes(q.prompt));for(const a of q.avoid||[])assert.ok(pool.includes(a));}
for(const [id,g] of Object.entries(G.games)){
 const item=items.get(id);assert.ok(item,`game ${id} has a milestone`);assert.ok(g.note.ar&&g.note.en);
 if(typeof g.full==='number'){assert.ok(g.half==null||g.full>=g.half);if(g.maxTrials)assert.ok(g.maxTrials>=g.full,`${id} can reach full`);}
 if(g.kind==='observe'){assert.equal(typeof g.full,'object');for(const [k,v] of Object.entries(g.full))assert.ok(['total','distinct','bout','sum','percent'].includes(k)&&v>0,`${id} ${k}`);assert.ok(/(TO|O)\b|\(E\)|day|observation/i.test(item.text.en+item.scoring.en),`${id} is observed`);}
 if(g.bank)assert.ok(G[g.bank].length>=Math.min(g.maxTrials,g.full),`${id} bank holds enough questions`);
 if(g.kind==='listener'||g.kind==='match')assert.ok(pool.length>=g.maxTrials);
 if(g.half!==null)assert.ok(M.halfAllowed(item),`${id} allows a half point`);
}
// No game for tasks that need real objects, people or non-identical pictures the library does not have.
for(const id of ['vp1-2','vp1-4','vp2-10','vp3-11','l1-4','l1-2'])assert.equal(G.games[id],undefined,id);
// Other drawings exist on disk and are never the same file as the library card.
for(const [id,list] of Object.entries(c.VB_PICTURE_EXAMPLES)){assert.ok(cards[id],id);for(const p of list){assert.ok(fs.existsSync(path.join(root,p)),p);assert.notEqual(fs.readFileSync(path.join(root,p)).toString('base64'),fs.readFileSync(path.join(root,cards[id].src)).toString('base64'));}}
assert.ok(Object.values(c.VB_PICTURE_EXAMPLES).filter(l=>l.length===2).length>=40,'enough 3-drawing items');
const before=fs.readFileSync(path.join(root,'docs/SOUND-SCRIPT.md'),'utf8');cp.execFileSync('node',[path.join(root,'scripts/build-sound-script.cjs')]);
assert.equal(fs.readFileSync(path.join(root,'docs/SOUND-SCRIPT.md'),'utf8'),before,'docs/SOUND-SCRIPT.md is current (run npm run build:sounds)');
console.log(`PASS: ${Object.keys(G.games).length} games, ${pool.length} pictures, ${G.clips.length} numbered clips, criteria reachable, sound script current.`);
