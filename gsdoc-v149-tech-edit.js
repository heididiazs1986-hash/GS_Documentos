/* GS Documentos v149 · edición segura del técnico durante la jornada */
(()=>{
  'use strict';
  if(globalThis.__GS_DOCS_V149_TECH_EDIT__) return;
  globalThis.__GS_DOCS_V149_TECH_EDIT__=true;

  const q=s=>document.querySelector(s);
  const clean=s=>String(s||'').trim().replace(/\s+/g,' ');

  function currentTech(){
    try{
      return clean(
        globalThis.state?.jornada?.tecnico_nombre ||
        globalThis.state?.jornada?.nombre_tecnico ||
        globalThis.state?.techProfile?.nombre ||
        q('#jornada_nombre')?.value ||
        ''
      );
    }catch(_){ return ''; }
  }

  function persistName(name){
    const value=clean(name);
    if(!value) throw new Error('El nombre del técnico no puede quedar vacío.');

    try{
      globalThis.state=globalThis.state||{};
      state.jornada=state.jornada||{};
      state.techProfile=state.techProfile||{};
      state.jornada.tecnico_nombre=value;
      state.jornada.nombre_tecnico=value;
      state.techProfile.nombre=value;

      if(state.registration && typeof state.registration==='object'){
        state.registration.tecnico_nombre=value;
      }
      if(state.currentRecord && typeof state.currentRecord==='object'){
        state.currentRecord.tecnico_nombre=value;
      }
      if(state.form && typeof state.form==='object'){
        if('cm_retie_constructor' in state.form || state.form.cm_retie_constructor){
          state.form.cm_retie_constructor=value;
        }
      }
    }catch(_){}

    const jornadaInput=q('#jornada_nombre');
    if(jornadaInput){
      jornadaInput.disabled=false;
      jornadaInput.readOnly=false;
      jornadaInput.removeAttribute('disabled');
      jornadaInput.removeAttribute('readonly');
      jornadaInput.value=value;
    }

    try{ if(typeof save==='function') save(); }catch(_){}

    // Conserva compatibilidad si alguna versión usa claves directas.
    try{
      localStorage.setItem('GS_DOCS_TECH_NAME_V1', value);
    }catch(_){}

    refreshButton();
  }

  function refreshButton(){
    const btn=q('#gs149EditTech');
    if(!btn) return;
    const name=currentTech();
    btn.title=name ? 'Técnico actual: '+name : 'Editar técnico de la jornada';
    const label=btn.querySelector('.gs149-tech-label');
    if(label) label.textContent=name || 'Técnico';
  }

  function closeModal(){
    q('#gs149TechModal')?.remove();
  }

  function openModal(){
    closeModal();

    const overlay=document.createElement('div');
    overlay.id='gs149TechModal';
    overlay.style.cssText='position:fixed;inset:0;z-index:999999;background:rgba(15,23,42,.55);display:grid;place-items:center;padding:18px';

    const card=document.createElement('div');
    card.style.cssText='width:min(520px,100%);background:var(--card,#fff);color:var(--text,#13233A);border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.28);padding:22px;font-family:Manrope,Arial,sans-serif';

    const title=document.createElement('h3');
    title.textContent='Cambiar técnico / gestor';
    title.style.cssText='margin:0 0 8px;font-size:20px';

    const help=document.createElement('p');
    help.textContent='El cambio se usará desde ahora en la jornada y en los documentos que generes o regeneres.';
    help.style.cssText='margin:0 0 16px;line-height:1.45;opacity:.8;font-size:14px';

    const label=document.createElement('label');
    label.textContent='Nombre del técnico / gestor';
    label.style.cssText='display:block;font-weight:700;margin-bottom:7px';

    const input=document.createElement('input');
    input.id='gs149TechNameInput';
    input.value=currentTech();
    input.autocomplete='name';
    input.style.cssText='width:100%;box-sizing:border-box;padding:12px 13px;border:1px solid #cbd5e1;border-radius:12px;font:inherit;background:transparent;color:inherit';

    const note=document.createElement('div');
    note.textContent='No se modifica la firma capturada.';
    note.style.cssText='font-size:12px;opacity:.7;margin-top:8px';

    const actions=document.createElement('div');
    actions.style.cssText='display:flex;gap:10px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap';

    const cancel=document.createElement('button');
    cancel.type='button';
    cancel.className='btn secondary';
    cancel.textContent='Cancelar';

    const saveBtn=document.createElement('button');
    saveBtn.type='button';
    saveBtn.className='btn';
    saveBtn.textContent='Guardar cambio';

    cancel.onclick=closeModal;
    saveBtn.onclick=()=>{
      try{
        const value=clean(input.value);
        if(!value){
          input.focus();
          if(typeof toast==='function') toast('Escribe el nombre del técnico');
          return;
        }
        persistName(value);
        closeModal();
        try{ if(typeof toast==='function') toast('✅ Técnico actualizado: '+value,5000); }catch(_){}
        try{ if(typeof renderForm==='function' && q('#form.screen.active')) renderForm(); }catch(_){}
      }catch(e){
        try{ if(typeof toast==='function') toast(e?.message||'No fue posible cambiar el técnico'); }catch(_){}
      }
    };

    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'){ e.preventDefault(); saveBtn.click(); }
      if(e.key==='Escape'){ e.preventDefault(); closeModal(); }
    });
    overlay.addEventListener('click',e=>{ if(e.target===overlay) closeModal(); });

    actions.append(cancel,saveBtn);
    card.append(title,help,label,input,note,actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    setTimeout(()=>{ input.focus(); input.select(); },30);
  }

  function ensureButton(){
    if(q('#gs149EditTech')){ refreshButton(); return; }
    const host=q('.head-actions') || q('.head');
    if(!host) return;

    const btn=document.createElement('button');
    btn.id='gs149EditTech';
    btn.type='button';
    btn.className='theme';
    btn.setAttribute('aria-label','Cambiar técnico o gestor');
    btn.style.cssText='width:auto;min-width:44px;padding:0 10px;display:inline-flex;align-items:center;gap:6px;white-space:nowrap';
    btn.innerHTML='<span aria-hidden="true">✏️</span><span class="gs149-tech-label">Técnico</span>';
    btn.addEventListener('click',e=>{ e.preventDefault(); e.stopPropagation(); openModal(); });
    host.insertBefore(btn,host.firstChild);
    refreshButton();
  }

  function unlockJornadaInput(){
    const input=q('#jornada_nombre');
    if(!input) return;
    input.disabled=false;
    input.readOnly=false;
    input.removeAttribute('disabled');
    input.removeAttribute('readonly');

    if(input.dataset.gs149Bound!=='1'){
      input.dataset.gs149Bound='1';
      input.addEventListener('change',()=>{
        const value=clean(input.value);
        if(value) persistName(value);
      });
    }
  }

  function enhance(){
    ensureButton();
    unlockJornadaInput();
    refreshButton();
  }

  // Refuerza el control si la app vuelve a renderizar pantallas.
  [0,150,500,1200,2500].forEach(ms=>setTimeout(enhance,ms));
  document.addEventListener('click',()=>setTimeout(enhance,0),true);

  console.info('GS Documentos v149 · edición de técnico activa');
})();