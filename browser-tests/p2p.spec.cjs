async function openHostSection(page,name){await page.locator('#tabTools').click();await page.locator('.workspace-sections').getByRole('button',{name:name==='tokens'?'Tokens':name==='properties'?'Propriedades':'Mapa',exact:true}).click()}
// Browser smoke tests for the published P2P frontend (no external signaling required).
const {test,expect}=require('@playwright/test');
test.setTimeout(45000);
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
let server;
test.beforeAll(async()=>{server=http.createServer((req,res)=>{const file=path.join(process.cwd(),'p2p',req.url.startsWith('/assets/')?req.url.slice(1):'index.html');if(!file.startsWith(path.join(process.cwd(),'p2p'))){res.writeHead(403);return res.end()}fs.readFile(file,(err,data)=>{res.setHeader('Content-Type',file.endsWith('.svg')?'image/svg+xml':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(err?'missing':data)})}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r))});
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
test('home mostra compromisso de gratuidade e identidade',async({page})=>{await mockPeer(page);await page.goto(url());await expect(page.getByText('Highlords VTT é e sempre será gratuito.')).toBeVisible();await expect(page.locator('#host')).toBeVisible();await expect(page.locator('#join')).toBeVisible();await expect(page.locator('.version-tag').first()).toContainText(/VERSÃO 1\.0/)});
test('mestre cria mesa, cena, ficha, token e exporta',async({page})=>{await mockPeer(page);await page.goto(url());await page.locator('#host').click();await expect(page.locator('#game')).toBeVisible();await openHostSection(page,'tokens');await page.locator('#tokenName').fill('Goblin');await openHostSection(page,'tokens');await page.locator('#addToken').click();await expect(page.locator('.piece').getByText('Goblin')).toBeVisible();await page.locator('#tabSheets').click();await page.locator('#charName').fill('Thorin');await page.locator('#tabSheets').click();await page.locator('#addChar').click();await page.locator('#tabSheets').click();await expect(page.locator('.char strong').getByText('Thorin')).toBeVisible();page.once('dialog',d=>d.accept('Masmorra'));await page.locator('#tabTools').click();await page.locator('#newScene').click();await expect(page.locator('#sceneSelect option')).toHaveCount(2);const download=page.waitForEvent('download');await page.locator('#campaignMenu > summary').click();await page.locator('#export').click();const file=await download;expect(file.suggestedFilename()).toMatch(/\.highlords$/);await expect(page.locator('#saveStatus')).toContainText(/Salvo|salvamento/,{timeout:10000})});
test('jogador só abre mesa depois de sincronização',async({page})=>{await mockPeer(page);await page.goto(url());await page.locator('#roomCode').fill('hl-12345678-1234-1234-1234-123456789abc');await page.locator('#guestName').fill('Jogador');await page.locator('#join').click();await expect(page.locator('#game')).toBeVisible();await expect(page.locator('#status')).toContainText('sincronizada');await expect(page.locator('#masterTools')).toBeHidden()});

test('mestre salva ficha e conserva dados ao alternar de cena',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await expect(page.locator('#game')).toBeVisible();
 await page.locator('#tabSheets').click();await page.locator('#charName').fill('Arcanista');
 await page.locator('#tabSheets').click();await page.locator('#addChar').click();
 await page.locator('#tabSheets').click();await page.locator('.char textarea').fill('Pontos de vida 22');
 await page.locator('#tabSheets').click();await page.getByRole('button',{name:'Salvar ficha'}).click();
 page.once('dialog',dialog=>dialog.accept('Ruínas'));
 await page.locator('#tabTools').click();await page.locator('#newScene').click();
 await expect(page.locator('#sceneSelect option')).toHaveCount(2);
 await expect(page.locator('.char textarea')).toHaveValue('Pontos de vida 22');
 await page.locator('#tabTools').click();await page.locator('#sceneSelect').selectOption({index:0});
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
 await page.locator('#campaignMenu > summary').click();await page.locator('#export').click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toMatch(/^cronicas-do-norte-.*\.highlords$/);
 await page.locator('#gameCampaignName').fill('A Torre Vermelha');
 await page.locator('#gameCampaignName').dispatchEvent('change');
 await expect(page.locator('#gameCampaignName')).toHaveValue('A Torre Vermelha');
});

