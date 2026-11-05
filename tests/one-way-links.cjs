'use strict';
// VB-MAPP stands alone: the main website links here, never the other way round.
const fs=require('node:fs'),path=require('node:path');
const site=path.resolve(__dirname,'../output/pages'),banned=/speech-website|assets\/site\/|forms\/ASD|(?:^|["'`/])(?:forms|resources)\.html|href="\.\.\//;
if(!fs.existsSync(path.join(site,'index.html')))throw Error('Run scripts/stage-site.cjs first.');
const bad=[];let checked=0;
for(const entry of fs.readdirSync(site,{recursive:true,withFileTypes:true})){
 if(!entry.isFile()||!/\.(html|js|css|json)$/.test(entry.name))continue;
 const file=path.join(entry.parentPath,entry.name);checked++;
 if(banned.test(fs.readFileSync(file,'utf8')))bad.push(path.relative(site,file));
}
if(bad.length)throw Error('Links back to the main website:\n'+bad.join('\n'));
console.log(`PASS: ${checked} published files have no link back to the main website.`);
