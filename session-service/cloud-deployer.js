const { randomBytes } = require('node:crypto');
const { decodeSession } = require('../core/session-token');
const SOURCE = 'https://codeload.github.com/amsoulness/amsoulness-md/tar.gz/refs/heads/main';
const BUILDPACKS = [{ url: 'https://github.com/heroku/heroku-buildpack-apt.git' }, { url: 'https://github.com/heroku/heroku-buildpack-nodejs.git' }];
function createCloudDeployer({ fetchImpl = fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), attempts = 240, clock = Date.now } = {}) {
  const jobs = new Map(), limits = new Map();
  const wipe = r => { r.key = null; r.updateKey = null; r.data = null; };
  const remove = id => { const r = jobs.get(id); if (r) { r.abort.abort(); wipe(r); jobs.delete(id); } };
  const sweep = setInterval(() => { for (const [id,r] of jobs) if (r.expiresAt < clock()) remove(id); for (const [id,r] of limits) if (r.until < clock()) limits.delete(id); }, 10000); sweep.unref();
  const safe = r => ({ phase:r.phase, error:r.error, steps:r.steps, dashboardUrl:r.dashboardUrl, serviceUrl:r.serviceUrl, expiresAt:r.expiresAt });
  const step = (r, phase, message) => { r.phase=phase; r.steps.push({message}); };
  async function api(r, path, method='GET', data, token=r.key) {
    let response;
    try { response = await fetchImpl((r.host==='heroku'?'https://api.heroku.com':'https://app.koyeb.com/v1')+path, {method, redirect:'error', signal:AbortSignal.any([r.abort.signal,AbortSignal.timeout(20000)]), headers:{Authorization:`Bearer ${token}`,Accept:r.host==='heroku'?'application/vnd.heroku+json; version=3':'application/json','Content-Type':'application/json'}, ...(data===undefined?{}:{body:JSON.stringify(data)})}); }
    catch { throw new Error('Provider did not respond. Check your dashboard before retrying.'); }
    if (!response.ok) throw new Error(`Host rejected the request (HTTP ${response.status}). Check credentials, billing, name availability and account limits. No alternative plan was selected.`);
    if(response.status===204)return {};
    try{return await response.json();}catch{throw new Error('Host returned an unreadable response. Check your dashboard before retrying.');}
  }
  async function launch(r) {
    try {
      const d=r.data;
      const env={SESSION:d.session,DATABASE_URL:d.databaseUrl,SUDO:d.sudo,BOT_NAME:'Amsoulness',AUTO_UPDATE:'false',USE_SERVER:'true'};
      step(r,'creating','Creating your app');
      if(r.host==='heroku') {
        const app=await api(r,'/apps','POST',{name:d.name,region:d.region,stack:'heroku-24'});
        if(!app.id) throw new Error('Host did not return an app identifier. Check your dashboard.');
        const base='/apps/'+encodeURIComponent(app.id);
        r.dashboardUrl='https://dashboard.heroku.com/apps/'+encodeURIComponent(app.name||d.name);
        r.serviceUrl=app.web_url;
        await api(r,base,'GET',undefined,r.updateKey);
        step(r,'configuring','Saving your session and update credential privately on Heroku');
        await api(r,base+'/config-vars','PATCH',{...env,HEROKU_APP_NAME:app.name||d.name,HEROKU_API_KEY:r.updateKey});
        step(r,'building','Building Amsoulness with Node.js and media tools');
        const build=await api(r,base+'/builds','POST',{source_blob:{url:SOURCE},buildpacks:BUILDPACKS});
        if(!build.id) throw new Error('Build was not confirmed. Inspect your app before retrying.');
        let built=false;
        for(let i=0;i<attempts;i++) { const state=await api(r,base+'/builds/'+encodeURIComponent(build.id)); if(state.status==='succeeded'){built=true;break;} if(state.status==='failed') throw new Error('Build failed. Open your host dashboard for build logs.'); await sleep(5000); }
        if(!built) throw new Error('Build is still pending. Follow it in your host dashboard.');
        step(r,'starting','Starting one paid Basic web dyno, as approved');
        await api(r,base+'/formation/web','PATCH',{quantity:1,dyno_size:{name:'Basic'}});
        let up=false;
        for(let i=0;i<36;i++) { const dynos=await api(r,base+'/dynos'); if(dynos.some(x=>x.type==='web'&&x.state==='up')){up=true;break;} if(dynos.some(x=>x.type==='web'&&x.state==='crashed')) throw new Error('The dyno crashed. Check runtime logs in Heroku.'); await sleep(5000); }
        if(!up) throw new Error('Dyno startup is not confirmed yet. Check your dashboard.');
      } else {
        const result=await api(r,'/apps','POST',{name:d.name}); const app=result.app;
        if(!app?.id) throw new Error('Host did not return an app identifier. Check your dashboard.');
        r.dashboardUrl='https://app.koyeb.com/apps/'+encodeURIComponent(app.id);
        await api(r,'/apps/'+encodeURIComponent(app.id),'GET',undefined,r.updateKey);
        step(r,'configuring','Saving your session, database and update credential as Koyeb secrets');
        const vars=[];
        for(const [key,value] of Object.entries({...env,KOYEB_API_KEY:r.updateKey,PORT:'3000'})) {
          if(['SESSION','DATABASE_URL','KOYEB_API_KEY'].includes(key)) { const name=d.name+'-'+key.toLowerCase().replaceAll('_','-'); await api(r,'/secrets','POST',{name,type:'SIMPLE',value}); vars.push({key,secret:name}); }
          else vars.push({key,value});
        }
        step(r,'building','Building your Docker service on the Free instance');
        const created=await api(r,'/services','POST',{app_id:app.id,name:d.name,definition:{name:d.name,type:'WEB',regions:[d.region],instance_types:[{type:'free'}],git:{repository:'github.com/amsoulness/amsoulness-md',branch:'main',docker:{dockerfile:'Dockerfile'}},env:vars,ports:[{port:3000,protocol:'http'}],routes:[{port:3000,path:'/'}]}});
        if(!created.service?.id) throw new Error('Service creation was not confirmed. Check the Koyeb dashboard.');
        let healthy=false;
        for(let i=0;i<attempts;i++) { const state=await api(r,'/services/'+encodeURIComponent(created.service.id)); const status=state.service?.status; if(status==='HEALTHY'){healthy=true;break;} if(['ERROR','UNHEALTHY'].includes(status)) throw new Error('Koyeb reports an unhealthy service. Inspect build and runtime logs.'); await sleep(5000); }
        if(!healthy) throw new Error('Service is still starting. Follow deployment in your dashboard.');
      }
      step(r,'complete','Host reports your bot running. Send .ping to confirm WhatsApp is connected. Use .redeploy for future host builds.');
    } catch(error) { step(r,'error','Deployment needs attention'); r.error=error.message; }
    finally { wipe(r); }
  }
  async function handle(req,res,send) {
    const match=/^\/api\/cloud\/(koyeb|heroku)(?:\?.*)?$/.exec(req.url||''); if(!match)return false;
    try {
      if(req.method==='POST') {
        const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0].trim(); let limit=limits.get(ip); if(!limit||limit.until<clock()){if(limits.size>10000)throw new Error('Deployer busy.');limits.set(ip,limit={count:0,until:clock()+600000});} if(++limit.count>5){send(429,{error:'Try again in ten minutes.'});return true;}
        if(jobs.size>=20){send(503,{error:'Deployer busy. Try again shortly.'});return true;}
        let raw=''; for await(const chunk of req){raw+=chunk;if(raw.length>150000){send(413,{error:'Request too large.'});return true;}}
        const d=JSON.parse(raw||'{}'); const host=match[1];
        if(d.confirm!==true||d.configureUpdates!==true)throw new Error('Approve resource creation and private update-key storage first.');
        if(host==='heroku'&&d.paidConfirmed!==true)throw new Error('Approve the paid Heroku Basic dyno before deploying.');
        if(!/^[a-z][a-z0-9-]{2,27}$/.test(d.name||''))throw new Error('Use a 3–28 character lowercase app name.');
        if(!(host==='heroku'?['us','eu']:['fra','was']).includes(d.region))throw new Error('Choose a supported region.');
        for(const key of ['apiKey','updateApiKey'])if(typeof d[key]!=='string'||d[key].length<20||d[key].length>2048||/\s/.test(d[key]))throw new Error('Enter two valid, separate host credentials.');
        if(d.apiKey===d.updateApiKey)throw new Error('Create a different credential for bot updates.');
        try { decodeSession(d.session); } catch { throw new Error('Enter a valid Amsoulness session.'); }
        let db;try{db=new URL(d.databaseUrl);}catch{throw new Error('Enter your PostgreSQL connection URL.');}if(!['postgres:','postgresql:'].includes(db.protocol))throw new Error('A PostgreSQL database is required.');
        if(!/^[1-9]\d{6,14}$/.test(d.sudo||''))throw new Error('Enter your owner number with country code.');
        const r={host,key:d.apiKey,updateKey:d.updateApiKey,data:{name:d.name,session:d.session,databaseUrl:d.databaseUrl,sudo:d.sudo,region:d.region},phase:'validating',steps:[],abort:new AbortController(),expiresAt:clock()+30*60000};
        try {
          if(host==='heroku'){const a=await api(r,'/account');const b=await api(r,'/account','GET',undefined,r.updateKey);if(!a.id||a.id!==b.id)throw new Error('Both credentials must belong to the same Heroku account.');}
          else {await api(r,'/apps?limit=1');await api(r,'/apps?limit=1','GET',undefined,r.updateKey);}
        }catch(e){wipe(r);throw e;}
        if(jobs.size>=20){wipe(r);throw new Error('Deployer busy.');}
        const id=randomBytes(32).toString('base64url');jobs.set(id,r);void launch(r);send(202,{id,...safe(r)});return true;
      }
      const id=String(req.headers.authorization||'').replace(/^Bearer /,'');const r=jobs.get(id);
      if(!r||r.host!==match[1]||r.expiresAt<clock()){send(410,{error:'Deployment connection expired. Check your host dashboard before retrying.'});return true;}
      if(req.method==='GET'){send(200,safe(r));return true;}
      if(req.method==='DELETE'){remove(id);send(200,{ok:true});return true;}
      send(405,{error:'Method not allowed.'});return true;
    }catch(error){send(400,{error:error instanceof SyntaxError?'Invalid request.':error.message});return true;}
  }
  return {handle,close(){clearInterval(sweep);for(const id of jobs.keys())remove(id);limits.clear();}};
}
module.exports={createCloudDeployer,SOURCE,BUILDPACKS};