test('mestre transfere token, exclui e volta ao menu',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await expect(page.locator('#game')).toBeVisible();
 await openHostSection(page,'tokens');await page.locator('#tokenName').fill('Sentinela');await openHostSection(page,'tokens');await page.locator('#addToken').click();
 page.once('dialog',d=>d.accept('Outra cena'));await page.locator('#tabTools').click();await page.locator('#newScene').click();
 await page.locator('#tabTools').click();await page.locator('#sceneSelect').selectOption({index:0});
 await openHostSection(page,'tokens');const options=page.locator('#tokenManager .token-actions select');await expect(options).toHaveCount(1);
 await options.selectOption({index:1});
 await openHostSection(page,'tokens');await expect(page.locator('#tokenManager .token-actions select')).toHaveCount(0);
 await page.locator('#tabTools').click();await page.locator('#sceneSelect').selectOption({index:1});
 await openHostSection(page,'tokens');await expect(page.locator('#tokenManager .token-actions select')).toHaveCount(1);
 page.once('dialog',d=>d.accept());await openHostSection(page,'tokens');await page.locator('#tokenManager button.danger').click();
 await openHostSection(page,'tokens');await expect(page.locator('#tokenManager .token-control')).toHaveCount(0);
 page.on('dialog',d=>d.accept());await page.locator('#campaignMenu > summary').click();await page.locator('#leaveGame').click();await expect(page.locator('#home')).toBeVisible();
});
test('ferramentas são botões e podem alternar',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await expect(page.locator('#toolButtons button')).toHaveCount(8);
 await page.locator('#tabTools').click();await page.locator('[data-tool="draw"]').click();
 await expect(page.locator('[data-tool="draw"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#board')).toHaveCSS('cursor',/cursor-brush\.svg/);
 await page.evaluate(()=>apply('token:add',{name:'Cursor'},myId,nickname));
 await expect(page.locator('.piece')).toHaveCSS('cursor',/cursor-brush\.svg/);
 await page.locator('[data-tool="rectangle"]').click();
 await expect(page.locator('#board')).toHaveCSS('cursor','crosshair');
 await expect(page.locator('.piece')).toHaveCSS('cursor','crosshair');
 await page.locator('#tabTools').click();await page.locator('[data-tool="pan"]').click();
 await expect(page.locator('[data-tool="pan"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#board')).toHaveCSS('cursor','move');
 const area=await page.locator('#board').boundingBox();await page.mouse.move(area.x+400,area.y+500);await page.mouse.down();
 await expect(page.locator('#board')).toHaveCSS('cursor','grabbing');await page.mouse.up();
 await expect(page.locator('#board')).toHaveCSS('cursor','move');
});

test('desenho aceita traços consecutivos e revelação ativa névoa',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await expect(page.locator('#game')).toBeVisible();
 await page.locator('#tabTools').click();await page.locator('[data-tool="draw"]').click();
 const board=page.locator('#board'),rect=await board.boundingBox();
 for(let i=0;i<2;i++){
  await page.mouse.move(rect.x+220,rect.y+100+i*45);
  await page.mouse.down();await page.mouse.move(rect.x+350,rect.y+105+i*45,{steps:8});await page.mouse.up();
 }
 await expect(page.locator('#sketchLayer polyline')).toHaveCount(2);
 await page.locator('#tabTools').click();await page.locator('#fogEnable').click();
 await expect(page.locator('#fogState')).toContainText('Ativa');
 await page.locator('#tabTools').click();await page.locator('[data-tool="reveal"]').click();
 await page.mouse.move(rect.x+200,rect.y+70);await page.mouse.down();
 await page.mouse.move(rect.x+350,rect.y+180,{steps:4});await page.mouse.up();
 await expect(page.locator('#fogLayer > rect')).toHaveCount(1);
});

test('ferramenta revelar não ativa névoa sozinha e mestre mantém mapa visível',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await page.locator('#tabTools').click();await page.locator('[data-tool="reveal"]').click();
 await expect(page.locator('#fogState')).toContainText('Desativada');
 await expect(page.locator('[data-tool="pan"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#board')).toHaveCSS('cursor','move');
 const area=await page.locator('#board').boundingBox();await page.mouse.move(area.x+400,area.y+500);await page.mouse.down();
 await expect(page.locator('#board')).toHaveCSS('cursor','grabbing');await page.mouse.up();
 await expect(page.locator('#board')).toHaveCSS('cursor','move');
 await page.locator('#tabTools').click();await page.locator('#fogEnable').click();
 await expect(page.locator('#fogState')).toContainText('Ativa');
 await expect(page.locator('#fogLayer mask')).toHaveCount(0);
 await page.locator('#tabTools').click();await page.locator('[data-tool="reveal"]').click();
 await expect(page.locator('[data-tool="reveal"]')).toHaveAttribute('aria-pressed','true');
});

