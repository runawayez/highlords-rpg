'use strict';
// TURN integration is intentionally disabled by product decision.
// This endpoint MUST NOT issue credentials or contact any TURN provider,
// even if an operator accidentally configures TURN environment variables.
// The historical broker implementation is retained below for future review.
module.exports = async function disabledTurn(req,res){
 res.setHeader('Cache-Control','no-store, private');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'method_not_allowed'})}
 return res.status(503).json({error:'turn_disabled'});
};

/*
'use strict';
// Optional TURN broker. Requires a dedicated Cloudflare Realtime TURN key.
// Keep TURN_KEY_API_TOKEN server-side. Protect this endpoint with a production
// rate-limit rule before enabling: TURN relay bandwidth is billable.
module.exports = async function handler(req,res){
 res.setHeader('Cache-Control','no-store, private');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'method_not_allowed'})}
 if(process.env.TURN_ENABLED!=='true'||!process.env.TURN_KEY_ID||!process.env.TURN_KEY_API_TOKEN)
  return res.status(503).json({error:'turn_not_configured'});
 const origin=req.headers.origin;
 const forwardedProto=(req.headers['x-forwarded-proto']||'https').split(',')[0];
 const host=req.headers.host;
 if(origin && origin!==forwardedProto+'://'+host)
  return res.status(403).json({error:'cross_origin'});
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),4000);
 try{
  const response=await fetch('https://rtc.live.cloudflare.com/v1/turn/keys/'+encodeURIComponent(process.env.TURN_KEY_ID)+'/credentials/generate-ice-servers',{
   method:'POST',headers:{Authorization:'Bearer '+process.env.TURN_KEY_API_TOKEN,'Content-Type':'application/json'},
   body:JSON.stringify({ttl:3600}),signal:controller.signal
  });
  if(!response.ok)throw new Error('upstream_failure');
  const payload=await response.json();
  if(!Array.isArray(payload.iceServers)||payload.iceServers.length===0)throw new Error('invalid_upstream');
  const iceServers=payload.iceServers.filter(x=>x&&Array.isArray(x.urls)&&x.urls.length<16&&x.urls.every(url=>typeof url==='string'&&/^(stun:|stuns:|turn:|turns:)/.test(url))&&(!x.username||typeof x.username==='string')&&(!x.credential||typeof x.credential==='string')).slice(0,6);
  if(!iceServers.length)throw new Error('empty_ice');
  return res.status(200).json({iceServers,ttl:3600});
 }catch{return res.status(502).json({error:'turn_unavailable'})}
 finally{clearTimeout(timeout)}
};

*/
