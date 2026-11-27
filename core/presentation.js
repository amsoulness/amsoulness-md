const context=require('./context');
const installed=Symbol('aslnsPresentation');
const RAW=new Set(['say','broadcast','forward','send','testalive','alive']);
const labels={ai:'AI CORNER',group:'GROUP ROOM',media:'MEDIA LAB',download:'DOWNLOADS',converters:'REMIX LAB',converter:'REMIX LAB',edit:'EDIT SUITE',utility:'QUICK TOOLS',owner:'CONTROL ROOM',settings:'PREFERENCES',workspace:'YOUR DESK',game:'PLAY ROOM',system:'SYSTEM',search:'DISCOVERY',misc:'EXTRAS',whatsapp:'WHATSAPP TOOLS',general:'ASSISTANT'};
const clean=value=>String(value||'').replace(/[\r\n*_`]/g,' ').trim().slice(0,45);
const icons={LAUNCH:'🚀',EXPLORE:'🧭',COMMANDS:'🗂️','COMMAND GUIDE':'📖','HOW TO':'📖',DISCOVER:'🔎','ASK THE DIRECTORY':'💡','FIND YOUR WAY':'🧭',SIGNAL:'📶',ONLINE:'🟢','AI CORNER':'🤖','GROUP ROOM':'👥','MEDIA LAB':'🎬',DOWNLOADS:'📥','REMIX LAB':'🎨','EDIT SUITE':'✂️','QUICK TOOLS':'🧰','CONTROL ROOM':'🛠️',PREFERENCES:'⚙️','YOUR DESK':'🗒️','PLAY ROOM':'🎮',SYSTEM:'🖥️',DISCOVERY:'🔎',EXTRAS:'✨','WHATSAPP TOOLS':'💬',ASSISTANT:'✨',NOTIFICATION:'🔔','A NEW CHAPTER':'🆕','NEW CHAPTER':'🆕','RELEASE CHECK':'🔄','BUILD ACCEPTED':'🏗️','UPGRADE COMPLETE':'✅','CHANGES INSTALLED':'✅','UPDATE PAUSED':'⚠️',SAVED:'✅',TASKS:'☑️',NOTES:'📝',FOCUS:'⏱️','FOCUS STARTED':'🎯','FOCUS COMPLETE':'🏁','THE BOT':'💫'};
const hasEmoji=text=>/\p{Extended_Pictographic}/u.test(text);
function emojiLabel(title){const value=String(title||'');return hasEmoji(value)?value:value+' '+(icons[value.toUpperCase()]||'✨');}
function decorateCardHeading(text){
 const decorated=text.replace(/^\*ASLNS \/ ([^*\n]+)\*/,(_,title)=>'*ASLNS / '+emojiLabel(title)+'*');
 const lines=decorated.split('\n');
 if(lines[1]!=='━━━━━━━━━━━━━━')lines.splice(1,0,'━━━━━━━━━━━━━━');
 return lines.join('\n');
}
function card(title,body,kicker='AMSOULNESS / BUILT AROUND YOU'){
 return `*ASLNS / ${emojiLabel(clean(title).toUpperCase())}*\n━━━━━━━━━━━━━━\n_${kicker}_\n\n${body}`;
}
function formatReply(text,meta={}){
 if(typeof text!=='string'||!text.trim()||meta.raw||RAW.has(meta.command))return text;
 if(/^\*ASLNS \/ /.test(text))return decorateCardHeading(text);
 const category=labels[meta.category]||clean(meta.category).toUpperCase()||'NOTIFICATION';
 const command=clean(meta.command).toUpperCase();
 return card(category,text,command?`AMSOULNESS  ·  ${command}`:'AMSOULNESS / LIVE');
}
function stylePayload(jid,payload,meta){
 if(!payload||typeof payload!=='object'||Buffer.isBuffer(payload)||!jid||/@(?:broadcast|newsletter)$/.test(jid)||payload.forward||payload.contextInfo?.isForwarded||payload.delete||payload.react)return payload;
 let next=payload;
 for(const field of ['text','caption'])if(typeof payload[field]==='string'){
  const value=formatReply(payload[field],meta);
  if(value.length<=64000&&value!==payload[field]){if(next===payload)next={...payload};next[field]=value;}
 }
 return next;
}
function styleInteractiveOptions(opts,meta={}){
 if(!opts||meta.raw||RAW.has(meta.command))return opts;
 const result={...opts};
 for(const field of ['text','body','title'])if(typeof opts[field]==='string'&&opts[field])result[field]=formatReply(opts[field],meta);
 if(typeof opts.header==='string')result.header=opts.header.startsWith('ASLNS')?opts.header:'ASLNS · '+opts.header;
 const footer=String(opts.footer||'').trim();result.footer=/ASLNS|AMSOULNESS/i.test(footer)?footer:(footer?footer+' · ASLNS':'AMSOULNESS / ASLNS');
 return result;
}
// Relay paths bypass sendMessage for native controls, albums and protocol edits.
// Only authored display fields change; IDs, actions, mentions, quotes and bytes stay intact.
function styleRelayMessage(message,meta={},depth=0){
 if(!message||typeof message!=='object'||depth>8||meta.raw||RAW.has(meta.command)||message.contextInfo?.isForwarded||message.botForwardedMessage||message.richResponseMessage)return message;
 let out=message;
 const set=(key,value)=>{if(value===message[key])return;if(out===message)out={...message};out[key]=value;};
 if(typeof message.conversation==='string')set('conversation',formatReply(message.conversation,meta));
 for(const type of ['extendedTextMessage','imageMessage','videoMessage','documentMessage','buttonsMessage','listMessage']){
  const node=message[type];if(!node||node.contextInfo?.isForwarded)continue;
  const fields=type==='extendedTextMessage'?['text']:type==='buttonsMessage'?['contentText']:type==='listMessage'?['description']:['caption'];
  let next=node;
  for(const field of fields)if(typeof node[field]==='string'&&node[field]){const value=formatReply(node[field],meta);if(value!==node[field]){if(next===node)next={...node};next[field]=value;}}
  if(['buttonsMessage','listMessage'].includes(type)){
   const footer=node.footerText||'';if(!/ASLNS|AMSOULNESS/i.test(footer)){if(next===node)next={...node};next.footerText=footer?footer+' · ASLNS':'AMSOULNESS / ASLNS';}
  }
  set(type,next);
 }
 const interactive=message.interactiveMessage;
 if(interactive&&!interactive.contextInfo?.isForwarded){
  let node={...interactive};
  if(interactive.body?.text)node.body={...interactive.body,text:formatReply(interactive.body.text,meta)};
  if(interactive.header?.title&&!interactive.header.title.startsWith('ASLNS'))node.header={...interactive.header,title:'ASLNS · '+interactive.header.title};
  const footer=interactive.footer?.text||'';
  if(!/ASLNS|AMSOULNESS/i.test(footer))node.footer={...interactive.footer,text:footer?footer+' · ASLNS':'AMSOULNESS / ASLNS'};
  set('interactiveMessage',node);
 }
 for(const type of ['ephemeralMessage','viewOnceMessage','viewOnceMessageV2','viewOnceMessageV2Extension','documentWithCaptionMessage']){
  if(!message[type]?.message)continue;
  const next=styleRelayMessage(message[type].message,meta,depth+1);
  if(next!==message[type].message)set(type,{...message[type],message:next});
 }
 if(message.protocolMessage?.editedMessage){
  const next=styleRelayMessage(message.protocolMessage.editedMessage,meta,depth+1);
  if(next!==message.protocolMessage.editedMessage)set('protocolMessage',{...message.protocolMessage,editedMessage:next});
 }
 return out;
}
function installPresentation(sock){
 if(!sock?.sendMessage||sock[installed])return;
 const send=sock.sendMessage;
 sock.sendMessage=function(jid,payload,options){
  const {aslnsRaw,...sdkOptions}=options||{};
  const meta=aslnsRaw?{raw:true}:context.current()?.presentation||{};
  return send.call(this,jid,stylePayload(jid,payload,meta),aslnsRaw?sdkOptions:options);
 };
 if(sock.relayMessage){const relay=sock.relayMessage;sock.relayMessage=function(jid,message,options){
  const {aslnsRaw,...sdkOptions}=options||{};
  const raw=aslnsRaw||/@(?:broadcast|newsletter)$/.test(jid||'');
  return relay.call(this,jid,raw?message:styleRelayMessage(message,context.current()?.presentation||{}),aslnsRaw?sdkOptions:options);
 };}
 sock[installed]=true;
}
module.exports={card,formatReply,stylePayload,styleInteractiveOptions,styleRelayMessage,installPresentation,emojiLabel,decorateCardHeading,RAW};