test('mestre aguarda autosave ao sair pelo menu',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await expect(page.locator('#game')).toBeVisible();
 await page.locator('#tabSheets').click();await page.locator('#charName').fill('Guardião');await page.locator('#tabSheets').click();await page.locator('#addChar').click();
 await page.locator('#campaignMenu > summary').click();await page.locator('#leaveGame').click();
 await expect(page.locator('#home')).toBeVisible();
 const saved=await page.evaluate(async()=>{const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction('saves');const r=tx.objectStore('saves').get('latest');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})});
 expect(saved.characters.some(c=>c.name==='Guardião')).toBe(true);
});

test('desfazer remove apenas último traço e limpar pede confirmação',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await page.locator('#tabTools').click();await page.locator('[data-tool="draw"]').click();
 const r=await page.locator('#board').boundingBox();
 for(let i=0;i<2;i++){await page.mouse.move(r.x+220,r.y+100+i*40);await page.mouse.down();await page.mouse.move(r.x+350,r.y+110+i*40,{steps:5});await page.mouse.up()}
 await expect(page.locator('#sketchLayer polyline')).toHaveCount(2);
 await page.locator('#tabTools').click();await page.locator('#undoDrawing').click();
 await expect(page.locator('#sketchLayer polyline')).toHaveCount(1);
 page.once('dialog',d=>d.dismiss());await page.locator('#tabTools').click();await page.locator('#clearDrawings').click();
 await expect(page.locator('#sketchLayer polyline')).toHaveCount(1);
 page.once('dialog',d=>d.accept());await page.locator('#tabTools').click();await page.locator('#clearDrawings').click();
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
 await page.locator('#tabSheets').click();await page.locator('#charName').fill('Cartógrafa');await page.locator('#tabSheets').click();await page.locator('#addChar').click();
 await page.locator('#tabSheets').click();await page.locator('.char textarea').fill('PV 17');await page.locator('#tabSheets').click();await page.getByRole('button',{name:'Salvar ficha'}).click();
 await openHostSection(page,'tokens');await page.locator('#tokenName').fill('Exploradora');await openHostSection(page,'tokens');await page.locator('#addToken').click();
 page.once('dialog',d=>d.accept('Templo'));await page.locator('#tabTools').click();await page.locator('#newScene').click();
 await openHostSection(page,'tokens');await page.locator('#tokenName').fill('Guardião');await openHostSection(page,'tokens');await page.locator('#addToken').click();
 await page.evaluate(()=>saveLocal());
 await page.reload();
 await expect(page.locator('#recoveryPanel')).toBeVisible();
 await page.locator('#recoveryRestore').click();
 await page.locator('#host').click();
 await expect(page.locator('#sceneSelect option')).toHaveCount(2);
 await expect(page.locator('.char textarea')).toHaveValue('PV 17');
 await openHostSection(page,'tokens');await expect(page.locator('#tokenManager .token-control')).toHaveCount(1);
 await page.locator('#tabTools').click();await page.locator('#sceneSelect').selectOption({index:0});
 await openHostSection(page,'tokens');await expect(page.locator('#tokenManager .token-control')).toHaveCount(1);
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

test('home apresenta a mesa e gratuidade',async({page})=>{await mockPeer(page);await page.goto(url());await expect(page.getByText('Highlords VTT é e sempre será gratuito.')).toBeVisible();await expect(page.getByRole('button',{name:'Preparar minha mesa'})).toBeVisible();await expect(page.getByRole('button',{name:'Sentar à mesa'})).toBeVisible();await page.getByRole('button',{name:'Preparar minha mesa'}).click();await expect(page.locator('#board')).toBeVisible()});

test('Beta: ZIP e editor universal e grid',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await page.locator('#tabSheets').click();await page.locator('#charName').fill('Investigador');await page.locator('#tabSheets').click();await page.locator('#addChar').click();
 await page.locator('#tabSheets').click();await page.getByLabel('Novo campo da ficha').fill('Sanidade');
 await page.locator('#tabSheets').click();await page.getByLabel('Tipo de campo').selectOption('number');
 await page.locator('#tabSheets').click();await page.getByRole('button',{name:'+ Campo'}).click();
 await expect(page.getByLabel('Sanidade',{exact:true})).toBeVisible();
 await page.locator('#tabTools').click();await page.locator('#gridSize').fill('45');await page.locator('#tabTools').click();await page.locator('#gridSize').dispatchEvent('change');
 const value=await page.evaluate(async()=>{const bytes=new Uint8Array(await zipCampaign(state).arrayBuffer());const obj=await unzipCampaign(new File([bytes],'campanha.highlords'));return {magic:Array.from(bytes.slice(0,4)),fields:obj.characters[0].fields.length,grid:obj.gridSize}});
 expect(value).toEqual({magic:[80,75,3,4],fields:1,grid:45});
});

