// Touch games: each engine plays to a score, stopping early scores what was done, and the overlay ignores outside taps.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium,webkit}=require(process.env.VBMAPP_PLAYWRIGHT||'playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const f=path.join(root,decodeURIComponent(req.url.split('?')[0]).replace(/\/$/,'/index.html'));fs.readFile(f,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'})[path.extname(f)]||'application/octet-stream');res.end(b);});});
server.listen(0,'127.0.0.1',async()=>{
 const engine=process.env.VBMAPP_ENGINE==='webkit'?webkit:chromium;let browser;
 try{
  browser=await engine.launch({headless:true,...(engine===chromium?{channel:'chrome'}:{})});
  const page=await browser.newPage({viewport:{width:1024,height:768},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.locator('#accountName').fill('Games QA');await page.locator('#accountForm button').click();await page.waitForFunction(()=>window.VBApp?.snapshot().child.name==='Games QA');
  await page.locator('nav [data-page=milestones]').click();
  const snap=id=>page.evaluate(id=>({v:VBApp.snapshot().scores.milestones[id],note:VBApp.snapshot().comments[id]||''}),id);
  async function launch(id){await page.evaluate(()=>{const d=document.getElementById('itemDialog');if(d.open)d.close();});await page.locator(`[data-edit="${id}"]`).first().click();await page.locator(`#itemBody [data-game="${id}"]`).click();await page.locator('#gameDialog [data-game-start]').click();}
  async function choose(limit=99,wrongAt=-1){let n=0;while(n<limit&&await page.locator('#gameDialog [data-option]').count()){const ans=await page.evaluate(()=>VBGames.currentAnswer());if(ans===null)break;const count=await page.locator('#gameDialog [data-option]').count();await page.locator(`#gameDialog [data-option="${n===wrongAt?(ans+1)%count:ans}"]`).click({force:true});n++;await page.waitForFunction(n=>VBGames.currentAnswer()===null||document.querySelectorAll('#gameDialog .game-option.ok,#gameDialog .game-option.no').length===0,n);}}
  async function sort(drag){for(let round=0;round<4&&await page.locator('#gameDialog .game-pile').count();round++){const assigned={};let left=await page.locator('#gameDialog .game-pile .game-piece').count();
   while(left){const p=page.locator('#gameDialog .game-pile .game-piece').first(),k=await p.getAttribute('data-k');let bin=page.locator(`#gameDialog .game-bin[data-k="${k}"]`);if(!await bin.count()){assigned[k]??=Object.keys(assigned).length;bin=page.locator(`#gameDialog .game-bin[data-bin="${assigned[k]}"]`);}
    if(drag&&left%2){const a=await p.boundingBox(),b=await bin.boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height-12,{steps:6});await page.mouse.up();}else{await p.click();await bin.click({position:{x:12,y:12}});}
    left=await page.locator('#gameDialog .game-pile .game-piece').count();}
   await page.locator('#gameDialog [data-sort-done]').click().catch(()=>{});}}
  async function done(){await page.locator('#gameDialog .game-result').waitFor();const text=await page.locator('#gameDialog .game-result').textContent();await page.locator('#gameDialog [data-game-done]').click();assert.equal(await page.evaluate(()=>document.getElementById('gameDialog').open),false);return text;}

  // Matching: all correct → full point, recorded with a note.
  await launch('vp1-5');assert.equal(await page.locator('#gameDialog .game-sample').count(),1);
  await page.mouse.click(3,765);assert.equal(await page.evaluate(()=>document.getElementById('gameDialog').open),true,'outside taps never close a game');
  await choose();await done();let r=await snap('vp1-5');assert.equal(r.v,1);assert.match(r.note,/^\[[^\]]+\] .*10\/10/);assert.doesNotMatch(r.note,/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  // The score stays editable by hand.
  await page.locator('#itemBody [data-score="0.5"]').click();assert.equal((await snap('vp1-5')).v,.5);
  // Sorting with models (tap and drag) and without a model.
  await launch('vp2-7');await sort(true);await done();assert.equal((await snap('vp2-7')).v,1);
  await launch('vp3-14');await sort(false);await done();assert.equal((await snap('vp3-14')).v,1);
  // Patterns: the 2-step option is worth a half point.
  await page.evaluate(()=>{document.getElementById('itemDialog').close();});await page.locator('[data-edit="vp3-15"]').first().click();await page.locator('#itemBody [data-game="vp3-15"]').click();await page.locator('#gameDialog [data-steps="2"]').click();await page.locator('#gameDialog [data-game-start]').click();
  assert.equal(await page.locator('#gameDialog .game-sequence').count(),1);await choose();await done();assert.equal((await snap('vp3-15')).v,.5);
  // LRFFC, listener colour/shape, reading and maths scorers.
  await launch('lr2-6');await choose(99,0);await done();assert.equal((await snap('lr2-6')).v,1);
  await launch('l3-11');await choose();await done();assert.equal((await snap('l3-11')).v,1);
  await launch('r3-15');await choose();await done();assert.equal((await snap('r3-15')).v,1);
  await launch('ma3-11');await choose(99,0);await done();r=await snap('ma3-11');assert.ok([0,.5].includes(r.v),'one missed number can never earn the full point');assert.match(r.note,/الأرقام الصحيحة|Correct numbers/);
  await launch('ma3-15');await choose();await done();assert.equal((await snap('ma3-15')).v,1);
  // Letters follow the interface language: Arabic letters and prompts in Arabic.
  await launch('r3-12');const glyphs=await page.locator('#gameDialog [data-option] .game-glyph').allTextContents();assert.ok(glyphs.length===5&&glyphs.every(g=>/^[\u0621-\u064A]$/.test(g.trim())),'Arabic letters: '+glyphs.join(' '));
  assert.match(await page.locator('#gameDialog .game-say').textContent(),/وين حرف ال/);assert.match(await page.locator('#gameDialog .game-replay').textContent(),/5\d\d/);
  await choose();await done();r=await snap('r3-12');assert.equal(r.v,1);assert.match(r.note,/حروف عربية/);
  // Newer kinds: non-identical matching, comparisons (both ends of every pair), counting out.
  await launch('vp2-9');assert.equal(await page.locator('#gameDialog .game-sample img').count(),1);await choose();await done();assert.equal((await snap('vp2-9')).v,1);
  await launch('ma3-14');await choose();await done();r=await snap('ma3-14');assert.equal(r.v,1);assert.match(r.note,/8/);
  await launch('ma3-13');for(let t=0;t<5;t++){const say=await page.locator('#gameDialog .game-say').textContent(),n=['واحد','اتنين','تلاتة','أربعة','خمسة'].findIndex(w=>say.includes(w))+1;for(let i=0;i<n;i++)await page.locator('#gameDialog .count-pile [data-count]').first().click();await page.locator('#gameDialog [data-count-done]').click();await page.waitForTimeout(650);}
  await done();assert.equal((await snap('ma3-13')).v,1);
  // Screens you score with ✓/✗: picture cards, the mand board, tracking.
  const yes=async n=>{for(let i=0;i<n;i++)await page.locator('#gameDialog [data-judge="1"]').click();};
  await launch('t1-2');await yes(4);await done();assert.equal((await snap('t1-2')).v,1);
  await launch('m1-2');for(let i=0;i<3;i++){await page.locator(`#gameDialog [data-board="${i}"]`).click();await yes(1);}await page.locator('#gameDialog [data-board-end]').click();await done();assert.equal((await snap('m1-2')).v,.5);
  await launch('vp1-1');const thing=page.locator('#gameDialog .track-thing');await thing.waitFor();
  // The object never stops moving.
  const where=async()=>(await thing.boundingBox());const p1=await where();await page.waitForTimeout(1200);const p2=await where();await page.waitForTimeout(1200);const p3=await where();
  assert.ok(Math.hypot(p2.x-p1.x,p2.y-p1.y)>5&&Math.hypot(p3.x-p2.x,p3.y-p2.y)>5,'tracking object keeps moving');
  // A short hold does not count; holding 2 s counts once.
  const hold=async ms=>{const b=await page.locator('#gameDialog [data-hold]').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(ms);await page.mouse.up();};
  await hold(800);assert.match(await page.locator('#gameDialog .game-progress').textContent(),/^\s*0 ·/);
  await hold(2300);await hold(2300);await page.locator('#gameDialog [data-miss]').click();assert.match(await page.locator('#gameDialog .game-progress').textContent(),/^\s*2 ·/);await page.locator('#gameDialog [data-game-close]').click();await done();r=await snap('vp1-1');assert.equal(r.v,.5);assert.match(r.note,/2/);
  // Observation timer: counts, then save.
  await launch('s1-1');await page.locator('#gameDialog [data-run]').click();for(let i=0;i<5;i++)await page.locator('#gameDialog [data-ev="new"]').click();
  assert.match(await page.locator('#gameDialog [data-stats]').textContent(),/5/);await page.locator('#gameDialog [data-obs-end]').click();await done();assert.equal((await snap('s1-1')).v,1);
  // Stopping early scores what was done and marks it incomplete; stopping before any answer records nothing.
  await launch('l2-6');assert.ok(await page.locator('#gameDialog .game-say').textContent());await choose(3);await page.locator('#gameDialog [data-game-close]').click();
  assert.match(await done(),/أُوقفت مبكراً|Stopped early/);r=await snap('l2-6');assert.equal(r.v,0);assert.match(r.note,/غير مكتملة|incomplete/);
  await launch('l1-5');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.getElementById('gameDialog').open),false);assert.equal((await snap('l1-5')).v,undefined);
  // No emoji anywhere in the game overlay or the item card.
  assert.equal(await page.evaluate(()=>/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]/u.test(document.body.innerText)),false);
  // Completed profiles show no game button.
  await page.evaluate(()=>document.getElementById('itemDialog').close());await page.locator('nav [data-page=report]').click();await page.locator('[data-assessment-action=finish]').click();await page.locator('[data-confirm-assessment]').click();
  assert.equal(await page.evaluate(()=>document.querySelectorAll('main [data-game], dialog[open] [data-game]').length),0);
  assert.deepEqual(errors,[]);console.log('PASS: non-identical matching, comparisons, counting out, picture cards, mand board, tracking, observation timer; matching, model and free sorting (tap and drag), 3/2-step patterns, LRFFC, colour/shape, reading and maths scoring; early stop and Escape; outside taps ignored; hidden on completed profiles.');
 }catch(e){console.error(e);process.exitCode=1;}finally{if(browser)await browser.close();server.close();}
});
