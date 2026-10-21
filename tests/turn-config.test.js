const {test}=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/turn.js');
function call(method='GET',headers={}){
 return new Promise(resolve=>{
  const res={code:200,headers:{},setHeader(k,v){this.headers[k]=v},status(code){this.code=code;return this},json(body){resolve({code:this.code,body,headers:this.headers});return this}};
  Promise.resolve(handler({method,headers},res)).catch(reject=>resolve({code:500,error:reject.message}));
 });
}
test('TURN disabled by default, no server secret leakage',async()=>{
 const prev=process.env.TURN_ENABLED;
 try{delete process.env.TURN_ENABLED;
  const r=await call();
  assert.equal(r.code,503);assert.deepEqual(r.body,{error:'turn_not_configured'});
  assert.match(r.headers['Cache-Control'],/no-store/);
 }finally{if(prev!==undefined)process.env.TURN_ENABLED=prev}
});
test('TURN endpoint only accepts GET',async()=>{
 const r=await call('POST');assert.equal(r.code,405);assert.equal(r.headers.Allow,'GET');
});
test('TURN rejects foreign origin before contacting provider',async()=>{
 const prev={enabled:process.env.TURN_ENABLED,id:process.env.TURN_KEY_ID,token:process.env.TURN_KEY_API_TOKEN};
 try{process.env.TURN_ENABLED='true';process.env.TURN_KEY_ID='test';process.env.TURN_KEY_API_TOKEN='not-real';
 const r=await call('GET',{origin:'https://attacker.example',host:'highlords-rpg.vercel.app','x-forwarded-proto':'https'});
 assert.equal(r.code,403);
 }finally{for(const [key,value] of Object.entries({TURN_ENABLED:prev.enabled,TURN_KEY_ID:prev.id,TURN_KEY_API_TOKEN:prev.token}))value===undefined?delete process.env[key]:process.env[key]=value}
});
