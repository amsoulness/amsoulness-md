const SOURCE='https://codeload.github.com/amsoulness/amsoulness-md/tar.gz/refs/heads/main';
async function redeployCloud(env=process.env, fetchImpl=fetch) {
  let url, key, payload, host;
  if(env.KOYEB_SERVICE_ID){
    if(!/^[a-z0-9-]{1,100}$/i.test(env.KOYEB_SERVICE_ID))throw new Error('Invalid Koyeb service identifier.');
    host='Koyeb';key=env.KOYEB_API_KEY;url=`https://app.koyeb.com/v1/services/${env.KOYEB_SERVICE_ID}/redeploy`;payload={skip_build:false,use_cache:false};
  }else if(env.HEROKU_APP_NAME){
    if(!/^[a-z][a-z0-9-]{2,29}$/.test(env.HEROKU_APP_NAME))throw new Error('Invalid Heroku app name.');
    host='Heroku';key=env.HEROKU_API_KEY;url=`https://api.heroku.com/apps/${env.HEROKU_APP_NAME}/builds`;payload={source_blob:{url:SOURCE},buildpacks:[{url:'https://github.com/heroku/heroku-buildpack-apt.git'},{url:'https://github.com/heroku/heroku-buildpack-nodejs.git'}]};
  }else throw new Error('This command supports Koyeb and Heroku. On Render use .update start or .update beta.');
  if(!key)throw new Error(`Set the ${host} update API credential in your host environment first.`);
  let response;
  try{response=await fetchImpl(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json',Accept:host==='Heroku'?'application/vnd.heroku+json; version=3':'application/json'},body:JSON.stringify(payload)});}catch{throw new Error(`${host} did not confirm a new build. Check your dashboard before retrying.`);}
  if(!response.ok)throw new Error(`${host} rejected the rebuild (HTTP ${response.status}). Check your update credential and service access.`);
  return host;
}
module.exports={redeployCloud};
