const guides = require('./command-guides');
const clean = value => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
function commandGroups(commands, commandName, categoryLabel = s => s, locale = null) {
  const groups = new Map(), seen = new Set();
  for (const command of commands) {
    if (!command.pattern || command.excludeFromCommands) continue;
    const name = commandName(command);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const key = command.use || 'general';
    if (!groups.has(key)) groups.set(key, { key, label: clean(categoryLabel(key)), commands: [] });
    groups.get(key).commands.push({ name, desc: command.desc, usage: command.usage, warn: command.warn, fromMe: Boolean(command.fromMe), publishedHelp: locale ? publishedHelpFor(name, locale) : [] });
  }
  return [...groups.values()].sort((a,b) => a.label.localeCompare(b.label)).map(g => ({ ...g, commands: g.commands.sort((a,b) => a.name.localeCompare(b.name)) }));
}
function formatMenu({ groups, prefix, name, owner, user, mode, version, uptime }) {
  const count=groups.reduce((n,g)=>n+g.commands.length,0);
  const lines=['*ASLNS / LAUNCH*','_AMSOULNESS · YOUR WHATSAPP, REIMAGINED_','',`Hey ${clean(user)||'there'}. What are we doing today?`,'',`*${clean(name)}* · v${clean(version)}`,`${clean(mode)} mode · ${clean(uptime)} online`,'', '*PICK A DIRECTION*'];
  for(const g of groups)lines.push(`*${g.label}*  /  ${g.commands.length}`,`${prefix}list ${g.key}`);
  lines.push('','*QUICK MOVES*',`${prefix}help sticker — find a command`,`${prefix}desk — your private workspace`,`${prefix}settings — make it yours`,'',`${count} commands. One place to begin.`,`Owner · ${clean(owner)}`,'','aslns.online');
  return lines.join('\n');
}
function paginate(text, limit=8000) {
  const pages=[]; let page='';
  for (const line of text.split('\n')) {
    let rest=line;
    while(rest.length>limit){if(page){pages.push(page);page='';}pages.push(rest.slice(0,limit));rest=rest.slice(limit);}
    if(page.length+rest.length+1>limit){pages.push(page);page='';}
    page+=(page?'\n':'')+rest;
  }
  if(page)pages.push(page);
  return pages;
}
function formatList(groups,prefix,query='') {
  const search=clean(query).toLowerCase();
  if(!search){return ['*ASLNS / EXPLORE*\n_Choose a category. Keep the chat clear._\n\n'+groups.map(g=>`*${g.label}* · ${g.commands.length}\n${prefix}list ${g.key}`).join('\n\n')+`\n\n${prefix}list all — full directory\n${prefix}help <word> — search by purpose`];}
  const selected=search==='all'?groups:groups.filter(g=>g.key.toLowerCase()===search||g.label.toLowerCase()===search);
  if(!selected.length)return [`*ASLNS / FIND YOUR WAY*\n\nNo category matches “${clean(query)}”.\nAvailable: ${groups.map(g=>g.key).join(', ')}\n\nTry ${prefix}help ${clean(query)} to search commands.`];
  const lines=['*ASLNS / COMMANDS*','_Less searching. More doing._'];
  for(const g of selected){lines.push('',`*${g.label.toUpperCase()}*`);for(const c of g.commands){lines.push('',`*${prefix}${c.name}*`);if(c.desc)lines.push(String(c.desc));if(c.usage)lines.push(`Try · ${usageOf(c,prefix)}`);if(c.warn)lines.push(`Before you start · ${c.warn}`);lines.push(`_Step-by-step · ${prefix}help ${c.name}_`);}}
  lines.push('',`${prefix}help <command> — closer look`,`${prefix}menu — back to launch`);
  const pages=paginate(lines.join('\n'));
  return pages.map((page,i)=>pages.length>1?page+`\n\n_${i+1} / ${pages.length}_`:page);
}
function usageOf(command,prefix){
 const usage=String(command.usage||'').trim();
 if(!usage)return prefix+command.name;
 if(/^[.!#/$]/.test(usage))return usage.replace(/(^|\n|\|\s*)[.!#/$](?=[a-z])/gi,(_,lead)=>lead+prefix);
 if(usage.startsWith(command.name))return prefix+usage;
 return `${prefix}${command.name} ${usage}`;
}
function publishedHelpFor(name,locale){
 const escaped=String(name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const mention=new RegExp('(?:[.!#/$]|\\{p\\})'+escaped+'(?:\\b|\\s)','i');
 const found=[];
 for(const section of Object.values(locale||{}))for(const [key,value]of Object.entries(section||{})){
  if(!/(HELP|USAGE|SETUP|SYNTAX|EXAMPLE|FORMAT)/.test(key)||typeof value!=='string'||!mention.test(value))continue;
  if(value.length>8000||found.includes(value))continue;
  found.push(value);
 }
 return found.sort((a,b)=>b.length-a.length).slice(0,2);
}
function formatHelp(groups,prefix,query=''){
 const all=groups.flatMap(g=>g.commands.map(c=>({...c,category:g.label})));
 const word=clean(query).replace(/^[.!#/$]/,'').toLowerCase();
 if(!word)return `*ASLNS / ASK THE DIRECTORY*\n\nTell me a command or what you want to do.\n\n${prefix}help sticker\n${prefix}help music\n${prefix}list — browse categories\n${prefix}menu — launch menu`;
 const exact=all.find(c=>c.name.toLowerCase()===word)||(word==='list'?{name:'list',category:'Navigation',desc:'Browse commands by category, or open the complete directory.',usage:'.list [category | all]',fromMe:false}:null);
 if(exact){
  const guide=guides[exact.name.toLowerCase()]||{};
  const substitute=text=>String(text).replaceAll('{p}',prefix);
  const steps=guide.steps||[
   exact.usage?'Follow the published syntax below; replace its placeholders with your own input.':'This plugin has not published a full argument guide. Read its description and any validation prompt before choosing inputs.',
   'Run it in a chat where your account has permission. If it reports missing input, supply that input and try again.'
  ];
  const examples=guide.examples?.map(substitute)||[];
  const access=guide.self?'Only your linked account in Message yourself.':exact.fromMe?'Owner or authorized sudo users under the current bot access mode.':'Users allowed by the current bot access mode.';
  const lines=['*ASLNS / COMMAND GUIDE*',`_${exact.category} · ${prefix}${exact.name}_`,'', '*WHAT IT DOES*',exact.desc||'This plugin did not publish a description.','', '*HOW TO USE*',...steps.map((step,i)=>`${i+1}. ${substitute(step)}`),'', '*SYNTAX*',usageOf(exact,prefix)];
  if(examples.length)lines.push('', '*EXAMPLES*',...examples.map(example=>'`'+example+'`'));
  if(exact.publishedHelp?.length)lines.push('', '*FROM THE PLUGIN GUIDE*',...exact.publishedHelp.map(text=>substitute(text).replace(/(^|\n)[.!#/$](?=[a-z])/gi,(_,lead)=>lead+prefix)));
  lines.push('', '*WHERE & ACCESS*',access);
  if(guide.group)lines.push('Use inside the target group. Group admin access may also be required.');
  if(guide.result)lines.push('', '*WHAT TO EXPECT*',substitute(guide.result));
  const notes=[exact.warn,guide.note].filter(Boolean).map(substitute);
  if(notes.length)lines.push('', '*BEFORE YOU START*',...notes.map(note=>'• '+note));
  lines.push('', `_${prefix}list — browse · ${prefix}menu — launch_`);
  return lines.join('\n');
 }
 const found=all.filter(c=>[c.name,c.desc,c.category].join(' ').toLowerCase().includes(word));
 return `*ASLNS / DISCOVER*\n\n${found.length?found.length+' matches for':'No matches for'} “${clean(query)}”\n\n`+(found.length?found.slice(0,15).map(c=>`*${prefix}${c.name}* · ${c.category}\n${String(c.desc||'').slice(0,150)}`).join('\n\n'):`Try a shorter word, or ${prefix}list.`)+(found.length>15?'\n\nShowing the first 15. Use a more specific search.':'');
}
module.exports={commandGroups,formatMenu,formatList,formatHelp,usageOf,publishedHelpFor,paginate};
