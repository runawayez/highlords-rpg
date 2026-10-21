// Browser smoke tests for the published P2P frontend (no external signaling required).
const {test,expect}=require('@playwright/test');
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
 connect(){const c={open:true,peer:'hl-mock-room',handlers:{},on(event,cb){(this.handlers[event]||=[]).push(cb)},send(m){if(m.kind==='hello')setTimeout(()=>{for(const cb of this.handlers.data||[])cb({kind:'state',revision:1,state:{schema:1,title:'Teste',updated:Date.now(),activeSceneId:'scene-1',scenes:[{id:'scene-1',title:'Cena teste'}],map:'',tokens:[],drawings:[],fog:{enabled:false,reveals:[]},characters:[],chat:[]}})},15)},close(){this.open=false;for(const cb of this.handlers.close||[])cb()}};setTimeout(()=>{for(const cb of c.handlers.open||[])cb()},10);return c}
 reconnect(){this.disconnected=false;this.emit('open',this.id)}
}
window.Peer=Peer;`}))}
test('home mostra compromisso de gratuidade e identidade',async({page})=>{await mockPeer(page);await page.goto(url());await expect(page.getByText('Highlords RPG é e sempre será gratuito.')).toBeVisible();await expect(page.locator('#host')).toBeVisible();await expect(page.locator('#join')).toBeVisible()});
test('mestre cria mesa, cena, ficha, token e exporta',async({page})=>{await mockPeer(page);await page.goto(url());await page.locator('#host').click();await expect(page.locator('#game')).toBeVisible();await page.locator('#tokenName').fill('Goblin');await page.locator('#addToken').click();await expect(page.locator('.piece').getByText('Goblin')).toBeVisible();await page.locator('#charName').fill('Thorin');await page.locator('#addChar').click();await expect(page.locator('.char strong').getByText('Thorin')).toBeVisible();page.once('dialog',d=>d.accept('Masmorra'));await page.locator('#newScene').click();await expect(page.locator('#sceneSelect option')).toHaveCount(2);const download=page.waitForEvent('download');await page.locator('#export').click();const file=await download;expect(file.suggestedFilename()).toMatch(/\\.highlords$/);await expect(page.locator('#saveStatus')).toContainText(/Salvo|pendentes|salvamento/,{timeout:7000})});
test('jogador só abre mesa depois de sincronização',async({page})=>{await mockPeer(page);await page.goto(url());await page.locator('#roomCode').fill('hl-12345678-1234-1234-1234-123456789abc');await page.locator('#guestName').fill('Jogador');await page.locator('#join').click();await expect(page.locator('#game')).toBeVisible();await expect(page.locator('#status')).toContainText('sincronizada');await expect(page.locator('#masterTools')).toBeHidden()});
