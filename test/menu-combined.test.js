const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
function load(animation){
 const calls=[];const commands=['ai','converters','download','edit','game','group','misc','owner','search','settings','system','utility','whatsapp','workspace'].map((use,i)=>({pattern:'command'+i,use,desc:'Command'}));
 const config={VERSION:'9.2.1',MODE:'private',BOT_INFO:'Amsoulness;Amsoulness;default',MENU_ANIMATIONS:animation};
 const mapping={'../core/presentation':require('../core/presentation'),'../core/menu-media':require('../core/menu-media'),'../core/menu-design':require('../core/menu-design'),'../main':{commands,Module:(spec,fn)=>commands.push({...spec,function:fn})},'../config':config,'../core/plugins/registry':{helpPrefix:()=>'.',commandName:c=>c.pattern.match(/^[a-z0-9]+/i)?.[0]},'../core/store':{getTotalUserCount:async()=>1},'./utils/misc':{bytesToSize:()=> '1 GB'},'./utils/lang':{getString:()=>({}),language:{STRINGS:{}}}};
 const module={exports:{}};
 vm.runInNewContext(fs.readFileSync('plugins/commands.js','utf8'),{module,exports:module.exports,require:name=>mapping[name]||(['os','path','fs'].includes(name)?require(name):{}),__dirname:path.resolve('plugins'),process,Buffer,console});
 const message={jid:'self@s.whatsapp.net',senderName:'Owner',client:{sendMessage:async(jid,payload)=>{calls.push({jid,payload})}},sendReply:async text=>calls.push({text})};
 return {calls,commands,message};
}
test('menu animation and full navigation are delivered in exactly one message',async()=>{
 const {calls,commands,message}=load(true);await commands.find(c=>c.pattern==='menu').function(message,[]);
 assert.equal(calls.length,1);assert.equal(calls[0].payload.gifPlayback,true);assert.ok(Buffer.isBuffer(calls[0].payload.video));const caption=calls[0].payload.caption;assert.match(caption,/ASLNS \/ LAUNCH 🚀/);assert.match(caption,/PICK A DIRECTION/);assert.match(caption,/\.list group/);assert.match(caption,/\.help <topic>/);assert.ok(caption.length<=1000);
});
test('disabled animation keeps the menu in one image message',async()=>{
 const {calls,commands,message}=load(false);await commands.find(c=>c.pattern==='menu').function(message,[]);assert.equal(calls.length,1);assert.ok(Buffer.isBuffer(calls[0].payload.image));assert.match(calls[0].payload.caption,/PICK A DIRECTION/);assert.equal(calls[0].payload.video,undefined);
});
test('very large category sets still produce a caption-sized navigation menu',()=>{
 const {formatMenu}=require('../core/menu-design');const groups=Array.from({length:100},(_,i)=>({key:'a'.repeat(100)+i,label:'Long category name '+i,commands:[{name:'test'}]}));const menu=formatMenu({groups,prefix:'.',name:'Amsoulness',owner:'Owner',user:'User',version:'9.2.1',mode:'private',uptime:'1h'});assert.ok(menu.length<=1000);assert.match(menu,/\.list — browse all categories/);
});
