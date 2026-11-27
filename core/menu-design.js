const clean = value => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
function commandGroups(commands, commandName, categoryLabel = s => s) {
  const groups = new Map(), seen = new Set();
  for (const command of commands) {
    if (!command.pattern || command.excludeFromCommands) continue;
    const name = commandName(command);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const key = command.use || 'general';
    if (!groups.has(key)) groups.set(key, { key, label: clean(categoryLabel(key)), commands: [] });
    groups.get(key).commands.push({ name, desc: command.desc, usage: command.usage, warn: command.warn });
  }
  return [...groups.values()].sort((a,b) => a.label.localeCompare(b.label)).map(g => ({ ...g, commands: g.commands.sort((a,b) => a.name.localeCompare(b.name)) }));
}
function formatMenu({ groups, prefix, name, owner, user, mode, version, uptime, ram, users }) {
  const count = groups.reduce((n,g) => n + g.commands.length, 0);
  const lines = [
    '*AMSOULNESS / ASLNS*', '_Your everyday workspace. Your WhatsApp assistant._', '',
    `Hello, ${clean(user) || 'there'}.`,
    `*${clean(name)}*  ·  v${clean(version)}`,
    `${count} commands  /  ${groups.length} categories`, '',
    '*01 / AT A GLANCE*',
    `Owner  ›  ${clean(owner)}`, `Mode  ›  ${clean(mode)}`,
    `Uptime  ›  ${clean(uptime)}`, `Free RAM  ›  ${clean(ram)}`,
    `Total users  ›  ${clean(users)}`, '',
    '*02 / QUICK START*',
    `Private workspace → ${prefix}desk (self-chat)`,
    `Menu directory → ${prefix}list`,
    `Bot settings → ${prefix}settings`,
    `Command help → ${prefix}info <command>`, '',
    '*03 / EXPLORE*'
  ];
  for (const group of groups) {
    const preview = group.commands.slice(0,6).map(c => `${prefix}${c.name}`).join('  ·  ');
    const extra = group.commands.length > 6 ? `  +${group.commands.length-6} more` : '';
    lines.push('', `*${group.label.toUpperCase()}* / ${group.commands.length}`, preview + extra, `↳ ${prefix}list ${group.key}`);
  }
  lines.push('', '━━━━━━━━━━━━━━', 'Made for your everyday.', 'Website  ↗  https://aslns.online', 'Plugins  ↗  https://aslns.online/session/plugins');
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
  const selected=search?groups.filter(g=>g.key.toLowerCase()===search||g.label.toLowerCase()===search):groups;
  if (!selected.length) return [`*AMSOULNESS / DIRECTORY*\n\nNo category matches “${clean(query)}”.\n\nAvailable: ${groups.map(g=>g.key).join(', ')}\n\nUse ${prefix}list <category> or ${prefix}menu.`];
  const count=selected.reduce((n,g)=>n+g.commands.length,0);
  const lines=['*AMSOULNESS / COMMAND DIRECTORY*', `_${count} commands. Find your next shortcut._`, '', `Browse one category: ${prefix}list <category>`, `Detailed help: ${prefix}info <command>`];
  selected.forEach((g,i)=>{lines.push('', `*${String(i+1).padStart(2,'0')} / ${g.label.toUpperCase()}*`, `${g.commands.length} commands`, '');g.commands.forEach(c=>{lines.push(`*${prefix}${c.name}*`);if(c.desc)lines.push(String(c.desc));if(c.usage)lines.push(`Usage › ${c.usage}`);if(c.warn)lines.push(`Note › ${c.warn}`);lines.push('');});});
  lines.push('━━━━━━━━━━━━━━','Amsoulness / ASLNS','https://aslns.online/session/plugins');
  const pages=paginate(lines.join('\n'));
  return pages.length>1?pages.map((p,i)=>`_AMSOULNESS · ${i+1}/${pages.length}_\n\n${p}`):pages;
}
module.exports={commandGroups,formatMenu,formatList,paginate};