test('Beta editor: grid hexagonal, magnetismo, camadas e formato persistido',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await page.locator('#tabTools').click();await page.locator('#gridKind').selectOption('hex');
 await page.locator('#tabTools').click();await page.locator('#gridSnap').check();
 await page.locator('#tabTools').click();await page.locator('#gridOriginX').fill('12');await page.locator('#tabTools').click();await page.locator('#gridOriginX').dispatchEvent('change');
 await page.locator('#tabTools').click();await page.locator('#gridOpacity').fill('35');await page.locator('#tabTools').click();await page.locator('#gridOpacity').dispatchEvent('change');
 const result=await page.evaluate(()=>({kind:state.gridKind,snap:state.gridSnap,x:state.gridOriginX,opacity:state.gridOpacity,size:state.gridSize,ice:peerOptions().config.iceServers.map(i=>i.urls)}));
 expect(result.kind).toBe('hex');expect(result.snap).toBe(true);expect(result.x).toBe(12);expect(result.opacity).toBe(35);
 expect(result.ice.every(x=>x.startsWith('stun:'))).toBe(true);
 await page.locator('#tabTools').click();await page.locator('#layerDrawings').uncheck();
 await expect(page.locator('#sketchLayer')).toBeHidden();
 await page.locator('#tabTools').click();await page.locator('#layerDrawings').check();
 await expect(page.locator('#sketchLayer')).toBeVisible();
});
test('Beta editor: formas, régua, borracha e permissões',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 for(const tool of ['line','rectangle','ellipse','eraser','ruler','pan']){
  await page.locator('#tabTools').click();await page.locator('[data-tool="'+tool+'"]').click();
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

test('home moderna mantém fluxo de mestre, jogador e layout responsivo',async({page})=>{
 await mockPeer(page);await page.setViewportSize({width:390,height:844});await page.goto(url());
 await expect(page.getByRole('heading',{name:/Um espaço para qualquer história/})).toBeVisible();
 await expect(page.getByText('Highlords VTT é e sempre será gratuito.')).toBeVisible();
 await expect(page.locator('#host')).toBeVisible();
 await expect(page.getByRole('button',{name:/Preparar minha mesa/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Sentar à mesa/})).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
 expect(overflow).toBe(false);
 await page.locator('#host').click();await expect(page.locator('#board')).toBeVisible();
});

test('Beta camadas: persistência, autorização e sincronização',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await page.locator('#tabTools').click();await page.locator('#layerDrawings').uncheck();
 const result=await page.evaluate(()=>{
  const before=structuredClone(state.layerVisibility);
  const revisionBefore=revision;
  apply('layer:visibility',{layer:'tokens',visible:false},'intruder','X');
  return {before,after:state.layerVisibility,revisionBefore,revisionAfter:revision,guest:playerView('guest').layerVisibility};
 });
 expect(result.before.drawings).toBe(false);
 expect(result.after.tokens).toBe(true);
 expect(result.revisionAfter).toBe(result.revisionBefore);
 expect(result.guest.drawings).toBe(false);
 const archive=await page.evaluate(async()=>unzipCampaign(new File([zipCampaign(state)],'backup.highlords')).then(x=>x.layerVisibility));
 expect(archive.drawings).toBe(false);
});

test('Beta editor: desfazer e refazer alterações, propriedades autorizadas',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await openHostSection(page,'tokens');await page.locator('#tokenName').fill('Pioneiro');await openHostSection(page,'tokens');await page.locator('#addToken').click();
 await expect(page.locator('.piece')).toHaveCount(1);
 await openHostSection(page,'map');await page.locator('#editorUndo').click();await expect(page.locator('.piece')).toHaveCount(0);
 await openHostSection(page,'map');await page.locator('#editorRedo').click();await expect(page.locator('.piece')).toHaveCount(1);
 const check=await page.evaluate(()=>{
  const id=state.tokens[0].id;
  apply('token:properties',{id,key:'name',value:'Invasor'},'guest','guest');
  const denied=state.tokens[0].name;
  apply('token:properties',{id,key:'size',value:85},myId,nickname);
  return {denied,size:state.tokens[0].size};
 });
 expect(check).toEqual({denied:'Pioneiro',size:85});
 await page.locator('.piece').click();
 await expect(page.getByLabel('Tamanho do token')).toHaveValue('85');
});

