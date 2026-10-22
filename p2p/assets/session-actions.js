/* All persistent table actions are host-only, bounded and committed atomically. */
function tokenTemplate(token){return {id:uid(),name:token.name,size:token.size||56,characterId:token.characterId||'',resourceFieldId:token.resourceFieldId||''}}
function applyTableAction(action,p,id){
 if(!hostMode||id!==myId||!tableId(state.activeSceneId))return false;
 const data=structuredClone(state.tabletop||emptyTabletop()),scene=Object.hasOwn(data.scenes,state.activeSceneId)?data.scenes[state.activeSceneId]:(data.scenes[state.activeSceneId]=emptySceneTable()),library=data.library;
 let newTokens=null,grid=null,map=null;
 const name=typeof p.name==='string'?p.name.trim():'';
 const group=Array.isArray(p.ids)?p.ids.map(id=>state.tokens.find(t=>t.id===id)):[];
 switch(action){
 case 'table:map:save':
  if(!name||!tableImage(p.data)||library.maps.length>=20)return false;
  library.maps.push({id:uid(),name,tags:String(p.tags||''),data:p.data});break;
 case 'table:map:use':{
  const m=library.maps.find(m=>m.id===p.id);if(!m||state.layerPolicy?.map?.locked)return false;map=m.data;break;
 }
 case 'table:asset:edit':{
  if(!['maps','tokens','encounters'].includes(p.kind)||!name)return false;const asset=library[p.kind].find(x=>x.id===p.id);if(!asset)return false;asset.name=name;asset.tags=String(p.tags||'');break;
 }
 case 'table:asset:remove':
  if(!['maps','tokens','encounters'].includes(p.kind)||!library[p.kind].some(x=>x.id===p.id))return false;
  library[p.kind]=library[p.kind].filter(x=>x.id!==p.id);break;
 case 'table:token:save':{
  const token=state.tokens.find(t=>t.id===p.id);if(!token||library.tokens.length>=60)return false;
  library.tokens.push({...tokenTemplate(token),name:name||token.name,tags:String(p.tags||'')});break;
 }
 case 'table:encounter:save':
  if(!name||!group.length||group.length>25||group.some(t=>!t)||new Set(p.ids).size!==p.ids.length||library.encounters.length>=30)return false;
  library.encounters.push({id:uid(),name,tags:String(p.tags||''),gridSize:state.gridSize||60,tokens:captureTableFormation(group.map(t=>({...tokenTemplate(t),x:t.x,y:t.y})),state.gridSize||60)});break;
 case 'table:spawn':{
  if(state.layerPolicy?.tokens?.locked||!['tokens','encounters'].includes(p.kind))return false;
  const asset=library[p.kind].find(x=>x.id===p.id);if(!asset)return false;
  const templates=p.kind==='tokens'?[{...asset,x:0,y:0}]:asset.tokens;
  if(state.tokens.length+templates.length>150)return false;
  const center={x:Math.max(0,Math.min(boardWidth(),Number.isFinite(p.x)?p.x:boardWidth()/2)),y:Math.max(0,Math.min(boardHeight(),Number.isFinite(p.y)?p.y:boardHeight()/2))};
  newTokens=placeTableFormation(templates,asset.gridSize||state.gridSize||60,state.gridSize||60,center,boardWidth(),boardHeight()).map(t=>({id:uid(),name:t.name,size:t.size,x:t.x,y:t.y,owner:'',characterId:state.characters.some(c=>c.id===t.characterId)?t.characterId:'',resourceFieldId:state.characters.find(c=>c.id===t.characterId)?.fields?.some(f=>f.id===t.resourceFieldId)?t.resourceFieldId:''}));break;
 }
 case 'table:notes':if(typeof p.text!=='string')return false;scene.notes=p.text;break;
 case 'table:pin:save':{
  if(!tableText(p.title,100)||!p.title.trim()||!tableText(p.text,10000)||typeof p.shared!=='boolean'||![p.x,p.y].every(Number.isFinite)||p.x<0||p.y<0||p.x>boardWidth()||p.y>boardHeight())return false;
  const pin=scene.pins.find(x=>x.id===p.id);if(!pin&&scene.pins.length>=80)return false;
  const value={id:pin?.id||uid(),title:p.title,text:p.text,shared:p.shared,x:p.x,y:p.y};
  if(pin)scene.pins[scene.pins.indexOf(pin)]=value;else scene.pins.push(value);break;
 }
 case 'table:pin:remove':scene.pins=scene.pins.filter(x=>x.id!==p.id);break;
 case 'table:grid':
  if(state.layerPolicy?.map?.locked||!Number.isInteger(p.size)||p.size<20||p.size>150||![p.originX,p.originY].every(x=>Number.isInteger(x)&&x>=0&&x<=150))return false;
  grid=p;break;
 case 'table:combat:include':{
  const token=state.tokens.find(t=>t.id===p.id);if(!token)return false;
  if(!scene.combat.entries.some(e=>e.id===p.id))scene.combat.entries.push({id:p.id,value:0});break;
 }
 case 'table:combat:remove':{
  const current=scene.combat.entries[scene.combat.index]?.id;
  scene.combat.entries=scene.combat.entries.filter(e=>e.id!==p.id);scene.combat.index=Math.max(0,scene.combat.entries.findIndex(e=>e.id===current));break;
 }
 case 'table:combat:value':{
  const entry=scene.combat.entries.find(e=>e.id===p.id);if(!entry||!Number.isFinite(p.value))return false;entry.value=p.value;break;
 }
 case 'table:combat:order':{
  const entries=scene.combat.entries,i=entries.findIndex(e=>e.id===p.id),j=i+p.direction,current=entries[scene.combat.index]?.id;
  if(![-1,1].includes(p.direction)||i<0||j<0||j>=entries.length)return false;
  [entries[i],entries[j]]=[entries[j],entries[i]];scene.combat.index=Math.max(0,entries.findIndex(e=>e.id===current));break;
 }
 case 'table:combat:roll':{
  const match=/^(\d{1,2})d(4|6|8|10|12|20|100)([+-]\d{1,3})?$/i.exec(String(p.expression||'').replace(/\s/g,''));if(!match||+match[1]<1||+match[1]>30)return false;
  scene.combat.expression=match[0];
  const entries=scene.combat.entries;for(const e of entries){e.value=Number(match[3]||0);for(let i=0;i<+match[1];i++)e.value+=crypto.getRandomValues(new Uint32Array(1))[0]%Number(match[2])+1}
  entries.sort((a,b)=>b.value-a.value);scene.combat.index=0;scene.combat.round=0;scene.combat.active=false;break;
 }
 case 'table:combat:start':if(!scene.combat.entries.length)return false;scene.combat.active=true;scene.combat.round=1;scene.combat.index=0;break;
 case 'table:combat:stop':scene.combat.active=false;break;
 case 'table:combat:step':{
  const c=scene.combat;if(!c.active||!c.entries.length||![-1,1].includes(p.direction))return false;
  if(p.direction===-1&&c.index===0&&c.round<=1)return false;
  c.index+=p.direction;if(c.index>=c.entries.length){c.index=0;c.round++}if(c.index<0){c.index=c.entries.length-1;c.round--}break;
 }
 default:return false;
 }
 if(!validTabletop(data))return false;
 update(()=>{state.tabletop=data;if(newTokens)state.tokens.push(...newTokens);if(map!==null)state.map=map;if(grid){state.gridSize=grid.size;state.gridOriginX=grid.originX;state.gridOriginY=grid.originY;state.gridVisible=true}});
 if(map!==null)fitBoard();return true;
}
function reconcileTableCombat(){
 if(!state.tabletop)return;
 const scene=tableForScene(state,false),c=scene.combat,current=c.entries[c.index]?.id;
 c.entries=c.entries.filter(e=>state.tokens.some(t=>t.id===e.id));c.index=Math.max(0,c.entries.findIndex(e=>e.id===current));if(!c.entries.length)c.active=false;
}
