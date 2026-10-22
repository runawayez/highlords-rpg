/* Deltas operate exclusively on the already-authorized recipient projection. */
const SYNC_FIELDS = new Set(['schema','campaignId','boardWidth','boardHeight','title','updated','gridSize','gridKind','gridVisible','gridOriginX','gridOriginY','gridOpacity','gridSnap','layerVisibility','layerPolicy','activeSceneId','scenes','map','drawings','fog','chat','participants','characters','tabletop']);

const CHARACTER_SYNC_KEYS=new Set(['name','owner','text','textVersion']);
const FIELD_SYNC_KEYS=new Set(['name','type','value','version','format','section','visibility','editableByOwner']);
function entityDelta(previous,next,characters=false){
 const old=new Map(previous.map(x=>[x.id,x])),current=new Set(next.map(x=>x.id)),put=[],patch=[];
 for(const value of next){const before=old.get(value.id);if(!before){put.push(structuredClone(value));continue}
  const set={};for(const key of characters?CHARACTER_SYNC_KEYS:FIELD_SYNC_KEYS)if(JSON.stringify(before[key])!==JSON.stringify(value[key]))set[key]=structuredClone(value[key]);
  const fields=characters&&JSON.stringify(before.fields)!==JSON.stringify(value.fields)?entityDelta(before.fields||[],value.fields||[]):null;
  if(Object.keys(set).length||fields)patch.push({id:value.id,set,...(fields?{fields}:{})});
 }
 return {put,patch,drop:previous.filter(x=>!current.has(x.id)).map(x=>x.id),order:next.map(x=>x.id)};
}
function mergeEntities(previous,delta,characters=false){
 const limit=characters?50:40,allowed=characters?CHARACTER_SYNC_KEYS:FIELD_SYNC_KEYS;
 if(!delta||!['put','patch','drop','order'].every(k=>Array.isArray(delta[k])&&delta[k].length<=limit)||new Set(delta.order).size!==delta.order.length||!delta.order.every(id=>typeof id==='string'))return null;
 const values=new Map(previous.map(x=>[x.id,structuredClone(x)]));
 for(const id of delta.drop)if(typeof id!=='string'||!values.delete(id))return null;
 for(const value of delta.put){if(!value||typeof value.id!=='string'||values.has(value.id))return null;values.set(value.id,structuredClone(value))}
 for(const patch of delta.patch){const value=values.get(patch?.id);if(!value||!patch.set||typeof patch.set!=='object'||Array.isArray(patch.set)||Object.keys(patch.set).some(k=>!allowed.has(k)))return null;
  for(const [key,next] of Object.entries(patch.set))value[key]=structuredClone(next);
  if(patch.fields!==undefined){if(!characters)return null;const fields=mergeEntities(value.fields||[],patch.fields);if(!fields)return null;value.fields=fields}
 }
 if(values.size!==delta.order.length||delta.order.some(id=>!values.has(id)))return null;
 return delta.order.map(id=>values.get(id));
}

function viewDelta(previous,next,baseRevision,revision){
 const changes={};
 const characterPatch=Array.isArray(previous.characters)&&Array.isArray(next.characters)&&JSON.stringify(previous.characters)!==JSON.stringify(next.characters)?entityDelta(previous.characters,next.characters,true):null;
 for(const key of SYNC_FIELDS)if(!(key==='characters'&&characterPatch)&&JSON.stringify(previous[key])!==JSON.stringify(next[key]))changes[key]=structuredClone(next[key]);
 const oldTokens=new Map(previous.tokens.map(t=>[t.id,t])),newTokens=new Map(next.tokens.map(t=>[t.id,t]));
 const put=next.tokens.filter(t=>JSON.stringify(oldTokens.get(t.id))!==JSON.stringify(t)).map(t=>structuredClone(t));
 const drop=previous.tokens.filter(t=>!newTokens.has(t.id)).map(t=>t.id);
 const order=next.tokens.map(t=>t.id);
 return {kind:'state-delta',campaignId:next.campaignId,sceneId:next.activeSceneId,baseRevision,revision,changes,...(characterPatch?{characters:characterPatch}:{}),tokens:{put,drop,order}};
}
function mergeViewDelta(previous,message,currentRevision,currentSequence){
 if(message?.baseSequence!==undefined&&message.baseSequence!==currentSequence)return null;
 if(!message||message.baseRevision!==currentRevision||!Number.isSafeInteger(message.revision)||message.revision<currentRevision||message.campaignId!==previous.campaignId||message.sceneId!==previous.activeSceneId||!message.changes||typeof message.changes!=='object'||Array.isArray(message.changes))return null;
 if(Object.keys(message.changes).some(k=>!SYNC_FIELDS.has(k)))return null;
 const t=message.tokens;if(!t||!Array.isArray(t.put)||t.put.length>150||!Array.isArray(t.drop)||t.drop.length>150||!Array.isArray(t.order)||t.order.length>150||!t.put.every(x=>x&&typeof x.id==='string')||!t.drop.every(x=>typeof x==='string')||!t.order.every(x=>typeof x==='string')||new Set(t.order).size!==t.order.length)return null;
 const next=structuredClone(previous);for(const [k,v] of Object.entries(message.changes))next[k]=structuredClone(v);
 const tokens=new Map(next.tokens.map(t=>[t.id,t]));for(const id of t.drop)if(!tokens.delete(id))return null;for(const token of t.put)tokens.set(token.id,structuredClone(token));
 if(t.order.length!==tokens.size||t.order.some(id=>!tokens.has(id)))return null;
 next.tokens=t.order.map(id=>tokens.get(id));
 if(message.characters!==undefined){const characters=mergeEntities(next.characters||[],message.characters,true);if(!characters)return null;next.characters=characters}
 return next;
}
function sendSyncedView(conn,view,version,force=false){
 const sequence=(conn.syncSequence||0)+1,full={kind:'state',state:view,revision:version,syncSequence:sequence};let message=full;
 if(!force&&conn.syncSupported&&conn.syncView&&conn.syncView.campaignId===view.campaignId&&conn.syncView.activeSceneId===view.activeSceneId){
  const delta=viewDelta(conn.syncView,view,conn.syncRevision,version);
  delta.baseSequence=conn.syncSequence;delta.syncSequence=sequence;
  if(JSON.stringify(delta).length<JSON.stringify(full).length)message=delta;
 }
 conn.send(message);conn.syncView=structuredClone(view);conn.syncRevision=version;conn.syncSequence=sequence;
}
if(typeof module!=='undefined')module.exports={viewDelta,mergeViewDelta};
