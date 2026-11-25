const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function load(axios){const module={exports:{}};vm.runInNewContext(fs.readFileSync('core/services/render-api.js','utf8'),{require:()=>axios,module,encodeURIComponent});return module.exports;}
test('Render deploy is requested directly with cache clear and a timeout',async()=>{let calls=0;const deploy=load({post:async(url,body,options)=>{calls++;assert.match(url,/services\/srv-test\/deploys$/);assert.equal(body.clearCache,'clear');assert.equal(options.timeout,30000);return {data:{id:'dep-test',status:'created'}}}});assert.equal((await deploy('srv-test','test-key')).id,'dep-test');assert.equal(calls,1);});
test('Render failure is propagated without leaking credentials',async()=>{const deploy=load({post:async()=>{throw {response:{status:401},message:'test-secret'}}});await assert.rejects(deploy('srv-test','test-secret'),e=>e.message.includes('401')&&!e.message.includes('test-secret'));});
test('empty Render response never reports deployment success',async()=>{const deploy=load({post:async()=>({data:{}})});await assert.rejects(deploy('srv-test','test-key'),/did not confirm/);});