test('Beta fichas: seções e campos privados respeitam permissões no host',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await page.locator('#tabSheets').click();await page.locator('#charName').fill('Observador');await page.locator('#tabSheets').click();await page.locator('#addChar').click();
 await page.locator('#tabSheets').click();await page.getByLabel('Novo campo da ficha').fill('Segredo');
 await page.locator('#tabSheets').click();await page.getByLabel('Seção do campo').fill('Notas');
 await page.locator('#tabSheets').click();await page.getByLabel('Visibilidade do campo').selectOption('master');
 await page.locator('#tabSheets').click();await page.getByRole('button',{name:'+ Campo'}).click();
 const result=await page.evaluate(()=>{
  const ch=state.characters[0],field=ch.fields[0];
  const before=field.value;
  apply('character:field',{id:ch.id,fieldId:field.id,value:'roubado'},'guest','guest');
  return {before,after:field.value,section:field.section,visibleToGuest:playerView('guest').characters.length};
 });
 expect(result).toEqual({before:'',after:'',section:'Notas',visibleToGuest:0});
});

test('Beta ZIP v3: estrutura separada, validação CRC e compatibilidade v2',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 const value=await page.evaluate(async()=>{
  ensureSceneData();const image='data:image/png;base64,'+btoa('small-image');
  state.map=image;state.scenes[0].map=image;rememberScene();
  const packed=zipCampaign(state),entries=await readStoredZip(new File([packed],'beta.highlords'));
  const manifest=JSON.parse(new TextDecoder().decode(entries.get('manifest.json')));
  const restored=await unzipCampaign(new File([packed],'beta.highlords'));
  const old=packStoredZip([['manifest.json',JSON.stringify({format:'highlords',version:2})],['campaign.json',JSON.stringify(state)]]);
  const legacy=await unzipCampaign(new File([old],'antigo.highlords'));
  const damaged=new Uint8Array(await packed.arrayBuffer());damaged[70]^=0x30;
  let rejects=false;try{await unzipCampaign(new File([damaged],'corrompido.highlords'))}catch{rejects=true}
  return {version:manifest.version,paths:[...entries.keys()],sameImage:restored.map===image&&restored.scenes[0].map===image,legacy:legacy.map===image,rejects};
 });
 expect(value.version).toBe(3);
 expect(value.paths).toContain('characters/characters.json');
 expect(value.paths).toContain('scenes/scene-0.json');
 expect(value.paths).toContain('assets/asset-0.png');
 expect(value.sameImage).toBe(true);
 expect(value.legacy).toBe(true);
 expect(value.rejects).toBe(true);
});

test('Beta camadas: sigilo, bloqueio e persistência por cena',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 const result=await page.evaluate(()=>{
  apply('token:add',{name:'Oculto'},myId,nickname);
  apply('draw',{points:[[0,0],[40,50]]},myId,nickname);
  state.map='data:image/png;base64,'+btoa('pixels');changed();
  apply('layer:policy',{layer:'map',property:'private',enabled:true},myId,nickname);
  apply('layer:policy',{layer:'drawings',property:'private',enabled:true},myId,nickname);
  apply('layer:policy',{layer:'tokens',property:'private',enabled:true},myId,nickname);
  const view=playerView('intruso'),before=state.tokens.length;
  apply('layer:policy',{layer:'tokens',property:'locked',enabled:true},myId,nickname);
  apply('token:add',{name:'Bloqueado'},myId,nickname);
  rememberScene();
  return {map:view.map,draw:view.drawings.length,tokens:view.tokens.length,block:state.tokens.length===before,private:state.scenes[0].layerPolicy.map.private};
 });
 expect(result).toEqual({map:'',draw:0,tokens:0,block:true,private:true});
});

test('Beta identidade: mestre reassocia fichas e tokens e revoga vínculo anterior',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 const result=await page.evaluate(()=>{
  const oldId='11111111-1111-4111-8111-111111111111',newId='22222222-2222-4222-8222-222222222222';
  state.trustedKeys[oldId]={kty:'EC',crv:'P-256',x:'a',y:'b'};
  state.trustedKeys[newId]={kty:'EC',crv:'P-256',x:'c',y:'d'};
  state.characters.push({id:'sheet-1',name:'Herói',text:'',owner:oldId,fields:[]});
  state.tokens.push({id:'token-1',name:'Herói',x:50,y:50,owner:oldId});
  contacts.set('new-browser',{open:true,playerId:newId,playerName:'Jogador',send(){}});
  apply('identity:transfer',{oldId,newId},oldId,'intruso');
  const before=state.characters[0].owner;
  apply('identity:transfer',{oldId,newId},myId,nickname);
  contacts.delete('new-browser');
  return {before,after:state.characters[0].owner,token:state.tokens[0].owner,oldKey:!!state.trustedKeys[oldId]};
 });
 expect(result.before).toBe('11111111-1111-4111-8111-111111111111');
 expect(result.after).toBe('22222222-2222-4222-8222-222222222222');
 expect(result.token).toBe(result.after);
 expect(result.oldKey).toBe(false);
});

