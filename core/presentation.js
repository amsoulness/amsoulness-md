const context=require('./context');
const installed=Symbol('aslnsPresentation');
const RAW=new Set(['say','broadcast','forward','send','filter','welcome','goodbye','greeting','setalive','testalive','alive','take']);
const labels={group:'GROUP CONTROL',media:'MEDIA',download:'DOWNLOADS',converters:'CONVERT',converter:'CONVERT',utility:'TOOLS',owner:'CONTROL',settings:'PREFERENCES',workspace:'YOUR DESK',game:'PLAY',system:'SYSTEM',whatsapp:'WHATSAPP',general:'ASSISTANT'};
const clean=value=>String(value||'').replace(/[\r\n*_`]/g,' ').trim().slice(0,45);
function card(title,body,kicker='AMSOULNESS / BUILT AROUND YOU'){
 return `*ASLNS / ${clean(title).toUpperCase()}*\n_${kicker}_\n\n${body}`;
}
function formatReply(text,meta={}){
 if(typeof text!=='string'||!text.trim()||meta.raw||RAW.has(meta.command)||/^\*ASLNS \/ /.test(text))return text;
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
function installPresentation(sock){
 if(!sock?.sendMessage||sock[installed])return;
 const send=sock.sendMessage;
 sock.sendMessage=function(jid,payload,options){return send.call(this,jid,stylePayload(jid,payload,context.current()?.presentation||{}),options);};
 sock[installed]=true;
}
module.exports={card,formatReply,stylePayload,installPresentation,RAW};
