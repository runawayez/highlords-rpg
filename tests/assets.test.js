const test=require('node:test');const assert=require('node:assert/strict');const {server}=require('../server');
test('imagens são restritas à campanha',async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const host='http://127.0.0.1:'+server.address().port;
 const post=async(p,b)=>{const r=await fetch(host+p,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});return {status:r.status,data:await r.json()}};
 try{
  const a=await post('/api/rooms',{name:'Mestre A'}),b=await post('/api/rooms',{name:'Mestre B'});
  const code=a.data.room.code,key=a.data.key;
  const png=Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082','hex');
  const upload=await post('/api/rooms/'+code+'/upload',{key,data:'data:image/png;base64,'+png.toString('base64')});
  assert.equal(upload.status,200);
  const scene=await (await fetch(host+'/api/rooms/'+code+'?key='+key)).json();
  const asset=scene.room.scene.background;
  assert.ok(asset.startsWith('/uploads/'));
  assert.equal((await fetch(host+asset)).status,400);
  assert.equal((await fetch(host+asset+'?room='+code+'&key=invalid')).status,403);
  assert.equal((await fetch(host+asset+'?room='+b.data.room.code+'&key='+b.data.key)).status,404);
  const allowed=await fetch(host+asset+'?room='+code+'&key='+key);
  assert.equal(allowed.status,200);
  assert.equal(allowed.headers.get('cache-control'),'private, no-store');
 }finally{await new Promise(resolve=>server.close(resolve))}
});