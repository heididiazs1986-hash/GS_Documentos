/* GS Documentos v119 · mayúsculas solo en Excel */
(()=>{
  'use strict';
  if(globalThis.__GS_DOCS_V119_CASE_RULE__) return;
  globalThis.__GS_DOCS_V119_CASE_RULE__=true;

  // The v77 normalizer is exported as normalizeAddress by its private module.
  // Share the alias used by the base app and this presentation add-on.
  if(typeof globalThis.gs77NormalizeAddress!=='function' && typeof globalThis.normalizeAddress==='function'){
    globalThis.gs77NormalizeAddress=globalThis.normalizeAddress;
  }

  const trimText=v=>String(v??'').replace(/[ \t]{2,}/g,' ');
  const cleanText=v=>String(v??'').trim().replace(/\s+/g,' ');

  const SMALL=new Set(['de','del','la','las','los','y','e','o','en','al','por','para','con','sin','a']);
  const KEEP=new Map([
    ['retie','RETIE'],['spt','SPT'],['ec','EC'],['e1','E1'],['e6','E6'],['dj','DJ'],['ar','AR'],['ro','RO'],
    ['conte','CONTE'],['conaltel','CONALTEL'],['applus','APPLUS'],['inmel','INMEL'],['pvc','PVC'],['acsr','ACSR'],
    ['bt','BT'],['mt','MT'],['dps','DPS'],['gps','GPS'],['garrawall','GarraWall']
  ]);
  const ROAD=new Set(['KRA','KR','CL','DG','TRV','TV','AK','AC','AV','AUT','CIRC','MANZ','LOTE','PISO','CS','VDA','BRR','STOR','CDLA','UND','APTO','INT','BLQ','KM','BIS','SUR','NORTE','ESTE','OESTE']);

  function capWord(w){
    const low=String(w||'').toLocaleLowerCase('es-CO');
    if(KEEP.has(low))return KEEP.get(low);
    return low ? low.charAt(0).toLocaleUpperCase('es-CO')+low.slice(1) : '';
  }
  function titleCase(v){
    const s=cleanText(v); if(!s)return '';
    let first=true;
    return s.split(/(\s+|-|\/)/).map(part=>{
      if(/^\s+$|^-$|^\/$/.test(part))return part;
      const low=part.toLocaleLowerCase('es-CO');
      const out=(!first&&SMALL.has(low))?low:capWord(part);
      first=false; return out;
    }).join('');
  }
  function sentenceCase(v){
    let s=cleanText(v); if(!s)return '';
    s=s.toLocaleLowerCase('es-CO')
      .replace(/(^|[.!?]\s+)([a-záéíóúüñ])/g,(m,p,c)=>p+c.toLocaleUpperCase('es-CO'));
    for(const [low,pretty] of KEEP){
      s=s.replace(new RegExp('\\b'+low+'\\b','gi'),pretty);
    }
    return s;
  }
  function addressPretty(v){
    const s=cleanText(v); if(!s)return '';
    return s.split(/([\s#.,;/()-]+)/).map(part=>{
      if(!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(part))return part;
      const up=part.toLocaleUpperCase('es-CO'), low=part.toLocaleLowerCase('es-CO');
      if(ROAD.has(up)||part.length===1)return up;
      if(KEEP.has(low))return KEEP.get(low);
      if(SMALL.has(low))return low;
      return capWord(part);
    }).join('').replace(/\s+/g,' ').trim();
  }

  // Quitar la regla global que convertía cada campo escrito a MAYÚSCULA.
  try{ upperCaseLive=trimText; }catch(_){}
  try{ upperCaseWords=cleanText; }catch(_){}

  // Conserva las abreviaturas técnicas de dirección, pero presenta el resto
  // con ortografía normal.
  try{
    const oldNormalize=gs77NormalizeAddress;
    gs77NormalizeAddress=function(v){ return addressPretty(oldNormalize(v)); };
    normalizeAddress=gs77NormalizeAddress;
  }catch(_){}

  // Inicio de jornada: nombre normal, no todo en mayúscula.
  try{
    gs77StartJornada=function(){
      const nameEl=document.getElementById('jornada_nombre');
      const contratoEl=document.getElementById('jornada_contrato');
      const nombre=titleCase(nameEl?.value||'');
      const contrato=String(contratoEl?.value||state.jornada?.contrato||'').trim();
      if(typeof records==='function'&&records().length){
        alert('Hay una jornada anterior pendiente de exportar. Debes cerrarla antes de iniciar una nueva.');
        if(typeof show==='function')show('records'); return;
      }
      if(!contrato){toast('Selecciona el contrato / aliado estratégico');contratoEl?.focus();return}
      if(!nombre){toast('Escribe el nombre completo del técnico / gestor');nameEl?.focus();return}
      state.jornada=state.jornada||{};state.techProfile=state.techProfile||{};
      const anterior=titleCase(state.techProfile.nombre||'');
      if(anterior&&anterior!==nombre){
        state.techProfile={nombre,cedula:'',profesion:'',consejo:'',matricula:''};
        try{delete state.signatures?.tecnico}catch(_){}
      }else state.techProfile.nombre=nombre;
      state.jornada.active=true;state.jornada.contrato=contrato;
      state.jornada.tecnico_nombre=nombre;state.jornada.nombre_tecnico=nombre;
      state.jornada.inicio=new Date().toISOString();
      if(nameEl)nameEl.value=nombre;
      save();show('register');toast('Jornada iniciada');
    };
  }catch(_){}

  // Hallazgos: texto normal en la App; los encabezados pueden seguir siendo
  // visualmente destacados.
  try{
    if(typeof TECH_RULES!=='undefined'){
      TECH_RULES.forEach(r=>{r.texto=sentenceCase(r.texto)});
      if(Array.isArray(state.registration?.estado_tecnico)){
        state.registration.estado_tecnico=state.registration.estado_tecnico.map(sentenceCase);
      }
    }
  }catch(_){}

  // Al cargar un usuario del TXT, presentar nombres, sector y dirección
  // con ortografía normal, sin alterar cédulas, RO ni códigos.
  try{
    if(typeof applyTxtRecord==='function'){
      const oldApply=applyTxtRecord;
      applyTxtRecord=function(rec){
        const result=oldApply.apply(this,arguments);
        state.registration=state.registration||{};
        state.registration.nombres=titleCase(state.registration.nombres||'');
        state.registration.sector=titleCase(state.registration.sector||'');
        state.registration.localidad=titleCase(state.registration.localidad||'');
        state.registration.direccion=gs77NormalizeAddress(state.registration.direccion||'');
        if(typeof renderRegistration==='function')renderRegistration();
        if(typeof save==='function')save();
        return result;
      };
    }
  }catch(_){}

  function polishVisible(){
    const name=document.getElementById('jornada_nombre');
    if(name&&document.activeElement!==name&&name.value)name.value=titleCase(name.value);
    const sel=document.getElementById('txtUserSelect');
    if(sel){
      [...sel.options].forEach((o,i)=>{if(i>0)o.textContent=titleCase(o.textContent)});
    }
  }

  try{
    if(typeof renderRegistration==='function'){
      const oldRender=renderRegistration;
      renderRegistration=function(){
        const r=oldRender.apply(this,arguments);
        setTimeout(polishVisible,0);
        return r;
      };
    }
  }catch(_){}

  document.addEventListener('blur',e=>{
    const el=e.target;
    if(!(el instanceof HTMLInputElement||el instanceof HTMLTextAreaElement))return;
    if(el.id==='reg_nombres'||el.id==='jornada_nombre')el.value=titleCase(el.value);
    else if(el.id==='reg_sector')el.value=titleCase(el.value);
    else if(el.id==='reg_observaciones')el.value=sentenceCase(el.value);
    else if(['reg_direccion','cm_dir_radica','retie_dir_constructor'].includes(el.id))el.value=gs77NormalizeAddress(el.value);
  },true);

  setTimeout(polishVisible,0);
  console.info('GS Documentos v119 · mayúsculas solo en Excel');
})();
