const {randomUUID}=require('node:crypto');
const KEY='ASLNS_PRIVATE_WORKSPACE_V1';
const fresh=()=>({version:1,nextTask:1,nextNote:1,tasks:[],notes:[],focus:null,completedFocus:0});
function createWorkspace({read,write,clock=Date.now}){
 const locks=new Map();
 async function transact(account,operation){
  if(!account)throw new Error('Your linked account is not ready yet.');
  const before=locks.get(account)||Promise.resolve();
  const task=before.catch(()=>{}).then(async()=>{
   const stored=await read(account);let state=fresh();
   if(stored){try{state=JSON.parse(stored);}catch{throw new Error('Workspace data could not be read. It was kept unchanged.');}}
   if(state.version!==1||!Array.isArray(state.tasks)||!Array.isArray(state.notes))throw new Error('Workspace format is unsupported. Data was kept unchanged.');
   const result=operation(state);if(result.save)await write(account,JSON.stringify(state));return result.value;
  });
  locks.set(account,task);try{return await task;}finally{if(locks.get(account)===task)locks.delete(account);}
 }
 const text=(value,max)=>{const s=String(value||'').trim();if(!s||s.length>max)throw new Error(`Enter between 1 and ${max} characters.`);return s;};
 return {
  snapshot:account=>transact(account,s=>({value:structuredClone(s)})),
  addTask:(account,value)=>transact(account,s=>{if(s.tasks.length>=100)throw new Error('Task limit reached (100). Remove completed tasks first.');const item={id:s.nextTask++,text:text(value,300),done:false,createdAt:clock()};s.tasks.push(item);return{save:true,value:structuredClone(item)};}),
  task:(account,id,action)=>transact(account,s=>{const item=s.tasks.find(x=>x.id===id);if(!item)throw new Error('Task ID not found. Use .todo list.');if(action==='remove')s.tasks=s.tasks.filter(x=>x.id!==id);else item.done=action==='done';return{save:true,value:structuredClone(item)};}),
  addNote:(account,value)=>transact(account,s=>{if(s.notes.length>=50)throw new Error('Note limit reached (50). Remove an older note first.');const item={id:s.nextNote++,text:text(value,2000),createdAt:clock()};s.notes.push(item);return{save:true,value:structuredClone(item)};}),
  removeNote:(account,id)=>transact(account,s=>{if(!s.notes.some(x=>x.id===id))throw new Error('Note ID not found.');s.notes=s.notes.filter(x=>x.id!==id);return{save:true,value:id};}),
  focus:(account,minutes,label='')=>transact(account,s=>{if(!Number.isInteger(minutes)||minutes<1||minutes>180)throw new Error('Choose 1–180 minutes.');if(s.focus)throw new Error('A focus session already exists. Check .focus status or use .focus cancel.');s.focus={id:randomUUID(),minutes,label:String(label).trim().slice(0,100),endsAt:clock()+minutes*60000};return{save:true,value:structuredClone(s.focus)};}),
  cancelFocus:account=>transact(account,s=>{const item=s.focus;s.focus=null;return{save:Boolean(item),value:Boolean(item)};}),
  claimFocus:account=>transact(account,s=>{if(!s.focus||s.focus.endsAt>clock())return{value:null};const item=s.focus;s.focus=null;s.completedFocus++;return{save:true,value:structuredClone(item)};}),
 };
}
let workspace;
function getWorkspace(){
 if(!workspace){const {SessionVariable}=require('../database');workspace=createWorkspace({read:async accountId=>(await SessionVariable.findOne({where:{accountId,key:KEY},raw:true}))?.value,write:(accountId,value)=>SessionVariable.upsert({accountId,key:KEY,value})});}
 return workspace;
}
function isSelfChat(message){
 const bare=id=>typeof id==='string'?id.replace(/:\d+(?=@)/,''):'';
 return message.fromMe===true&&[bare(message.client.user?.id),bare(message.client.user?.lid)].filter(Boolean).includes(message.jid);
}
async function checkFocus(client,account){
 const target=String(client.user?.id||'').replace(/:\d+(?=@)/,'');
 if(!account||!/^\d+@s\.whatsapp\.net$/.test(target))return;
 const completed=await getWorkspace().claimFocus(account);if(!completed)return;
 // Persist the claim first: restarts cannot send a completion twice.
 await client.sendMessage(target,{text:`*AMSOULNESS / FOCUS COMPLETE*\n\n${completed.minutes} minutes finished${completed.label?': '+completed.label:'.'}\nTake a short break. Your next step is yours.\n\n.desk — your workspace`});
}
module.exports={createWorkspace,getWorkspace,isSelfChat,checkFocus};