test('Beta seleção múltipla: alinhamento e rejeição de ação remota',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await page.evaluate(()=>{
  ensureSceneData();
  apply('token:add',{name:'A'},myId,nickname);apply('token:add',{name:'B'},myId,nickname);
  state.tokens[0].x=220;state.tokens[0].y=120;
  state.tokens[1].x=350;state.tokens[1].y=310;changed();
 });
 await page.locator('.piece').nth(0).click();
 await page.locator('.piece').nth(1).click({modifiers:['Shift']});
 await page.locator('#tabTools').click();await expect(page.getByRole('button',{name:'Alinhar horizontalmente'})).toBeVisible();
 await page.locator('#tabTools').click();await page.getByRole('button',{name:'Alinhar horizontalmente'}).click();
 const data=await page.evaluate(()=>{
  const y=state.tokens[0].y,first=state.tokens[1].y;
  apply('token:bulk',{ids:state.tokens.map(t=>t.id),operation:'delete'},'fake-player','evil');
  return{aligned:y===first,count:state.tokens.length};
 });
 expect(data).toEqual({aligned:true,count:2});
});

test('Beta: papel de mestre é visível na mesa',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await expect(page.locator('#game')).toBeVisible();
 await expect(page.locator('#sessionRole')).toHaveText('MESTRE');
 await expect(page.locator('#game .version-tag')).toContainText('VERSÃO 1.0');
});

test('mesa oferece chat e dados imediatamente sem rolagem do mestre',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await expect(page.locator('#tabChat')).toHaveAttribute('aria-selected','true');
 await expect(page.locator('#message')).toBeVisible();
 await expect(page.locator('#dice')).toBeVisible();
 await expect(page.locator('#masterTools')).toBeHidden();
 await page.locator('#tabTools').click();
 await expect(page.locator('#masterTools')).toBeVisible();
 await page.locator('#tabSheets').click();
 await expect(page.locator('#sheetsPanel')).toBeVisible();
 await page.locator('#tabChat').click();
 await expect(page.locator('#roll')).toBeVisible();
 const sizes=await page.evaluate(()=>({aside:document.querySelector('#tableSidebar').clientHeight,scroll:document.querySelector('#tableSidebar').scrollHeight,visible:!!document.querySelector('#history').offsetParent}));
 expect(sizes.scroll).toBeLessThanOrEqual(sizes.aside+2);expect(sizes.visible).toBe(true);
});

test('Beta hardening: valida IDs duplicados e impede payloads malformados',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 const result=await page.evaluate(()=>{
  const base={schema:1,title:'Mesa',tokens:[],characters:[],chat:[],map:''};
  const duplicate={...base,tokens:[{id:'x',name:'A',x:1,y:1},{id:'x',name:'B',x:2,y:2}]};
  const before=revision;
  apply('chat',{text:'malicioso'},'jogador','x');
  const messages=state.chat.length;
  apply('chat',{text:'x'.repeat(20000)},'jogador','x');
  const deniedOversize=state.chat.length===messages;
  let accepted=0;for(let i=0;i<32;i++)if(acceptGuestAction('flood','chat',{text:'x'}))accepted++;
  return {duplicate:isValidState(duplicate),before,after:revision,deniedOversize,accepted};
 });
 expect(result.duplicate).toBe(false);
 expect(result.after).toBe(result.before+1);
 expect(result.deniedOversize).toBe(true);
 expect(result.accepted).toBe(25);
});
test('Beta hardening: falha de armazenamento sinaliza backup sem falso sucesso',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();await expect(page.locator('#game')).toBeVisible();
 await page.evaluate(async()=>{
  clearTimeout(saveTimer);await saveLocal();
  lastSavedRevision=-1;revision++;
  const previous=openDb;
  openDb=async()=>{const e=new Error('Espaço insuficiente');e.name='QuotaExceededError';throw e};
  saveDb=null;
  try{await saveLocal()}finally{openDb=previous}
 });
 await expect(page.locator('#saveStatus')).toContainText('espaço esgotado');
 await expect(page.locator('#saveStatus')).toContainText('Exporte sua campanha');
 await expect(page.locator('#saveStatus')).toHaveAttribute('role','alert');
});
test('Beta hardening: aba de chat acessível em mobile e sem rolagem geral do painel',async({page})=>{
 await mockPeer(page);await page.setViewportSize({width:390,height:844});await page.goto(url());await page.locator('#host').click();
 await expect(page.locator('#tabChat')).toHaveAttribute('aria-selected','true');
 await expect(page.locator('#dice')).toBeVisible();
 await page.locator('#tabTools').click();await expect(page.locator('#tabTools')).toHaveAttribute('aria-selected','true');
 await page.locator('#tabChat').click();await expect(page.locator('#message')).toBeVisible();
 const result=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,tabHidden:document.querySelector('#masterTools').hidden}));
 expect(result.width).toBeLessThanOrEqual(result.viewport+3);
 expect(result.tabHidden).toBe(true);
});

