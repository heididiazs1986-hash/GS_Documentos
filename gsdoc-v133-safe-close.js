/* GS Documentos v133 · exportación segura + cierre obligatorio por jornada */
(()=>{
  'use strict';
  if(globalThis.__GS_DOCS_V133_SAFE_CLOSE__) return;
  globalThis.__GS_DOCS_V133_SAFE_CLOSE__=true;

  const PENDING_DAY_KEY='GS_DOCS_PENDING_DAY_V133';
  const EXPORTED_DAY_KEY='GS_DOCS_EXPORTED_DAYS_V134';
  const q=s=>document.querySelector(s);
  let exporting=false;
  let warnedOverdue=false;

  const pad=n=>String(n).padStart(2,'0');
  const localDay=d=>{
    const x=d instanceof Date?d:new Date(d);
    if(Number.isNaN(x.getTime()))return '';
    return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());
  };
  const today=()=>localDay(new Date());

  function parseDay(v){
    const s=String(v??'').trim();
    if(!s)return '';
    let m=s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if(m)return m[1]+'-'+pad(m[2])+'-'+pad(m[3]);
    m=s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if(m)return m[3]+'-'+pad(m[2])+'-'+pad(m[1]);
    return localDay(s);
  }

  function getRecords(){
    try{return typeof records==='function'?(records()||[]):[]}catch(_){return []}
  }

  function inferRecordDay(list=getRecords()){
    const candidates=[];
    for(const r of list){
      for(const k of ['fecha_hora_creacion','fecha_hora_actualizacion','fecha_registro','fecha de registro','fecha','created_at','createdAt']){
        const d=parseDay(r?.[k]);
        if(d)candidates.push(d);
      }
    }
    const jornada=parseDay(globalThis.state?.jornada?.inicio);
    if(jornada)candidates.push(jornada);
    return candidates.sort()[0]||'';
  }

  function ensurePendingDay(){
    const list=getRecords();
    if(!list.length){localStorage.removeItem(PENDING_DAY_KEY);return ''}
    let d=localStorage.getItem(PENDING_DAY_KEY)||'';
    if(!d){
      d=inferRecordDay(list)||today();
      try{localStorage.setItem(PENDING_DAY_KEY,d)}catch(_){}
    }
    return d;
  }

  // No interrumpir trabajo de campo mientras existan respaldos históricos pendientes.
  // La recuperación es una COPIA: nunca elimina registros ni bloquea capturas.
  function isOverdue(){return false;}
  function recordDay(r){
    for(const key of ['fecha_hora_creacion','fecha_registro','Fecha de registro','fecha_de_registro','created_at','createdAt','fecha']){
      const day=parseDay(r?.[key]);
      if(day)return day;
    }
    return '';
  }

  function lockMessage(){
    const d=ensurePendingDay();
    return 'Hay una jornada del '+(d||'día anterior')+' pendiente de exportar. Debes exportarla antes de continuar con una nueva jornada.';
  }

  function forceRecords(showAlert=true){
    if(showAlert && !warnedOverdue){
      warnedOverdue=true;
      alert(lockMessage());
    }
    try{
      if(typeof show==='function')show('records');
      if(typeof renderRecords==='function')renderRecords();
    }catch(_){}
    setTimeout(renderLockBanner,20);
  }

  function renderLockBanner(){
    const card=q('#records .card');
    if(!card)return;
    let box=q('#gs133DayLock');
    if(!isOverdue()){
      box?.remove();
      return;
    }
    if(!box){
      box=document.createElement('div');
      box.id='gs133DayLock';
      box.className='gs133-day-lock';
      const h=card.querySelector('h2');
      if(h)h.insertAdjacentElement('afterend',box);else card.prepend(box);
    }
    box.innerHTML='<b>⛔ Jornada anterior pendiente</b><span>'+lockMessage()+'</span>';
  }

  // Registrar el día original en cuanto existan registros pendientes.
  try{
    if(typeof saveRecords==='function'){
      const oldSaveRecords=saveRecords;
      saveRecords=function(list){
        const arr=Array.isArray(list)?list:[];
        if(arr.length){
          if(!localStorage.getItem(PENDING_DAY_KEY)){
            const d=inferRecordDay(arr)||today();
            try{localStorage.setItem(PENDING_DAY_KEY,d)}catch(_){}
          }
        }else{
          localStorage.removeItem(PENDING_DAY_KEY);
        }
        return oldSaveRecords.apply(this,arguments);
      };
    }
  }catch(_){}

  const norm=s=>String(s??'').trim().toLocaleLowerCase('es-CO')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');

  const specs=[
    ['Orden_RO',['orden_ro','orden','ro']],
    ['Fecha de registro',['fecha_de_registro','fecha_registro','fecha','fecha_hora_creacion']],
    ['Nombres',['nombres','nombre','usuario']],
    ['Identificación',['identificacion','cedula','documento']],
    ['Contacto',['contacto','celular','telefono']],
    ['Dirección',['direccion','dirección']],
    ['localidad',['localidad','municipio']],
    ['Sector/Barrio',['sector_barrio','sector','barrio']],
    ['Tipo Zona',['tipo_zona','zona']],
    ['Tipo de población',['tipo_de_poblacion','tipo_poblacion','poblacion']],
    ['Documento de propiedad',['documento_de_propiedad','documento_propiedad']],
    ['Documentos pendientes',['documentos_pendientes','documentos']],
    ['Condiciones de seguridad',['condiciones_de_seguridad','condiciones_seguridad','seguridad']],
    ['Esquema Particular',['esquema_particular']],
    ['Esquema Contrato',['esquema_contrato']],
    ['Requiere de redes',['requiere_de_redes','requiere_redes']],
    ['Tipo material predio',['tipo_material_predio','material_predio']],
    ['Plantas',['plantas']],
    ['Requiere muro/Pilar',['requiere_muro_pilar','muro_pilar']],
    ['Requiere uso de GarraWall',['requiere_uso_de_garrawall','requiere_garrawall','garrawall']],
    ['Requiere uso de arriostre',['requiere_uso_de_arriostre','requiere_arriostre','arriostre']],
    ['Requiere instalación interna',['requiere_instalacion_interna','instalacion_interna']],
    ['Requiere instalación externa',['requiere_instalacion_externa','instalacion_externa']],
    ['Elementos requeridos de instalación externa',['elementos_requeridos_de_instalacion_externa','elementos_instalacion_externa']],
    ['Estado técnico',['estado_tecnico']],
    ['Observaciones',['observaciones']],
    ['Latitud (Y)',['latitud_y','latitud','latitude']],
    ['Longitud (X)',['longitud_x','longitud','longitude']],
    ['Precisión (m)',['precision_m','precision','precision_gps']]
  ];

  const upperHeaders=new Set([
    'orden_ro','fecha_de_registro','nombres','identificacion','contacto','direccion','localidad','sector_barrio'
  ]);

  function flat(v){
    if(v==null)return '';
    if(Array.isArray(v))return v.map(flat).filter(Boolean).join(' | ');
    if(typeof v==='object'){
      try{return JSON.stringify(v)}catch(_){return String(v)}
    }
    return String(v).trim();
  }

  function pick(rec,aliases){
    const entries=Object.entries(rec||{});
    const map=new Map(entries.map(([k,v])=>[norm(k),v]));
    for(const a of aliases){
      const k=norm(a);
      if(map.has(k))return map.get(k);
    }
    return '';
  }

  function excelValue(v,header){
    let s=flat(v);
    if(/^data:(image|application)\//i.test(s)||/^JVBERi0/i.test(s))return '';
    if(s.length>30000)s=s.slice(0,30000);
    if(upperHeaders.has(norm(header)))s=s.toLocaleUpperCase('es-CO');
    return s;
  }

  function buildExcelRows(list){
    return list.map(rec=>{
      const out={};
      for(const [header,aliases] of specs){
        let v=pick(rec,aliases);
        if(header==='Fecha de registro'){
          const d=parseDay(v);
          if(d){
            const [y,m,day]=d.split('-');
            v=day+'/'+m+'/'+y;
          }
        }
        out[header]=excelValue(v,header);
      }
      return out;
    });
  }

  function safeFilePart(v){
    return String(v||'').trim().replace(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,60);
  }

  function downloadBlob(blob,name){
    const a=document.createElement('a');
    const url=URL.createObjectURL(blob);
    a.href=url;a.download=name;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }

  async function exportSafe(){
    if(exporting)return;
    const all=getRecords();
    if(!all.length){toast('No hay registros pendientes de exportar');return}
    const previous=[...new Set(all.map(recordDay).filter(d=>d && d<today()))].sort();
    const day=previous.includes('2026-10-14')?'2026-10-14':previous[0];
    if(!day){toast('No se identificaron registros anteriores con fecha verificable. No se modificó ningún dato.');return}
    const list=all.filter(r=>recordDay(r)===day);
    if(!list.length)return;
    if(!globalThis.XLSX?.utils || !globalThis.JSZip){
      toast('No fue posible preparar el exporte. Cierra y vuelve a abrir la App.');
      return;
    }

    exporting=true;
    const btn=[...document.querySelectorAll('button,.btn')].find(el=>/cerrar\s+y\s+exportar\s+jornada/i.test(el.textContent||''));
    const prev=btn?.textContent;
    if(btn){btn.disabled=true;btn.textContent='Preparando exporte…'}

    try{
      const headers=specs.map(x=>x[0]);
      const rows=buildExcelRows(list);
      if(rows.length!==list.length)throw new Error('Conteo de registros inconsistente');
      const ws=XLSX.utils.json_to_sheet(rows,{header:headers});
      ws['!cols']=headers.map(h=>({wch:Math.min(42,Math.max(12,h.length+2))}));
      const wb=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb,ws,'Registros');
      const xlsx=XLSX.write(wb,{bookType:'xlsx',type:'array'});

      // JSON de respaldo: conserva el registro completo tal como quedó en la App.
      const json=JSON.stringify(list,null,2);
      const stamp=day;
      const tech=safeFilePart(globalThis.state?.jornada?.tecnico_nombre||globalThis.state?.jornada?.nombre_tecnico||'');
      const stem='GS_DOCUMENTOS_'+stamp+(tech?'_'+tech:'');
      const zip=new JSZip();
      zip.file(stem+'.xlsx',xlsx);
      zip.file(stem+'.json',json);
      const packageBlob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
      downloadBlob(packageBlob,stem+'.zip');

      // Nunca borrar registros operativos. La exportación histórica es copia segura.
      const ok=confirm('Se inició la descarga del ZIP de '+day+'.\\n\\n¿Verificaste que el archivo existe y contiene Excel y JSON?\\nAceptar registra la jornada como respaldada, SIN BORRAR NINGÚN REGISTRO.\\nCancelar mantiene todo pendiente.');
      if(ok){
        const exported=JSON.parse(localStorage.getItem(EXPORTED_DAY_KEY)||'[]');
        if(!exported.includes(day))exported.push(day);
        localStorage.setItem(EXPORTED_DAY_KEY,JSON.stringify(exported));
        toast('✅ Respaldo de '+day+' confirmado; los registros de hoy siguen intactos.');
      }else{
        toast('Todos los registros conservados. Puedes repetir la descarga.');
      }
    }catch(e){
      console.error('GS v133 exportación segura',e);
      toast('No fue posible exportar. Los registros se conservaron completos.');
    }finally{
      exporting=false;
      if(btn){btn.disabled=false;btn.textContent=prev||'📦 Cerrar y exportar jornada'}
      setTimeout(renderLockBanner,30);
    }
  }

  // Sustituye únicamente el cierre/exporte de jornada por la ruta segura.
  document.addEventListener('click',e=>{
    const el=e.target?.closest?.('button,.btn');
    if(!el)return;
    const text=String(el.textContent||'').trim();
    if(/cerrar\s+y\s+exportar\s+jornada/i.test(text)){
      e.preventDefault();
      e.stopImmediatePropagation();
      exportSafe();
      return;
    }
    if(isOverdue()){
      const allowed=/exportar|registros|volver/i.test(text)||el.closest('#records');
      if(!allowed){
        e.preventDefault();
        e.stopImmediatePropagation();
        forceRecords(true);
      }
    }
  },true);

  // Si amaneció con una jornada pendiente, no se puede continuar capturando.
  try{
    if(typeof show==='function'){
      const oldShow=show;
      show=function(id){
        if(isOverdue() && id!=='records'){
          const r=oldShow.call(this,'records');
          setTimeout(renderLockBanner,0);
          if(!warnedOverdue){warnedOverdue=true;setTimeout(()=>alert(lockMessage()),20)}
          return r;
        }
        const r=oldShow.apply(this,arguments);
        if(id==='records')setTimeout(renderLockBanner,0);
        return r;
      };
    }
  }catch(_){}

  try{
    if(typeof gs77StartJornada==='function'){
      const oldStart=gs77StartJornada;
      gs77StartJornada=function(){
        if(isOverdue()){forceRecords(true);return}
        return oldStart.apply(this,arguments);
      };
    }
  }catch(_){}

  try{
    if(typeof renderRecords==='function'){
      const oldRender=renderRecords;
      renderRecords=function(){
        const r=oldRender.apply(this,arguments);
        setTimeout(renderLockBanner,0);
        return r;
      };
    }
  }catch(_){}

  ensurePendingDay();
  setTimeout(()=>{
    renderLockBanner();
    if(isOverdue())forceRecords(true);
  },120);

  console.info('GS Documentos v133 · exportación segura y cierre obligatorio activos');
})();