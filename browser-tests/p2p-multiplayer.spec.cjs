async function openHostSection(page,name){await page.locator('#tabTools').click();await page.locator('.workspace-sections').getByRole('button',{name:name==='tokens'?'Tokens':name==='properties'?'Propriedades':'Mapa',exact:true}).click()}
const {test,expect}=require('@playwright/test');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
test('dois navegadores isolados autenticam e sincronizam ficha e chat',async({browser})=>{
 const server=http.createServer((req,res)=>{
  const file=path.join(process.cwd(),'p2p',req.url.startsWith('/assets/')?req.url.slice(1):'index.html');
  fs.readFile(file,(error,data)=>{
   res.setHeader('Content-Type',file.endsWith('.ttf')?'font/ttf':file.endsWith('.woff')?'font/woff':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');
   if(error){res.writeHead(404);res.end('Não encontrado')}else res.end(data);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port+'/';
 const hostContext=await browser.newContext(),playerContext=await browser.newContext();
 const host=await hostContext.newPage(),player=await playerContext.newPage();
 for(const [name,page] of [['mestre',host],['jogador',player]]){
  page.on('pageerror',e=>console.log('PAGE ERROR '+name+': '+e.message));
  page.on('console',msg=>{if(msg.type()==='error')console.log('CONSOLE ERROR '+name+': '+msg.text())});
 }

 const peers=new Map(),packets=[];let dropDelta=false,dropped=0;
 async function wire(page){
  await page.exposeFunction('__p2pBridge',async message=>{
   if(message.kind==='register'){peers.set(message.id,page);return true}
   if(message.kind==='relay'){
    if(message.packet?.type==='data'){packets.push(message.packet.data);if(dropDelta&&message.packet.data?.kind==='state-delta'){dropDelta=false;dropped++;return true}}
    const dest=peers.get(message.to);
    if(!dest||dest.isClosed())return false;
    // The bridge never blocks waiting for a response on the destination page.
    void dest.evaluate(packet=>window.__peerSignal?.(packet),message.packet).catch(()=>{});
    return true;
   }
   return false;
  });
  const mock=fs.readFileSync(path.join(process.cwd(),'browser-tests/mock-p2p.js'),'utf8');
  await page.route('https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:mock}));
 }
 try{
  await wire(host);await wire(player);
  await host.goto(origin);await host.locator('#entryTabHost').click();await host.locator('#hostName').fill('Mestre');
  await host.locator('#host').click();await expect(host.locator('#game')).toBeVisible({timeout:10000});
  const label=await host.locator('#roomLabel').textContent(),room=label.replace(/^Sala\s+/,'').trim();
  await player.goto(origin);
  await player.locator('#roomCode').fill(room);
  await player.locator('#guestName').fill('Convidado');
  await player.locator('#join').click();
  await expect(player.locator('#game')).toBeVisible({timeout:20000});
  await expect(player.locator('#status')).toContainText('sincronizada');
  await host.locator('#tabSheets').click();await host.locator('#charName').fill('Guardião');
  await host.locator('#tabSheets').click();await host.locator('#addChar').click();
  await host.locator('#tabSheets').click();await host.locator('.char > select:first-of-type').selectOption({label:'Convidado'});
  await player.locator('#tabSheets').click();await expect(player.locator('.char strong')).toHaveText('Guardião');
  await player.locator('.char > textarea').fill('PV: 24');
  await player.getByRole('button',{name:'Salvar ficha'}).click();
  await expect(host.locator('.char > textarea')).toHaveValue('PV: 24');
  await player.locator('#tabChat').click();await player.locator('#message').fill('Olá, mestre');
  await player.locator('#send').click();
  await host.locator('#tabChat').click();await expect(host.locator('#history')).toContainText('Olá, mestre');
  // Actual isolated clients edit different fields, then resolve the same-field race.
  await host.evaluate(()=>{const c=state.characters[0];for(const name of ['Vida','Ouro'])apply('character:field:add',{id:c.id,name,type:'number',section:'Atributos',visibility:'owner',editableByOwner:true},myId,'Mestre')});
  await host.locator('#tabSheets').click();await player.locator('#tabSheets').click();
  await expect(player.getByLabel('Vida',{exact:true})).toBeVisible();
  await host.getByLabel('Vida',{exact:true}).fill('20');await player.getByLabel('Ouro',{exact:true}).fill('30');
  await host.getByRole('button',{name:'Salvar Vida',exact:true}).click();await player.getByRole('button',{name:'Salvar Ouro',exact:true}).click();
  await expect(host.getByLabel('Ouro',{exact:true})).toHaveValue('30');await expect(player.getByLabel('Vida',{exact:true})).toHaveValue('20');
  await player.getByLabel('Vida',{exact:true}).fill('18');await host.getByLabel('Vida',{exact:true}).fill('15');await host.getByRole('button',{name:'Salvar Vida',exact:true}).click();
  await expect(player.getByText('Este campo mudou em outro navegador.',{exact:false})).toBeVisible();
  await expect(player.getByLabel('Vida',{exact:true})).toHaveValue('18');await expect(host.getByLabel('Vida',{exact:true})).toHaveValue('15');
  await player.getByRole('button',{name:'Aplicar meu rascunho'}).click();await expect(host.getByLabel('Vida',{exact:true})).toHaveValue('18');
  await expect(player.locator('.field-status.conflict')).toHaveCount(0);
  await player.evaluate(()=>hostLink.send({kind:'action',action:'scene:add',payload:{title:'Cena não autorizada'}}));
  await host.waitForTimeout(200);
  await expect(host.locator('#sceneSelect option')).toHaveCount(1);
  await player.evaluate(()=>hostLink.close());
  await player.getByLabel('Vida',{exact:true}).fill('12');
  await expect(player.locator('#status')).toContainText('tentando novamente');
  await expect(player.locator('#status')).toContainText('mesa sincronizada',{timeout:15000});
  await player.locator('#tabSheets').click();await expect(player.locator('.char > textarea')).toHaveValue('PV: 24');
  await expect(host.getByLabel('Vida',{exact:true})).toHaveValue('12');
  await host.evaluate(()=>dispatch('scene:dimensions',{width:2000,height:1000}));
  await expect(player.locator('#canvas')).toHaveCSS('width','2000px');
  await player.evaluate(()=>{manualClose=true;clearTimeout(retryTimer);hostLink.close();const c=state.characters[0],f=c.fields.find(f=>f.name==='Vida');editSheetDraft(c.id,f.id,'11');clearTimeout(sheetDrafts.get(sheetKey(c.id,f.id)).timer);persistSheetDrafts()});
  await host.getByLabel('Vida',{exact:true}).fill('9');await host.getByRole('button',{name:'Salvar Vida',exact:true}).click();
  await player.reload();await player.locator('#roomCode').fill(room);await player.locator('#join').click();await expect(player.locator('#game')).toBeVisible({timeout:20000});await player.locator('#tabSheets').click();
  await expect(player.getByLabel('Vida',{exact:true})).toHaveValue('11');
  await expect(player.getByText('Este campo mudou em outro navegador.',{exact:false})).toBeVisible();
  await player.getByRole('button',{name:'Aplicar meu rascunho'}).click();await expect(host.getByLabel('Vida',{exact:true})).toHaveValue('11');


  // New session data, private projection, delta recovery and legacy fallback use the same clients.
  await host.evaluate(()=>{
   dispatch('token:add',{name:'Explorador'});dispatch('token:add',{name:'Emboscada secreta'});
   state.tokens[0].x=40;state.tokens[0].y=40;state.tokens[1].x=1000;state.tokens[1].y=700;
   dispatch('table:notes',{text:'SEGREDO_NOTAS'});dispatch('table:pin:save',{title:'SEGREDO_PIN',text:'Segredo',x:500,y:500,shared:false});
   dispatch('table:pin:save',{title:'Porta pública',text:'Conhecida',x:50,y:50,shared:true});
   dispatch('fog:toggle',{enabled:true});dispatch('fog:reveal',{x:0,y:0,width:200,height:200});
   for(const t of state.tokens)dispatch('table:combat:include',{id:t.id});dispatch('table:combat:start',{});
  });
  await expect.poll(()=>player.evaluate(()=>state.tokens.length)).toBe(1);
  await expect(player.locator('#scenePins')).toContainText('◆');
  expect(await player.evaluate(()=>JSON.stringify(state).includes('SEGREDO'))).toBe(false);
  await player.locator('#sessionDock').getByRole('button',{name:'Combate',exact:true}).click();await expect(player.locator('#combatBody')).toContainText('Explorador');await expect(player.locator('#combatBody')).not.toContainText('Emboscada');
  await player.evaluate(()=>hostLink.send({kind:'action',action:'table:notes',payload:{text:'Intruso'}}));await host.waitForTimeout(100);expect(await host.evaluate(()=>tableForScene(state,false).notes)).toBe('SEGREDO_NOTAS');
  const beforeMove=packets.length;
  await host.evaluate(()=>dispatch('move',{id:state.tokens[0].id,x:80,y:80}));await expect.poll(()=>player.evaluate(()=>state.tokens[0].x)).toBe(80);
  const movement=packets.slice(beforeMove).find(p=>p.kind==='state-delta');expect(movement).toBeTruthy();expect(movement.tokens.put).toHaveLength(1);expect(movement.changes).not.toHaveProperty('map');
  dropDelta=true;
  await host.evaluate(()=>dispatch('move',{id:state.tokens[0].id,x:90,y:80}));await expect.poll(()=>dropped).toBe(1);
  await host.evaluate(()=>dispatch('move',{id:state.tokens[0].id,x:100,y:80}));await expect.poll(()=>player.evaluate(()=>state.tokens[0].x)).toBe(100);expect(packets.some(p=>p.kind==='sync-request')).toBe(true);
  // Revoked fields cannot linger in a reconstructed recipient state.
  await host.evaluate(()=>dispatch('character:assign',{id:state.characters[0].id,playerId:''}));await expect.poll(()=>player.evaluate(()=>state.characters.length)).toBe(0);
  await host.evaluate(()=>{const c=[...contacts.values()][0];c.syncSupported=false;dispatch('move',{id:state.tokens[0].id,x:110,y:80})});await expect.poll(()=>player.evaluate(()=>state.tokens[0].x)).toBe(110);

 }finally{
  await Promise.allSettled([hostContext.close(),playerContext.close()]);
  await new Promise(resolve=>server.close(resolve));
 }
});
