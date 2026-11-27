const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const context=require('../core/context');const {formatReply,stylePayload,installPresentation}=require('../core/presentation');
test('one visual style reaches direct replies, captions and edited replies without changing routing',async()=>{
 const calls=[];const sock={sendMessage:async function(jid,payload,options){assert.equal(this,sock);calls.push({jid,payload,options});return{key:{id:'sent'}}}};installPresentation(sock);installPresentation(sock);
 const options={quoted:{key:{id:'original'}}};
 await context.run({accountId:'owner',presentation:{command:'sticker',category:'converters'}},async()=>{await sock.sendMessage('chat@g.us',{text:'Reply to a photo.',mentions:['123@s.whatsapp.net']},options);await sock.sendMessage('chat@g.us',{text:'Finished.',edit:{id:'sent'}},options);await sock.sendMessage('chat@g.us',{video:Buffer.from('video'),caption:'Your file'},options)});
 assert.equal(calls.length,3);for(const call of calls){assert.equal(call.jid,'chat@g.us');assert.equal(call.options,options);assert.match(call.payload.text||call.payload.caption,/ASLNS \/ CONVERT/);assert.match(call.payload.text||call.payload.caption,/STICKER/);}assert.deepEqual(calls[0].payload.mentions,['123@s.whatsapp.net']);assert.equal(calls[1].payload.edit.id,'sent');assert.equal(calls[2].payload.video.toString(),'video');
});
test('forwarded content, custom text, statuses, reactions, deletes and documents are preserved',()=>{
 for(const payload of [{forward:{}},{contextInfo:{isForwarded:true},text:'Someone’s words'},{delete:{id:'x'}},{react:{text:'✓',key:{id:'x'}}},{document:Buffer.from('file'),mimetype:'text/plain'}])assert.equal(stylePayload('chat@g.us',payload,{}),payload);
 const custom={text:'A custom greeting'};assert.equal(stylePayload('chat@g.us',custom,{raw:true}),custom);assert.equal(stylePayload('status@broadcast',custom,{}),custom);assert.equal(stylePayload('123@newsletter',custom,{}),custom);assert.equal(formatReply('My alive message',{command:'alive'}),'My alive message');
});
test('formatting is idempotent, keeps code and placeholders intact, and leaves message bodies untruncated',()=>{
 const body='Result\n```\n{"key":"value"}\n```\n@123';const first=formatReply(body,{command:'tool',category:'utility'});assert.ok(first.endsWith(body));assert.equal(formatReply(first,{}),first);const long={text:'x'.repeat(64000)};assert.equal(stylePayload('chat@g.us',long,{}),long);
});
test('redesigned English templates preserve formatter placeholder contracts',()=>{
 const expected=JSON.parse(fs.readFileSync('test/fixtures/locale-placeholders.json','utf8'));const current=JSON.parse(fs.readFileSync('plugins/utils/lang/english.json','utf8')).STRINGS;
 for(const [section,strings]of Object.entries(expected))for(const [key,counts]of Object.entries(strings)){const next=current[section]?.[key];assert.equal(typeof next,'string',section+'.'+key);for(const [i,token]of ['{}','{p}'].entries())assert.equal(next.split(token).length-1,counts[i],section+'.'+key+':'+token);}
});
