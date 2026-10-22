/* Campaign extensions. Pure validation/projection helpers are also exercised in Node. */
const TABLE_LIMITS = Object.freeze({maps:20, templates:60, encounters:30, pins:80, combatants:150});
function emptyTabletop(){return {library:{maps:[],tokens:[],encounters:[]},scenes:{}}}
function emptySceneTable(){return {notes:'',pins:[],combat:{entries:[],index:0,round:0,active:false,expression:'1d20'}}}
function tableText(v,n){return typeof v==='string'&&v.length<=n}
function tableId(v){return typeof v==='string'&&v.length>0&&v.length<=100&&!Object.hasOwn(Object.prototype,v)&&v!=='prototype'}
function tableImage(v){return tableText(v,8500000)&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v)}
function uniqueTableIds(items){return new Set(items.map(x=>x?.id)).size===items.length}
function validTokenTemplate(t){return t&&tableId(t.id)&&tableText(t.name,100)&&Number.isFinite(t.size)&&t.size>=24&&t.size<=120&&tableText(t.characterId,100)&&tableText(t.resourceFieldId,100)}
function validTabletop(v){
 if(v===undefined)return true;
 if(!v||typeof v!=='object'||Array.isArray(v)||!v.library||!v.scenes||Array.isArray(v.scenes)||typeof v.scenes!=='object')return false;
 const {maps,tokens,encounters}=v.library;
 if(!Array.isArray(maps)||maps.length>TABLE_LIMITS.maps||!uniqueTableIds(maps)||!maps.every(m=>m&&tableId(m.id)&&tableText(m.name,100)&&tableText(m.tags,150)&&tableImage(m.data)))return false;
 if(!Array.isArray(tokens)||tokens.length>TABLE_LIMITS.templates||!uniqueTableIds(tokens)||!tokens.every(t=>validTokenTemplate(t)&&tableText(t.tags,150)))return false;
 if(!Array.isArray(encounters)||encounters.length>TABLE_LIMITS.encounters||!uniqueTableIds(encounters)||!encounters.every(e=>e&&tableId(e.id)&&tableText(e.name,100)&&tableText(e.tags,150)&&Number.isFinite(e.gridSize)&&e.gridSize>=20&&e.gridSize<=150&&Array.isArray(e.tokens)&&e.tokens.length>0&&e.tokens.length<=25&&uniqueTableIds(e.tokens)&&e.tokens.every(t=>validTokenTemplate(t)&&Number.isFinite(t.x)&&Number.isFinite(t.y)&&Math.abs(t.x)<=4096&&Math.abs(t.y)<=4096)))return false;
 const entries=Object.entries(v.scenes);if(entries.length>25)return false;
 return entries.every(([id,s])=>{
  if(!tableId(id)||!s||!tableText(s.notes,20000)||!Array.isArray(s.pins)||s.pins.length>TABLE_LIMITS.pins||!uniqueTableIds(s.pins))return false;
  if(!s.pins.every(p=>p&&tableId(p.id)&&tableText(p.title,100)&&tableText(p.text,10000)&&typeof p.shared==='boolean'&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=4096&&p.y>=0&&p.y<=4096))return false;
  const c=s.combat;
  return c&&Array.isArray(c.entries)&&c.entries.length<=150&&uniqueTableIds(c.entries)&&c.entries.every(e=>e&&tableId(e.id)&&Number.isFinite(e.value)&&Math.abs(e.value)<=100000)&&Number.isInteger(c.index)&&c.index>=0&&c.index<=Math.max(0,c.entries.length-1)&&Number.isInteger(c.round)&&c.round>=0&&c.round<=100000&&typeof c.active==='boolean'&&tableText(c.expression,30)&&/^(\d{1,2})d(4|6|8|10|12|20|100)([+-]\d{1,3})?$/i.test(c.expression)&&Number(c.expression.split('d')[0])<=30;
 });
}
function validSceneGrid(s){return (s.gridSize===undefined||Number.isInteger(s.gridSize)&&s.gridSize>=20&&s.gridSize<=150)&&(s.gridKind===undefined||['square','hex'].includes(s.gridKind))&&['gridOriginX','gridOriginY'].every(k=>s[k]===undefined||Number.isInteger(s[k])&&s[k]>=0&&s[k]<=150)&&(s.gridOpacity===undefined||Number.isInteger(s.gridOpacity)&&s.gridOpacity>=0&&s.gridOpacity<=100)&&['gridSnap','gridVisible'].every(k=>s[k]===undefined||typeof s[k]==='boolean')}
function tableForScene(campaign,create=true){
 if(!campaign.tabletop){if(!create)return emptySceneTable();campaign.tabletop=emptyTabletop()}
 const id=campaign.activeSceneId;if(!tableId(id))return emptySceneTable();
 if(!Object.hasOwn(campaign.tabletop.scenes,id)){if(!create)return emptySceneTable();campaign.tabletop.scenes[id]=emptySceneTable()}
 return campaign.tabletop.scenes[id];
}
function projectedTabletop(campaign,visibleTokens){
 const scene=tableForScene(campaign,false),visible=new Set(visibleTokens.map(t=>t.id)),combat=structuredClone(scene.combat);
 const current=combat.entries[combat.index]?.id;
 combat.entries=combat.entries.filter(e=>visible.has(e.id));
 const currentIndex=combat.entries.findIndex(e=>e.id===current);
 // An invisible combatant's turn does not identify another token as active.
 combat.index=Math.max(0,currentIndex);combat.active=combat.active&&currentIndex>=0;
 return {library:{maps:[],tokens:[],encounters:[]},scenes:campaign.activeSceneId?{[campaign.activeSceneId]:{notes:'',pins:scene.pins.filter(p=>p.shared).map(p=>structuredClone(p)),combat}}:{}};
}
function captureTableFormation(tokens,gridSize){
 const first=tokens[0];return tokens.map(t=>({...t,x:t.x-first.x,y:t.y-first.y}));
}
function placeTableFormation(templates,sourceGrid,targetGrid,anchor,width,height){
 const ratio=targetGrid/sourceGrid;
 return templates.map(t=>({...t,x:Math.max(0,Math.min(width-t.size,anchor.x+t.x*ratio)),y:Math.max(0,Math.min(height-t.size,anchor.y+t.y*ratio))}));
}
function calculateGridAlignment(a,b,cells=1){
 if(!Number.isInteger(cells)||cells<1||cells>20)return null;
 const size=Math.round(Math.hypot(b.x-a.x,b.y-a.y)/cells);if(size<20||size>150)return null;
 return {size,originX:((Math.round(a.x)%size)+size)%size,originY:((Math.round(a.y)%size)+size)%size};
}
if(typeof module!=='undefined')module.exports={emptyTabletop,emptySceneTable,validTabletop,projectedTabletop,captureTableFormation,placeTableFormation,calculateGridAlignment};
