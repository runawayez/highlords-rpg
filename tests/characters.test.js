const test=require('node:test');const assert=require('node:assert/strict');const {server}=require('../server');
test('vínculo de ficha sem login e reconhecimento por identidade local',async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const host='http://127.0.0.1:'+server.address().port;
 const post=async(url,data)=>{const response=await fetch(host+url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});return {status:response.status,data:await response.json()}};
 try{
 const created=await post('/api/rooms',{name:'Mestre'}),code=created.data.room.code,master=created.data.key;
 const secret='a'.repeat(64),other='b'.repeat(64);
 const join=await post('/api/rooms/'+code+'/join',{name:'Pessoa',identity:secret});const p=join.data.key,pid=join.data.room.self.id;
 const joinOther=await post('/api/rooms/'+code+'/join',{name:'Pessoa',identity:other}),q=joinOther.data.key;
 const act=(key,type,payload)=>post('/api/rooms/'+code+'/action',{key,type,payload});
 const read=async key=>(await (await fetch(host+'/api/rooms/'+code+'?key='+key)).json()).room;
 assert.equal((await act(master,'character:add',{name:'Lyra'})).status,200);
 const character=(await read(master)).characters[0];
 assert.equal((await act(p,'character:assign',{id:character.id,playerId:pid})).status,403);
 assert.equal((await act(master,'character:assign',{id:character.id,playerId:pid})).status,200);
 assert.equal((await act(q,'character:update',{id:character.id,fields:{PV:'99'}})).status,403);
 assert.equal((await act(p,'character:update',{id:character.id,fields:{PV:'25',Classe:'Maga'}})).status,200);
 assert.equal((await read(q)).characters[0].canEdit,false);
 assert.equal((await read(p)).characters[0].canEdit,true);
 const reconnect=await post('/api/rooms/'+code+'/join',{name:'Pessoa',identity:secret});
 assert.equal(reconnect.data.room.self.id,pid);
 assert.equal(reconnect.data.room.characters[0].canEdit,true);
 assert.equal((await read(master)).players.length,3);
 assert.equal((await read(master)).characters[0].fields.PV,'25');
 assert.equal((await act(master,'character:assign',{id:character.id,playerId:null})).status,200);
 assert.equal((await read(reconnect.data.key)).characters[0].canEdit,false);
 }finally{await new Promise(resolve=>server.close(resolve))}
});