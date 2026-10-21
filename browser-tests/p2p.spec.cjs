// Browser smoke tests for the published P2P frontend (no external signaling required).
const {test,expect}=require('@playwright/test');
test.setTimeout(45000);
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
let server;
test.beforeAll(async()=>{server=http.createServer((req,res)=>{const file=path.join(process.cwd(),'p2p',req.url.startsWith('/assets/')?req.url.slice(1):'index.html');if(!file.startsWith(path.join(process.cwd(),'p2p'))){res.writeHead(403);return res.end()}fs.readFile(file,(err,data)=>{res.setHeader('Content-Type',file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(err?'missing':data)})}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r))});
test.afterAll(async()=>{await new Promise(r=>server.close(r))});
const url=()=>`http://127.0.0.1:${server.address().port}/`;
async function mockPeer(page){await page.route('https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:`
class Peer {
 constructor(id){this.id=id||'mock-guest';this.destroyed=false;this.disconnected=false;this.open=true;this.handlers={};setTimeout(()=>this.emit('open',this.id),10)}
 on(event,cb){(this.handlers[event]||=[]).push(cb)}
 emit(event,...args){for(const cb of this.handlers[event]||[])cb(...args)}
 connect(){const c={open:true,peer:'hl-mock-room',handlers:{},on(event,cb){(this.handlers[event]||=[]).push(cb)},send(m){if(m.kind==='hello')setTimeout(()=>{for(const cb of this.handlers.data||[])cb({kind:'challenge',nonce:'12345678-1234-1234-1234-123456789abc'})},15);if(m.kind==='proof')setTimeout(()=>{for(const cb of this.handlers.data||[])cb({kind:'state',revision:1,state:{schema:1,title:'Teste',updated:Date.now(),activeSceneId:'scene-1',scenes:[{id:'scene-1',title:'Cena teste'}],map:'',tokens:[],drawings:[],fog:{enabled:false,reveals:[]},characters:[],chat:[]}})},15)},close(){this.open=false;for(const cb of this.handlers.close||[])cb()}};setTimeout(()=>{for(const cb of c.handlers.open||[])cb()},10);return c}
 reconnect(){this.disconnected=false;this.emit('open',this.id)}
 destroy(){this.destroyed=true;this.open=false;this.emit('close')}
}
window.Peer=Peer;`}))}
test('home mostra compromisso de gratuidade e identidade',async({page})=>{await mockPeer(page);await page.goto(url());await expect(page.getByText('Highlords RPG é e sempre será gratuito.')).toBeVisible();await expect(page.locator('#host')).toBeVisible();await expect(page.locator('#join')).toBeVisible();await expect(page.locator('.version-tag').first()).toContainText(/BETA EM DESENVOLVIMENTO.*v0\.3\.0/)});
test('mestre cria mesa, cena, ficha, token e exporta',async({page})=>{await mockPeer(page);await page.goto(url());await page.locator('#host').click();await expect(page.locator('#game')).toBeVisible();await page.locator('#tokenName').fill('Goblin');await page.locator('#addToken').click();await expect(page.locator('.piece').getByText('Goblin')).toBeVisible();await page.locator('#charName').fill('Thorin');await page.locator('#addChar').click();await expect(page.locator('.char strong').getByText('Thorin')).toBeVisible();page.once('dialog',d=>d.accept('Masmorra'));await page.locator('#newScene').click();await expect(page.locator('#sceneSelect option')).toHaveCount(2);const download=page.waitForEvent('download');await page.locator('#export').click();const file=await download;expect(file.suggestedFilename()).toMatch(/\.highlords$/);await expect(page.locator('#saveStatus')).toContainText(/Salvo|salvamento/,{timeout:10000})});
test('jogador só abre mesa depois de sincronização',async({page})=>{await mockPeer(page);await page.goto(url());await page.locator('#roomCode').fill('hl-12345678-1234-1234-1234-123456789abc');await page.locator('#guestName').fill('Jogador');await page.locator('#join').click();await expect(page.locator('#game')).toBeVisible();await expect(page.locator('#status')).toContainText('sincronizada');await expect(page.locator('#masterTools')).toBeHidden()});

test('mestre salva ficha e conserva dados ao alternar de cena',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await expect(page.locator('#game')).toBeVisible();
 await page.locator('#charName').fill('Arcanista');
 await page.locator('#addChar').click();
 await page.locator('.char textarea').fill('Pontos de vida 22');
 await page.getByRole('button',{name:'Salvar ficha'}).click();
 page.once('dialog',dialog=>dialog.accept('Ruínas'));
 await page.locator('#newScene').click();
 await expect(page.locator('#sceneSelect option')).toHaveCount(2);
 await expect(page.locator('.char textarea')).toHaveValue('Pontos de vida 22');
 await page.locator('#sceneSelect').selectOption({index:0});
 await expect(page.locator('.char textarea')).toHaveValue('Pontos de vida 22');
});

test('recuperação local aparece integrada à home sem diálogo nativo',async({page})=>{
 await mockPeer(page);await page.goto(url());
 const result=await page.evaluate(async()=>{
  const db=await openDb();
  await new Promise((resolve,reject)=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put({schema:1,title:'Aventura de teste',updated:Date.now(),tokens:[],characters:[],chat:[],map:''},'latest');tx.oncomplete=resolve;tx.onerror=reject});
  return true;
 });
 expect(result).toBe(true);
 await page.reload();
 await expect(page.locator('#recoveryPanel')).toBeVisible();
 await expect(page.locator('#recoveryChoice')).toContainText('Aventura de teste');
 await page.locator('#recoveryRestore').click();
 await expect(page.locator('#recoveryPanel')).toBeHidden();
 await expect(page.locator('#notice')).toContainText('Campanha recuperada');
});

test('nome da campanha aparece no save e no download',async({page})=>{
 await mockPeer(page);await page.goto(url());
 await page.locator('#campaignName').fill('Crônicas do Norte');
 await page.locator('#host').click();
 await expect(page.locator('#gameCampaignName')).toHaveValue('Crônicas do Norte');
 const downloadPromise=page.waitForEvent('download');
 await page.locator('#export').click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toMatch(/^cronicas-do-norte-.*\.highlords$/);
 await page.locator('#gameCampaignName').fill('A Torre Vermelha');
 await page.locator('#gameCampaignName').dispatchEvent('change');
 await expect(page.locator('#gameCampaignName')).toHaveValue('A Torre Vermelha');
});

test('mestre transfere token, exclui e volta ao menu',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await expect(page.locator('#game')).toBeVisible();
 await page.locator('#tokenName').fill('Sentinela');await page.locator('#addToken').click();
 page.once('dialog',d=>d.accept('Outra cena'));await page.locator('#newScene').click();
 await page.locator('#sceneSelect').selectOption({index:0});
 const options=page.locator('#tokenManager .token-actions select');await expect(options).toHaveCount(1);
 await options.selectOption({index:1});
 await expect(page.locator('#tokenManager .token-actions select')).toHaveCount(0);
 await page.locator('#sceneSelect').selectOption({index:1});
 await expect(page.locator('#tokenManager .token-actions select')).toHaveCount(1);
 page.once('dialog',d=>d.accept());await page.locator('#tokenManager button.danger').click();
 await expect(page.locator('#tokenManager .token-control')).toHaveCount(0);
 page.on('dialog',d=>d.accept());await page.locator('#leaveGame').click();await expect(page.locator('#home')).toBeVisible();
});
test('ferramentas são botões e podem alternar',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await expect(page.locator('#toolButtons button')).toHaveCount(8);
 await page.locator('[data-tool="draw"]').click();
 await expect(page.locator('[data-tool="draw"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-tool="pan"]').click();
 await expect(page.locator('[data-tool="pan"]')).toHaveAttribute('aria-pressed','true');
});

test('desenho aceita traços consecutivos e revelação ativa névoa',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await expect(page.locator('#game')).toBeVisible();
 await page.locator('[data-tool="draw"]').click();
 const board=page.locator('#board'),rect=await board.boundingBox();
 for(let i=0;i<2;i++){
  await page.mouse.move(rect.x+90,rect.y+100+i*45);
  await page.mouse.down();await page.mouse.move(rect.x+180,rect.y+105+i*45,{steps:8});await page.mouse.up();
 }
 await expect(page.locator('#sketchLayer polyline')).toHaveCount(2);
 await page.locator('#fogEnable').click();
 await expect(page.locator('#fogState')).toContainText('Ativa');
 await page.locator('[data-tool="reveal"]').click();
 await page.mouse.move(rect.x+70,rect.y+70);await page.mouse.down();
 await page.mouse.move(rect.x+180,rect.y+180,{steps:4});await page.mouse.up();
 await expect(page.locator('#fogLayer > rect')).toHaveCount(1);
});

test('ferramenta revelar não ativa névoa sozinha e mestre mantém mapa visível',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await page.locator('[data-tool="reveal"]').click();
 await expect(page.locator('#fogState')).toContainText('Desativada');
 await expect(page.locator('[data-tool="pan"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('#fogEnable').click();
 await expect(page.locator('#fogState')).toContainText('Ativa');
 await expect(page.locator('#fogLayer mask')).toHaveCount(0);
 await page.locator('[data-tool="reveal"]').click();
 await expect(page.locator('[data-tool="reveal"]')).toHaveAttribute('aria-pressed','true');
});

test('mestre aguarda autosave ao sair pelo menu',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await expect(page.locator('#game')).toBeVisible();
 await page.locator('#charName').fill('Guardião');await page.locator('#addChar').click();
 await page.locator('#leaveGame').click();
 await expect(page.locator('#home')).toBeVisible();
 const saved=await page.evaluate(async()=>{const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction('saves');const r=tx.objectStore('saves').get('latest');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})});
 expect(saved.characters.some(c=>c.name==='Guardião')).toBe(true);
});

test('desfazer remove apenas último traço e limpar pede confirmação',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await page.locator('[data-tool="draw"]').click();
 const r=await page.locator('#board').boundingBox();
 for(let i=0;i<2;i++){await page.mouse.move(r.x+90,r.y+100+i*40);await page.mouse.down();await page.mouse.move(r.x+180,r.y+110+i*40,{steps:5});await page.mouse.up()}
 await expect(page.locator('#sketchLayer polyline')).toHaveCount(2);
 await page.locator('#undoDrawing').click();
 await expect(page.locator('#sketchLayer polyline')).toHaveCount(1);
 page.once('dialog',d=>d.dismiss());await page.locator('#clearDrawings').click();
 await expect(page.locator('#sketchLayer polyline')).toHaveCount(1);
 page.once('dialog',d=>d.accept());await page.locator('#clearDrawings').click();
 await expect(page.locator('#sketchLayer polyline')).toHaveCount(0);
});

test('identidade WebCrypto persiste e verifica assinatura',async({page})=>{
 await mockPeer(page);await page.goto(url());
 const value=await page.evaluate(async()=>{
  const keys=await loadIdentityKeys();
  const id=identity(),challenge='12345678-1234-1234-1234-123456789abc';
  roomId='hl-12345678-1234-1234-1234-123456789abc';
  const proof=await signChallenge(challenge,id);
  const valid=await verifyChallenge(challenge,id,proof.key,proof.signature);
  const invalid=await verifyChallenge(challenge,'different-player',proof.key,proof.signature);
  identityKeys=null;
  const persisted=await loadIdentityKeys();
  return {valid,invalid,privateExtractable:keys.privateKey.extractable,sameKey:keys.privateKey===persisted.privateKey||keys.publicKey.type===persisted.publicKey.type};
 });
 expect(value.valid).toBe(true);expect(value.invalid).toBe(false);
 expect(value.privateExtractable).toBe(false);expect(value.sameKey).toBe(true);
});
test('importação rejeita cena com coordenadas fora do mapa',async({page})=>{
 await mockPeer(page);await page.goto(url());
 const result=await page.evaluate(()=>{
  const scene={id:'scene',title:'Cena',map:'',tokens:[{id:'token',name:'Ruim',x:99999,y:0}],drawings:[],fog:{enabled:false,reveals:[]}};
  return isValidState({schema:1,title:'Campanha',map:'',tokens:[],characters:[],chat:[],scenes:[scene],activeSceneId:'scene'});
 });
 expect(result).toBe(false);
});

test('fog protege os pixels ocultos no payload da mesa',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 const result=await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=800;
  const ctx=canvas.getContext('2d');ctx.fillStyle='red';ctx.fillRect(0,0,1200,800);
  state.map=canvas.toDataURL('image/png');
  state.fog={enabled:true,reveals:[{x:0,y:0,width:100,height:100}]};
  const view=playerView('guest-id');
  const secured=await maskedPlayerMap(state.map,state.fog.reveals);
  const image=new Image();image.src=secured;await image.decode();
  const out=document.createElement('canvas');out.width=1200;out.height=800;
  const o=out.getContext('2d');o.drawImage(image,0,0);
  const visible=o.getImageData(50,50,1,1).data,secret=o.getImageData(600,500,1,1).data;
  return {originalNotSent:view.map==='',different:secured!==state.map,visibleRed:visible[0]>140,secretDark:secret[0]<35&&secret[1]<35&&secret[2]<35};
 });
 expect(result).toEqual({originalNotSent:true,different:true,visibleRed:true,secretDark:true});
});

test('WebRTC usa apenas STUN e nunca consulta endpoint TURN',async({page})=>{
 await mockPeer(page);
 let turnRequests=0;
 await page.route('**/api/turn',route=>{turnRequests++;return route.abort()});
 await page.goto(url());
 const result=await page.evaluate(()=>{
  const config=peerOptions().config.iceServers;
  return {urls:config.flatMap(x=>Array.isArray(x.urls)?x.urls:[x.urls]),isAsync:peerOptions() instanceof Promise};
 });
 expect(result.urls.length).toBeGreaterThan(0);
 expect(result.urls.every(url=>url.startsWith('stun:'))).toBe(true);
 expect(result.isAsync).toBe(false);
 await page.locator('#host').click();
 await expect(page.locator('#game')).toBeVisible();
 expect(turnRequests).toBe(0);
});

test('fechamento abrupto preserva cenas e fichas no autosave',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await page.locator('#charName').fill('Cartógrafa');await page.locator('#addChar').click();
 await page.locator('.char textarea').fill('PV 17');await page.getByRole('button',{name:'Salvar ficha'}).click();
 await page.locator('#tokenName').fill('Exploradora');await page.locator('#addToken').click();
 page.once('dialog',d=>d.accept('Templo'));await page.locator('#newScene').click();
 await page.locator('#tokenName').fill('Guardião');await page.locator('#addToken').click();
 await page.evaluate(()=>saveLocal());
 await page.reload();
 await expect(page.locator('#recoveryPanel')).toBeVisible();
 await page.locator('#recoveryRestore').click();
 await page.locator('#host').click();
 await expect(page.locator('#sceneSelect option')).toHaveCount(2);
 await expect(page.locator('.char textarea')).toHaveValue('PV 17');
 await expect(page.locator('#tokenManager .token-control')).toHaveCount(1);
 await page.locator('#sceneSelect').selectOption({index:0});
 await expect(page.locator('#tokenManager .token-control')).toHaveCount(1);
});
test('importação de campanha antiga não herda chaves de outra campanha',async({page})=>{
 await mockPeer(page);await page.goto(url());
 const result=await page.evaluate(async()=>{
  state.trustedKeys={'12345678-1234-1234-1234-123456789abc':{kty:'EC',crv:'P-256',x:'old',y:'old'}};
  const legacy={schema:1,title:'Campanha legada',updated:Date.now(),map:'',tokens:[],characters:[],chat:[]};
  await restore(new File([JSON.stringify(legacy)],'legacy.highlords',{type:'application/json'}));
  return {title:state.title,trustedKeys:state.trustedKeys,scenes:state.scenes.length};
 });
 expect(result).toEqual({title:'Campanha legada',trustedKeys:{},scenes:1});
});

test('home apresenta a mesa e gratuidade',async({page})=>{await mockPeer(page);await page.goto(url());await expect(page.getByText('Highlords RPG é e sempre será gratuito.')).toBeVisible();await expect(page.getByRole('button',{name:'Preparar minha mesa'})).toBeVisible();await expect(page.getByRole('button',{name:'Sentar à mesa'})).toBeVisible();await page.getByRole('button',{name:'Preparar minha mesa'}).click();await expect(page.locator('#board')).toBeVisible()});

test('Beta: ZIP e editor universal e grid',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await page.locator('#charName').fill('Investigador');await page.locator('#addChar').click();
 await page.getByLabel('Novo campo da ficha').fill('Sanidade');
 await page.getByLabel('Tipo de campo').selectOption('number');
 await page.getByRole('button',{name:'+ Campo'}).click();
 await expect(page.getByLabel('Sanidade')).toBeVisible();
 await page.locator('#gridSize').fill('45');await page.locator('#gridSize').dispatchEvent('change');
 const value=await page.evaluate(async()=>{const bytes=new Uint8Array(await zipCampaign(state).arrayBuffer());const obj=await unzipCampaign(new File([bytes],'campanha.highlords'));return {magic:Array.from(bytes.slice(0,4)),fields:obj.characters[0].fields.length,grid:obj.gridSize}});
 expect(value).toEqual({magic:[80,75,3,4],fields:1,grid:45});
});

test('Beta editor: grid hexagonal, magnetismo, camadas e formato persistido',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await page.locator('#gridKind').selectOption('hex');
 await page.locator('#gridSnap').check();
 await page.locator('#gridOriginX').fill('12');await page.locator('#gridOriginX').dispatchEvent('change');
 await page.locator('#gridOpacity').fill('35');await page.locator('#gridOpacity').dispatchEvent('change');
 const result=await page.evaluate(()=>({kind:state.gridKind,snap:state.gridSnap,x:state.gridOriginX,opacity:state.gridOpacity,size:state.gridSize,ice:peerOptions().config.iceServers.map(i=>i.urls)}));
 expect(result.kind).toBe('hex');expect(result.snap).toBe(true);expect(result.x).toBe(12);expect(result.opacity).toBe(35);
 expect(result.ice.every(x=>x.startsWith('stun:'))).toBe(true);
 await page.locator('#layerDrawings').uncheck();
 await expect(page.locator('#sketchLayer')).toBeHidden();
 await page.locator('#layerDrawings').check();
 await expect(page.locator('#sketchLayer')).toBeVisible();
});
test('Beta editor: formas, régua, borracha e permissões',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 for(const tool of ['line','rectangle','ellipse','eraser','ruler','pan']){
  await page.locator('[data-tool="'+tool+'"]').click();
  await expect(page.locator('[data-tool="'+tool+'"]')).toHaveAttribute('aria-pressed','true');
 }
 await page.evaluate(()=>{
  apply('draw',{points:[[20,20],[80,80]]},myId,nickname);
 });
 await expect(page.locator('#sketchLayer polyline')).toHaveCount(1);
 await page.evaluate(()=>apply('draw:remove',{index:0},myId,nickname));
 await expect(page.locator('#sketchLayer polyline')).toHaveCount(0);
 await page.evaluate(()=>apply('draw',{points:[[20,20],[80,80]]},'malicious-guest','X'));
 await expect(page.locator('#sketchLayer polyline')).toHaveCount(0);
});