test('1.0 mostra identificação oficial e mantém TURN desativado',async({page})=>{
 await mockPeer(page);await page.goto(url());
 await expect(page.locator('.version-tag').first()).toContainText('VERSÃO 1.0');
 await expect(page.getByText('Highlords VTT é e sempre será gratuito.')).toBeVisible();
 await page.locator('#host').click();
 await expect(page.locator('#game .version-tag')).toContainText('VERSÃO 1.0');
 expect(await page.evaluate(()=>({version:APP_VERSION,ice:peerOptions().config.iceServers.flatMap(s=>[s.urls])}))).toEqual({version:'1.0.0',ice:['stun:stun.l.google.com:19302','stun:stun.cloudflare.com:3478']});
});
test('1.0 rejeita estado importado com nomes de chat e proprietários excessivos',async({page})=>{
 await mockPeer(page);await page.goto(url());
 const result=await page.evaluate(()=>{
  const base={schema:1,title:'Campanha',tokens:[],characters:[],chat:[],map:''};
  return {
   badChat:isValidState({...base,chat:[{name:'x'.repeat(150),text:'mensagem'}]}),
   badToken:isValidState({...base,tokens:[{id:'id',name:'Token',x:10,y:10,owner:'x'.repeat(150)}]}),
   badCharacter:isValidState({...base,characters:[{id:'ficha',name:'Nome',text:'',owner:'x'.repeat(150)}]}),
   valid:isValidState(base)
  };
 });
 expect(result).toEqual({badChat:false,badToken:false,badCharacter:false,valid:true});
});

