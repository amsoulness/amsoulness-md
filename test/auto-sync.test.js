const {test}=require('node:test');const assert=require('node:assert/strict');
const {mergeJSON,eligible,branded}=require('../scripts/sync-upstream.cjs');
test('automatic sync retains custom identity and combines nonoverlapping upstream settings',()=>{assert.deepEqual(mergeJSON({name:'original',v:1},{name:'Amsoulness',v:1},{name:'original',v:2}),{name:'Amsoulness',v:2});});
test('conflicting custom settings stop automatic sync',()=>{assert.throws(()=>mergeJSON({v:1},{v:2},{v:3}),/Manual review/);});
test('upstream deletions preserve custom keys and delete unchanged keys',()=>{assert.deepEqual(mergeJSON({a:1,b:2},{a:1,b:3,c:4},{}),{b:3,c:4});});
test('LICENSE, notices, docs, automation and custom deployment code stay outside the sync scope',()=>{for(const name of ['LICENSE','NOTICE','readme.md','.github/workflows/upstream-sync.yml','session-service/server.js','plugins/LICENSE'])assert.equal(eligible(name),false,name);assert.equal(eligible('core/pipeline/dispatcher.js'),true);assert.equal(eligible('plugins/pdf.js'),true);});
test('new updater URLs and startup announcements use Amsoulness',()=>{assert.equal(branded('Raganork started! https://github.com/souravkl11/raganork-md.git'),'Amsoulness started! https://github.com/amsoulness/amsoulness-md.git');});
