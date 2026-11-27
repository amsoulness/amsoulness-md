// Background checks must resolve account-scoped keys in the linked account context.
async function runUpdateCheck({context,sessions,isRender,getKey,check}) {
  return context.runUnscoped(async()=>{
    if(isRender()&&!getKey()){
      for(const entry of sessions.values()){
        if(!entry.session?.accountId)continue;
        if(context.run(entry.session,()=>Boolean(getKey())))return context.run(entry.session,check);
      }
    }
    return check();
  });
}
module.exports={runUpdateCheck};
