/* GS Documentos v123 · observación ESPT copiable */
(()=>{
  'use strict';
  if(globalThis.__GS_DOCS_V123_OBSERVATION__) return;
  globalThis.__GS_DOCS_V123_OBSERVATION__=true;

  const q=s=>document.querySelector(s);
  const upper=v=>String(v??'').trim().replace(/\s+/g,' ').toLocaleUpperCase('es-CO');

  function currentRec(){
    return state.currentRecord||state.registration||{};
  }

  function buildObservation(rec=currentRec()){
    const orden=upper(rec.orden_ro||rec.Orden_RO||rec.ro||state.form?.e1_no_solicitud||'');
    const nombre=upper(rec.nombres||state.form?.cm_nombre||'');
    const cc=upper(rec.identificacion||state.form?.cm_num_doc||'');
    const celular=upper(rec.contacto||state.form?.cm_celular||'');
    const direccion=upper(rec.direccion||state.form?.cm_dir_radica||'');
    const sector=upper(rec.sector||state.form?.cm_sector||'');
    const localidad=upper(rec.localidad||state.form?.cm_localidad||'');

    const partes=[
      'ORDEN PARA DIAGNÓSTICO DE PREDIOS ESPT.',
      'VERIFICACIÓN DEL PREDIO PARA SOLICITUD DE CONEXIÓN.',
      orden ? 'NÚMERO DE RO: '+orden+'.' : '',
      direccion ? 'SE LLEGA A LA DIRECCIÓN INDICADA POR EL USUARIO: '+direccion+'.' : 'SE LLEGA A LA DIRECCIÓN INDICADA POR EL USUARIO.',
      sector ? 'BARRIO/SECTOR: '+sector+'.' : '',
      localidad ? 'LOCALIDAD: '+localidad+'.' : '',
      nombre ? 'USUARIO: '+nombre+'.' : '',
      cc ? 'C.C.: '+cc+'.' : '',
      celular ? 'CELULAR: '+celular+'.' : '',
      'DOCUMENTACIÓN SE ENCUENTRA AL DÍA.',
      'LAS CONDICIONES DEL PREDIO E INSTALACIONES INTERNAS CUMPLEN NORMA VIGENTE PARA REALIZAR OBRA.',
      'SE ANEXA REGISTRO FOTOGRÁFICO.'
    ].filter(Boolean);

    return partes.join(' ');
  }

  async function copyObservation(textarea){
    const text=String(textarea?.value||'').trim();
    if(!text){toast('No hay observación para copiar');return}
    try{
      await navigator.clipboard.writeText(text);
      toast('Observación copiada');
    }catch(_){
      try{
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        textarea.setSelectionRange(0,0);
        toast('Observación copiada');
      }catch(e){
        console.error('GS v123 copiar observación',e);
        toast('No fue posible copiar la observación');
      }
    }
  }

  function makeBox(id){
    const wrap=document.createElement('div');
    wrap.className='gs123-observation-card';
    wrap.dataset.observationBox=id;
    wrap.innerHTML=
      '<div class="gs123-observation-head">'+
        '<div><b>Observación ESPT</b><span>Lista para copiar y pegar</span></div>'+
        '<button type="button" class="btn secondary gs123-copy">📋 Copiar</button>'+
      '</div>'+
      '<textarea class="gs123-observation-text" rows="7" spellcheck="true"></textarea>'+
      '<div class="gs123-observation-help">Se genera automáticamente con RO/orden, usuario, cédula, celular, dirección, sector y localidad. Puedes editarla antes de copiar.</div>';
    wrap.querySelector('.gs123-copy').onclick=()=>copyObservation(wrap.querySelector('textarea'));
    return wrap;
  }

  function refreshBox(box){
    if(!box)return;
    const ta=box.querySelector('.gs123-observation-text');
    if(!ta)return;
    const auto=buildObservation();
    if(!ta.dataset.userEdited || ta.dataset.userEdited==='0'){
      ta.value=auto;
      ta.dataset.autoValue=auto;
    }
    if(ta.dataset.gs123!=='1'){
      ta.dataset.gs123='1';
      ta.addEventListener('input',()=>{
        ta.dataset.userEdited=ta.value===ta.dataset.autoValue?'0':'1';
      });
    }
  }

  function ensureSaved(){
    const card=q('#saved .decision-card')||q('#saved .card');
    if(!card)return;
    let box=card.querySelector('[data-observation-box="saved"]');
    if(!box){
      box=makeBox('saved');
      const actions=card.querySelector('.saved-actions')||card.querySelector('.actions');
      if(actions)card.insertBefore(box,actions);
      else card.appendChild(box);
    }
    refreshBox(box);
  }

  function ensureRecords(){
    const card=q('#records .card');
    if(!card)return;
    let box=card.querySelector('[data-observation-box="records"]');
    if(!box){
      box=makeBox('records');
      const host=q('#recordsHost');
      if(host)host.insertAdjacentElement('afterend',box);
      else card.appendChild(box);
    }
    refreshBox(box);
  }

  function enhance(){
    try{ensureSaved()}catch(e){console.warn('GS v123 saved',e)}
    try{ensureRecords()}catch(e){console.warn('GS v123 records',e)}
  }

  try{
    if(typeof show==='function'){
      const oldShow=show;
      show=function(id){
        const r=oldShow.apply(this,arguments);
        if(id==='saved'||id==='records')setTimeout(enhance,0);
        return r;
      };
    }
  }catch(_){}

  try{
    if(typeof renderRecords==='function'){
      const oldRenderRecords=renderRecords;
      renderRecords=function(){
        const r=oldRenderRecords.apply(this,arguments);
        setTimeout(ensureRecords,0);
        return r;
      };
    }
  }catch(_){}

  document.addEventListener('click',e=>{
    if(e.target?.id==='saveRegister'||e.target?.id==='savedRecords'||e.target?.id==='recordsBack'){
      setTimeout(enhance,80);
    }
  },true);

  setTimeout(enhance,0);
  console.info('GS Documentos v123 · observación ESPT copiable activa');
})();