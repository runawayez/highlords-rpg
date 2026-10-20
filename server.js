'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {URL}=require('node:url');
const HOST=process.env.HOST||'127.0.0.1', PORT=+(process.env.PORT||3000);
const ROOT=path.join(__dirname,'data'), ROOMS=path.join(ROOT,'rooms'), UPLOADS=path.join(ROOT,'uploads');
fs.mkdirSync(ROOMS,{recursive:true});fs.mkdirSync(UPLOADS,{recursive:true});
const clients=new Map(), memory=new Map(), id=n=>crypto.randomBytes(n).toString('hex');
const err=(s,m)=>Object.assign(new Error(m),{status:s});
const clean=(v,n=150)=>String(v??'').trim().slice(0,n);
const file=code=>path.join(ROOMS,code+'.json');
function get(code){if(!/^[A-F0-9]{6}$/.test(code))throw err(400,'Código inválido');if(memory.has(code))return memory.get(code);if(!fs.existsSync(file(code)))throw err(404,'Sala não encontrada');const r=JSON.parse(fs.readFileSync(file(code)));memory.set(code,r);return r;}
function save(r){r.updated=Date.now();const temp=file(r.code)+'.tmp';fs.writeFileSync(temp,JSON.stringify(r));fs.renameSync(temp,file(r.code));}
function session(r,key){const p=r.players.find(p=>p.key===key);if(!p)throw err(403,'Sessão inválida');return p;}
function identityHash(secret){if(typeof secret!=='string'||!/^[a-f0-9]{64}$/.test(secret))throw err(400,'Identidade local inválida');return crypto.createHash('sha256').update(secret).digest('hex');}
function ensureCharacters(r){r.characters??=[];}
function view(r,p){ensureScenes(r);ensureCharacters(r);const {notes,scenes,characters,...publicRoom}=r;return {...publicRoom,characters:characters.map(c=>({...c,ownerHash:undefined,ownerName:c.ownerHash?(r.players.find(x=>x.identityHash===c.ownerHash)?.name||'Jogador vinculado'):null,canEdit:p.gm||!!(p.identityHash&&c.ownerHash===p.identityHash)})),scenes:scenes.map(s=>({id:s.id,title:s.scene.title})),tokens:(!p.gm&&r.scene.fog)?r.tokens.filter(t=>(r.scene.reveals||[]).some(a=>t.x+30>=a.x&&t.x+30<=a.x+a.width&&t.y+30>=a.y&&t.y+30<=a.y+a.height)):r.tokens,notes:p.gm?notes:undefined,self:{id:p.id,name:p.name,gm:p.gm},players:r.players.map(({key,identityHash,...person})=>person),log:r.log.filter(x=>!x.secret||p.gm)};}
function sync(r){for(const sub of clients.get(r.code)||[]){try{sub.res.write('event: state\ndata: '+JSON.stringify(view(r,sub.p))+'\n\n');}catch{}}}
function master(p){if(!p.gm)throw err(403,'Ação exclusiva do mestre');}
async function body(req,limit=5600000){let size=0,buf=[];for await(const part of req){size+=part.length;if(size>limit)throw err(413,'Arquivo grande demais');buf.push(part);}try{return JSON.parse(Buffer.concat(buf).toString())}catch{throw err(400,'JSON inválido')}}
function send(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));}
function number(v,defaultValue=0){v=Number(v);return Number.isFinite(v)?Math.max(-100000,Math.min(100000,v)):defaultValue}
function roll(expr){const m=/^(\d{1,2})d(4|6|8|10|12|20|100)([+-]\d{1,4})?$/i.exec(clean(expr,60).replace(/\s/g,''));if(!m||+m[1]>30||+m[1]<1)throw err(400,'Use 1d20, 2d6+3 etc. (até 30 dados)');const values=Array.from({length:+m[1]},()=>crypto.randomInt(1,+m[2]+1)),modifier=+(m[3]||0);return {expr:m[0],values,modifier,total:values.reduce((a,b)=>a+b,modifier)}}
function snapshot(r){return {scene:{...r.scene},tokens:r.tokens.map(t=>({...t})),drawings:(r.drawings||[]).map(d=>({...d}))};}
function ensureScenes(r){if(!Array.isArray(r.scenes)||!r.scenes.length){r.scenes=[{id:id(6),...snapshot(r)}];r.activeSceneId=r.scenes[0].id;}if(!r.activeSceneId)r.activeSceneId=r.scenes[0].id;}
function storeCurrent(r){ensureScenes(r);const item=r.scenes.find(s=>s.id===r.activeSceneId);if(item)Object.assign(item,snapshot(r));}
function activateScene(r,sceneId){const found=r.scenes.find(x=>x.id===sceneId);if(!found)throw err(404,'Cena não encontrada');r.activeSceneId=found.id;r.scene={...found.scene};r.tokens=found.tokens.map(t=>({...t}));r.drawings=(found.drawings||[]).map(d=>({...d}));}
function action(r,p,a){const q=a.payload||{};ensureScenes(r);ensureCharacters(r);switch(a.type){
case 'character:add':{master(p);if(r.characters.length>=50)throw err(400,'Limite de personagens');r.characters.push({id:id(8),name:clean(q.name,80)||'Personagem',fields:{},ownerHash:null});break;}
case 'character:assign':{master(p);const character=r.characters.find(c=>c.id===q.id);if(!character)throw err(404,'Ficha não encontrada');if(q.playerId===null){character.ownerHash=null;break;}const target=r.players.find(x=>x.id===q.playerId&&!x.gm);if(!target?.identityHash)throw err(400,'Jogador sem identidade local');character.ownerHash=target.identityHash;break;}
case 'character:update':{const character=r.characters.find(c=>c.id===q.id);if(!character)throw err(404,'Ficha não encontrada');if(!p.gm&&character.ownerHash!==p.identityHash)throw err(403,'Você não controla esta ficha');
if(!q.fields||typeof q.fields!=='object'||Array.isArray(q.fields))throw err(400,'Campos inválidos');
const entries=Object.entries(q.fields);if(entries.length>30)throw err(400,'Muitos campos');const next={};for(const [k,v] of entries){if(k.length>48||!k||typeof v!=='string'||v.length>300)throw err(400,'Campo inválido');next[k]=v;}character.fields=next;break;}
case 'chat': {const text=clean(q.text,1200);if(!text)throw err(400,'Mensagem vazia');r.log.push({type:'chat',name:p.name,text,at:Date.now()});break;}
case 'roll':r.log.push({type:'roll',name:p.name,...roll(q.expr),at:Date.now(),secret:!!q.secret&&p.gm});break;
case 'token:add':master(p);if(r.tokens.length>=150)throw err(400,'Limite de tokens');r.tokens.push({id:id(8),x:number(q.x,200),y:number(q.y,200),name:clean(q.name,30)||'Token',color:/^#[a-f0-9]{6}$/i.test(q.color)?q.color:'#dd8b60'});break;
case 'token:move': {const t=r.tokens.find(t=>t.id===q.id);if(!t)throw err(404,'Token não encontrado');if(!p.gm&&!r.settings.playersMove)throw err(403,'Movimento bloqueado');t.x=number(q.x);t.y=number(q.y);break;}
case 'token:remove':master(p);r.tokens=r.tokens.filter(t=>t.id!==q.id);break;
case 'token:move-many':{
 if(!p.gm&&!r.settings.playersMove)throw err(403,'Movimento bloqueado');
 if(!Array.isArray(q.moves)||q.moves.length<1||q.moves.length>150)throw err(400,'Movimentação inválida');
 const seen=new Set(),updates=[];
 for(const m of q.moves){if(typeof m.id!=='string'||seen.has(m.id))throw err(400,'Token duplicado');seen.add(m.id);
 const token=r.tokens.find(t=>t.id===m.id);if(!token)throw err(404,'Token não encontrado');
 if(!Number.isFinite(m.x)||!Number.isFinite(m.y))throw err(400,'Coordenadas inválidas');
 updates.push({token,x:number(m.x),y:number(m.y)});}
 for(const u of updates){u.token.x=u.x;u.token.y=u.y;}break;}
case 'drawing:add':{
 master(p);r.drawings??=[];if(r.drawings.length>=300)throw err(400,'Limite de desenhos');
 if(!Array.isArray(q.points)||q.points.length<2||q.points.length>300)throw err(400,'Traçado inválido');
 if(!q.points.every(pt=>Array.isArray(pt)&&pt.length===2&&pt.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=100000)))throw err(400,'Coordenadas inválidas');
 r.drawings.push({id:id(8),points:q.points,color:/^#[a-f0-9]{6}$/i.test(q.color)?q.color:'#eedb9b',width:Math.max(1,Math.min(16,number(q.width,4)))});break;}
case 'drawing:clear':master(p);r.drawings=[];break;
case 'scene':master(p);r.scene.title=clean(q.title,80);r.scene.grid=!!q.grid;r.scene.gridSize=Math.max(25,Math.min(150,number(q.gridSize,64)));r.settings.playersMove=!!q.playersMove;break;
case 'notes':master(p);r.notes=clean(q.text,12000);break;
case 'fog':master(p);r.scene.fog=!!q.enabled;break;
case 'fog:reveal':{master(p);if(!r.scene.fog)throw err(400,'Ative a névoa primeiro');r.scene.reveals??=[];if(r.scene.reveals.length>=250)throw err(400,'Limite de áreas reveladas');if(![q.x,q.y,q.width,q.height].every(n=>typeof n==='number'&&Number.isFinite(n)))throw err(400,'Coordenadas inválidas');if(q.width<5||q.height<5||q.width>1600||q.height>1200)throw err(400,'Área inválida');r.scene.reveals.push({x:Math.max(0,Math.min(1600,q.x)),y:Math.max(0,Math.min(1200,q.y)),width:q.width,height:q.height});break;}
case 'fog:reset':master(p);r.scene.reveals=[];break;
case 'scene:add':{master(p);storeCurrent(r);if(r.scenes.length>=30)throw err(400,'Limite de cenas');const newScene={id:id(6),scene:{title:clean(q.title,80)||'Nova cena',grid:true,gridSize:64,background:'',fog:false,reveals:[]},tokens:[],drawings:[]};r.scenes.push(newScene);activateScene(r,newScene.id);break;}
case 'scene:switch':master(p);storeCurrent(r);activateScene(r,q.id);break;
case 'scene:delete':{master(p);if(r.scenes.length<=1)throw err(400,'Uma cena é obrigatória');if(!r.scenes.some(s=>s.id===q.id))throw err(404,'Cena não encontrada');storeCurrent(r);r.scenes=r.scenes.filter(s=>s.id!==q.id);if(r.activeSceneId===q.id)activateScene(r,r.scenes[0].id);break;}
default:throw err(400,'Ação desconhecida');
}storeCurrent(r);r.log=r.log.slice(-250);save(r);sync(r);}
const server=http.createServer(async(req,res)=>{
try{const url=new URL(req.url,'http://localhost'),p=url.pathname,method=req.method;
if(method==='POST'&&p==='/api/rooms'){const b=await body(req,10000),code=id(3).toUpperCase(),key=id(24),r={code,title:clean(b.title,80)||'Campanha sem nome',scene:{title:'Primeira cena',grid:true,gridSize:64,background:'',fog:false,reveals:[]},settings:{playersMove:true},notes:'',tokens:[],drawings:[],characters:[],log:[],players:[{id:id(7),key,name:clean(b.name,40)||'Mestre',gm:true}]};memory.set(code,r);save(r);return send(res,201,{room:view(r,r.players[0]),key});}
const m=/^\/api\/rooms\/([A-F0-9]{6})(?:\/(join|action|events|upload))?$/.exec(p);
if(m){const r=get(m[1]),op=m[2]||'';
if(method==='POST'&&op==='join'){const b=await body(req,1000);const hash=identityHash(b.identity);const existing=r.players.find(p=>!p.gm&&p.identityHash===hash);if(existing){existing.key=id(24);existing.name=clean(b.name,40)||existing.name;save(r);sync(r);return send(res,200,{room:view(r,existing),key:existing.key});}if(r.players.length>=12)throw err(400,'Sala cheia');const person={id:id(7),key:id(24),identityHash:hash,name:clean(b.name,40)||'Jogador',gm:false};r.players.push(person);save(r);sync(r);return send(res,200,{room:view(r,person),key:person.key});}
if(method==='GET'&&op===''){const person=session(r,url.searchParams.get('key'));return send(res,200,{room:view(r,person)});}
if(method==='GET'&&op==='events'){const person=session(r,url.searchParams.get('key'));res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('event: state\ndata: '+JSON.stringify(view(r,person))+'\n\n');if(!clients.has(r.code))clients.set(r.code,new Set());const sub={res,p:person};clients.get(r.code).add(sub);const beat=setInterval(()=>res.write(': ping\n\n'),20000);req.on('close',()=>{clearInterval(beat);clients.get(r.code)?.delete(sub)});return;}
if(method==='POST'&&op==='action'){const b=await body(req,50000),person=session(r,b.key);action(r,person,b);return send(res,200,{ok:true});}
if(method==='POST'&&op==='upload'){const b=await body(req),person=session(r,b.key);master(person);const match=/^data:image\/(png|jpeg|webp);base64,([a-zA-Z0-9+/=]+)$/.exec(b.data||'');if(!match)throw err(400,'Imagem inválida');const buf=Buffer.from(match[2],'base64');if(buf.length>4000000)throw err(413,'Máximo 4MB');const png=buf.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),jpg=buf[0]===255&&buf[1]===216&&buf[2]===255,webp=buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP';if(!(png||jpg||webp))throw err(400,'Imagem inválida');const filename=id(12)+'.'+(png?'png':jpg?'jpg':'webp');fs.writeFileSync(path.join(UPLOADS,filename),buf);r.scene.background='/uploads/'+filename;storeCurrent(r);save(r);sync(r);return send(res,200,{ok:true});}
}
if(method==='GET'&&/^\/uploads\/[a-f0-9]{24}\.(png|jpg|webp)$/.test(p)){
 const roomCode=url.searchParams.get('room'),room=get(roomCode),person=session(room,url.searchParams.get('key'));
 const asset=path.basename(p),location='/uploads/'+asset;
 ensureScenes(room);
 const available=room.scenes.some(scene=>scene.scene.background===location);
 if(!available)throw err(404,'Imagem não pertence à campanha');
 const f=path.join(UPLOADS,asset);
 if(!fs.existsSync(f))throw err(404,'Imagem não encontrada');
 res.writeHead(200,{'Content-Type':f.endsWith('.png')?'image/png':f.endsWith('.jpg')?'image/jpeg':'image/webp','X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'});
 return fs.createReadStream(f).pipe(res);
}
if(method==='GET'&&(p==='/'||p==='/index.html')){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});return fs.createReadStream(path.join(__dirname,'public','index.html')).pipe(res);}
throw err(404,'Rota não encontrada');
}catch(e){if(!res.headersSent)send(res,e.status||500,{error:e.status?e.message:'Erro interno'});else res.end();}
});
if(require.main===module)server.listen(PORT,HOST,()=>console.log('Highlords RPG em http://'+HOST+':'+PORT));
module.exports={server,roll};
