'use strict';
// Copies the published files into output/pages for GitHub Pages.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/pages');
const omitted=new Set(['.github','tests','scripts','node_modules','output']),names=new Set(['.gitignore','AGENTS.md','package.json','package-lock.json','.DS_Store']);
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
let total=0;
for(const file of cp.execFileSync('git',['ls-files','-z'],{cwd:root}).toString().split('\0').filter(Boolean)){
 const parts=file.split('/');if(parts.some(p=>omitted.has(p))||names.has(parts.at(-1)))continue;
 const target=path.join(out,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file),target);total++;
}
fs.writeFileSync(path.join(out,'.nojekyll'),'');
console.log(`Pages artifact: ${total} files in output/pages.`);
