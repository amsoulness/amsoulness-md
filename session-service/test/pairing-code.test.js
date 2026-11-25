const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { requestConfirmedCode } = require('../pairing-code');
async function setup(query) {
 const wa = await import('baileys');
 const socket = { authState: { creds: wa.initAuthCreds() }, ev: new EventEmitter(), generateMessageTag: () => 'test', query };
 return { wa, socket, browser: wa.Browsers.windows('Chrome') };
}
test('code waits for acknowledgement and sends binary nonce', async () => {
 let resolve, stanza;
 const { wa, socket, browser } = await setup(node => { stanza=node; return new Promise(r => {resolve=r}); });
 let finished=false;
 const pending=requestConfirmedCode(socket,'12025550123',wa,browser).then(c=>{finished=true;return c});
 while(!resolve) await new Promise(r=>setImmediate(r));
 assert.equal(finished,false);
 const fields=stanza.content[0].content;
 assert.deepEqual(fields.find(n=>n.tag==='link_code_pairing_nonce').content,Buffer.from([0]));
 resolve({tag:'iq',attrs:{type:'result'},content:[{tag:'link_code_companion_reg',attrs:{},content:[{tag:'link_code_pairing_ref',attrs:{},content:Buffer.from('confirmed')}]}]});
 assert.match(await pending,/^[A-Z0-9]{8}$/);
});
test('empty server acceptance never exposes a code', async()=>{
 const {wa,socket,browser}=await setup(async()=>({tag:'iq',attrs:{type:'result'},content:[]}));
 await assert.rejects(requestConfirmedCode(socket,'12025550123',wa,browser),/did not accept/);
});
test('server rejection is propagated',async()=>{
 const {wa,socket,browser}=await setup(async()=>{throw new Error('rate-overlimit')});
 await assert.rejects(requestConfirmedCode(socket,'12025550123',wa,browser),/rate-overlimit/);
});
