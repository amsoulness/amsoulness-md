// Merge official upstream changes without replacing the Amsoulness distribution.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync,spawnSync}=require('node:child_process');
const REPO='https://github.com/souravkl11/raganork-md.git';
const STATE='.upstream-sync.json';
const missing=Symbol('missing');
function mergeJSON(base,ours,theirs,at='') {
  if(JSON.stringify(ours)===JSON.stringify(base))return theirs;
  if(JSON.stringify(theirs)===JSON.stringify(base)||JSON.stringify(ours)===JSON.stringify(theirs))return ours;
  if([base,ours,theirs].every(v=>v&&typeof v==='object'&&!Array.isArray(v))){
    const result={};for(const key of new Set([...Object.keys(base),...Object.keys(ours),...Object.keys(theirs)])){
      const get=o=>Object.hasOwn(o,key)?o[key]:missing;
      const value=mergeJSON(get(base),get(ours),get(theirs),at+'/'+key);if(value!==missing)result[key]=value;
    }return result;
  }
  if(theirs===missing)return ours;
  throw new Error('Manual review required: overlapping JSON change at '+at);
}
function eligible(file){
 if(/^licen[cs]e(?:\.|$)/i.test(path.basename(file)))return false;
 return /^(core\/|plugins\/)/.test(file)||['config.js','index.js','main.js','package.json','yarn.lock','Dockerfile'].includes(file);
}
function branded(text){
 return text.replaceAll('https://github.com/souravkl11/raganork-md.git','https://github.com/amsoulness/amsoulness-md.git')
 .replaceAll('https://raw.githubusercontent.com/souravkl11/raganork-md/main/package.json','https://raw.githubusercontent.com/amsoulness/amsoulness-md/main/package.json')
 .replaceAll('Raganork updated to','Amsoulness updated to').replaceAll('Raganork started!','Amsoulness started!');
}
function nextVersion(version){
 if(!/^\d+\.\d+\.\d+$/.test(version))throw new Error('Amsoulness needs a valid release version.');
 const [major,minor,patch]=version.split('.').map(Number);
 return `${major}.${minor}.${patch+1}`;
}
function run(){
 const git=(args,options={})=>execFileSync('git',args,{encoding:'utf8',maxBuffer:32*1024*1024,...options});
 if(git(['status','--porcelain']).trim())throw new Error('Run upstream sync only in a clean checkout.');
 const state=JSON.parse(fs.readFileSync(STATE,'utf8'));
 if(state.repository!==REPO||state.branch!=='main'||!/^([a-f0-9]{40})$/.test(state.commit))throw new Error('Invalid upstream checkpoint.');
 git(['fetch','--no-tags',REPO,'main:refs/remotes/upstream-sync/main']);
 const latest=git(['rev-parse','refs/remotes/upstream-sync/main']).trim();
 if(latest===state.commit){console.log('Already synchronized.');return;}
 git(['merge-base','--is-ancestor',state.commit,latest]);
 const changed=git(['diff','--name-only','--no-renames','-z',state.commit,latest]).split('\0').filter(Boolean);
 const read=(revision,file)=>{try{return execFileSync('git',['show',revision+':'+file],{maxBuffer:32*1024*1024,stdio:['ignore','pipe','ignore']});}catch{return null;}};
 const updates=new Map(),conflicts=[];
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'aslns-sync-'));
 try{for(const file of changed){
   if(!eligible(file))continue;
   if(file.split('/').some(part=>part==='..'||part==='')||path.isAbsolute(file))throw new Error('Unsafe upstream path.');
   const mode=git(['ls-tree',latest,'--',file]).split(' ')[0];if(mode&&mode!=='100644'&&mode!=='100755')throw new Error('Unsupported upstream file type: '+file);
   const b=read(state.commit,file),o=read('HEAD',file),t=read(latest,file);
   const equal=(a,b)=>a===null?b===null:b!==null&&a.equals(b);
   if(equal(o,b)){updates.set(file,t&&!t.includes(0)?Buffer.from(branded(t.toString())):t);continue;}
   if(equal(t,b)||equal(o,t))continue;
   if(!b||!o||!t||[b,o,t].some(v=>v.includes(0))){conflicts.push(file);continue;}
   try{
     let output;
     if(file.endsWith('.json')){
       const base=JSON.parse(branded(b.toString())),ours=JSON.parse(o),theirs=JSON.parse(branded(t.toString()));
       if(file==='package.json'){
         // Identity and local test scripts belong to this distribution.
         for(const key of ['name','description','author','contributors','scripts']){base[key]=ours[key];theirs[key]=ours[key];}
         base.version=ours.version;theirs.version=ours.version;
       }
       output=JSON.stringify(mergeJSON(base,ours,theirs),null,2)+'\n';
     }else{
       const files=[o.toString(),branded(b.toString()),branded(t.toString())].map((s,i)=>{const f=path.join(temp,String(i));fs.writeFileSync(f,s.replaceAll('\r\n','\n'));return f;});
       const result=spawnSync('git',['merge-file','-p',...files],{encoding:'utf8',maxBuffer:32*1024*1024});
       if(result.status!==0)throw new Error('Overlapping change');output=result.stdout;
     }
     updates.set(file,Buffer.from(output));
   }catch{conflicts.push(file);}
 }
 if(conflicts.length)throw new Error('Sync stopped; no files changed. Review upstream conflicts in: '+conflicts.join(', '));
 // Every compatible code sync creates a new Amsoulness release, even when
 // upstream has not bumped its version. Never downgrade to upstream numbering.
 if(updates.size){
   const local=JSON.parse(read('HEAD','package.json'));
   const pkg=JSON.parse(updates.get('package.json')||read('HEAD','package.json'));
   pkg.version=nextVersion(local.version);
   updates.set('package.json',Buffer.from(JSON.stringify(pkg,null,2)+'\n'));
 }
 state.upstreamVersion=JSON.parse(read(latest,'package.json')).version;
 for(const [file,value]of updates){
   const previous=read('HEAD',file)?.toString()||'';
   if(value&&!value.includes(0)&&(value.toString().match(/Raganork|raganork\.site/g)||[]).length>(previous.match(/Raganork|raganork\.site/g)||[]).length)throw new Error('New upstream branding requires review: '+file);
 }
 for(const [file,value]of updates){if(value===null)fs.unlinkSync(file);else{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);}}
 const added=[...updates].filter(([file,value])=>value!==null&&!read('HEAD',file)).map(([file])=>file);
 if(added.length)git(['add','--intent-to-add','--',...added]);
 state.commit=latest;fs.writeFileSync(STATE,JSON.stringify(state,null,2)+'\n');
 console.log('Synchronized '+updates.size+' files from '+latest+'. LICENSE, notices, documentation, workflows and custom-only files were preserved.');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
if(require.main===module){try{run();}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={mergeJSON,eligible,branded,nextVersion};
