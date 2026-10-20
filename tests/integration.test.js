const test=require('node:test');
const assert=require('node:assert/strict');
const {server}=require('../server');
let base, rooms=[];
async function request(url,method='GET',payload){
 const r=await fetch(base+url,{method,headers:{'content-type':'application/json'},body:payload?JSON.stringify(payload):undefined});
 return {status:r.status,data:await r.json()};
}
test('integração: autorização, isolamento e persistência de sala',async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 base='http://127.0.0.1:'+server.address().port;
 try{
  const created=await request('/api/rooms','POST',{title:'Campanha teste',name:'Narrador'});
  assert.equal(created.status,201);
  const code=created.data.room.code,master=created.data.key;
  assert.equal(created.data.room.self.gm,true);
  const joined=await request('/api/rooms/'+code+'/join','POST',{name:'Jogador'});
  assert.equal(joined.status,200);
  const player=joined.data.key;
  assert.equal(joined.data.room.self.gm,false);
  const note=await request('/api/rooms/'+code+'/action','POST',{key:master,type:'notes',payload:{text:'SEGREDO DO MESTRE'}});
  assert.equal(note.status,200);
  const playerView=await request('/api/rooms/'+code+'?key='+player);
  assert.equal(playerView.status,200);
  assert.equal(playerView.data.room.notes,undefined);
  assert.ok(!JSON.stringify(playerView.data.room).includes('SEGREDO DO MESTRE'));
  assert.equal(playerView.data.room.players.every(p=>!('key' in p)),true);
  const masterView=await request('/api/rooms/'+code+'?key='+master);
  assert.equal(masterView.data.room.notes,'SEGREDO DO MESTRE');
  const forbidden=await request('/api/rooms/'+code+'/action','POST',{key:player,type:'notes',payload:{text:'Invasão'}});
  assert.equal(forbidden.status,403);
  assert.equal((await request('/api/rooms/'+code+'?key=invalid')).status,403);
  assert.equal((await request('/api/rooms/'+code+'/action','POST',{key:player,type:'fog',payload:{enabled:true}})).status,403);
  assert.equal((await request('/api/rooms/'+code+'/action','POST',{key:master,type:'fog',payload:{enabled:true}})).status,200);
  assert.equal((await request('/api/rooms/'+code+'?key='+player)).data.room.scene.fog,true);
  const roll=await request('/api/rooms/'+code+'/action','POST',{key:master,type:'roll',payload:{expr:'1d20',secret:true}});
  assert.equal(roll.status,200);
  assert.equal((await request('/api/rooms/'+code+'?key='+player)).data.room.log.length,0);
  assert.equal((await request('/api/rooms/'+code+'?key='+master)).data.room.log.length,1);
 }finally{await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()))}
});
