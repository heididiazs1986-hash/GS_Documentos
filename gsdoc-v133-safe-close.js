/* GS Documentos v134 · exportación por jornada + bloqueo real de pendientes anteriores */
(()=>{
  'use strict';
  if(globalThis.__GS_DOCS_V134_SAFE_CLOSE__) return;
  globalThis.__GS_DOCS_V134_SAFE_CLOSE__=true;

  const q=s=>document.querySelector(s);
  let exporting=false;
  let warnedOverdue=false;

  const pad=n=>String(n).padStart(2,'0');
  const today=()=>{
    const d=new Date();
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  };

  function parseDay(v){
    const s=String(v??'').trim();
    if(!s)return '';
    let m=s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if(m)return m[1]+'-'+pad(m[2])+'-'+pad(m[3]);
    m=s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if(m)return m[3]+'-'+pad(m[2])+'-'+pad(m[1]);
    const d=new Date(s);
    if(Number.isNaN(d.getTime()))return '';
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  }

  function getRecords(){
    try{return typeof records==='function'?(records()||[]):[]}catch(_){return []}
  }

  function recordDay(r){
    for(const key of [
      '_gs_export_day',
      'fecha_hora_creacion','fecha_hora_actualizacion',
      'fecha_registro','Fecha de registro','fecha_de_registro',
      'created_at','createdAt','fecha'
    ]){
      const d=parseDay(r?.[key]);
      if(d)return d;
    }
    return '';
  }

  function classify(){
    const list=getRecords();
    const mapped=list.map((r,i)=>({r,i,day:recordDay(r)}));
    const known=mapped.filter(x=>x.day);
    const unknown=mapped.filter(x=>!x.day);

    // Registros legados sin fecha: nunca usamos un marcador viejo para bloquear.
    // Se consideran de hoy para evitar falsos bloqueos.
    for(const x of unknown)x.day=today();

    const days=[...new Set(mapped.map(x=>x.day).filter(Boolean))].sort();
    const previous=days.filter(d=>d<today());
    return {list,mapped,days,previous};
  }

  function overdueDay(){
    return classify().previous[0]||'';
  }

  function isOverdue(){
    return !!overdueDay();
  }

  function lockMessage(){
    const d=overdueDay();
    return d
      ? 'Hay una jornada del '+d+' pendiente de exportar. Debes exportarla antes de continuar con una nueva jornada.'
      : '';
  }

  function renderLockBanner(){
    const card=q('#records .card');
    if(!card)return;
    let box=q('#gs134DayLock');
    const msg=lockMessage();
    if(!msg){box?.remove();return}
    if(!box){
      box=document.createElement('div');
      box.id='gs134DayLock';
      box.className='gs133-day-lock';
      const h=card.querySelector('h2');
      if(h)h.insertAdjacentElement('afterend',box); else card.prepend(box);
    }
    box.innerHTML='<b>⛔ Jornada anterior pendiente</b><span>'+msg+'</span>';
  }

  function forceRecords(showAlert=true){
    const msg=lockMessage();
    if(showAlert && msg && !warnedOverdue){
      warnedOverdue=true;
      alert(msg);
    }
    try{
      if(typeof show==='function')show('records');
      if(typeof renderRecords==='function')renderRecords();
    }catch(_){}
    setTimeout(renderLockBanner,30);
  }

  // Guardar un día estable en registros nuevos que no lo traigan.
  try{
    if(typeof saveRecords==='function'){
      const oldSaveRecords=saveRecords;
      saveRecords=function(list){
        const arr=(Array.isArray(list)?list:[]).map(r=>{
          if(!r || typeof r!=='object')return r;
          if(recordDay(r))return r;
          return {...r,_gs_export_day:today()};
        });
        return oldSaveRecords.call(this,arr);
      };
    }
  }catch(_){}

  const norm=s=>String(s??'').trim().toLocaleLowerCase('es-CO')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');

  const specs=[
    ['Orden_RO',['orden_ro','orden','ro']],
    ['Fecha de registro',['fecha_de_registro','fecha_registro','fecha','fecha_hora_creacion','_gs_export_day']],
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
    const map=new Map(Object.entries(rec||{}).map(([k,v])=>[norm(k),v]));
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
          const d=parseDay(v)||recordDay(rec);
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
    return String(v||'').trim()
      .replace(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ_-]+/g,'_')
      .replace(/^_+|_+$/g,'').slice(0,60);
  }

  function triggerDownload(blob,name){
    const a=document.createElement('a');
    const url=URL.createObjectURL(blob);
    a.href=url;
    a.download=name;
    a.style.display='none';
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{a.remove();URL.revokeObjectURL(url)},60000);
  }

  function targetBatch(){
    const c=classify();
    if(!c.list.length)return {day:'',records:[],indexes:[],all:c.list};
    const target=c.previous[0] || today();
    const indexes=[];
    const recs=[];
    c.mapped.forEach((x,idx)=>{
      if(x.day===target){indexes.push(idx);recs.push(x.r)}
    });
    return {day:target,records:recs,indexes,all:c.list};
  }

  async function exportSafe(){
    if(exporting)return;
    const batch=targetBatch();
    if(!batch.records.length){
      toast('No hay registros pendientes de exportar');
      return;
    }
    if(!globalThis.XLSX?.utils || !globalThis.JSZip){
      toast('No fue posible preparar el exporte. Cierra y vuelve a abrir la App.');
      return;
    }

    exporting=true;
    const btn=[...document.querySelectorAll('button,.btn')]
      .find(el=>/cerrar\s+y\s+exportar\s+jornada/i.test(el.textContent||''));
    const prev=btn?.textContent;
    if(btn){btn.disabled=true;btn.textContent='Preparando exporte…'}

    try{
      const headers=specs.map(x=>x[0]);
      const rows=buildExcelRows(batch.records);
      const ws=XLSX.utils.json_to_sheet(rows,{header:headers});
      ws['!cols']=headers.map(h=>({wch:Math.min(42,Math.max(12,h.length+2))}));

      const wb=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb,ws,'Registros');
      const xlsx=XLSX.write(wb,{bookType:'xlsx',type:'array'});

      const json=JSON.stringify(batch.records,null,2);
      const tech=safeFilePart(
        globalThis.state?.jornada?.tecnico_nombre||
        globalThis.state?.jornada?.nombre_tecnico||''
      );
      const stem='GS_DOCUMENTOS_'+batch.day+(tech?'_'+tech:'');
      const zip=new JSZip();
      zip.file(stem+'.xlsx',xlsx);
      zip.file(stem+'.json',json);
      const packageBlob=await zip.generateAsync({
        type:'blob',
        compression:'DEFLATE',
        compressionOptions:{level:6}
      });

      triggerDownload(packageBlob,stem+'.zip');

      const ok=confirm(
        'Se inició la descarga de '+stem+'.zip con '+batch.records.length+' registro(s).\n\n'+
        'El ZIP contiene el Excel y el JSON.\n\n'+
        '¿Confirmas que el archivo quedó descargado?\n\n'+
        'Aceptar = retirar SOLO esta jornada de pendientes.\n'+
        'Cancelar = conservarla completa para volver a exportar.'
      );

      if(!ok){
        toast('Registros conservados. Puedes volver a exportar.');
        return;
      }

      // Elimina exclusivamente los registros del día exportado.
      const exportedIndexes=new Set(batch.indexes);
      const remaining=batch.all.filter((_,idx)=>!exportedIndexes.has(idx));
      if(typeof saveRecords==='function')saveRecords(remaining);

      // Limpiar solo el registro actual si pertenecía al lote exportado.
      try{
        const cur=globalThis.state?.currentRecord;
        if(cur && recordDay(cur)===batch.day){
          state.currentRecord=null;
          state.registration={};
          state.selected=[];
          state.form={};
        }
        if(typeof save==='function')save();
      }catch(_){}

      warnedOverdue=false;
      try{if(typeof renderRecords==='function')renderRecords()}catch(_){}
      setTimeout(renderLockBanner,30);

      if(remaining.length){
        const nextOld=overdueDay();
        if(nextOld)toast('✅ Jornada '+batch.day+' exportada. Aún queda pendiente '+nextOld+'.');
        else toast('✅ Jornada '+batch.day+' exportada. Puedes continuar con los registros de hoy.');
      }else{
        toast('✅ Jornada '+batch.day+' exportada y cerrada.');
      }
    }catch(e){
      console.error('GS v134 exportación segura',e);
      toast('No fue posible exportar. Ningún registro fue eliminado.');
    }finally{
      exporting=false;
      if(btn){btn.disabled=false;btn.textContent=prev||'📦 Cerrar y exportar jornada'}
    }
  }

  // Reemplazar el cierre/exporte nativo.
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
      // Dentro de Registros se permite editar/exportar; no iniciar nuevos casos.
      const newWork=
        /nuevo\s+registro|registrar|volver\s+al\s+registro\s+actual|realizar\s+documentos/i.test(text) ||
        el.dataset?.go==='register';
      if(newWork){
        e.preventDefault();
        e.stopImmediatePropagation();
        forceRecords(true);
      }
    }
  },true);

  try{
    if(typeof show==='function'){
      const oldShow=show;
      show=function(id){
        if(isOverdue() && ['register','jornada','saved','docs','form','supports'].includes(String(id))){
          const r=oldShow.call(this,'records');
          setTimeout(renderLockBanner,0);
          if(!warnedOverdue){
            warnedOverdue=true;
            setTimeout(()=>alert(lockMessage()),20);
          }
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

  // Borrar marcadores defectuosos de versiones anteriores: ya no se usan.
  try{
    localStorage.removeItem('GS_DOCS_PENDING_DAY_V133');
    localStorage.removeItem('GS_DOCS_EXPORTED_DAYS_V134');
  }catch(_){}

  setTimeout(()=>{
    renderLockBanner();
    if(isOverdue())forceRecords(false);
  },120);

  console.info('GS Documentos v134 · exportación por jornada y bloqueo real activos');
})();