const {Module}=require('../main');
const context=require('../core/context');
const {getWorkspace,isSelfChat}=require('../core/services/workspace');
const {version}=require('../package.json');
function wrap(handler){return async(message,match)=>{
 if(!isSelfChat(message))return message.sendReply('Your Amsoulness workspace is private. Use Message yourself from the linked account.');
 const account=context.accountId();if(!account)return message.sendReply('Your linked account is starting. Try again shortly.');
 try{return await handler(message,String(match?.[1]||'').trim(),getWorkspace(),account);}catch(error){return message.sendReply(error.message?.startsWith('Enter ')||/^(Task |Note |Workspace |Your linked|Choose |A focus)/.test(error.message||'')?error.message:'Could not save or read your workspace. Try again; no success was recorded.');}
};}
Module({pattern:'desk\\s*$',fromMe:true,use:'workspace',desc:'Your private Amsoulness dashboard: tasks, notes and focus.',usage:'.desk'},wrap(async(m,_,w,a)=>{
 const s=await w.snapshot(a),pending=s.tasks.filter(t=>!t.done),left=s.focus?Math.max(0,Math.ceil((s.focus.endsAt-Date.now())/60000)):null;
 const lines=['*AMSOULNESS / YOUR DESK*',`v${version} · Private workspace`,'',`TASKS  ${pending.length} open · ${s.tasks.length-pending.length} done`,`NOTES  ${s.notes.length} saved`,`FOCUS  ${s.focus?(left?left+' minutes left':'Finishing...'):'Ready when you are'}`,`SESSIONS  ${s.completedFocus} completed`,''];
 if(pending.length)lines.push('*Your next steps*',...pending.slice(0,3).map(t=>`${t.id}. ${t.text}`),'');
 lines.push('.todo add <task>','.notes add <text>','.focus 25 <what you’re working on>','','Saved in your bot database. Only available in your self-chat.');return m.sendReply(lines.join('\n'));
}));
Module({pattern:'todo(?:\\s+([\\s\\S]+))?\\s*$',fromMe:true,use:'workspace',desc:'Save tasks, mark them done and track your next steps.',usage:'.todo add <task> | list | done <id> | reopen <id> | remove <id>'},wrap(async(m,arg,w,a)=>{
 const [action,...rest]=arg.split(/\s+/),value=rest.join(' ');
 if(action==='add'){const t=await w.addTask(a,value);return m.sendReply(`Task #${t.id} saved.\n${t.text}\n\n.todo done ${t.id} — mark complete`);}
 if(['done','reopen','remove'].includes(action)){if(!/^\d+$/.test(value))return m.sendReply('Use a task ID, for example .todo done 1.');const t=await w.task(a,Number(value),action);return m.sendReply(`Task #${t.id} ${action==='remove'?'removed':action==='done'?'completed':'reopened'}.`);}
 if(!arg||action==='list'){const s=await w.snapshot(a);return m.sendReply('*AMSOULNESS / TASKS*\n\n'+(s.tasks.length?s.tasks.map(t=>`${t.done?'✓':'○'} #${t.id} ${t.text}`).join('\n'):'A clear desk. Add your first task with .todo add <task>.'));}
 return m.sendReply('.todo add <task>\n.todo list\n.todo done <id>\n.todo reopen <id>\n.todo remove <id>');
}));
Module({pattern:'notes(?:\\s+([\\s\\S]+))?\\s*$',fromMe:true,use:'workspace',desc:'Save and search private notes, including replied text.',usage:'.notes add <text> | list | show <id> | search <text> | remove <id>'},wrap(async(m,arg,w,a)=>{
 const [action,...rest]=arg.split(/\s+/),value=rest.join(' ');
 if(action==='add'){const n=await w.addNote(a,value||m.reply_message?.text);return m.sendReply(`Note #${n.id} saved.\n.notes show ${n.id} — read it`);}
 if(action==='remove'){if(!/^\d+$/.test(value))return m.sendReply('Use .notes remove <id>.');await w.removeNote(a,Number(value));return m.sendReply(`Note #${value} removed.`);}
 const s=await w.snapshot(a);
 if(action==='show'){const n=s.notes.find(n=>n.id===Number(value));return m.sendReply(n?`*AMSOULNESS / NOTE #${n.id}*\n\n${n.text}`:'Note ID not found. Use .notes list.');}
 if(!arg||['list','search'].includes(action)){if(action==='search'&&!value)return m.sendReply('Use .notes search <text>.');const notes=action==='search'?s.notes.filter(n=>n.text.toLowerCase().includes(value.toLowerCase())):s.notes;return m.sendReply('*AMSOULNESS / NOTES*\n\n'+(notes.length?notes.slice().reverse().map(n=>`#${n.id} · ${n.text.replace(/\s+/g,' ').slice(0,100)}`).join('\n'):'No notes here yet.')+'\n\n.notes show <id> — read the full note');}
 return m.sendReply('.notes add <text> (or reply to text)\n.notes list\n.notes show <id>\n.notes search <text>\n.notes remove <id>');
}));
Module({pattern:'focus(?:\\s+([\\s\\S]+))?\\s*$',fromMe:true,use:'workspace',desc:'Start a focus timer that survives restarts and reminds only you.',usage:'.focus 25 <label> | status | cancel'},wrap(async(m,arg,w,a)=>{
 if(arg==='cancel')return m.sendReply(await w.cancelFocus(a)?'Focus session cancelled.':'No focus session is running.');
 if(!arg||arg==='status'){const s=await w.snapshot(a);return m.sendReply(s.focus?`*AMSOULNESS / FOCUS*\n\n${Math.max(0,Math.ceil((s.focus.endsAt-Date.now())/60000))} minutes left${s.focus.label?' · '+s.focus.label:''}\n\n.focus cancel — stop this session`:'Ready for your next session.\n.focus 25 <label>\nChoose 1–180 minutes. Completion arrives in your self-chat when the bot is online.');}
 const match=/^(\d+)(?:\s+([\s\S]+))?$/.exec(arg);if(!match)return m.sendReply('Use .focus 25 <label>, .focus status or .focus cancel.');
 const f=await w.focus(a,Number(match[1]),match[2]);return m.sendReply(`*AMSOULNESS / FOCUS STARTED*\n\n${f.minutes} minutes${f.label?' · '+f.label:''}\nA completion message will arrive here. If the bot is offline, it checks after reconnecting.\n\n.focus status — check progress`);
}));
