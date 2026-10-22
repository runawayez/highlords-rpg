/* Terminal presentation only: all session, authority and campaign data stays in the existing engine. */
function selectEntryRole(role, focus = false) {
  const host = role === 'host';
  for (const [id, chosen] of [['Join',!host],['Host',host]]) {
    const tab = document.getElementById('entryTab'+id);
    tab.setAttribute('aria-selected', String(chosen));
    tab.tabIndex = chosen ? 0 : -1;
    document.getElementById('entry'+id+'Panel').hidden = !chosen;
    if (chosen && focus) tab.focus();
  }
}
addEventListener('DOMContentLoaded', () => {
  for (const [id,role] of [['entryTabJoin','join'],['entryTabHost','host']])
    document.getElementById(id).addEventListener('click',()=>selectEntryRole(role));
  document.querySelector('.entry-tabs').addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    e.preventDefault();const host=e.key==='End'||e.key!=='Home'&&document.getElementById('entryTabJoin').getAttribute('aria-selected')==='true';
    selectEntryRole(host?'host':'join',true);
  });
  const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v14H3zM8 22h8M12 19v3M6 9h12M6 12h12M6 15h12"/></svg>';
  const gameButton=document.createElement('button');gameButton.type='button';gameButton.id='scanlinesGame';gameButton.className='crt-toggle';gameButton.setAttribute('aria-label','Efeito de tela CRT');
  document.querySelector('.session-actions').append(gameButton);
  const buttons=[document.getElementById('scanlinesHome'),gameButton];
  let enabled=true;try{enabled=localStorage.getItem('hl-scanlines')!=='off'}catch{}
  function renderEffect(){
    document.body.classList.toggle('scanlines',enabled);
    for(const button of buttons){button.innerHTML=icon;button.setAttribute('aria-pressed',String(enabled));button.title=enabled?'Desativar efeito de tela CRT':'Ativar efeito de tela CRT'}
  }
  for(const button of buttons)button.onclick=()=>{enabled=!enabled;try{localStorage.setItem('hl-scanlines',enabled?'on':'off')}catch{}renderEffect()};
  renderEffect();
});
