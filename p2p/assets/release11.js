/* Highlords 1.1: campaign-scoped recovery and board/sheet integration. */
let loadedDraftScope = '';
function draftScope() {
  return state.campaignId && myId ? 'hl-sheet-drafts:' + state.campaignId + ':' + myId : '';
}
function persistSheetDrafts() {
  const scope = draftScope();
  if (!scope || loadedDraftScope !== scope) return;
  try {
    const drafts = [...sheetDrafts.values()].map(({timer, ...d}) => ({...d, pending:false}));
    if (drafts.length) localStorage.setItem(scope, JSON.stringify(drafts));
    else localStorage.removeItem(scope);
  } catch { $('saveStatus').textContent = 'Não foi possível guardar os rascunhos neste navegador. Mantenha a mesa aberta até sincronizar.'; }
}
function loadPersistedSheetDrafts() {
  const scope = draftScope();
  if (!scope || loadedDraftScope === scope) return;
  resetSheetDrafts();
  loadedDraftScope = scope;
  try {
    const drafts = JSON.parse(localStorage.getItem(scope) || '[]');
    if (!Array.isArray(drafts) || drafts.length > 2050) return;
    for (const d of drafts) {
      if (!d || typeof d.id !== 'string' || typeof d.value !== 'string' || d.value.length > 30000 || !Number.isSafeInteger(d.baseVersion) || d.baseVersion < 0) continue;
      const current = sheetValue(d.id,d.fieldId);
      if (!current || !hostMode && (current.character.owner !== myId || current.field?.visibility === 'master' || current.field?.editableByOwner === false)) continue;
      sheetDrafts.set(sheetKey(d.id,d.fieldId), {...d,pending:false,timer:null});
    }
  } catch { announce('Não foi possível recuperar os rascunhos locais.'); }
}
function renderTokenBinding(node, token) {
  const label = document.createElement('label'); label.textContent = 'Ficha vinculada';
  const select = document.createElement('select');select.setAttribute('aria-label','Ficha do token');
  select.add(new Option('Sem vínculo',''));
  for (const c of state.characters) select.add(new Option(c.name,c.id));
  select.value = token.characterId || '';
  select.onchange = () => dispatch('token:bind',{id:token.id,characterId:select.value,resourceFieldId:''});
  label.append(select);node.append(label);
  const c = state.characters.find(c=>c.id===token.characterId);
  if (!c) return;
  const resource = document.createElement('label');resource.textContent='Barra de recurso';
  const fields=document.createElement('select');fields.setAttribute('aria-label','Recurso do token');fields.add(new Option('Ocultar',''));
  for(const f of c.fields||[]) if(f.type==='resource')fields.add(new Option(f.name,f.id));
  fields.value=token.resourceFieldId||'';
  fields.onchange=()=>dispatch('token:bind',{id:token.id,characterId:c.id,resourceFieldId:fields.value});
  resource.append(fields);node.append(resource);
}
function decorateToken(el,token) {
  const c=state.characters.find(c=>c.id===token.characterId);
  el.title=token.name+' · '+(!state.layerPolicy?.tokens?.locked&&(hostMode||token.owner===myId)?'Você pode mover o token':'Arraste para mover o mapa · token sem permissão de movimento')+(c?' · Duplo clique para abrir a ficha':'');
  if(!c)return;
  const portrait=(c.fields||[]).find(f=>f.type==='portrait'&&f.value&&(hostMode||f.visibility!=='master'));
  if(portrait){const img=document.createElement('img');img.src=portrait.value;img.alt='';img.draggable=false;img.className='token-portrait';el.prepend(img)}
  const field=(c.fields||[]).find(f=>f.id===token.resourceFieldId&&f.type==='resource'&&(hostMode||f.visibility!=='master'));
  if(field){try{const [value,max]=JSON.parse(field.value);if(Number.isFinite(value)&&Number.isFinite(max)&&max>0){const bar=document.createElement('span');bar.className='token-resource';bar.setAttribute('role','meter');bar.setAttribute('aria-label',field.name);bar.setAttribute('aria-valuenow',value);bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',max);bar.title=field.name+': '+value+'/'+max;const fill=document.createElement('i');fill.style.width=Math.max(0,Math.min(100,value/max*100))+'%';bar.append(fill);el.append(bar)}}catch{}}
  el.ondblclick=e=>{e.stopPropagation();$('tabSheets').click();[...$('characters').children].find(el=>el.dataset.character===c.id)?.scrollIntoView({block:'nearest',behavior:'smooth'})};
}
async function refreshCampaignLibrary() {
  try {
    const db=await openDb();
    const records=await new Promise((resolve,reject)=>{const tx=db.transaction('saves','readonly'),req=tx.objectStore('saves').getAll();tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error)});
    const seen=new Set();recoveryCandidates=records.map(x=>x?.state||x).filter(isValidState).sort((a,b)=>b.updated-a.updated).filter(c=>{const key=(c.campaignId||c.title)+':'+c.updated;if(seen.has(key))return false;seen.add(key);return true});
    populateCampaignRecovery(recoveryCandidates);
  } catch { /* The existing autosave status reports storage failures. */ }
}
addEventListener('DOMContentLoaded',()=>{
  const dimensions=document.createElement('fieldset');dimensions.className='scene-dimensions';
  dimensions.innerHTML='<legend>Dimensões da cena</legend><label>Largura <input id="sceneWidth" aria-label="Largura da cena" type="number" min="240" max="4096" value="1200"></label><label>Altura <input id="sceneHeight" aria-label="Altura da cena" type="number" min="240" max="4096" value="800"></label><button type="button" id="applySceneDimensions">Aplicar dimensões</button><button type="button" id="matchMapDimensions">Usar proporção do mapa</button><small>240–4096 px. Objetos e áreas reveladas acompanham o redimensionamento.</small>';
  $('upload').parentElement.after(dimensions);
  $('applySceneDimensions').onclick=()=>dispatch('scene:dimensions',{width:Number($('sceneWidth').value),height:Number($('sceneHeight').value)});
  $('matchMapDimensions').onclick=()=>{const img=$('map');if(!img.naturalWidth)return announce('Adicione um mapa primeiro');const factor=Math.min(1,4096/Math.max(img.naturalWidth,img.naturalHeight));const width=Math.round(img.naturalWidth*factor),height=Math.round(img.naturalHeight*factor);if(Math.min(width,height)<240)return announce('O mapa precisa ter pelo menos 240 px em cada dimensão');dispatch('scene:dimensions',{width,height})};
  const previousRender=renderWorkspace;renderWorkspace=()=>{previousRender();if(document.activeElement!==$('sceneWidth'))$('sceneWidth').value=boardWidth();if(document.activeElement!==$('sceneHeight'))$('sceneHeight').value=boardHeight()};
  const keys={v:'pan',b:'draw',l:'line',r:'rectangle',o:'ellipse',e:'eraser',m:'ruler',f:'reveal'};
  for(const [key,tool] of Object.entries(keys)){const button=$('toolButtons').querySelector('[data-tool="'+tool+'"]');button.title+=' ('+key.toUpperCase()+')';button.setAttribute('aria-keyshortcuts',key)}
  document.addEventListener('keydown',e=>{
    if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.target.isContentEditable||e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.key==='Escape'){if(drag||sketch)finishPointer({pointerId:(drag||sketch).pointerId},true);selectedTokens.clear();selectedToken=null;selectedDrawing=-1;selectBoardTool('pan');render();return}
    if(hostMode&&keys[e.key.toLowerCase()]){e.preventDefault();$('toolButtons').querySelector('[data-tool="'+keys[e.key.toLowerCase()]+'"]').click()}
  });
  $('board').addEventListener('dblclick',e=>{
    if(hostMode&&activeTool!=='pan'||e.target.closest('#boardToolbar,#sceneBar,#zoomControls'))return;
    const p=boardPoint(e),token=[...state.tokens].reverse().find(t=>p.x>=t.x&&p.x<=t.x+(t.size||56)&&p.y>=t.y&&p.y<=t.y+(t.size||56));
    if(!token)return;
    const c=state.characters.find(c=>c.id===token.characterId);if(!c)return;
    $('tabSheets').click();[...$('characters').children].find(el=>el.dataset.character===c.id)?.scrollIntoView({block:'nearest',behavior:'smooth'});
  });
  addEventListener('pagehide',persistSheetDrafts);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)persistSheetDrafts()});
});
async function migrateLegacyCampaigns(db,candidates) {
  const groups=new Map(),records=[];
  for(const c of candidates){
    if(!isValidState(c)||c.campaignId)continue;
    const key=(c.title||'')+':'+(c.scenes?.[0]?.id||'legacy');
    if(!groups.has(key))groups.set(key,crypto.randomUUID());
    c.campaignId=groups.get(key);records.push(c);
  }
  if(!records.length)return;
  await new Promise((resolve,reject)=>{
    const tx=db.transaction('saves','readwrite'),store=tx.objectStore('saves');
    for(const c of records.sort((a,b)=>a.updated-b.updated)){store.put(c,'campaign:'+c.campaignId);store.put({timestamp:c.updated,state:c},'checkpoint:'+c.campaignId+':'+c.updated)}
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
}

function populateCampaignRecovery(candidates) {
  const select=$('recoveryChoice');select.replaceChildren();
  const groups=new Map();
  for(const [index,c] of candidates.entries()){
    const key=c.campaignId||c.title;
    if(!groups.has(key)){const group=document.createElement('optgroup');group.label=c.title||'Sem título';groups.set(key,group);select.append(group)}
    const group=groups.get(key),date=Number.isFinite(c.updated)?new Date(c.updated).toLocaleString('pt-BR'):'Data desconhecida';
    group.append(new Option((c.title||'Sem título')+' · '+date+(group.children.length?' · checkpoint':' · último estado'),String(index)));
  }
  $('recoveryPanel').hidden=!candidates.length;
  $('recoveryTitle').textContent='Biblioteca de campanhas';
  $('recoveryHelp').textContent=groups.size+' campanha(s) neste navegador, com checkpoints separados. Exporte .highlords para guardar uma cópia fora do navegador.';
}
