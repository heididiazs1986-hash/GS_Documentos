(()=>{
'use strict';

const $=s=>document.querySelector(s);

const DOCS={
  E1:{label:'Formato de solicitud de servicio',signature:'signature_480n0a',name:'1 Nombre o Razón Social',id:'4 Número de Documento',expand:{x:0,y:-5,w:0,h:10},clear:{left:4,right:4,bottom:4,top:4}},
  E6:{label:'Acta de recibo técnico',signature:'signature_337f0v',name:'text_27bpxy',id:null,expand:{x:0,y:-9,w:0,h:20},clear:{left:4,right:4,bottom:4,top:4}},
  AR:{label:'Aceptación de requisitos',signature:'signature_126y9t',name:'text_6prgm',id:'text_7jdiv',expand:{x:0,y:-3,w:0,h:6},clear:{left:4,right:4,bottom:5,top:4}},
  DJ:{label:'Declaración juramentada',signature:'signature_131z3s',name:'Nombre solicitante',id:'NumIdentificacion',expand:{x:0,y:-2,w:0,h:4},clear:{left:4,right:4,bottom:5,top:4}},
  TD:{label:'Tratamiento de datos',signature:'Firma usuario',name:'usuario',id:'cedula',expand:{x:0,y:0,w:0,h:0},clear:{left:5,right:5,bottom:5,top:5}}
};

let sourceBytes=null;
let sourceName='';
let analysis=null;
let generatedUrl=null;
let drawing=false;
let hasInk=false;

function toast(msg){
  const el=$('#toast');
  el.textContent=msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t=setTimeout(()=>el.classList.remove('show'),3200);
}

function setStatus(text){const el=$('#statusPill');if(el)el.textContent=text}

function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

function normalizeName(v){
  return String(v||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toUpperCase().replace(/[^A-Z0-9 ]+/g,' ')
    .replace(/\s+/g,' ').trim();
}
function normalizeId(v){return String(v||'').replace(/\D/g,'')}

function getField(form,name){
  try{return form.getField(name)}catch(_){return null}
}
function readField(form,name){
  if(!name)return '';
  try{
    const f=form.getField(name);
    if(typeof f.getText==='function')return String(f.getText()||'').trim();
    if(typeof f.getSelected==='function')return String(f.getSelected()||'').trim();
    return '';
  }catch(_){return ''}
}

function isSignatureField(field){
  try{
    const ft=field.acroField?.dict?.get(PDFLib.PDFName.of('FT'));
    return String(ft)==='/Sig';
  }catch(_){return false}
}

/* Retira únicamente widgets/campos de tipo /Sig.
   No aplana ni modifica los campos de texto, listas o checks. */
function removeSignatureFieldsSafely(pdfDoc,form){
  const pages=pdfDoc.getPages();
  const sigFields=form.getFields().filter(isSignatureField);

  for(const field of sigFields){
    const refs=[];
    try{
      const kids=field.acroField.normalizedEntries().Kids;
      for(let i=0;i<kids.size();i++){
        const ref=kids.get(i);
        if(ref instanceof PDFLib.PDFRef)refs.push(ref);
      }
    }catch(_){}

    if(!refs.length && field.ref instanceof PDFLib.PDFRef)refs.push(field.ref);

    for(const ref of refs){
      for(const page of pages){
        try{page.node.removeAnnot(ref)}catch(_){}
      }
      try{pdfDoc.context.delete(ref)}catch(_){}
    }

    try{form.acroForm.removeField(field.acroField)}catch(e){
      console.warn('No se pudo retirar un campo /Sig',field.getName?.(),e);
    }
    try{pdfDoc.context.delete(field.ref)}catch(_){}
  }
}

function getPlacement(pdfDoc,form,code){
  const doc=DOCS[code];
  const field=getField(form,doc.signature);
  if(!field)return null;
  const widgets=field.acroField.getWidgets();
  if(!widgets?.length)return null;

  const widget=widgets[0];
  const rect=widget.getRectangle();
  const pages=pdfDoc.getPages();
  const pRef=widget.P?.();
  let pageIndex=pRef?pages.findIndex(p=>p.ref===pRef||String(p.ref)===String(pRef)):-1;

  if(pageIndex<0){
    const fallback={E1:0,E6:5,AR:8,DJ:9,TD:10};
    pageIndex=fallback[code]??-1;
  }
  if(pageIndex<0||!pages[pageIndex])return null;

  const e=doc.expand||{};
  return{
    pageIndex,
    x:rect.x+(e.x||0),
    y:rect.y+(e.y||0),
    width:Math.max(20,rect.width+(e.w||0)),
    height:Math.max(16,rect.height+(e.h||0))
  };
}

function analyzePdf(pdfDoc){
  const form=pdfDoc.getForm();
  const checks={};
  let baseName='',baseId='';

  for(const [code,doc] of Object.entries(DOCS)){
    const signatureField=getField(form,doc.signature);
    const nameField=getField(form,doc.name);
    const idField=doc.id?getField(form,doc.id):true;
    const present=!!signatureField&&!!nameField&&!!idField;
    const name=present?readField(form,doc.name):'';
    const id=present&&doc.id?readField(form,doc.id):'';

    checks[code]={
      code,label:doc.label,present,name,id,
      placement:present?getPlacement(pdfDoc,form,code):null,
      valid:false,issues:[]
    };

    if(present&&!name)checks[code].issues.push('No se pudo leer el nombre');
    if(present&&doc.id&&!id)checks[code].issues.push('No se pudo leer la cédula');
  }

  if(checks.E1.present){
    baseName=checks.E1.name;baseId=checks.E1.id;
  }else{
    const withIdentity=Object.values(checks).find(x=>x.present&&x.name&&x.id);
    if(withIdentity){baseName=withIdentity.name;baseId=withIdentity.id}
  }

  const nBase=normalizeName(baseName);
  const iBase=normalizeId(baseId);

  for(const item of Object.values(checks)){
    if(!item.present)continue;
    if(!item.placement)item.issues.push('No se encontró la zona de firma');
    if(nBase&&item.name&&normalizeName(item.name)!==nBase)item.issues.push('El nombre no coincide');
    if(iBase&&item.id&&normalizeId(item.id)!==iBase)item.issues.push('La cédula no coincide');
    item.valid=item.issues.length===0;
  }

  const allPresent=Object.values(checks).every(x=>x.present);
  const allValid=Object.values(checks).every(x=>x.present&&x.valid);
  return{form,checks,baseName,baseId,allPresent,allValid};
}

function renderValidation(){
  $('#validationCard').classList.remove('hidden');
  const box=$('#docChecks');
  box.innerHTML='';

  for(const code of Object.keys(DOCS)){
    const item=analysis.checks[code];
    const row=document.createElement('div');
    row.className='doc-row';
    const detail=!item.present
      ?'No encontrado en el PDF'
      :item.issues.length
        ?item.issues.join(' · ')
        :(item.id?`${item.name} · C.C. ${item.id}`:item.name);

    row.innerHTML=`
      <div class="doc-top">
        <div class="doc-code">${code}</div>
        <span class="badge ${item.present&&item.valid?'ok':'bad'}">${item.present&&item.valid?'Correcto':'Revisar'}</span>
      </div>
      <strong>${item.label}</strong>
      <small>${escapeHtml(detail)}</small>`;
    box.appendChild(row);
  }

  const idBox=$('#identityBox');
  if(analysis.baseName||analysis.baseId){
    idBox.classList.remove('hidden');
    idBox.innerHTML=`
      <strong>USUARIO DETECTADO</strong>
      <div class="person">${escapeHtml(analysis.baseName||'Sin nombre')}</div>
      <div class="id">C.C. ${escapeHtml(analysis.baseId||'No identificada')}</div>`;
  }else idBox.classList.add('hidden');

  const msg=$('#validationMessage');
  const badge=$('#validationBadge');

  if(analysis.allValid){
    msg.className='message ok';
    msg.textContent='Validación correcta. Los cinco documentos están presentes y corresponden al mismo usuario.';
    badge.textContent='Validación correcta';
    badge.classList.add('ok');
    $('#signCard').classList.remove('hidden');
    setStatus('PDF validado');
    setTimeout(resizeCanvas,40);
  }else{
    badge.textContent='Requiere revisión';
    badge.classList.remove('ok');
    msg.className='message bad';
    const missing=Object.values(analysis.checks).filter(x=>!x.present).map(x=>x.code);
    msg.textContent=missing.length
      ?`No es posible continuar. Faltan o no se reconocen: ${missing.join(', ')}.`
      :'No es posible continuar. Hay diferencias de identidad o no se encontró alguna zona de firma.';
    $('#signCard').classList.add('hidden');
    setStatus('PDF con novedades');
  }
}

async function loadFile(file){
  if(!file)return;
  if(file.type&&file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf')){
    toast('Selecciona un archivo PDF');
    return;
  }

  try{
    setStatus('Leyendo PDF…');
    sourceBytes=new Uint8Array(await file.arrayBuffer());
    sourceName=file.name;

    const pdfDoc=await PDFLib.PDFDocument.load(sourceBytes,{ignoreEncryption:false,updateMetadata:false});
    analysis=analyzePdf(pdfDoc);

    $('#fileMeta').classList.remove('hidden');
    $('#fileMeta').textContent=`${file.name} · ${pdfDoc.getPageCount()} páginas`;

    renderValidation();
    clearSignature();
    $('#doneCard').classList.add('hidden');
    $('#validationCard').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(err){
    console.error(err);
    sourceBytes=null;analysis=null;
    $('#validationCard').classList.add('hidden');
    $('#signCard').classList.add('hidden');
    setStatus('Sin PDF abierto');
    toast('No fue posible leer el PDF: '+(err?.message||'error desconocido'));
  }
}

function resizeCanvas(){
  const canvas=$('#signatureCanvas');
  const box=canvas.parentElement;
  if(!box.clientWidth||!box.clientHeight)return;

  const ratio=Math.max(1,window.devicePixelRatio||1);
  const old=hasInk?canvas.toDataURL():null;

  canvas.width=Math.round(box.clientWidth*ratio);
  canvas.height=Math.round(box.clientHeight*ratio);

  const ctx=canvas.getContext('2d');
  ctx.setTransform(ratio,0,0,ratio,0,0);
  ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#111';ctx.lineWidth=3;

  if(old){
    const img=new Image();
    img.onload=()=>ctx.drawImage(img,0,0,box.clientWidth,box.clientHeight);
    img.src=old;
  }
}

function pointFromEvent(e){
  const r=$('#signatureCanvas').getBoundingClientRect();
  return{x:e.clientX-r.left,y:e.clientY-r.top};
}
function startDraw(e){
  if(!analysis?.allValid)return;
  drawing=true;
  const p=pointFromEvent(e);
  const ctx=$('#signatureCanvas').getContext('2d');
  ctx.beginPath();ctx.moveTo(p.x,p.y);
  e.currentTarget.setPointerCapture?.(e.pointerId);
}
function moveDraw(e){
  if(!drawing)return;
  const p=pointFromEvent(e);
  const ctx=$('#signatureCanvas').getContext('2d');
  ctx.lineTo(p.x,p.y);ctx.stroke();
  hasInk=true;
  $('#signHint').style.display='none';
  $('#generateBtn').disabled=false;
}
function endDraw(){drawing=false}

function clearSignature(){
  const c=$('#signatureCanvas');
  if(!c)return;
  const ctx=c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  hasInk=false;
  $('#signHint').style.display='';
  $('#generateBtn').disabled=true;
}

function trimmedSignatureDataUrl(){
  const canvas=$('#signatureCanvas');
  const ctx=canvas.getContext('2d');
  const img=ctx.getImageData(0,0,canvas.width,canvas.height);
  const{data,width,height}=img;
  let minX=width,minY=height,maxX=-1,maxY=-1;

  for(let y=0;y<height;y++){
    for(let x=0;x<width;x++){
      if(data[(y*width+x)*4+3]>15){
        if(x<minX)minX=x;if(x>maxX)maxX=x;
        if(y<minY)minY=y;if(y>maxY)maxY=y;
      }
    }
  }
  if(maxX<0)return null;

  const pad=Math.round(Math.max(10,Math.min(width,height)*.03));
  minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);
  maxX=Math.min(width-1,maxX+pad);maxY=Math.min(height-1,maxY+pad);

  const w=maxX-minX+1,h=maxY-minY+1;
  const out=document.createElement('canvas');
  out.width=w;out.height=h;
  out.getContext('2d').drawImage(canvas,minX,minY,w,h,0,0,w,h);
  return out.toDataURL('image/png');
}

function cleanPriorSignature(page,p,code){
  const m=DOCS[code].clear||{};
  const x=p.x+(m.left||0);
  const y=p.y+(m.bottom||0);
  const width=Math.max(8,p.width-(m.left||0)-(m.right||0));
  const height=Math.max(8,p.height-(m.bottom||0)-(m.top||0));

  page.drawRectangle({x,y,width,height,color:PDFLib.rgb(1,1,1),borderWidth:0});
}

async function generate(){
  if(!sourceBytes||!analysis?.allValid||!hasInk)return;

  const btn=$('#generateBtn');
  btn.disabled=true;btn.textContent='Generando…';
  setStatus('Generando PDF…');

  try{
    const pdfDoc=await PDFLib.PDFDocument.load(sourceBytes,{ignoreEncryption:false,updateMetadata:false});
    const form=pdfDoc.getForm();
    const placements=[];

    for(const code of Object.keys(DOCS)){
      const p=getPlacement(pdfDoc,form,code);
      if(!p)throw new Error(`No se encontró la zona de firma de ${code}`);
      placements.push({...p,code});
    }

    const sigUrl=trimmedSignatureDataUrl();
    if(!sigUrl)throw new Error('La firma está vacía');

    const sigBytes=new Uint8Array(await(await fetch(sigUrl)).arrayBuffer());
    const sig=await pdfDoc.embedPng(sigBytes);
    const ratio=sig.width/sig.height;
    const replacePrior=$('#replacePrior')?.checked!==false;

    for(const p of placements){
      const page=pdfDoc.getPages()[p.pageIndex];

      if(replacePrior)cleanPriorSignature(page,p,p.code);

      const margin=5;
      const maxW=Math.max(10,p.width-margin*2);
      const maxH=Math.max(10,p.height-margin*2);
      let w=maxW,h=w/ratio;
      if(h>maxH){h=maxH;w=h*ratio}

      page.drawImage(sig,{
        x:p.x+(p.width-w)/2,
        y:p.y+(p.height-h)/2,
        width:w,height:h
      });
    }

    // Se quitan únicamente los campos /Sig vacíos para evitar cajas o etiquetas.
    // Los campos de texto, checks y listas permanecen intactos y editables.
    removeSignatureFieldsSafely(pdfDoc,form);

    const out=await pdfDoc.save({
      useObjectStreams:false,
      addDefaultPage:false,
      updateFieldAppearances:false
    });

    const blob=new Blob([out],{type:'application/pdf'});
    if(generatedUrl)URL.revokeObjectURL(generatedUrl);
    generatedUrl=URL.createObjectURL(blob);

    const base=sourceName.replace(/\.pdf$/i,'');
    const a=$('#downloadBtn');
    a.href=generatedUrl;
    a.download=`${base}_FIRMADO.pdf`;

    $('#doneCard').classList.remove('hidden');
    setStatus('PDF firmado listo');
    $('#doneCard').scrollIntoView({behavior:'smooth',block:'center'});
    toast('PDF firmado generado. Los demás campos se conservaron.');
  }catch(err){
    console.error(err);
    setStatus('Error al generar');
    toast('No fue posible generar el PDF: '+(err?.message||'error desconocido'));
  }finally{
    btn.textContent='Generar PDF firmado';
    btn.disabled=!hasInk;
  }
}

function resetAll(){
  if(generatedUrl){URL.revokeObjectURL(generatedUrl);generatedUrl=null}
  sourceBytes=null;sourceName='';analysis=null;
  $('#pdfInput').value='';
  $('#fileMeta').classList.add('hidden');
  $('#validationCard').classList.add('hidden');
  $('#signCard').classList.add('hidden');
  $('#doneCard').classList.add('hidden');
  $('#validationBadge').classList.remove('ok');
  clearSignature();
  setStatus('Sin PDF abierto');
  window.scrollTo({top:0,behavior:'smooth'});
}

function bind(){
  $('#pdfInput').onchange=e=>loadFile(e.target.files?.[0]);

  const dz=$('#dropzone');
  ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{
    e.preventDefault();dz.classList.add('drag');
  }));
  ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{
    e.preventDefault();dz.classList.remove('drag');
  }));
  dz.addEventListener('drop',e=>loadFile(e.dataTransfer.files?.[0]));

  const c=$('#signatureCanvas');
  c.addEventListener('pointerdown',startDraw);
  c.addEventListener('pointermove',moveDraw);
  c.addEventListener('pointerup',endDraw);
  c.addEventListener('pointercancel',endDraw);
  c.addEventListener('pointerleave',endDraw);

  $('#clearBtn').onclick=clearSignature;
  $('#generateBtn').onclick=generate;
  $('#newBtn').onclick=resetAll;
  window.addEventListener('resize',()=>setTimeout(resizeCanvas,80));
}

document.addEventListener('DOMContentLoaded',bind);
})();