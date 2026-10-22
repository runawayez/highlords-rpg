/* Session tools use the campaign model and existing host-authoritative actions. */
let sessionReady=false,libraryKind='maps',libraryQuery='',pinPlacement=false,pinPlacementScene='',gridAlignment=null,inspectorDismissed='';
function sessionNode(tag,text,cls){return sheetElement(tag,text,cls)}
function sessionButton(text,fn){const b=sheetButton(text,fn);b.type='button';return b}
function sessionField(label,type='text',value=''){const wrap=sessionNode('label',label),input=document.createElement(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.value=value;input.setAttribute('aria-label',label);wrap.append(input);return {wrap,input}}
function sessionDialog(id,title){
 const dialog=document.createElement('dialog');dialog.id=id;dialog.className='session-dialog';const header=sessionNode('header'),heading=sessionNode('h2',title);heading.id=id+'Title';dialog.setAttribute('aria-labelledby',heading.id);
 const close=sessionButton('Fechar',()=>dialog.close());close.setAttribute('aria-label','Fechar '+title);header.append(heading,close);const body=sessionNode('div',undefined,'session-dialog-body');dialog.append(header,body);document.body.append(dialog);return {dialog,body,heading};
}
function showSessionDialog(dialog){if(!dialog.open)dialog.showModal()}
function sessionNotice(text){const dialogs=[...document.querySelectorAll('.session-dialog[open]')];const dialog=dialogs.at(-1);let el=dialog?.querySelector('.session-feedback');if(dialog&&!el){el=sessionNode('p',undefined,'session-feedback');el.setAttribute('role','status');dialog.querySelector('.session-dialog-body').append(el)}el||=$('sessionNotice');if(el)el.textContent=text;else announce(text)}
function focusTableToken(token){
 offset={x:$('board').clientWidth/2-(token.x+(token.size||56)/2)*zoom,y:$('board').clientHeight/2-(token.y+(token.size||56)/2)*zoom};transform();
 if(hostMode){selectedToken=token.id;selectedTokens.clear();selectedTokens.add(token.id);inspectorDismissed='';render()}
}
function openTokenSheet(token){
 if(!state.characters.some(c=>c.id===token.characterId))return sessionNotice('Nenhuma ficha disponível para este token.');
 $('tabSheets').click();[...$('characters').children].find(el=>el.dataset.character===token.characterId)?.scrollIntoView({block:'nearest'});
}
function saveSelectedEncounter(){
 const ids=selectedTokens.size?[...selectedTokens]:selectedToken?[selectedToken]:[];
 if(!ids.length)return sessionNotice('Selecione um ou mais tokens para salvar o encontro.');
 const {dialog,body}=sessionDialog('saveEncounterDialog','Salvar encontro');
 const name=sessionField('Nome do encontro'),tags=sessionField('Tags do encontro');name.input.maxLength=100;tags.input.maxLength=150;
 body.append(sessionNode('p',ids.length+' token(s). A formação será preservada.'),name.wrap,tags.wrap,sessionButton('Salvar encontro',()=>{if(!name.input.value.trim())return name.input.focus();if(applyTableAction('table:encounter:save',{ids,name:name.input.value,tags:tags.input.value},myId)){dialog.close();sessionNotice('Encontro salvo na biblioteca.')}else sessionNotice('Não foi possível salvar. O limite é 25 tokens por encontro e 30 encontros.')}));
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});showSessionDialog(dialog);
}
function startPinPlacement(){if(!hostMode)return;pinPlacement=true;pinPlacementScene=state.activeSceneId;gridAlignment=null;$('sessionNotice').textContent='';renderSession()}
function openPinEditor(pin){
 cancelTablePlacement();
 const {dialog,body}=sessionDialog('pinEditor','Marcador da cena');
 const title=sessionField('Título do marcador','text',pin.title||''),text=sessionField('Nota do marcador','textarea',pin.text||'');title.input.maxLength=100;text.input.maxLength=10000;
 body.append(title.wrap,text.wrap);
 if(hostMode){
  const shared=sessionField('Compartilhar com jogadores','checkbox');shared.input.checked=!!pin.shared;
  body.append(shared.wrap,sessionNode('p','Marcadores compartilhados ficam visíveis mesmo fora da área revelada. Compartilhe somente o que o grupo já conhece.','muted'));
  body.append(sessionButton('Salvar marcador',()=>{if(!title.input.value.trim())return title.input.focus();if(applyTableAction('table:pin:save',{...pin,title:title.input.value,text:text.input.value,shared:shared.input.checked},myId))dialog.close()}));
  if(pin.id)body.append(sessionButton('Excluir marcador',()=>{dispatch('table:pin:remove',{id:pin.id});dialog.close()}));
 }else{title.input.readOnly=true;text.input.readOnly=true}
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});showSessionDialog(dialog);
}
function openSceneNotes(){
 if(!hostMode)return;const {dialog,body}=sessionDialog('sceneNotesDialog','Notas da cena');const field=sessionField('Anotações privadas do mestre','textarea',tableForScene(state,false).notes);field.input.maxLength=20000;
 body.append(field.wrap,sessionButton('Salvar notas',()=>{dispatch('table:notes',{text:field.input.value});dialog.close()}));dialog.addEventListener('close',()=>dialog.remove(),{once:true});showSessionDialog(dialog);
}
function startGridAlignment(){
 if(!hostMode)return;pinPlacement=false;const {dialog,body}=sessionDialog('gridSetup','Alinhar grade');
 body.append(sessionNode('p',state.gridKind==='hex'?'Clique em dois centros de hexágonos da mesma linha.':'Clique em duas interseções da mesma linha ou coluna da grade impressa.'));
 const count=sessionField('Distância em células','number','1');count.input.min=1;count.input.max=20;
 body.append(count.wrap,sessionButton('Marcar no mapa',()=>{const cells=Number(count.input.value);if(!Number.isInteger(cells)||cells<1||cells>20)return count.input.focus();gridAlignment={cells,points:[],sceneId:state.activeSceneId};dialog.close();renderSession()}));
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});showSessionDialog(dialog);
}
function cancelTablePlacement(){pinPlacement=false;pinPlacementScene='';gridAlignment=null;$('sessionNotice').textContent='';renderEditorGrid();$('gridPreview')?.replaceChildren();renderSession()}
function finishGridAlignment(){
 const alignment=gridAlignment,result=calculateGridAlignment(...alignment.points,alignment.cells);
 if(!result){cancelTablePlacement();return sessionNotice('A célula deve medir entre 20 e 150 px. Marque mais células ou aproxime os pontos.')}
 // The preview changes only the grid element; the campaign is untouched until Apply.
 $('grid').hidden=false;$('grid').style.backgroundImage='linear-gradient(to right,#ff466c 1px,transparent 1px),linear-gradient(to bottom,#ff466c 1px,transparent 1px)';
 $('grid').style.backgroundSize=result.size+'px '+result.size+'px';$('grid').style.backgroundPosition=result.originX+'px '+result.originY+'px';$('grid').style.opacity='.6';
 if(state.gridKind==='hex'){
  const old={gridSize:state.gridSize,gridOriginX:state.gridOriginX,gridOriginY:state.gridOriginY,gridVisible:state.gridVisible};
  try{Object.assign(state,{gridSize:result.size,gridOriginX:result.originX,gridOriginY:result.originY,gridVisible:true});renderEditorGrid()}finally{Object.assign(state,old)}
 }
 const {dialog,body}=sessionDialog('gridConfirm','Prévia da grade');body.append(sessionNode('p','Célula: '+result.size+' px · origem: '+result.originX+', '+result.originY),sessionButton('Aplicar grade',()=>{if(alignment.sceneId===state.activeSceneId)dispatch('table:grid',result);dialog.close()}),sessionButton('Cancelar alinhamento',()=>dialog.close()));
 dialog.addEventListener('close',()=>{dialog.remove();cancelTablePlacement()},{once:true});showSessionDialog(dialog);
}
async function openPlayerPreview(){
 if(!hostMode)return;const {dialog,body}=sessionDialog('playerPreview','Visão do jogador');
 const select=document.createElement('select');select.setAttribute('aria-label','Jogador da prévia');select.add(new Option('Visitante sem ficha','__visitor__'));
 const people=new Map();for(const c of contacts.values())if(c.playerId)people.set(c.playerId,c.playerName);for(const c of state.characters)if(c.owner&&!people.has(c.owner))people.set(c.owner,c.name+' · proprietário');
 for(const [id,name] of people)select.add(new Option(name,id));const content=sessionNode('div');body.append(select,sessionButton('Atualizar prévia',refresh),content);let request=0;
 async function refresh(){const version=++request;content.textContent='Carregando prévia…';try{const view=await recipientView(select.value);if(version!==request||!dialog.open)return;content.replaceChildren();
  const stage=sessionNode('div',undefined,'preview-stage');stage.style.aspectRatio=view.boardWidth+'/'+view.boardHeight;
  if(view.map){const img=document.createElement('img');img.src=view.map;img.alt='Mapa recebido por este jogador';stage.append(img)}
  for(const token of view.tokens){const t=sessionNode('span',token.name,'preview-token');t.style.left=token.x/view.boardWidth*100+'%';t.style.top=token.y/view.boardHeight*100+'%';stage.append(t)}
  content.append(stage,sessionNode('p',view.tokens.length+' token(s) · '+view.characters.length+' ficha(s) disponíveis.'));
  for(const c of view.characters){content.append(sessionNode('h3',c.name),sessionNode('p',c.text));for(const f of c.fields||[]){if(f.type==='portrait'&&f.value){const img=document.createElement('img');img.src=f.value;img.alt='Retrato de '+c.name;img.className='preview-portrait';content.append(img)}else content.append(sessionNode('p',f.name+': '+f.value))}}
  for(const pin of tableForScene(view,false).pins)content.append(sessionNode('h3',pin.title),sessionNode('p',pin.text));
 }catch{content.textContent='Não foi possível gerar a prévia. Nenhum mapa foi exibido.'}}
 select.onchange=refresh;dialog.addEventListener('close',()=>{request++;dialog.remove()},{once:true});showSessionDialog(dialog);await refresh();
}
function openVisualLibrary(){if(!hostMode)return;showSessionDialog($('visualLibrary'));renderVisualLibrary()}
function renderVisualLibrary(){
 const dialog=$('visualLibrary');if(!dialog?.open)return;
 const cards=$('assetCards');cards.replaceChildren();const library=state.tabletop?.library||emptyTabletop().library;
 const sources={maps:library.maps,tokens:library.tokens,encounters:library.encounters,characters:state.characters,scenes:state.scenes};
 const query=libraryQuery.toLocaleLowerCase('pt-BR');let count=0;
 for(const asset of sources[libraryKind]||[]){
  if(query&&!(asset.name||asset.title||'').toLocaleLowerCase('pt-BR').includes(query)&&!(asset.tags||'').toLocaleLowerCase('pt-BR').includes(query))continue;count++;
  const card=sessionNode('article',undefined,'asset-card');card.dataset.assetId=asset.id;
  const image=libraryKind==='maps'?asset.data:libraryKind==='scenes'?asset.map:libraryKind==='characters'?(asset.fields||[]).find(f=>f.type==='portrait')?.value:(state.characters.find(c=>c.id===asset.characterId)?.fields||[]).find(f=>f.type==='portrait')?.value;
  if(image){const img=document.createElement('img');img.src=image;img.alt='';img.loading='lazy';card.append(img)}else card.append(sessionNode('div',libraryKind==='encounters'?String(asset.tokens.length)+' tokens':libraryKind==='scenes'?'Cena':(asset.name||'?').slice(0,2).toUpperCase(),'asset-placeholder'));
  card.append(sessionNode('h3',asset.name||asset.title));if(asset.tags)card.append(sessionNode('p',asset.tags,'muted'));
  const act=sessionNode('div',undefined,'asset-actions');
  if(libraryKind==='maps')act.append(sessionButton('Usar mapa',()=>{dispatch('table:map:use',{id:asset.id});dialog.close()}));
  if(['tokens','encounters'].includes(libraryKind))act.append(sessionButton('Colocar na cena',()=>{dispatch('table:spawn',{id:asset.id,kind:libraryKind});dialog.close()}));
  if(libraryKind==='characters')act.append(sessionButton('Abrir ficha',()=>{dialog.close();$('tabSheets').click();[...$('characters').children].find(el=>el.dataset.character===asset.id)?.scrollIntoView({block:'nearest'})}),sessionButton('Criar cópia',()=>dispatch('character:duplicate',{id:asset.id})));
  if(libraryKind==='scenes')act.append(sessionButton('Abrir cena',()=>{dispatch('scene:switch',{id:asset.id});dialog.close()}));
  if(['maps','tokens','encounters'].includes(libraryKind))act.append(sessionButton('Editar nome e tags',()=>{const kind=libraryKind,{dialog:editor,body}=sessionDialog('assetEditor','Editar item');const name=sessionField('Nome do item','text',asset.name),tags=sessionField('Tags do item','text',asset.tags);name.input.maxLength=100;tags.input.maxLength=150;body.append(name.wrap,tags.wrap,sessionButton('Salvar item',()=>{if(applyTableAction('table:asset:edit',{kind,id:asset.id,name:name.input.value,tags:tags.input.value},myId))editor.close()}));editor.addEventListener('close',()=>editor.remove(),{once:true});showSessionDialog(editor)}),sessionButton('Remover da biblioteca',()=>{if(confirm('Remover '+asset.name+' da biblioteca? Os objetos já colocados permanecem na cena.'))dispatch('table:asset:remove',{kind:libraryKind,id:asset.id})}));
  card.append(act);cards.append(card);
 }
 if(!count)cards.append(sessionNode('p','Nenhum item encontrado. Adicione um mapa, salve um token ou crie um encontro.','asset-empty'));
 $('saveCurrentMap').hidden=libraryKind!=='maps';$('libraryImportLabel').hidden=libraryKind!=='maps';$('saveSelectedTokens').hidden=!['tokens','encounters'].includes(libraryKind);
 for(const b of $('assetTabs').children)b.setAttribute('aria-pressed',String(b.dataset.kind===libraryKind));
}
function renderQuickInspector(){
 const panel=$('quickInspector'),token=state.tokens.find(t=>t.id===selectedToken);
 if(!hostMode||!token||inspectorDismissed===token.id||selectedTokens.size>1){panel.hidden=true;return}
 panel.hidden=false;if(panel.contains(document.activeElement)&&['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;
 const key=JSON.stringify([token,state.characters.find(c=>c.id===token.characterId),[...contacts.values()].map(c=>[c.playerId,c.playerName])]);if(panel.dataset.key===key)return;panel.dataset.key=key;panel.replaceChildren();
 const header=sessionNode('div',undefined,'inspector-heading');header.append(sessionNode('strong',token.name),sessionButton('×',()=>{inspectorDismissed=token.id;panel.hidden=true}));header.lastChild.setAttribute('aria-label','Fechar propriedades rápidas');panel.append(header);
 for(const [label,field,type] of [['Nome rápido','name','text'],['Tamanho rápido','size','number']]){const el=sessionField(label,type,token[field]||(field==='size'?56:''));if(type==='number'){el.input.min=24;el.input.max=120}else el.input.maxLength=35;el.input.onchange=()=>dispatch('token:properties',{id:token.id,key:field,value:type==='number'?Number(el.input.value):el.input.value});panel.append(el.wrap)}
 const control=sessionNode('label','Controlador rápido'),select=document.createElement('select');select.setAttribute('aria-label','Controlador rápido');select.add(new Option('Só mestre',''));
 const players=new Map();for(const c of contacts.values())if(c.playerId)players.set(c.playerId,c.playerName);if(token.owner&&!players.has(token.owner))players.set(token.owner,'Jogador offline');for(const [id,name] of players)select.add(new Option(name,id));select.value=token.owner||'';select.onchange=()=>dispatch('token:owner',{id:token.id,playerId:select.value});control.append(select);panel.append(control);
 const char=state.characters.find(c=>c.id===token.characterId),resource=char?.fields?.find(f=>f.id===token.resourceFieldId&&f.type==='resource');
 if(resource){const value=sheetDrafts.get(sheetKey(char.id,resource.id))?.value||resource.value;try{const [current,max]=JSON.parse(value),field=sessionField('Recurso rápido · '+resource.name,'number',current);field.input.oninput=()=>editSheetDraft(char.id,resource.id,JSON.stringify([Number(field.input.value),max]));field.input.onchange=()=>saveSheetDraft(char.id,resource.id);panel.append(field.wrap);const draft=sheetDrafts.get(sheetKey(char.id,resource.id));if(draft?.conflict||draft?.error)panel.append(sessionButton('Revisar alteração na ficha',()=>openTokenSheet(token)))}catch{}}
 panel.append(sessionButton('Abrir ficha',()=>openTokenSheet(token)),sessionButton('Vincular ficha e recurso',()=>{$('tabTools').click();document.querySelector('.workspace-sections button:last-child').click();panel.hidden=true;inspectorDismissed=token.id}),sessionButton('Salvar modelo de token',()=>{dispatch('table:token:save',{id:token.id});sessionNotice('Modelo salvo na biblioteca.')}),sessionButton('Incluir no combate',()=>{dispatch('table:combat:include',{id:token.id});$('combatTracker').hidden=false;renderCombatTracker()}));
}
function renderCombatTracker(){
 const panel=$('combatTracker');if(!panel||panel.hidden)return;
 const body=$('combatBody');if(body.contains(document.activeElement)&&['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;body.replaceChildren();const combat=tableForScene(state,false).combat;
 $('combatRound').textContent=combat.active?'Rodada '+combat.round:'Combate';
 if(hostMode){
  const controls=sessionNode('div',undefined,'combat-controls'),expr=sessionField('Dados de iniciativa','text',combat.expression);expr.input.maxLength=30;
  controls.append(expr.wrap,sessionButton('Rolar ordem',()=>dispatch('table:combat:roll',{expression:expr.input.value})));
  const turns=sessionNode('div',undefined,'combat-turns');if(combat.active)controls.append(sessionButton('Encerrar combate',()=>dispatch('table:combat:stop',{})));else turns.append(sessionButton('Iniciar combate',()=>dispatch('table:combat:start',{})));if(combat.active)turns.append(sessionButton('Turno anterior',()=>dispatch('table:combat:step',{direction:-1})),sessionButton('Próximo turno',()=>dispatch('table:combat:step',{direction:1})));body.append(turns);const current=state.tokens.find(t=>t.id===combat.entries[combat.index]?.id);if(combat.active&&current)body.append(sessionNode('p','Vez de '+current.name,'combat-current'));
  const add=document.createElement('select');add.setAttribute('aria-label','Participante do combate');add.add(new Option('Adicionar token…',''));for(const t of state.tokens)if(!combat.entries.some(e=>e.id===t.id))add.add(new Option(t.name,t.id));add.onchange=()=>{if(add.value)dispatch('table:combat:include',{id:add.value})};controls.append(add);const setup=document.createElement('details');setup.open=!combat.entries.length;setup.append(sessionNode('summary','Preparar ordem'),controls);body.append(setup);
 }
 if(!combat.entries.length)body.append(sessionNode('p','Nenhum participante neste combate.','muted'));
 for(const [i,entry] of combat.entries.entries()){
  const token=state.tokens.find(t=>t.id===entry.id);if(!token)continue;const row=sessionNode('div',undefined,'combat-entry');row.classList.toggle('current',combat.active&&combat.index===i);
  const focus=sessionButton(token.name,()=>focusTableToken(token));if(combat.active&&combat.index===i)focus.setAttribute('aria-current','step');row.append(focus);
  if(hostMode){const field=document.createElement('input');field.type='number';field.value=entry.value;field.setAttribute('aria-label','Iniciativa de '+token.name);field.onchange=()=>dispatch('table:combat:value',{id:token.id,value:Number(field.value)});row.append(field);
   for(const [text,action,payload] of [['↑','order',{direction:-1}],['↓','order',{direction:1}],['×','remove',{}]]){const b=sessionButton(text,()=>dispatch('table:combat:'+action,{id:token.id,...payload}));b.setAttribute('aria-label',(text==='↑'?'Subir ':text==='↓'?'Descer ':'Remover do combate ')+token.name);row.append(b)}
  }else row.append(sessionNode('span',String(entry.value)));
  body.append(row);
 }
 
}
function sessionCommands(){return [
 ['Biblioteca visual',openVisualLibrary,true],['Notas da cena',openSceneNotes,true],['Adicionar marcador',startPinPlacement,true],['Alinhar grade',startGridAlignment,true],['Salvar encontro selecionado',saveSelectedEncounter,true],['Visão do jogador',openPlayerPreview,true],['Mostrar combate',()=>{$('combatTracker').hidden=false;renderCombatTracker()},false],['Enquadrar mapa',fitBoard,false],['Abrir fichas',()=>$('tabSheets').click(),false],['Abrir chat',()=>$('tabChat').click(),false],['Exportar campanha',saveFile,true],...Object.entries({pan:'Mover',draw:'Pincel',line:'Linha',rectangle:'Retângulo',ellipse:'Elipse',ruler:'Régua',reveal:'Revelar névoa'}).map(([key,label])=>['Ferramenta: '+label,()=>document.querySelector('[data-tool="'+key+'"]').click(),true])
 ]}
function openCommandSearch(){
 const dialog=$('commandSearch');showSessionDialog(dialog);$('commandQuery').value='';renderCommandResults();$('commandQuery').focus();
}
function renderCommandResults(){
 const list=$('commandResults');list.replaceChildren();const q=$('commandQuery').value.toLocaleLowerCase('pt-BR');
 for(const [label,fn,master] of sessionCommands())if((!master||hostMode)&&label.toLocaleLowerCase('pt-BR').includes(q))list.append(sessionButton(label,()=>{$('commandSearch').close();fn()}));
 if(!list.children.length)list.append(sessionNode('p','Nenhum comando encontrado.'));
}
function renderSession(){
 if(!sessionReady)return;
 for(const el of document.querySelectorAll('[data-host-session]'))el.hidden=!hostMode;
 $('placementHelp').hidden=!pinPlacement&&!gridAlignment;
 $('placementHelpText').textContent=pinPlacement?'Clique no mapa para colocar o marcador. Esc cancela.':gridAlignment?'Grade: marque '+(gridAlignment.points.length?'o segundo':'o primeiro')+' ponto':'';
 $('board').classList.toggle('placing-marker',pinPlacement||!!gridAlignment);
 if(pinPlacement&&pinPlacementScene!==state.activeSceneId||gridAlignment&&gridAlignment.sceneId!==state.activeSceneId){cancelTablePlacement();return}
 const pins=$('scenePins');pins.replaceChildren();for(const pin of tableForScene(state,false).pins){const b=sessionButton('◆',()=>openPinEditor(pin));b.className='scene-pin';b.title=pin.title;b.setAttribute('aria-label','Marcador: '+pin.title);b.style.left=pin.x+'px';b.style.top=pin.y+'px';b.dataset.shared=pin.shared;for(const event of ['pointerdown','pointerup'])b.addEventListener(event,e=>e.stopPropagation());pins.append(b)}
 renderQuickInspector();renderCombatTracker();renderVisualLibrary();
 if($('game').style.display!=='block'){$('combatTracker').hidden=true;$('quickInspector').hidden=true}
}
addEventListener('DOMContentLoaded',()=>{
 const dock=sessionNode('nav',undefined,'session-dock');dock.id='sessionDock';dock.setAttribute('aria-label','Recursos da sessão');
 for(const [label,fn,hostOnly] of [['Preparar',()=>{openVisualLibrary()},true],['Notas',openSceneNotes,true],['Marcador',startPinPlacement,true],['Grade',startGridAlignment,true],['Combate',()=>{$('combatTracker').hidden=!$('combatTracker').hidden;renderCombatTracker()},false],['Visão',openPlayerPreview,true],['Comandos',openCommandSearch,false]]){const b=sessionButton(label,fn);if(hostOnly)b.dataset.hostSession='';if(label==='Comandos'){b.title='Buscar comandos (Ctrl+K / ⌘K)';b.setAttribute('aria-keyshortcuts','Control+k Meta+k')}dock.append(b)}
 $('board').append(dock);
 const notice=sessionNode('p',undefined,'session-notice');notice.id='sessionNotice';notice.setAttribute('role','status');const controls=sessionNode('section',undefined,'board-controls');controls.id='boardControls';controls.setAttribute('aria-label','Navegação e recursos do mapa');const row=sessionNode('div',undefined,'board-control-row');row.append($('zoomControls'),dock);controls.append(notice,row);$('board').append(controls);
 new ResizeObserver(()=>{$('board').style.setProperty('--board-controls-height',controls.getBoundingClientRect().height+'px');if($('game').style.display==='block')fitBoard()}).observe(controls);
 const help=sessionNode('div',undefined,'placement-help');help.id='placementHelp';help.hidden=true;const helpText=sessionNode('span');helpText.id='placementHelpText';help.append(helpText,sessionButton('Cancelar',cancelTablePlacement));$('board').append(help);
 const pins=sessionNode('div');pins.id='scenePins';$('canvas').append(pins);
 const inspector=sessionNode('section',undefined,'quick-inspector');inspector.id='quickInspector';inspector.setAttribute('aria-label','Propriedades rápidas do token');inspector.hidden=true;$('board').append(inspector);inspector.addEventListener('focusout',()=>setTimeout(renderQuickInspector,0));
 const tracker=sessionNode('section',undefined,'combat-tracker');tracker.id='combatTracker';tracker.hidden=true;const trackerHeader=sessionNode('div',undefined,'inspector-heading'),round=sessionNode('strong');round.id='combatRound';const close=sessionButton('×',()=>tracker.hidden=true);close.setAttribute('aria-label','Recolher combate');trackerHeader.append(round,close);const body=sessionNode('div');body.id='combatBody';tracker.append(trackerHeader,body);$('board').append(tracker);body.addEventListener('focusout',()=>setTimeout(renderCombatTracker,0));
 const library=sessionDialog('visualLibrary','Preparar sessão');library.dialog.classList.add('library-dialog');const tabs=sessionNode('nav',undefined,'asset-tabs');tabs.id='assetTabs';tabs.setAttribute('aria-label','Tipo de conteúdo');
 for(const [kind,label] of [['maps','Mapas'],['tokens','Tokens'],['encounters','Encontros'],['characters','Personagens'],['scenes','Cenas']]){const b=sessionButton(label,()=>{libraryKind=kind;renderVisualLibrary()});b.dataset.kind=kind;tabs.append(b)}
 const search=sessionField('Buscar por nome ou tag');search.input.id='assetSearch';search.input.oninput=()=>{libraryQuery=search.input.value;renderVisualLibrary()};
 const actions=sessionNode('div',undefined,'library-actions');const saveMap=sessionButton('Guardar mapa atual',()=>{if(!state.map)return sessionNotice('Adicione um mapa à cena primeiro.');dispatch('table:map:save',{name:state.scenes.find(s=>s.id===state.activeSceneId)?.title||'Mapa',data:state.map});});saveMap.id='saveCurrentMap';
 const importLabel=sessionNode('label','Importar mapa','file-action');importLabel.id='libraryImportLabel';const input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp';input.id='libraryMapUpload';input.className='sr-only';input.onchange=async()=>{const f=input.files[0];if(!f)return;if(f.size>6000000)return sessionNotice('Mapa excede 6 MB.');try{const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f)});if(!applyTableAction('table:map:save',{name:f.name.replace(/\.[^.]+$/,''),data},myId))sessionNotice('Biblioteca cheia ou formato inválido.')}catch{sessionNotice('Não foi possível ler o mapa.')}input.value=''};importLabel.append(input);
 const saveGroup=sessionButton('Salvar seleção',()=>{if(libraryKind==='encounters')saveSelectedEncounter();else{const ids=selectedTokens.size?[...selectedTokens]:selectedToken?[selectedToken]:[];for(const id of ids)dispatch('table:token:save',{id});if(!ids.length)sessionNotice('Selecione um token no mapa primeiro.')}});saveGroup.id='saveSelectedTokens';
 const saveEncounter=sessionButton('Salvar encontro selecionado',saveSelectedEncounter);actions.append(saveMap,importLabel,saveGroup,saveEncounter);
 const cards=sessionNode('div',undefined,'asset-cards');cards.id='assetCards';library.body.append(sessionNode('p','Organize o conteúdo aqui. Feche a biblioteca para voltar à sessão.','muted'),tabs,search.wrap,actions,cards);library.dialog.addEventListener('close',()=>{fitBoard()});
 const command=sessionDialog('commandSearch','Buscar comandos');const query=sessionField('O que deseja fazer?');query.input.id='commandQuery';query.input.oninput=renderCommandResults;const results=sessionNode('div');results.id='commandResults';command.body.append(query.wrap,results);
 command.dialog.addEventListener('keydown',e=>{const buttons=[...results.querySelectorAll('button')];if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const i=buttons.indexOf(document.activeElement);buttons[(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus()}if(e.key==='Enter'&&document.activeElement===query.input){e.preventDefault();buttons[0]?.click()}});
 $('board').addEventListener('pointerdown',e=>{
  if(!hostMode||!pinPlacement&&!gridAlignment||e.target.closest('button,input,select,textarea,nav,#boardControls,#quickInspector,#combatTracker'))return;
  e.preventDefault();e.stopImmediatePropagation();const point=boardPoint(e);if(point.x<0||point.y<0||point.x>boardWidth()||point.y>boardHeight())return;
  if(pinPlacement){pinPlacement=false;renderSession();openPinEditor({...point,shared:false});return}
  gridAlignment.points.push(point);if(gridAlignment.points.length===2)finishGridAlignment();else renderSession();
 },true);
 $('board').addEventListener('click',e=>{if(e.target.closest('.piece')){inspectorDismissed='';renderQuickInspector()}else if(!e.target.closest('button,input,select,textarea,#quickInspector,#combatTracker,nav')){inspectorDismissed='';renderQuickInspector()}});
 document.addEventListener('keydown',e=>{
  if($('game').style.display!=='block')return;
  if(e.key==='Escape'&&(pinPlacement||gridAlignment)){e.preventDefault();e.stopImmediatePropagation();cancelTablePlacement();return}
  if(e.target.closest('dialog'))return;
  if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.target.isContentEditable)return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();e.stopImmediatePropagation();openCommandSearch()}
 },true);
 $('leaveGame').addEventListener('click',cancelTablePlacement);
 for(const surface of [controls,inspector,tracker,help])for(const type of ['pointerdown','pointerup','wheel'])surface.addEventListener(type,e=>e.stopPropagation());
 $('tabTools').textContent='Mestre';$('masterTools').querySelector('h3').textContent='Ferramentas da cena';$('masterTools').querySelector('h3').after(sessionButton('Abrir biblioteca visual',openVisualLibrary));
 sessionReady=true;renderSession();
});
