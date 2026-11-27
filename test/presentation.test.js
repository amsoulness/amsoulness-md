const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const context=require('../core/context');const {formatReply,stylePayload,installPresentation}=require('../core/presentation');
test('one visual style reaches direct replies, captions and edited replies without changing routing',async()=>{
 const calls=[];const sock={sendMessage:async function(jid,payload,options){assert.equal(this,sock);calls.push({jid,payload,options});return{key:{id:'sent'}}}};installPresentation(sock);installPresentation(sock);
 const options={quoted:{key:{id:'original'}}};
 await context.run({accountId:'owner',presentation:{command:'sticker',category:'converters'}},async()=>{await sock.sendMessage('chat@g.us',{text:'Reply to a photo.',mentions:['123@s.whatsapp.net']},options);await sock.sendMessage('chat@g.us',{text:'Finished.',edit:{id:'sent'}},options);await sock.sendMessage('chat@g.us',{video:Buffer.from('video'),caption:'Your file'},options)});
 assert.equal(calls.length,3);for(const call of calls){assert.equal(call.jid,'chat@g.us');assert.equal(call.options,options);assert.match(call.payload.text||call.payload.caption,/ASLNS \/ REMIX LAB/);assert.match(call.payload.text||call.payload.caption,/STICKER/);}assert.deepEqual(calls[0].payload.mentions,['123@s.whatsapp.net']);assert.equal(calls[1].payload.edit.id,'sent');assert.equal(calls[2].payload.video.toString(),'video');
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

test('native controls use shared presentation while IDs, URLs, copy codes and warnings remain unchanged',()=>{
 const {styleInteractiveOptions,styleRelayMessage}=require('../core/presentation');
 const buttons=[{name:'quick_reply',buttonParamsJson:JSON.stringify({display_text:'Enable',id:'.settings BUTTONS on'})},{name:'cta_copy',buttonParamsJson:JSON.stringify({display_text:'Copy',copy_code:'EXACT-CODE'})}];
 const original={interactiveMessage:{header:{title:'Preferences',hasMediaAttachment:false},body:{text:'Choose a setting'},footer:{text:'Experimental controls'},nativeFlowMessage:{buttons},contextInfo:{mentionedJid:['123@s.whatsapp.net'],quotedMessage:{conversation:'Do not restyle my quote'}}}};
 const snapshot=JSON.stringify(original);const styled=styleRelayMessage(original,{command:'settings',category:'settings'});
 assert.match(styled.interactiveMessage.body.text,/ASLNS \/ PREFERENCES/);assert.equal(styled.interactiveMessage.header.title,'ASLNS · Preferences');assert.match(styled.interactiveMessage.footer.text,/Experimental controls/);assert.equal(styled.interactiveMessage.nativeFlowMessage,original.interactiveMessage.nativeFlowMessage);assert.equal(styled.interactiveMessage.contextInfo,original.interactiveMessage.contextInfo);assert.equal(JSON.stringify(original),snapshot);
 const options={header:'Preferences',text:'Fallback text',body:'Native body',buttons:[{text:'Open',id:'.menu'}],footer:'Existing warning'};
 const next=styleInteractiveOptions(options,{category:'settings'});assert.match(next.text,/ASLNS/);assert.match(next.body,/ASLNS/);assert.equal(next.buttons,options.buttons);assert.match(next.footer,/Existing warning/);assert.deepEqual(styleInteractiveOptions(next,{category:'settings'}),next);
});
test('legacy lists, wrapped media and nested edits are styled without changing action or media data',()=>{
 const {styleRelayMessage}=require('../core/presentation');
 const sections=[{title:'Settings',rows:[{title:'Online',rowId:'.settings ALWAYS_ONLINE on'}]}];
 const list={listMessage:{description:'Choose one',sections,buttonText:'Open',footerText:'Original footer'}};
 const updated=styleRelayMessage(list,{category:'settings'});assert.match(updated.listMessage.description,/ASLNS/);assert.equal(updated.listMessage.sections,sections);assert.equal(updated.listMessage.buttonText,'Open');
 const bytes=Buffer.from([1,2,3,4]);const media={viewOnceMessageV2:{message:{imageMessage:{caption:'Ready',jpegThumbnail:bytes,mediaKey:bytes}}}};
 const next=styleRelayMessage(media,{category:'media'});assert.match(next.viewOnceMessageV2.message.imageMessage.caption,/MEDIA LAB/);assert.equal(next.viewOnceMessageV2.message.imageMessage.mediaKey,bytes);
 const key={remoteJid:'123@s.whatsapp.net',id:'same-id',fromMe:true};const edited={protocolMessage:{type:14,key,editedMessage:{extendedTextMessage:{text:'Finished',contextInfo:{stanzaId:'quote'}}}}};const result=styleRelayMessage(edited,{});assert.equal(result.protocolMessage.key,key);assert.equal(result.protocolMessage.type,14);assert.equal(result.protocolMessage.editedMessage.extendedTextMessage.contextInfo.stanzaId,'quote');assert.match(result.protocolMessage.editedMessage.extendedTextMessage.text,/ASLNS/);
});
test('rich apps, forwarded relays, revocations and raw socket options bypass presentation exactly',async()=>{
 const {styleRelayMessage}=require('../core/presentation');
 for(const source of [{botForwardedMessage:{message:{conversation:'HTML app'}}},{richResponseMessage:{unifiedResponse:{data:Buffer.from('html')}}},{extendedTextMessage:{text:'Original',contextInfo:{isForwarded:true}}},{protocolMessage:{type:0,key:{id:'revoke'}}}])assert.equal(styleRelayMessage(source,{}),source);
 const calls=[];const sock={sendMessage:async(...args)=>calls.push(args),relayMessage:async(...args)=>calls.push(args)};installPresentation(sock);
 const message={conversation:'Keep exactly'};await sock.relayMessage('123@s.whatsapp.net',message,{aslnsRaw:true,messageId:'same'});assert.equal(calls[0][1],message);assert.deepEqual(calls[0][2],{messageId:'same'});
 await sock.sendMessage('123@s.whatsapp.net',{text:'Keep exactly'},{aslnsRaw:true});assert.equal(calls[1][1].text,'Keep exactly');assert.deepEqual(calls[1][2],{});
});
test('all bundled locale strings retain their exact content under the shared design',()=>{
 for(const file of fs.readdirSync('plugins/utils/lang').filter(f=>f.endsWith('.json'))){const locale=JSON.parse(fs.readFileSync('plugins/utils/lang/'+file,'utf8')).STRINGS;for(const [section,strings]of Object.entries(locale))for(const [key,value]of Object.entries(strings)){if(typeof value!=='string')continue;const result=formatReply(value,{category:section,command:'example'});assert.ok(result===value||result.endsWith(value)||(/^\*ASLNS \/ /.test(value)&&result.split('\n').filter(line=>line!=='━━━━━━━━━━━━━━').slice(1).join('\n')===value.split('\n').filter(line=>line!=='━━━━━━━━━━━━━━').slice(1).join('\n')),file+':'+section+'.'+key);assert.equal(formatReply(result,{}),result);}}
});

test('styled native messages survive the actual Baileys protobuf codec',async()=>{
 const {proto}=await import('baileys').catch(()=>import('../session-service/node_modules/baileys/lib/index.js'));
 const {styleRelayMessage}=require('../core/presentation');const params=JSON.stringify({display_text:'Open menu',id:'.menu'});
 const original={viewOnceMessage:{message:{interactiveMessage:{header:{title:'Toolkit',hasMediaAttachment:false},body:{text:'Pick an action'},footer:{text:'Existing warning'},nativeFlowMessage:{buttons:[{name:'quick_reply',buttonParamsJson:params}]}}}}};
 const styled=styleRelayMessage(original,{category:'utility',command:'menu'});const wire=proto.Message.encode(proto.Message.fromObject(styled)).finish();const decoded=proto.Message.decode(wire);const card=decoded.viewOnceMessage.message.interactiveMessage;
 assert.match(card.body.text,/ASLNS \/ QUICK TOOLS/);assert.match(card.footer.text,/Existing warning/);assert.equal(card.nativeFlowMessage.buttons[0].buttonParamsJson,params);
});

test('every translated update announcement uses Amsoulness identity',()=>{
 for(const file of fs.readdirSync('plugins/utils/lang').filter(f=>f.endsWith('.json'))){const strings=JSON.parse(fs.readFileSync('plugins/utils/lang/'+file,'utf8')).STRINGS;assert.doesNotMatch(JSON.stringify(strings),/Raganork|raganork\.site/,file);}
});

test('emoji headings are consistent, idempotent and never inserted into command values',()=>{
 const text='Run `.todo add Finish homework` or copy ASLNS~example.';const first=formatReply(text,{category:'workspace',command:'todo'});assert.match(first,/🗒️/);assert.ok(first.endsWith(text));assert.equal(formatReply(first,{}),first);const existing=formatReply('*ASLNS / SIGNAL*\nLatency · 10 ms',{});assert.match(existing,/📶/);assert.equal(formatReply(existing,{}),existing);
});
