const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const context=require('../core/context');const {runUpdateCheck}=require('../core/services/update-context');
test('background Render checks can read the linked account key without exposing it globally',async()=>{
 const sessions=new Map([['other',{session:{accountId:'other'}}],['owner',{session:{accountId:'owner'}}]]);
 const getKey=()=>context.accountId()==='owner'?'private-key':'';
 let called=0;await runUpdateCheck({context,sessions,isRender:()=>true,getKey,check:async()=>{called++;await Promise.resolve();assert.equal(context.accountId(),'owner');assert.equal(getKey(),'private-key')}});
 assert.equal(called,1);assert.equal(context.accountId(),null);assert.equal(getKey(),'');
});
test('environment key and non-Render checks remain unscoped',async()=>{
 for(const isRender of [true,false])await runUpdateCheck({context,sessions:new Map([['owner',{session:{accountId:'owner'}}]]),isRender:()=>isRender,getKey:()=> 'environment-key',check:()=>assert.equal(context.isUnscoped(),true)});
});
test('announcing an update does not suppress later automatic attempts',async()=>{
 const source=fs.readFileSync('core/schedulers.js','utf8');const code=source.slice(source.indexOf('async function checkUpdates()'),source.indexOf('async function sendOfflinePresence'));
 let enabled=false,attempts=0,notifications=0;const sandbox={updaterNotified:null,isAutoUpdating:false,localPackageJson:{version:'7.4.7'},updater:{getRemoteVersion:async()=> '7.4.8',isGitRepo:async()=>false},isNewerVersion:()=>true,detectPlatform:()=> 'render',supportsAutoUpdate:()=> enabled,deploysOnRender:()=>true,performAutoUpdate:async()=>{attempts++;return false},notifyOwners:async()=>{notifications++},config:{HANDLERS:'.'},console};
 vm.createContext(sandbox);vm.runInContext(code+';globalThis.check=checkUpdates;',sandbox);
 await sandbox.check();enabled=true;await sandbox.check();await sandbox.check();
 assert.equal(notifications,1);assert.equal(attempts,2);
});