test('pós-1.0: chat preserva rascunho e fichas salvam por campo automaticamente',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 await page.locator('#tabSheets').click();await page.locator('#charName').fill('Cronista');await page.locator('#addChar').click();
 await page.getByLabel('Descrição de Cronista').fill('Um rascunho importante');
 await page.locator('#tabChat').click();await page.locator('#message').fill('Atualização concorrente');await page.locator('#send').click();
 await page.locator('#tabSheets').click();await expect(page.getByLabel('Descrição de Cronista')).toHaveValue('Um rascunho importante');
 await expect.poll(()=>page.evaluate(()=>state.characters[0].text)).toBe('Um rascunho importante');
 await expect(page.locator('[data-sheet-status]').first()).toHaveText('Sincronizado');
});
test('pós-1.0: versões rejeitam escrita obsoleta e mesclam campos diferentes',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 const r=await page.evaluate(()=>{
  apply('character:add',{name:'Heroína'},myId,'Mestre');const c=state.characters[0];
  for(const name of ['Vida','Ouro'])apply('character:field:add',{id:c.id,name,type:'number',section:'Atributos',visibility:'owner',editableByOwner:true},myId,'Mestre');
  const [a,b]=c.fields;
  apply('character:field',{id:c.id,fieldId:a.id,value:'20',baseVersion:0},myId,'Mestre');
  apply('character:field',{id:c.id,fieldId:b.id,value:'30',baseVersion:0},myId,'Mestre');
  apply('character:field',{id:c.id,fieldId:a.id,value:'999',baseVersion:0},myId,'Mestre');
  return c.fields.map(f=>({value:f.value,version:f.version}));
 });expect(r).toEqual([{value:'20',version:1},{value:'30',version:1}]);
});
test('pós-1.0: blocos estruturados, modelos e ZIP preservam dados e permissões',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 const r=await page.evaluate(async()=>{
  apply('character:add',{name:'Modelo universal'},myId,'Mestre');const c=state.characters[0];
  for(const [name,type] of [['Vida','resource'],['Mochila','inventory'],['Objetivos','list']])apply('character:field:add',{id:c.id,name,type,section:'Aventura',visibility:'owner',editableByOwner:true},myId,'Mestre');
  const f=c.fields[1];apply('character:field',{id:c.id,fieldId:f.id,value:'[{"name":"Corda","quantity":2,"notes":"10 metros"}]',baseVersion:0},myId,'Mestre');
  apply('character:duplicate',{id:c.id},'intruso','X');const unauthorized=state.characters.length;
  apply('character:duplicate',{id:c.id},myId,'Mestre');const copy=state.characters[1];
  const restored=await unzipCampaign(new File([zipCampaign(state)],'blocos.highlords'));
  return {valid:isValidState(restored),unauthorized,count:restored.characters.length,value:restored.characters[0].fields[1].value,newId:copy.fields[0].id!==c.fields[0].id,owner:copy.owner};
 });expect(r.valid).toBe(true);expect(r.unauthorized).toBe(1);expect(r.count).toBe(2);expect(r.newId).toBe(true);expect(r.owner).toBe('');expect(JSON.parse(r.value)[0].quantity).toBe(2);
});
test('pós-1.0: controles da mesa são acessíveis e painel pode recolher',async({page})=>{
 await mockPeer(page);await page.goto(url());await expect(page.locator('#host')).toBeInViewport();await page.locator('#host').click();
 await expect(page.locator('#boardToolbar')).toBeVisible();await expect(page.locator('#sceneBar')).toBeVisible();
 await page.locator('#collapseSidebar').click();await expect(page.locator('#tableSidebar')).toBeHidden();await page.locator('#collapseSidebar').click();
 await page.locator('#tabParticipants').click();await expect(page.locator('#participantsPanel')).toBeVisible();
 await page.locator('#tabSheets').click();await expect(page.locator('#participantsPanel')).toBeHidden();
});
test('pós-1.0: retrato, configuração e revogação de acesso não vazam fichas',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();
 const result=await page.evaluate(()=>{
  apply('character:add',{name:'Personagem reservado'},myId,'Mestre');const c=state.characters[0];
  apply('character:assign',{id:c.id,playerId:'dono'},myId,'Mestre');
  apply('character:field:add',{id:c.id,name:'Retrato',type:'portrait',section:'Identificação',visibility:'owner',editableByOwner:true},myId,'Mestre');
  const f=c.fields[0];apply('character:field',{id:c.id,fieldId:f.id,value:'data:image/svg+xml;base64,PHN2Zz4=',baseVersion:0},'dono','Jogador');const unsafe=f.value;
  const ownerBefore=playerView('dono').characters[0].fields.length,other=playerView('intruso').characters.length;
  apply('character:field:configure',{id:c.id,fieldId:f.id,name:'Segredo',section:'Privado',visibility:'master',editableByOwner:false},'dono','Jogador');const denied=f.name;
  apply('character:field:configure',{id:c.id,fieldId:f.id,name:'Retrato privado',section:'Privado',visibility:'master',editableByOwner:false},myId,'Mestre');
  return {unsafe,ownerBefore,other,denied,ownerAfter:playerView('dono').characters[0].fields.length,valid:isValidState(state)};
 });expect(result).toEqual({unsafe:'',ownerBefore:1,other:0,denied:'Retrato',ownerAfter:0,valid:true});
});
test('pós-1.0: inventário antigo iniciado por colchete continua legível e portátil',async({page})=>{
 await mockPeer(page);await page.goto(url());await page.locator('#host').click();await expect(page.locator('#game')).toBeVisible();
 await page.evaluate(()=>{state.characters=[{id:'legacy',name:'Legado',text:'',owner:'',fields:[{id:'old',name:'Bagagem',type:'inventory',value:'[Mochila]\nCorda e tochas'}]}];changed()});
 await page.locator('#tabSheets').click();await expect(page.getByLabel('Bagagem',{exact:true})).toHaveValue('[Mochila]\nCorda e tochas');
 const imported=await page.evaluate(async()=>unzipCampaign(new File([zipCampaign(state)],'legado.highlords')));expect(imported.characters[0].fields[0].value).toBe('[Mochila]\nCorda e tochas');
 await page.getByRole('button',{name:'Converter texto em itens'}).click();await page.getByRole('button',{name:'Salvar Bagagem',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>state.characters[0].fields[0].format)).toBe('items');
});
