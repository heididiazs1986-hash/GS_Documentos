/* GS Documentos v118 · presentación ortográfica de documentos
   Conserva los datos operativos tal como se registran y mejora SOLO la salida documental. */
(()=>{
  'use strict';
  if(globalThis.__GS_DOCS_V118_PRESENTATION__) return;
  globalThis.__GS_DOCS_V118_PRESENTATION__=true;

  const KEEP=new Map([
    ['retie','RETIE'],['spt','SPT'],['ec','EC'],['e1','E1'],['e6','E6'],['dj','DJ'],['ar','AR'],['ro','RO'],
    ['conte','CONTE'],['conaltel','CONALTEL'],['applus','APPLUS'],['inmel','INMEL'],['pvc','PVC'],['acsr','ACSR'],
    ['bt','BT'],['mt','MT'],['dps','DPS'],['gps','GPS'],['pdf','PDF'],['txt','TXT'],['sas','S.A.S.'],['d.c.','D.C.'],
    ['garrawall','GarraWall']
  ]);
  const SMALL=new Set(['de','del','la','las','los','y','e','o','en','al','por','para','con','sin','a']);
  const ROAD=new Set(['KRA','KR','CL','DG','TRV','TV','AK','AC','AV','CRA','CARRERA','CALLE','DIAGONAL','TRANSVERSAL','BIS','SUR','NORTE','ESTE','OESTE']);

  function capWord(w){
    if(!w)return w;
    const low=w.toLocaleLowerCase('es-CO');
    if(KEEP.has(low)) return KEEP.get(low);
    return low.charAt(0).toLocaleUpperCase('es-CO')+low.slice(1);
  }

  function titleCase(value){
    const s=String(value||'').trim().replace(/\s+/g,' ');
    if(!s)return '';
    let first=true;
    return s.split(/(\s+|-|\/)/).map(part=>{
      if(/^\s+$|^-$|^\/$/.test(part))return part;
      const low=part.toLocaleLowerCase('es-CO');
      const out=(!first && SMALL.has(low))?low:capWord(part);
      first=false;
      return out;
    }).join('');
  }

  function sentenceCase(value){
    let s=String(value||'').trim().replace(/\s+/g,' ');
    if(!s)return '';
    s=s.toLocaleLowerCase('es-CO');
    s=s.replace(/(^|[.!?]\s+)([a-záéíóúüñ])/g,(m,p,c)=>p+c.toLocaleUpperCase('es-CO'));
    const replacements=[
      ['retie','RETIE'],['spt','SPT'],['ec','EC'],['e1','E1'],['e6','E6'],['dj','DJ'],['ar','AR'],['ro','RO'],
      ['conte','CONTE'],['conaltel','CONALTEL'],['applus','APPLUS'],['inmel','INMEL'],['pvc','PVC'],['acsr','ACSR'],
      ['bt','BT'],['mt','MT'],['dps','DPS'],['gps','GPS'],['pdf','PDF'],['txt','TXT'],['garrawall','GarraWall']
    ];
    for(const [low,pretty] of replacements){
      s=s.replace(new RegExp('\\b'+low+'\\b','gi'),pretty);
    }
    return s;
  }

  function addressCase(value){
    const s=String(value||'').trim().replace(/\s+/g,' ');
    if(!s)return '';
    const parts=s.split(/([\s#.,;/()-]+)/);
    return parts.map(part=>{
      if(!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(part))return part;
      const up=part.toLocaleUpperCase('es-CO');
      const low=part.toLocaleLowerCase('es-CO');
      if(ROAD.has(up))return up;
      if(part.length===1)return up;
      if(KEEP.has(low))return KEEP.get(low);
      if(SMALL.has(low))return low;
      return capWord(part);
    }).join('').replace(/\s+/g,' ').trim();
  }

  function prettyDepto(v){
    const t=titleCase(v);
    return /^Bogotá\s+D\.?\s*C\.?$/i.test(t)?'Bogotá D.C.':t;
  }

  function humanHallazgos(rec){
    const out=[];
    const elems=Array.isArray(rec.elementos_externos)?rec.elementos_externos:[];
    if(rec.requiere_externa==='Sí' && elems.length){
      out.push('Elementos requeridos de instalación externa: '+elems.map(x=>sentenceCase(x)).join(', ')+'.');
    }
    const st=Array.isArray(rec.estado_tecnico)?rec.estado_tecnico.filter(Boolean):[];
    out.push(...st.map(sentenceCase));
    const obs=String(rec.observaciones||'').split('|').map(x=>x.trim()).filter(Boolean);
    for(const x of obs){
      if(!st.includes(x))out.push(sentenceCase(x));
    }
    return [...new Set(out.filter(Boolean))].join(' | ');
  }

  function dparts(value){
    const v=String(value||'').trim();
    let d;
    if(/^\d{4}-\d{2}-\d{2}$/.test(v))d=new Date(v+'T00:00:00'); else d=v?new Date(v):new Date();
    if(Number.isNaN(d.getTime()))d=new Date();
    const p=n=>String(n).padStart(2,'0');
    return {dia:p(d.getDate()),mes:p(d.getMonth()+1),anio:String(d.getFullYear()),fmt:p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear()};
  }

  function prettyValues(){
    const rec=state.currentRecord||state.registration||{}, f=state.form||{};
    const fecha=dparts(f.cm_fecha_solicitud||rec.fecha_registro||'');
    const posesion=f.dj_fecha_pose?dparts(f.dj_fecha_pose):{fmt:''};
    const construccion=f.retie_fecha_construccion?dparts(f.retie_fecha_construccion):{fmt:''};
    const mpio=titleCase(f.cm_mpio||rec.municipio||(rec.localidad==='Bogotá'?'Bogotá':''));
    const depto=prettyDepto(f.cm_depto||(mpio==='Bogotá'?'Bogotá D.C.':'Cundinamarca'));
    const techName=titleCase(f.cm_retie_constructor||rec.tecnico_nombre||state.jornada?.tecnico_nombre||state.techProfile?.nombre||'');
    const nombre=titleCase(f.cm_nombre||rec.nombres||'');
    const localidad=titleCase(f.cm_localidad||rec.localidad||'');
    const sector=titleCase(rec.sector||f.cm_sector||'');
    const direccion=addressCase(rec.direccion||f.cm_dir_radica||'');
    const prof=sentenceCase(f.retie_prof_constructor||rec.tecnico_profesion||state.techProfile?.profesion||'');
    return {
      rec,f,fecha,posesion,construccion,mpio,depto,techName,nombre,localidad,sector,direccion,prof,
      desc:String(f.dj_descripcion||'').trim(),
      doc:String(f.cm_num_doc||rec.identificacion||''),cel:String(f.cm_celular||rec.contacto||''),
      techCc:String(f.retie_const_identificacion||rec.tecnico_cedula||state.techProfile?.cedula||''),
      consejo:String(f.retie_consejo||rec.tecnico_consejo||state.techProfile?.consejo||''),
      matricula:String(f.cm_retie_matricula||rec.tecnico_matricula||state.techProfile?.matricula||''),
      ro:String(f.e1_no_solicitud||rec.orden_ro||''),hallazgos:humanHallazgos(rec)
    };
  }

  function setText(form,name,value,font,size){
    try{
      const field=form.getTextField(name);
      try{field.acroField.dict.delete(PDFLib.PDFName.of('MaxLen'))}catch(_){}
      field.setText(String(value??''));
      if(size)try{field.setFontSize(size)}catch(_){}
      try{field.defaultUpdateAppearances(font)}catch(_){}
      return true;
    }catch(_){return false}
  }

  async function repolish(kind,bytes){
    const pdf=await PDFLib.PDFDocument.load(bytes,{ignoreEncryption:true,updateMetadata:false});
    const form=pdf.getForm(), helv=await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
    const v=prettyValues();
    const put=(n,val,size)=>setText(form,n,val,helv,size);
    const dirSector=v.sector && !String(v.direccion).toLocaleLowerCase('es-CO').includes(v.sector.toLocaleLowerCase('es-CO'))
      ? v.direccion+' - '+v.sector : v.direccion;

    if(kind==='E1'){
      put('1 Nombre o Razón Social',v.nombre);put('4 Número de Documento',v.doc);
      put('5 Dirección de quien radica',dirSector);put('6 Dirección del predio',dirSector);
      put('6 MunicipioLocalidad',v.mpio);put('4 Municipio',v.mpio);put('7 departamento',v.depto);put('5 departamento',v.depto);
      put('3 Localidad',v.localidad);put('8 Celular',v.cel);put('2 Fecha de solicitud de servicio',v.fecha.fmt);put('No de solicitud',v.ro);
    }else if(kind==='E6'){
      put('text_2gqcv',dirSector);put('text_18ovuf',v.fecha.fmt);put('text_27bpxy',v.nombre);put('text_30sznp',v.techName);put('text_329o6m',v.cel);put('text_19wprf',v.ro);
      put('textarea_22rqal','');
      put('textarea_23tsxt','');
    }else if(kind==='AR'){
      put('text_1lojj',v.sector);put('text_2tgsw',v.localidad);put('text_3kjbx',v.mpio||v.localidad);
      put('text_4mqvb',v.direccion);put('text_5yied',v.localidad);put('text_6prgm',v.nombre);put('text_7jdiv',v.doc);
      put('text_8ptdj',v.fecha.dia);put('text_9ujpp',v.fecha.mes);put('text_10ipyf',v.fecha.anio);
    }else if(kind==='DJ'){
      put('Nombre solicitante',v.nombre);put('NumIdentificacion',v.doc);put('Domicilio',titleCase(v.f.dj_ciudad_dom||v.mpio));
      put('Direccion',dirSector);put('Descripcion',v.desc,v.desc.length>600?7.5:(v.desc.length>400?8.5:10));
      put('Fechapropiedad',v.posesion.fmt);put('LugarDom',titleCase(v.f.dj_ciudad_dom||v.mpio));put('Posesion',sentenceCase(v.f.dj_posesion||''));
      put('LugarFirma',v.mpio);put('FechaFirma',v.fecha.fmt);put('Solicitante Firma',v.nombre);
    }else if(kind==='RETIE'){
      put('retie_constructor',v.techName);put('retie_const_identificacion',v.techCc);put('text_4vafa',v.f.retie_decl_num||'');
      put('retie_prof_constructor',v.prof);put('retie_matricula_const',v.matricula);put('retie_consejo',v.consejo);
      put('retie_direccion',v.direccion);put('retie_municipio',v.mpio);put('retie_departamento',v.depto);put('retie_fecha_construccion',v.construccion.fmt);
      put('retie_solicitante',v.nombre);put('retie_identificacion',v.doc);put('retie_dia',v.fecha.dia);put('retie_mes',v.fecha.mes);put('tie_año',v.fecha.anio);put('retie_ciudad',v.mpio);
      put('retie_dir_constructor',addressCase(v.f.retie_dir_constructor||''));put('retie_cel_constructor',v.f.retie_cel_constructor||'');put('retie_correo_constructor',String(v.f.retie_correo_constructor||'').toLocaleLowerCase('es-CO'));
    }else if(kind==='EC'){
      put('ec_fecha',v.fecha.fmt);put('ec_usuario',v.nombre);put('ec_identificacion',v.doc);put('ec_direccion',dirSector);put('ec_municipio',v.mpio);
      put('ec_tecnico',v.techName);put('ec_matricula',v.matricula);put('ec_tecnico_1',v.techName);put('ec_identificacion_tecnico',v.techCc);put('ec_matricula_1',v.matricula);
    }else if(kind==='TD'){
      put('orden_ro',v.ro);put('localidad',v.localidad);put('sector',v.sector);put('nombre',v.nombre);put('identificacion',v.doc);
      put('direccion',v.direccion);put('contacto',v.cel);put('hallazgos',v.hallazgos,v.hallazgos.length>1500?6.8:v.hallazgos.length>900?7.3:8);
      put('aut_nombre',v.nombre);put('aut_identificacion',v.doc);
      put('firma_usuario_nombre',v.nombre);put('firma_usuario_cc',v.doc?('C.C. '+v.doc):'');
      put('firma_tecnico_nombre',v.techName);put('firma_tecnico_cc',v.techCc?('C.C. '+v.techCc):'');
    }
    try{form.updateFieldAppearances(helv)}catch(_){}
    return await pdf.save({useObjectStreams:false,addDefaultPage:false,updateFieldAppearances:false});
  }

  async function polishPackage(blob){
    const zip=await JSZip.loadAsync(blob);
    const targets={'E1.pdf':'E1','E6.pdf':'E6','AR.pdf':'AR','DJ.pdf':'DJ','RETIE.pdf':'RETIE','EC_Esquema_constructivo.pdf':'EC'};
    for(const [name,kind] of Object.entries(targets)){
      const f=zip.file(name);if(!f)continue;
      try{zip.file(name,await repolish(kind,await f.async('uint8array')))}catch(e){console.warn('GS v118',kind,e)}
    }
    for(const name of Object.keys(zip.files)){
      if(/^TD_.*\.pdf$/i.test(name)){
        try{const f=zip.file(name);if(f)zip.file(name,await repolish('TD',await f.async('uint8array')))}catch(e){console.warn('GS v118 TD',e)}
      }
    }
    return await zip.generateAsync({type:'blob'});
  }

  if(typeof downloadBlob==='function'){
    const previous=downloadBlob;
    downloadBlob=async function(blob,name){
      let out=blob;
      if(/\.zip$/i.test(String(name||''))){
        try{out=await polishPackage(blob)}catch(e){console.error('GS v118 presentación',e)}
      }
      return previous(out,name);
    };
  }

  console.info('GS Documentos v118 · regla ortográfica documental activa');
})();