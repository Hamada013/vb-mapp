// Every pop-up closes on a tap outside it, through its own cancel rules; game overlays opt out.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium,webkit}=require(process.env.VBMAPP_PLAYWRIGHT||'playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const f=path.join(root,decodeURIComponent(req.url.split('?')[0]).replace(/\/$/,'/index.html'));fs.readFile(f,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'})[path.extname(f)]||'application/octet-stream');res.end(b);});});
server.listen(0,'127.0.0.1',async()=>{
 const engine=process.env.VBMAPP_ENGINE==='webkit'?webkit:chromium;let browser;
 try{
  browser=await engine.launch({headless:true,...(engine===chromium?{channel:'chrome'}:{})});const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  const open=id=>page.evaluate(id=>document.getElementById(id).open,id),corner=()=>page.mouse.click(4,840);
  await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.locator('#accountDialog').waitFor();
  await corner();assert.equal(await open('accountDialog'),true,'first-launch account picker must stay open');
  await page.locator('#accountName').fill('Dialog QA');await page.locator('#accountForm button').click();await page.waitForFunction(()=>window.VBApp?.snapshot().child.name==='Dialog QA');
  await page.locator('nav [data-page=milestones]').click();await page.locator('[data-edit="m1-1"]').first().click();assert.equal(await open('itemDialog'),true);
  await page.locator('#itemBody').click({position:{x:5,y:5}});assert.equal(await open('itemDialog'),true,'a tap inside must not close');
  await corner();assert.equal(await open('itemDialog'),false,'outside tap closes the item dialog');
  await page.locator('#accounts').click();await page.locator('#parent-gate').waitFor();await corner();assert.equal(await open('parent-gate'),false,'outside tap cancels the parent gate');
  await page.locator('nav [data-page=barriers]').click();await page.locator('[data-barrier-notes]').click();assert.equal(await open('barrierNotesDialog'),true);await corner();assert.equal(await open('barrierNotesDialog'),false);
  await page.evaluate(()=>{const d=document.createElement('dialog');d.id='noOutside';d.setAttribute('data-no-outside-close','');d.textContent='game';document.body.append(d);d.showModal();});await corner();assert.equal(await open('noOutside'),true,'opt-out overlays stay open');
  assert.deepEqual(errors,[]);console.log('PASS: outside taps close item, notes and parent-gate dialogs; first-launch accounts and opt-out overlays stay open.');
 }catch(e){console.error(e);process.exitCode=1;}finally{if(browser)await browser.close();server.close();}
});
