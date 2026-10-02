/* GS Documentos v116 deployment hotfix
   Applies the verified v114-v116 corrections over the deployed v113 base
   without duplicating the large embedded PDF templates. */
(()=>{
  'use strict';
  if(globalThis.__GS_DOCS_V116_HOTFIX__) return;
  globalThis.__GS_DOCS_V116_HOTFIX__=true;
  const VERSION='v116-hotfix';

  const DJ_FALLBACK={
    'Vivienda urbana':'Inmueble destinado a vivienda, cuya construcción ocupa la totalidad o prácticamente la totalidad del área del lote, conformando una unidad residencial continua con sus accesos, dependencias y demás elementos propios de su uso.',
    'Lote con vivienda':'Predio conformado por un lote de terreno sobre el cual se encuentra construida una vivienda, conservando además áreas libres o despejadas no ocupadas por la edificación, destinadas a patio, acceso, circulación, jardín u otros usos propios del inmueble.',
    'Predio en construcción':'Predio sobre el cual se encuentra en desarrollo una construcción destinada principalmente a vivienda, con obras ejecutadas de manera parcial y pendiente de terminación o adecuación para su uso definitivo.',
    'Vivienda de uso mixto':'Inmueble destinado simultáneamente a vivienda y al desarrollo de una actividad comercial, productiva o de servicios, funcionando ambos usos dentro de la misma edificación o predio.',
    'Predio rural con vivienda':'Predio ubicado en zona rural, conformado por terreno y una construcción destinada a vivienda, con sus accesos y espacios propios del uso residencial rural.',
    'Predio rural con vivienda y explotación':'Predio ubicado en zona rural, destinado conjuntamente a vivienda y al desarrollo de actividades agrícolas, pecuarias, productivas o de aprovechamiento del terreno, dentro del cual se encuentra establecida la vivienda principal.'
  };

  const $p=s=>document.querySelector(s);
  const up=s=>String(s||'').trim().replace(/\s+/g,' ').toLocaleUpperCase('es-CO');
  const canon=s=>up(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const addrOnly=()=>up((state.currentRecord||state.registration||{}).direccion || state.form?.cm_dir_radica || '');
  const addrSector=()=>{
    const rec=state.currentRecord||state.registration||{};
    const a=addrOnly(), s=up(rec.sector||state.form?.cm_sector||'');
    if(!a)return s;if(!s)return a;
    return canon(a).includes(canon(s))?a:`${a} - ${s}`;
  };
  const dparts=value=>{
    const v=String(value||'').trim();
    let d;
    if(/^\d{4}-\d{2}-\d{2}$/.test(v)) d=new Date(v+'T00:00:00');
    else if(v) d=new Date(v);
    else d=new Date();
    if(Number.isNaN(d.getTime()))d=new Date();
    const p=n=>String(n).padStart(2,'0');
    return {dia:p(d.getDate()),mes:p(d.getMonth()+1),anio:String(d.getFullYear()),fmt:`${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}`};
  };
  const djMap=()=>{
    try{ if(typeof DJ_DESCRIPTION_MAP!=='undefined') return DJ_DESCRIPTION_MAP; }catch(_){ }
    return DJ_FALLBACK;
  };

  function syncDj(){
    try{
      const sel=$p('#dj_descripcion_titulo'), prev=$p('#djDescripcionPreview');
      if(!sel)return;
      const apply=()=>{
        state.form=state.form||{};
        state.form.dj_descripcion_titulo=sel.value;
        state.form.dj_descripcion=(djMap()[sel.value]||'');
        if(prev){
          prev.textContent=state.form.dj_descripcion||'Selecciona una opción para ver el párrafo que se incluirá en la Declaración Juramentada.';
          prev.classList.toggle('empty',!sel.value);
        }
        try{save()}catch(_){ }
      };
      if(sel.value && !state.form?.dj_descripcion) apply();
      if(sel.dataset.gs116Bound!=='1'){
        sel.dataset.gs116Bound='1';
        sel.addEventListener('change',apply);
      }
    }catch(e){console.warn('GS v116 DJ',e)}
  }

  function enhanceTechScroll(){
    try{
      const list=$p('#techOptions');if(!list)return;
      list.classList.add('tech-options-scroll');
      list.tabIndex=0;
      list.setAttribute('aria-label','Lista desplazable de hallazgos técnicos');
      const menu=list.closest('.tech-menu');
      if(menu && !menu.querySelector('.tech-scroll-hint')){
        const h=document.createElement('div');
        h.className='tech-scroll-hint';
        h.textContent='DESLIZA PARA VER TODOS LOS HALLAZGOS ↓';
        menu.insertBefore(h,list);
      }
      const search=$p('#techSearch');
      if(search && search.dataset.gs116Scroll!=='1'){
        search.dataset.gs116Scroll='1';
        search.addEventListener('input',()=>{list.scrollTop=0});
      }
    }catch(e){console.warn('GS v116 scroll',e)}
  }

  function enhance(){enhanceTechScroll();syncDj()}
  try{
    if(typeof renderRegistration==='function'){
      const original=renderRegistration;
      renderRegistration=function(){const r=original.apply(this,arguments);setTimeout(enhanceTechScroll,0);return r};
    }
  }catch(e){console.warn('GS v116 wrap registro',e)}
  try{
    if(typeof renderForm==='function'){
      const original=renderForm;
      renderForm=function(){const r=original.apply(this,arguments);setTimeout(syncDj,0);return r};
    }
  }catch(e){console.warn('GS v116 wrap form',e)}

  function setText(form,name,value,font,size){
    try{
      const f=form.getTextField(name);
      try{f.acroField.dict.delete(PDFLib.PDFName.of('MaxLen'))}catch(_){ }
      f.setText(String(value??''));
      if(size)try{f.setFontSize(size)}catch(_){ }
      try{f.defaultUpdateAppearances(font)}catch(_){ }
      return true;
    }catch(_){return false}
  }

  function values(){
    const rec=state.currentRecord||state.registration||{};
    const f=state.form||{};
    const fecha=dparts(f.cm_fecha_solicitud||rec.fecha_registro||'');
    const posesion=f.dj_fecha_pose?dparts(f.dj_fecha_pose):{fmt:''};
    const construccion=f.retie_fecha_construccion?dparts(f.retie_fecha_construccion):{fmt:''};
    const mpio=f.cm_mpio||rec.municipio||(rec.localidad==='Bogotá'?'Bogotá':'');
    const depto=f.cm_depto||(mpio==='Bogotá'?'Bogotá D.C.':'Cundinamarca');
    const techName=f.cm_retie_constructor||rec.tecnico_nombre||state.jornada?.tecnico_nombre||state.techProfile?.nombre||'';
    const techCc=f.retie_const_identificacion||rec.tecnico_cedula||state.techProfile?.cedula||'';
    const prof=f.retie_prof_constructor||rec.tecnico_profesion||state.techProfile?.profesion||'';
    const consejo=f.retie_consejo||rec.tecnico_consejo||state.techProfile?.consejo||'';
    const matricula=f.cm_retie_matricula||rec.tecnico_matricula||state.techProfile?.matricula||'';
    let materiales='';
    try{
      if(typeof materialRowsForRecord==='function'){
        materiales=materialRowsForRecord(rec).map(row=>{
          const [,tipo,elemento,material,unidad,cantidad]=row;
          return `${cantidad} ${unidad} · ${material}${elemento?` (${elemento})`:''}`;
        }).join('\n');
      }
    }catch(_){ }
    const desc=f.dj_descripcion || djMap()[f.dj_descripcion_titulo] || '';
    return {rec,f,fecha,posesion,construccion,mpio,depto,techName,techCc,prof,consejo,matricula,materiales,desc,
      nombre:f.cm_nombre||rec.nombres||'',doc:f.cm_num_doc||rec.identificacion||'',cel:f.cm_celular||rec.contacto||'',direccion:addrOnly(),direccionSector:addrSector(),localidad:f.cm_localidad||rec.localidad||'',sector:rec.sector||f.cm_sector||'',ro:f.e1_no_solicitud||rec.orden_ro||''};
  }

  async function patchPdf(kind,bytes){
    const pdf=await PDFLib.PDFDocument.load(bytes,{ignoreEncryption:true,updateMetadata:false});
    const form=pdf.getForm();
    const helv=await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
    const v=values();
    const put=(n,val,size)=>setText(form,n,val,helv,size);

    if(kind==='E1'){
      put('1 Nombre o Razón Social',v.nombre);put('4 Número de Documento',v.doc);
      put('5 Dirección de quien radica',v.direccionSector);put('6 Dirección del predio',v.direccionSector);
      put('6 MunicipioLocalidad',v.mpio);put('4 Municipio',v.mpio);put('7 departamento',v.depto);put('5 departamento',v.depto);
      put('3 Localidad',v.localidad);put('8 Celular',v.cel);put('2 Fecha de solicitud de servicio',v.fecha.fmt);put('No de solicitud',v.ro);
    }else if(kind==='E6'){
      put('text_2gqcv',v.direccionSector);put('text_18ovuf',v.fecha.fmt);put('textarea_22rqal',v.materiales,v.materiales.length>500?7.5:9);
      put('text_27bpxy',v.nombre);put('text_30sznp',v.techName);put('text_329o6m',v.cel);put('text_19wprf',v.ro);
      // No se toca textarea_23tsxt: Explicación técnica NO se llena automáticamente.
    }else if(kind==='AR'){
      put('text_1lojj',v.sector);put('text_2tgsw',v.localidad);put('text_3kjbx',v.mpio||v.localidad);
      put('text_4mqvb',v.direccion);put('text_5yied',v.localidad);put('text_6prgm',v.nombre);put('text_7jdiv',v.doc);
      put('text_8ptdj',v.fecha.dia);put('text_9ujpp',v.fecha.mes);put('text_10ipyf',v.fecha.anio);
    }else if(kind==='DJ'){
      put('Nombre solicitante',v.nombre);put('NumIdentificacion',v.doc);put('Domicilio',v.f.dj_ciudad_dom||v.mpio);
      put('Direccion',v.direccionSector);put('Descripcion',v.desc,v.desc.length>600?7.5:(v.desc.length>400?8.5:10));
      put('Fechapropiedad',v.posesion.fmt);put('LugarDom',v.f.dj_ciudad_dom||v.mpio);put('Posesion',v.f.dj_posesion||'');
      put('LugarFirma',v.mpio);put('FechaFirma',v.fecha.fmt);put('Solicitante Firma',v.nombre);
    }else if(kind==='RETIE'){
      put('retie_constructor',v.techName);put('retie_const_identificacion',v.techCc);put('text_4vafa',v.f.retie_decl_num||'');
      put('retie_prof_constructor',v.prof);put('retie_matricula_const',v.matricula);put('retie_consejo',v.consejo);
      put('retie_direccion',v.direccion);put('retie_municipio',v.mpio);put('retie_departamento',v.depto);put('retie_fecha_construccion',v.construccion.fmt);
      put('retie_solicitante',v.nombre);put('retie_identificacion',v.doc);put('retie_dia',v.fecha.dia);put('retie_mes',v.fecha.mes);put('retie_año',v.fecha.anio);put('retie_ciudad',v.mpio);
      put('retie_dir_constructor',v.f.retie_dir_constructor||'');put('retie_cel_constructor',v.f.retie_cel_constructor||'');put('retie_correo_constructor',v.f.retie_correo_constructor||'');
    }else if(kind==='EC'){
      put('ec_fecha',v.fecha.fmt);put('ec_usuario',v.nombre);put('ec_identificacion',v.doc);put('ec_direccion',v.direccionSector);put('ec_municipio',v.mpio);
      put('ec_tecnico',v.techName);put('ec_matricula',v.matricula);put('ec_tecnico_1',v.techName);put('ec_identificacion_tecnico',v.techCc);put('ec_matricula_1',v.matricula);
    }else if(kind==='TD'){
      put('text_291t9n',v.techName);put('firma_tecnico_nombre',v.techName);put('text_301t3m',v.techCc);put('firma_tecnico_cc',v.techCc);
    }
    try{form.updateFieldAppearances(helv)}catch(_){ }
    return await pdf.save({useObjectStreams:false,addDefaultPage:false,updateFieldAppearances:false});
  }

  async function patchPackage(blob){
    const zip=await JSZip.loadAsync(blob);
    try{zip.remove('CONTENIDO_PAQUETE.txt')}catch(_){delete zip.files['CONTENIDO_PAQUETE.txt']}
    const targets={
      'E1.pdf':'E1','E6.pdf':'E6','AR.pdf':'AR','DJ.pdf':'DJ','RETIE.pdf':'RETIE','EC_Esquema_constructivo.pdf':'EC'
    };
    for(const [name,kind] of Object.entries(targets)){
      const f=zip.file(name);if(!f)continue;
      try{zip.file(name,await patchPdf(kind,await f.async('uint8array')))}catch(e){console.warn('GS v116 PDF '+kind,e)}
    }
    for(const name of Object.keys(zip.files)){
      if(/^TD_.*\.pdf$/i.test(name)){
        try{const f=zip.file(name);if(f)zip.file(name,await patchPdf('TD',await f.async('uint8array')))}catch(e){console.warn('GS v116 TD',e)}
      }
    }
    return await zip.generateAsync({type:'blob'});
  }

  try{
    if(typeof downloadBlob==='function'){
      const original=downloadBlob;
      downloadBlob=async function(blob,name){
        let out=blob;
        if(/\.zip$/i.test(String(name||''))){
          try{out=await patchPackage(blob)}catch(e){console.error('GS v116 package patch',e)}
        }
        return original(out,name);
      };
    }
  }catch(e){console.warn('GS v116 download patch',e)}

  // Ensure the newest service worker is requested even though base app.js still carries its prior query string.
  if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js?v=gsdoc-v116-hotfix').catch(()=>{})}
  setTimeout(enhance,0);
  document.documentElement.dataset.gsV116Hotfix='active';
  console.info('GS Documentos',VERSION,'activo');
})();
