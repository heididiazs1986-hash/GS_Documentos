/* GS Documentos v141 · exportación de jornada en una sola descarga */
(()=>{
  'use strict';
  if(globalThis.__GS_DOCS_V141_SINGLE_EXPORT__) return;
  globalThis.__GS_DOCS_V141_SINGLE_EXPORT__=true;

  let exporting=false;

  function setExportBusy(busy){
    const b=document.getElementById('closeJornada');
    if(!b)return;
    b.disabled=!!busy;
    b.dataset.gs141Busy=busy?'1':'0';
    b.textContent=busy?'⏳ Generando ZIP…':'📦 Cerrar y exportar jornada';
  }

  async function gs141ExportJornada(){
    if(exporting){
      try{toast('La exportación ya está en curso.')}catch(_){}
      return false;
    }
    exporting=true;
    setExportBusy(true);
    try{
      const rows=jornadaRows();
      if(!rows.length){toast('No hay registros para exportar');return false}

      const dup=duplicateROs(rows);
      if(dup.length){
        alert('⚠️ Orden RO duplicada\n\nCorrige antes de exportar:\n'+dup.join('\n'));
        return false;
      }

      const sectors=rows.map(r=>r.sector).filter(Boolean);
      const sectorName=sectors.length&&sectors.every(x=>x===sectors[0])?sectors[0]:'Varios_sectores';
      const safe=safeFilePart(sectorName),date=todayISO();

      const excelName='Recibo_tecnico_'+safe+'_'+date+'.xlsx';
      const jsonName='GS_Registro_'+safe+'_'+date+'.json';
      const zipName='GS_Documentos_'+safe+'_'+date+'.zip';

      const zip=new JSZip();
      zip.file(excelName,buildExcelBytes(rows));

      const payload={
        app:'GS Documentos',
        version:(typeof VERSION!=='undefined'?VERSION:''),
        generated_at:new Date().toISOString(),
        total:rows.length,
        registros:rows.map(r=>typeof jsonRecord==='function'?jsonRecord(r):r)
      };
      zip.file(jsonName,JSON.stringify(payload,null,2));

      const blob=await zip.generateAsync({type:'blob'});
      let ok=true;
      if(typeof downloadGenerated==='function'){
        ok=await downloadGenerated(blob,zipName,'jornada');
      }else{
        await downloadBlob(blob,zipName);
      }
      if(ok===false)return false;

      localStorage.setItem('GS_DOCS_LAST_EXPORT_V1',new Date().toISOString());
      toast('✅ Jornada exportada en un solo ZIP: '+rows.length+' registros',6000);
      if(typeof renderRecordsScreen==='function')renderRecordsScreen();
      return true;
    }catch(e){
      console.error('GS v141 export',e);
      toast('No fue posible exportar: '+(e?.message||e),6000);
      return false;
    }finally{
      exporting=false;
      setTimeout(()=>setExportBusy(false),0);
    }
  }

  async function gs141CloseJornada(){
    if(exporting){
      toast('La exportación ya está en curso.');
      return;
    }
    const rows=jornadaRows();
    if(!rows.length){toast('No hay registros para cerrar');return}

    const dup=duplicateROs(rows);
    if(dup.length){
      alert('⚠️ Orden RO duplicada\n\nCorrige antes de cerrar la jornada:\n'+dup.join('\n'));
      return;
    }

    const ok=await gs141ExportJornada();
    if(!ok)return;

    if(confirm('¿Confirmas que verificaste y guardaste el ZIP de la jornada?\n\nAceptar limpiará los registros operativos del dispositivo.')){
      localStorage.removeItem(recordsKey);
      localStorage.removeItem(txtKey);
      localStorage.removeItem(appKey);
      toast('Jornada cerrada y datos operativos limpiados');
      setTimeout(()=>location.reload(),500);
    }
  }

  try{exportJornada=gs141ExportJornada}catch(e){console.warn('GS v141 no pudo reemplazar exportJornada',e)}
  try{closeJornada=gs141CloseJornada}catch(e){console.warn('GS v141 no pudo reemplazar closeJornada',e)}

  // El listener de captura evita que un onclick antiguo dispare una segunda exportación.
  document.addEventListener('click',e=>{
    const b=e.target?.closest?.('#closeJornada');
    if(!b)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    gs141CloseJornada();
  },true);

  console.info('GS Documentos v141 · exportación única activa');
})();