async function openHostSection(page,name){await page.locator('#tabTools').click();await page.locator('.workspace-sections').getByRole('button',{name:name==='tokens'?'Tokens':name==='properties'?'Propriedades':'Mapa',exact:true}).click()}
const {test,expect}=require('@playwright/test');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
test('dois navegadores isolados autenticam e sincronizam ficha e chat',async({browser})=>{
 const server=http.createServer((req,res)=>{
  const file=path.join(process.cwd(),'p2p',req.url.startsWith('/assets/')?req.url.slice(1):'index.html');
  fs.readFile(file,(error,data)=>{
   res.setHeader('Content-Type',file.endsWith('.svg')?'image/svg+xml':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');
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

 const peers=new Map();
 async function wire(page){
  await page.exposeFunction('__p2pBridge',async message=>{
   if(message.kind==='register'){peers.set(message.id,page);return true}
   if(message.kind==='relay'){
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
  await host.goto(origin);await host.locator('#hostName').fill('Mestre');
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

 }finally{
  await Promise.allSettled([hostContext.close(),playerContext.close()]);
  await new Promise(resolve=>server.close(resolve));
 }
});
