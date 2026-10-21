const {test,expect}=require('@playwright/test');
test('WebRTC DataChannel comunica dois contextos reais do Chromium',async({browser})=>{
 const one=await browser.newContext(),two=await browser.newContext();
 const a=await one.newPage(),b=await two.newPage();
 try{
  await a.goto('about:blank');await b.goto('about:blank');
  await a.evaluate(()=>{window.pc=new RTCPeerConnection({iceServers:[]});window.channel=pc.createDataChannel('highlords');window.messages=[];channel.onmessage=e=>messages.push(e.data)});
  await b.evaluate(()=>{window.pc=new RTCPeerConnection({iceServers:[]});window.messages=[];pc.ondatachannel=e=>{window.channel=e.channel;channel.onmessage=m=>{messages.push(m.data);channel.send('ack:'+m.data)}}});
  const offer=await a.evaluate(async()=>{await pc.setLocalDescription(await pc.createOffer());await new Promise(resolve=>{if(pc.iceGatheringState==='complete')resolve();else pc.addEventListener('icegatheringstatechange',()=>{if(pc.iceGatheringState==='complete')resolve()})});return pc.localDescription});
  const answer=await b.evaluate(async offer=>{await pc.setRemoteDescription(offer);await pc.setLocalDescription(await pc.createAnswer());await new Promise(resolve=>{if(pc.iceGatheringState==='complete')resolve();else pc.addEventListener('icegatheringstatechange',()=>{if(pc.iceGatheringState==='complete')resolve()})});return pc.localDescription},offer);
  await a.evaluate(async answer=>{await pc.setRemoteDescription(answer)},answer);
  await expect.poll(()=>a.evaluate(()=>channel.readyState),{timeout:15000}).toBe('open');
  await expect.poll(()=>b.evaluate(()=>channel?.readyState),{timeout:15000}).toBe('open');
  await a.evaluate(()=>channel.send('mesa-conectada'));
  await expect.poll(()=>a.evaluate(()=>messages.includes('ack:mesa-conectada')),{timeout:10000}).toBe(true);
  await expect.poll(()=>b.evaluate(()=>messages.includes('mesa-conectada'))).toBe(true);
 }finally{await Promise.allSettled([a.evaluate(()=>pc?.close()),b.evaluate(()=>pc?.close())]);await Promise.allSettled([one.close(),two.close()])}
});
