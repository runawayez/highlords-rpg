const {test,expect}=require('@playwright/test');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
test('dois navegadores isolados autenticam e sincronizam ficha e chat',async({browser})=>{
 const server=http.createServer((req,res)=>{
  const file=path.join(process.cwd(),'p2p',req.url.startsWith('/assets/')?req.url.slice(1):'index.html');
  fs.readFile(file,(error,data)=>{
   res.setHeader('Content-Type',file.endsWith('.svg')?'image/svg+xml':'text/html');
   if(error){res.writeHead(404);res.end('Não encontrado')}else res.end(data);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port+'/';
 const hostContext=await browser.newContext(),playerContext=await browser.newContext();
 const host=await hostContext.newPage(),player=await playerContext.newPage();
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
  await host.locator('#host').click();await expect(host.locator('#game')).toBeVisible();
  const label=await host.locator('#roomLabel').textContent(),room=label.replace(/^Sala\s+/,'').trim();
  await player.goto(origin);
  await player.locator('#roomCode').fill(room);
  await player.locator('#guestName').fill('Convidado');
  await player.locator('#join').click();
  await expect(player.locator('#game')).toBeVisible({timeout:20000});
  await expect(player.locator('#status')).toContainText('sincronizada');
  await host.locator('#charName').fill('Guardião');
  await host.locator('#addChar').click();
  await host.locator('.char select').selectOption({label:'Convidado'});
  await expect(player.locator('.char strong')).toHaveText('Guardião');
  await player.locator('.char textarea').fill('PV: 24');
  await player.getByRole('button',{name:'Salvar ficha'}).click();
  await expect(host.locator('.char textarea')).toHaveValue('PV: 24');
  await player.locator('#message').fill('Olá, mestre');
  await player.locator('#send').click();
  await expect(host.locator('#history')).toContainText('Olá, mestre');
 }finally{
  await Promise.allSettled([hostContext.close(),playerContext.close()]);
  await new Promise(resolve=>server.close(resolve));
 }
});
