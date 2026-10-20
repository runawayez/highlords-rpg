const test=require('node:test');const assert=require('node:assert/strict');const {server}=require('../server');
test('editor: operações de grupo, desenhos e permissões',async()=>{
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const call=async(url,payload)=>{const response=await fetch(base+url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});return {status:response.status,body:await response.json()}};
try{
const created=await call('/api/rooms',{name:'Mestre'});assert.equal(created.status,201);
const code=created.body.room.code,gm=created.body.key;
const joined=await call('/api/rooms/'+code+'/join',{name:'Jogador'});const player=joined.body.key;
const act=(key,type,payload)=>call('/api/rooms/'+code+'/action',{key,type,payload});
assert.equal((await act(gm,'token:add',{name:'Hero',x:1,y:2})).status,200);
const state=async key=>(await (await fetch(base+'/api/rooms/'+code+'?key='+key)).json()).room;
const id=(await state(gm)).tokens[0].id;
assert.equal((await act(player,'token:move-many',{moves:[{id,x:20,y:30}]})).status,200);
assert.equal((await state(gm)).tokens[0].x,20);
assert.equal((await act(gm,'token:move-many',{moves:[{id,x:40,y:40},{id:'invalid',x:0,y:0}]})).status,404);
assert.equal((await state(gm)).tokens[0].x,20);
assert.equal((await act(player,'drawing:add',{points:[[0,0],[1,1]]})).status,403);
assert.equal((await act(gm,'drawing:add',{points:[[0,0],[1,1]]})).status,200);
assert.equal((await state(player)).drawings.length,1);
assert.equal((await act(gm,'drawing:clear',{})).status,200);
assert.equal((await state(player)).drawings.length,0);
}finally{await new Promise(resolve=>server.close(resolve))}
});