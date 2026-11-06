/* GS Documentos v156 - EC INMEL: PDF fijo (3 paginas) con campos y firma.
 * Solo reemplaza el archivo EC dentro del ZIP. No modifica E1/E6/AR/DJ/RETIE.
 */
(()=>{
  'use strict';
  if(globalThis.__GS_DOCS_V156_EC_INMEL__) return;
  globalThis.__GS_DOCS_V156_EC_INMEL__=true;

  const PATH='./templates/base64/EC_INMEL_2026.part';
  const PART_COUNT=10;
  const EXPECTED_B64_LEN=2559132;
  const OUTPUT_NAME='EC_Esquema_constructivo.pdf';
  let templatePromise=null;

  function first(...values){
    for(const x of values){
      const s=String(x??'').trim();
      if(s)return s;
    }
    return '';
  }
  function dateDdMmYyyy(s){
    const x=String(s||'').trim();
    const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(x);
    return m?`${m[3]}/${m[2]}/${m[1]}`:x;
  }
  function asBytes(b64){
    const clean=String(b64||'').replace(/\s+/g,'');
    const raw=atob(clean);
    const bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    return bytes;
  }
  async function loadBase(){
    if(!templatePromise){
      templatePromise=Promise.all(Array.from({length:PART_COUNT},async(_,idx)=>{
        const uri=PATH+String(idx+1).padStart(2,'0')+'.txt';
        const response=await fetch(uri,{cache:'no-store'});
        if(!response.ok)throw new Error('Falta una parte del EC ('+(idx+1)+')');
        return (await response.text()).replace(/\s+/g,'');
      })).then(parts=>{
        const b64=parts.join('');
        if(b64.length!==EXPECTED_B64_LEN||!b64.startsWith('JVBERi0')){
          throw new Error('El PDF EC de INMEL no se cargo completo');
        }
        return asBytes(b64);
      }).catch(err=>{templatePromise=null;throw err});
    }
    return templatePromise;
  }
  function signaturePlacement(img,rect){
    const iw=Number(img.width)||1, ih=Number(img.height)||1;
    const scale=Math.min(rect.width/iw,rect.height/ih);
    const width=iw*scale,height=ih*scale;
    return {x:rect.x+(rect.width-width)/2,y:rect.y+(rect.height-height)/2,width,height};
  }
  function data(){
    // Se conserva la fecha registrada, aunque el usuario la haya editado.
    const rec=(state.currentRecord&&Object.keys(state.currentRecord).length)
      ?state.currentRecord:(state.registration||{});
    const form=state.form||{},jornada=state.jornada||{},tech=state.techProfile||{};
    const viaForm=(typeof window.recogerDatos==='function'?window.recogerDatos():{})||{};
    const municipio=String(rec.localidad||'').trim().toLocaleUpperCase('es-CO')==='SOACHA'
      ?'Soacha':first(rec.municipio,form.cm_mpio,viaForm.cm_mpio,rec.localidad);
    const tecnico=first(form.cm_retie_constructor,viaForm.cm_retie_constructor,
      tech.nombre,jornada.tecnico_nombre,jornada.nombre_tecnico);
    const matricula=first(form.cm_retie_matricula,viaForm.cm_retie_matricula,
      rec.tecnico_matricula,tech.matricula);
    return {
      Fecha:dateDdMmYyyy(first(rec.fecha_registro,form.cm_fecha_solicitud,viaForm.cm_fecha_solicitud)),
      Propietario:first(rec.nombres,form.cm_nombre,viaForm.cm_nombre),
      Identificacion:first(rec.identificacion,form.cm_num_doc,viaForm.cm_num_doc),
      Direccion:first(rec.direccion,form.cm_dir_radica,viaForm.cm_dir_radica),
      Municipio:municipio,
      Electricista:tecnico,
      Tarjeta_Profesional:matricula,
      Matricula_Pagina_1:matricula,
      Matricula_Pagina_2:matricula,
      Matricula_Pagina_3:matricula
    };
  }
  function compatibleText(v){
    const raw=String(v??'');
    try{return typeof sanitizePdfText==='function'?sanitizePdfText(raw):raw}
    catch(_){return raw}
  }
  async function makeEC(){
    if(!globalThis.PDFLib?.PDFDocument)throw new Error('No se cargo el motor PDF');
    const pdf=await PDFLib.PDFDocument.load(await loadBase(),{ignoreEncryption:true,updateMetadata:false});
    if(pdf.getPageCount()!==3)throw new Error('La plantilla EC debe tener exactamente 3 paginas');
    const form=pdf.getForm();
    const helv=await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
    for(const [name,value] of Object.entries(data())){
      let field;
      try{field=form.getTextField(name)}
      catch(e){throw new Error('Campo del EC no encontrado: '+name)}
      field.setText(compatibleText(value));
      try{field.defaultUpdateAppearances(helv)}catch(_){ }
    }
    try{form.updateFieldAppearances(helv)}catch(e){console.warn('EC: apariencias',e)}

    const sig=state.signatures?.tecnico;
    if(!sig)throw new Error('Falta firma del tecnico para el EC');
    const img=sig.startsWith('data:image/jpeg')||sig.startsWith('data:image/jpg')
      ?await pdf.embedJpg(asBytes(sig.split(',').pop()))
      :await pdf.embedPng(asBytes(sig.split(',').pop()));
    const pages=pdf.getPages();
    const rects=[
      {x:60.43,y:116.30,width:231.26,height:44.78},
      {x:59.85,y:110.48,width:230.10,height:47.10},
      {x:59.85,y:122.11,width:230.68,height:46.52}
    ];
    for(let i=0;i<pages.length;i++){
      pages[i].drawImage(img,signaturePlacement(img,rects[i]));
    }
    return pdf.save({useObjectStreams:false,updateFieldAppearances:false});
  }

  // El flujo v77 genera el antiguo EC antes de añadirlo al ZIP. Sustituimos
  // UNICAMENTE esa entrada por un Promise<Uint8Array> con el EC nuevo.
  // JSZip 3.x espera la promesa durante generateAsync; un error cancela el ZIP.
  function patchZip(){
    const Zip=globalThis.JSZip;
    if(!Zip?.prototype?.file)return false;
    if(Zip.prototype.file.__gsV156EC)return true;
    const original=Zip.prototype.file;
    const patched=function(name,content,...rest){
      if(arguments.length>=2 && typeof name==='string' &&
         (name===OUTPUT_NAME || name==='EC_Esquema_constructivo.docx')){
        return original.call(this,OUTPUT_NAME,makeEC(),...rest);
      }
      return original.apply(this,arguments);
    };
    patched.__gsV156EC=true;
    Zip.prototype.file=patched;
    return true;
  }
  if(!patchZip()){
    document.addEventListener('DOMContentLoaded',patchZip,{once:true});
  }
  console.info('GS Documentos v156: EC INMEL PDF 3 paginas Base64 activado');
})();
