const test=require('node:test');const assert=require('node:assert/strict');const {server}=require('../server');
test('cenas, névoa e visibilidade de tokens',async()=>{
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const post=async(path,payload)=>{const r=await fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});return {status:r.status,data:await r.json()}};
const get=async(path)=>(await (await fetch(origin+path)).json());
try{
const created=await post('/api/rooms',{title:'Mesa de teste',name:'GM'}),code=created.data.room.code,gm=created.data.key;
const joined=await post('/api/rooms/'+code+'/join',{name:'Player'}),player=joined.data.key;
const act=(key,type,payload)=>post('/api/rooms/'+code+'/action',{key,type,payload});
const state=async key=>(await get('/api/rooms/'+code+'?key='+key)).room;
assert.equal((await act(gm,'token:add',{name:'Monstro',x:100,y:100})).status,200);
assert.equal((await act(gm,'fog',{enabled:true})).status,200);
assert.equal((await state(player)).tokens.length,0);
assert.equal((await act(player,'fog:reveal',{x:0,y:0,width:200,height:200})).status,403);
assert.equal((await act(gm,'fog:reveal',{x:0,y:0,width:200,height:200})).status,200);
assert.equal((await state(player)).tokens.length,1);
assert.equal((await act(gm,'scene:add',{title:'Caverna'})).status,200);
assert.equal((await state(player)).tokens.length,0);
const newId=(await state(gm)).activeSceneId;
assert.equal((await act(gm,'token:add',{name:'Rato',x:50,y:50})).status,200);
const original=(await state(gm)).scenes.find(s=>s.id!==newId).id;
assert.equal((await act(gm,'scene:switch',{id:original})).status,200);
assert.equal((await state(gm)).tokens[0].name,'Monstro');
assert.equal((await state(player)).tokens.length,1);
assert.equal((await act(player,'scene:switch',{id:newId})).status,403);
assert.equal((await act(gm,'scene:switch',{id:newId})).status,200);
assert.equal((await state(gm)).tokens[0].name,'Rato');
assert.equal((await act(gm,'scene:delete',{id:original})).status,200);
assert.equal((await state(gm)).scenes.length,1);
assert.equal((await act(gm,'scene:delete',{id:newId})).status,400);
}finally{await new Promise(resolve=>server.close(resolve))}
});
