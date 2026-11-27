const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {createCloudDeployer}=require('../cloud-deployer');
const {encodeSession}=require('../../core/session-token');
const {redeployCloud}=require('../../core/services/cloud-api');
const session=encodeSession({'creds.json':JSON.stringify({me:{id:'1234567890@s.whatsapp.net'}})});
async function fixture(t,host,extra={}){
 const calls=[];
 const deployer=createCloudDeployer({sleep:async()=>{},attempts:2,fetchImpl:async(url,options)=>{
  const path=new URL(url).pathname;const body=options.body?JSON.parse(options.body):undefined;calls.push({path,method:options.method,body,key:options.headers.Authorization});let data={};
  if(path==='/account')data={id:'account-one'};
  else if(options.method==='POST'&&path==='/apps')data=host==='heroku'?{id:'app-one',name:'aslns-demo',web_url:'https://example.herokuapp.com'}:{app:{id:'app-one'}};
  else if(path.endsWith('/builds')&&options.method==='POST')data={id:'build-one'};
  else if(path.endsWith('/builds/build-one'))data={status:'succeeded'};
  else if(path.endsWith('/dynos'))data=[{type:'web',state:'up'}];
  else if(path==='/v1/apps'&&options.method==='POST')data={app:{id:'app-one'}};
  else if(path==='/v1/services'&&options.method==='POST')data={service:{id:'service-one'}};
  else if(path==='/v1/services/service-one')data={service:{status:'HEALTHY'}};
  return {ok:true,status:200,json:async()=>data};
 }});
 const server=http.createServer(async(req,res)=>{const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data))};if(!await deployer.handle(req,res,send))send(404,{});});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(()=>{deployer.close();server.closeAllConnections();server.close()});
 const url=`http://127.0.0.1:${server.address().port}/api/cloud/${host}`;
 const body={apiKey:'deploy-credential-123456789',updateApiKey:'update-credential-123456789',session,databaseUrl:'postgresql://user:secret@db.example/bot',sudo:'919876543210',name:'aslns-demo',region:host==='heroku'?'us':'fra',confirm:true,configureUpdates:true,paidConfirmed:true,...extra};
 return {calls,body,url};
}
for(const host of ['heroku','koyeb'])test(`${host} provisions with only the update key stored privately`,async t=>{
 const {calls,body,url}=await fixture(t,host);const response=await fetch(url,{method:'POST',body:JSON.stringify(body)});assert.equal(response.status,202);const start=await response.json();let status;
 for(let i=0;i<20;i++){status=await(await fetch(url,{headers:{Authorization:`Bearer ${start.id}`}})).json();if(['complete','error'].includes(status.phase))break;await new Promise(r=>setTimeout(r,5));}
 assert.equal(status.phase,'complete',status.error);const publicText=JSON.stringify(status);for(const secret of [body.apiKey,body.updateApiKey,body.session,body.databaseUrl])assert.ok(!publicText.includes(secret));
 const mutations=calls.filter(x=>x.body);assert.ok(!JSON.stringify(mutations.map(x=>x.body)).includes(body.apiKey));
 if(host==='heroku'){const config=calls.find(x=>x.path.endsWith('/config-vars')).body;assert.equal(config.HEROKU_API_KEY,body.updateApiKey);assert.equal(config.SESSION,session);assert.deepEqual(calls.find(x=>x.path.endsWith('/formation/web')).body,{quantity:1,dyno_size:{name:'Basic'}});}
 else{const definition=calls.find(x=>x.path==='/v1/services').body.definition;assert.deepEqual(definition.instance_types,[{type:'free'}]);assert.equal(definition.env.find(x=>x.key==='KOYEB_API_KEY').secret,'aslns-demo-koyeb-api-key');assert.equal(calls.find(x=>x.body?.name==='aslns-demo-koyeb-api-key').body.value,body.updateApiKey);}
});
test('paid Heroku confirmation and separate keys are required before any API call',async t=>{
 const {calls,body,url}=await fixture(t,'heroku',{paidConfirmed:false});assert.equal((await fetch(url,{method:'POST',body:JSON.stringify(body)})).status,400);assert.equal(calls.length,0);
 body.paidConfirmed=true;body.updateApiKey=body.apiKey;assert.equal((await fetch(url,{method:'POST',body:JSON.stringify(body)})).status,400);assert.equal(calls.length,0);
});
test('host rebuild requests use their configured keys and never leak provider error bodies',async()=>{
 for(const env of [{KOYEB_SERVICE_ID:'service-one',KOYEB_API_KEY:'private-koyeb'},{HEROKU_APP_NAME:'aslns-demo',HEROKU_API_KEY:'private-heroku'}]){
 let call;const host=await redeployCloud(env,async(url,options)=>{call={url,options};return{ok:true}});assert.ok(['Koyeb','Heroku'].includes(host));assert.ok(call.options.headers.Authorization.startsWith('Bearer private-'));assert.ok(!call.options.body.includes('private-'));
 await assert.rejects(()=>redeployCloud(env,async()=>({ok:false,status:403,json:async()=>({error:'private-secret'})})),e=>!e.message.includes('private-secret'));
 }
});
