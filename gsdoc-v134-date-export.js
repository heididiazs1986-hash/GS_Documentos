/* GS Documentos v134 · exportación por fecha (patrón AP Inventory) */
(()=>{
  'use strict';
  if(globalThis.__GS_DOCS_V134_DATE_EXPORT__) return;
  globalThis.__GS_DOCS_V134_DATE_EXPORT__=true;

  const DATE_KEY='GS_DOCS_EXPORT_DATE_V134';
  // El marcador v133 podía quedar obsoleto y bloquear una jornada actual.
  try{localStorage.removeItem('GS_DOCS_PENDING_DAY_V133')}catch(_){}

  const pad=n=>String(n).padStart(2,'0');
  const todayISO=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
  const displayDate=s=>{const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+'/'+m[2]+'/'+m[1]:String(s||'')};

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

  function recordDay(r){
    // La fecha operativa manda; creación es solo respaldo.
    return parseDay(r?.fecha_registro)||parseDay(r?.fecha_hora_creacion)||parseDay(r?.fecha_hora_actualizacion);
  }

  function allRecords(){
    try{return typeof records==='function'?(records()||[]):[]}catch(_){return []}
  }

  function pendingDates(){
    return [...new Set(allRecords().map(recordDay).filter(Boolean))].sort();
  }

  function selectedDate(){
    const dates=pendingDates();
    if(!dates.length)return '';
    const saved=localStorage.getItem(DATE_KEY)||'';
    if(dates.includes(saved))return saved;
    // Si hay días anteriores, prioriza el más antiguo. Si no, hoy/último disponible.
    const overdue=dates.filter(d=>d<todayISO());
    const next=overdue[0]||dates.find(d=>d===todayISO())||dates[dates.length-1];
    try{localStorage.setItem(DATE_KEY,next)}catch(_){}
    return next;
  }

  function setSelectedDate(d){
    if(pendingDates().includes(d))try{localStorage.setItem(DATE_KEY,d)}catch(_){}
  }

  function rowsForDate(d=selectedDate()){
    return allRecords().filter(r=>recordDay(r)===d);
  }

  function overdueDates(){
    return pendingDates().filter(d=>d<todayISO());
  }

  function hasOverdue(){return overdueDates().length>0}

  function safePart(v){
    return String(v||'Sin_sector').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80)||'Sin_sector';
  }

  function renderDateControls(){
    const host=document.querySelector('#recordsHost');
    if(!host)return;
    document.getElementById('gs133DayLock')?.remove();

    const dates=pendingDates();
    const date=selectedDate();
    const rows=rowsForDate(date);
    const toolbar=host.querySelector('.records-toolbar');
    if(!toolbar)return;

    let panel=document.getElementById('gs134DateExport');
    if(!panel){
      panel=document.createElement('div');
      panel.id='gs134DateExport';
      panel.className='gs134-date-export';
      toolbar.insertAdjacentElement('beforebegin',panel);
    }

    const overdue=overdueDates();
    const alertHtml=overdue.length
      ? '<div class="gs134-lock"><b>⛔ Jornada anterior pendiente</b><span>Debes exportar '+(overdue.length===1?'la jornada del '+displayDate(overdue[0]):'las jornadas anteriores')+' antes de crear registros de una nueva fecha.</span></div>'
      : '';

    panel.innerHTML=
      alertHtml+
      '<div class="gs134-picker">'+
        '<label for="gs134ExportDate">Fecha a exportar</label>'+
        '<select id="gs134ExportDate">'+dates.map(d=>'<option value="'+d+'" '+(d===date?'selected':'')+'>'+displayDate(d)+' · '+rowsForDate(d).length+' registro(s)</option>').join('')+'</select>'+
        '<small>Se exportan únicamente los registros guardados de la fecha seleccionada.</small>'+
      '</div>';

    const sel=document.getElementById('gs134ExportDate');
    if(sel)sel.onchange=()=>{setSelectedDate(sel.value);renderRecordsScreen()};

    const btn=document.getElementById('closeJornada');
    if(btn){
      btn.textContent=date?'📦 Exportar jornada · '+displayDate(date):'📦 Exportar jornada';
      btn.disabled=!rows.length;
      btn.onclick=()=>exportSelectedDate(date);
    }

    // El contador inferior conserva el total general, y el primero muestra la fecha elegida.
    const kpis=host.querySelectorAll('.records-kpi');
    if(kpis[0]){
      kpis[0].querySelector('b').textContent=String(rows.length);
      kpis[0].querySelector('span').textContent=date?'Registros del '+displayDate(date):'Registros';
    }

    // Con jornada anterior pendiente, el botón de nuevo registro debe quedar bloqueado de forma visible.
    const newButtons=[document.getElementById('recordsNew'),document.getElementById('newRecordAfterSave')]
      .filter(Boolean);
    for(const b of newButtons){
      b.disabled=hasOverdue();
      b.title=hasOverdue()?'Exporta primero la jornada anterior':'';
    }
  }

  async function exportSelectedDate(dateArg){
    const date=dateArg||selectedDate();
    const rows=rowsForDate(date);
    if(!date||!rows.length){toast('No hay registros para esa fecha');return false}

    const dup=typeof duplicateROs==='function'?duplicateROs(rows):[];
    if(dup.length){
      alert('⚠️ Orden RO duplicada\n\nCorrige antes de exportar:\n'+dup.join('\n'));
      return false;
    }

    const btn=document.getElementById('closeJornada');
    const oldText=btn?.textContent||'';
    if(btn){btn.disabled=true;btn.textContent='Preparando '+displayDate(date)+'…'}

    try{
      const sectors=rows.map(r=>r.sector).filter(Boolean);
      const sectorName=sectors.length&&sectors.every(x=>x===sectors[0])?sectors[0]:'Varios_sectores';
      const safe=safePart(sectorName);
      const excelName='Reporte_de_'+safe+'_'+date+'.xlsx';
      const jsonName='GS_Registro_'+safe+'_'+date+'.json';
      const zipName='GS_Docs_'+safe+'_'+date+'.zip';

      const zip=new JSZip();

      // Excel operativo exacto de GS Documentos.
      zip.file(excelName,buildExcelBytes(rows));

      // JSON siempre incluido en el cierre, para no depender del aliado ni de una segunda descarga.
      const payload={
        app:'GS Documentos',
        version:'v134',
        generated_at:new Date().toISOString(),
        fecha_jornada:date,
        sharepoint_list:'Registro_Recibos técnicos',
        contrato:rows[0]?.contrato||state.jornada?.contrato||'APPLUS',
        total:rows.length,
        registros:rows.map(jsonRecord)
      };
      zip.file(jsonName,JSON.stringify(payload,null,2));

      const matRows=rows.flatMap(materialRowsForRecord);
      if(matRows.length)zip.file('Materiales_'+safe+'_'+date+'.xlsx',materialsWorkbookBytes(rows));

      const tdFolder=zip.folder('CONSTANCIAS_TD');
      for(const r of rows.filter(x=>!x.td_exportado_individual)){
        tdFolder.file(tdFileName(r),await makeTD(r));
      }

      const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
      const ok=await downloadGenerated(blob,zipName,'jornada');
      if(!ok)return false;

      const confirmed=confirm(
        'Se generó '+zipName+' con '+rows.length+' registro(s) de '+displayDate(date)+'.\n\n'+
        'Incluye Excel y JSON'+(matRows.length?', además del Excel de materiales':'')+'.\n\n'+
        '¿Confirmas que el ZIP quedó descargado correctamente?\n\n'+
        'Aceptar = retirar SOLO esta fecha de pendientes.\n'+
        'Cancelar = conservar todos los registros.'
      );

      if(!confirmed){
        toast('Los registros se conservaron. Puedes volver a exportar.');
        return true;
      }

      const ids=new Set(rows.map(r=>r.id_registro).filter(Boolean));
      const remaining=allRecords().filter(r=>{
        if(r.id_registro&&ids.has(r.id_registro))return false;
        return recordDay(r)!==date;
      });
      saveRecords(remaining);
      localStorage.setItem('GS_DOCS_LAST_EXPORT_V1',new Date().toISOString());

      // Evita que quede abierto un registro ya retirado del pendiente.
      if(state.currentRecord && recordDay(state.currentRecord)===date){
        state.currentRecord=null;
        state.editingRecordId=null;
        state.registration={};
        state.form={};
        state.selected=[];
        try{save()}catch(_){}
      }

      const datesLeft=[...new Set(remaining.map(recordDay).filter(Boolean))].sort();
      if(datesLeft.length)setSelectedDate(datesLeft[0]);
      else localStorage.removeItem(DATE_KEY);

      renderRecordsScreen();
      toast('✅ Jornada '+displayDate(date)+' exportada y cerrada');
      return true;
    }catch(e){
      console.error('GS v134 exportación por fecha',e);
      toast('No fue posible exportar: '+(e?.message||e));
      return false;
    }finally{
      if(btn){btn.disabled=false;btn.textContent=oldText}
    }
  }

  // Reemplaza el cierre anterior: ya no usa "hoy" ni un marcador persistente obsoleto.
  try{exportJornada=()=>exportSelectedDate(selectedDate())}catch(_){}
  try{closeJornada=()=>exportSelectedDate(selectedDate())}catch(_){}

  try{
    const oldRender=renderRecordsScreen;
    renderRecordsScreen=function(){
      const r=oldRender.apply(this,arguments);
      setTimeout(renderDateControls,0);
      return r;
    };
  }catch(_){}

  function blockNewIfNeeded(e){
    if(!hasOverdue())return;
    const el=e.target?.closest?.('button,.btn,[data-go]');
    if(!el)return;
    const txt=String(el.textContent||'').trim();
    const isNew=/nuevo\s+registro|guardar\s+y\s+nuevo/i.test(txt)||
      el.id==='recordsNew'||el.id==='newRecordAfterSave';
    if(isNew){
      e.preventDefault();e.stopImmediatePropagation();
      alert('Debes exportar primero la jornada anterior. Selecciona la fecha pendiente y pulsa “Exportar jornada”.');
      try{show('records')}catch(_){}
    }
  }
  document.addEventListener('click',blockNewIfNeeded,true);

  try{
    if(typeof resetRegistrationKeepPlace==='function'){
      const oldReset=resetRegistrationKeepPlace;
      resetRegistrationKeepPlace=function(){
        if(hasOverdue()){
          alert('Debes exportar primero la jornada anterior antes de crear un nuevo registro.');
          show('records');return;
        }
        return oldReset.apply(this,arguments);
      };
    }
  }catch(_){}

  try{
    if(typeof startJornada==='function'){
      const oldStart=startJornada;
      startJornada=function(){
        if(hasOverdue()){
          alert('Hay una jornada anterior pendiente de exportar. Expórtala primero.');
          show('records');return;
        }
        return oldStart.apply(this,arguments);
      };
    }
  }catch(_){}

  try{
    if(typeof gs77StartJornada==='function'){
      const oldStart77=gs77StartJornada;
      gs77StartJornada=function(){
        if(hasOverdue()){
          alert('Hay una jornada anterior pendiente de exportar. Expórtala primero.');
          show('records');return;
        }
        return oldStart77.apply(this,arguments);
      };
    }
  }catch(_){}

  setTimeout(()=>{
    try{
      if(document.body.dataset.screen==='records')renderRecordsScreen();
      else if(hasOverdue())show('records');
    }catch(_){}
  },120);

  console.info('GS Documentos v134 · exportación por fecha activa');
})();