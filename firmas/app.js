import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

const REQUIRED_DOCS = ['E1','E6','AR','DJ','TD'];
const DOC_RULES = {
  E1: [
    [/\bE\s*[-_.]?\s*1\b/i, 120],
    [/FORMATO\s+E\s*[-_.]?\s*1/i, 140],
    [/SOLICITUD.{0,30}(CONEXI[ÓO]N|SERVICIO)/i, 55]
  ],
  E6: [
    [/\bE\s*[-_.]?\s*6\b/i, 120],
    [/FORMATO\s+E\s*[-_.]?\s*6/i, 140],
    [/(RECIBO|CERTIFICADO).{0,35}(OBRA|INSTALACI[ÓO]N)/i, 45]
  ],
  AR: [
    [/\bA\s*[-_.]?\s*R\b/i, 90],
    [/ACTA.{0,40}(RECIBO|RECEPCI[ÓO]N|RESPONSABILIDAD)/i, 100]
  ],
  DJ: [
    [/\bD\s*[-_.]?\s*J\b/i, 90],
    [/DECLARACI[ÓO]N.{0,35}(JURAMENTADA|EXTRAJUICIO)/i, 140]
  ],
  TD: [
    [/\bT\s*[-_.]?\s*D\b/i, 80],
    [/(TRATAMIENTO|AUTORIZACI[ÓO]N).{0,45}DATOS/i, 140],
    [/DATOS\s+PERSONALES/i, 45]
  ]
};

const SIGNATURE_TERMS = {
  E1: ['USUARIO','CLIENTE','SOLICITANTE','TITULAR'],
  E6: ['USUARIO','CLIENTE','SOLICITANTE','TITULAR'],
  AR: ['USUARIO','CLIENTE','RECIBE','TITULAR'],
  DJ: ['DECLARANTE','USUARIO','CLIENTE','TITULAR'],
  TD: ['TITULAR','USUARIO','CLIENTE','AUTORIZA']
};
const BAD_SIGNATURE_TERMS = ['TECNICO','TÉCNICO','PROFESIONAL','ELECTRICISTA','FUNCIONARIO','TESTIGO','ENEL','APPLUS'];

const $ = (id) => document.getElementById(id);
const pdfInput = $('pdfInput');
const dropzone = $('dropzone');
const validationCard = $('validationCard');
const signatureCard = $('signatureCard');
const docGrid = $('docGrid');
const identityBox = $('identityBox');
const blockingIssues = $('blockingIssues');
const validationMessage = $('validationMessage');
const fileInfo = $('fileInfo');
const consentCheck = $('consentCheck');
const signatureWrap = $('signatureWrap');
const signatureCanvas = $('signatureCanvas');
const signatureHint = $('signatureHint');
const clearSignature = $('clearSignature');
const generateBtn = $('generateBtn');
const progressBox = $('progressBox');
const progressText = $('progressText');
const successCard = $('successCard');
const successText = $('successText');
const downloadAgainBtn = $('downloadAgainBtn');

let sourceFile = null;
let originalBytes = null;
let pdfAnalysis = null;
let isValidated = false;
let hasSignature = false;
let lastOutputBlob = null;
let lastOutputName = '';

function normalizeText(s=''){
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();
}
function normalizeId(s=''){ return String(s).replace(/\D/g,''); }
function normalizeName(s=''){
  return normalizeText(s).replace(/[^A-ZÑ ]/g,' ').replace(/\b(CC|CEDULA|DOCUMENTO|IDENTIFICACION|NOMBRE|CLIENTE|USUARIO|SOLICITANTE|DECLARANTE|TITULAR)\b/g,' ').replace(/\s+/g,' ').trim();
}
function tokenSimilarity(a,b){
  const A=new Set(normalizeName(a).split(' ').filter(x=>x.length>1));
  const B=new Set(normalizeName(b).split(' ').filter(x=>x.length>1));
  if(!A.size||!B.size) return 0;
  let inter=0; for(const x of A) if(B.has(x)) inter++;
  return inter/Math.min(A.size,B.size);
}
function formatBytes(bytes){
  if(bytes<1024) return `${bytes} B`;
  if(bytes<1024*1024) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1024/1024).toFixed(1)} MB`;
}
function escapeHtml(s=''){
  return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function groupLines(items){
  const rows=[];
  for(const item of items){
    const raw=String(item.str||'').trim();
    if(!raw) continue;
    const x=Number(item.transform?.[4]||0), y=Number(item.transform?.[5]||0);
    let row=rows.find(r=>Math.abs(r.y-y)<2.4);
    if(!row){ row={y,items:[]}; rows.push(row); }
    row.items.push({text:raw,x,y,width:Number(item.width||0),height:Math.abs(Number(item.transform?.[3]||10))});
  }
  rows.forEach(r=>{
    r.items.sort((a,b)=>a.x-b.x);
    r.text=r.items.map(i=>i.text).join(' ').replace(/\s+/g,' ').trim();
    r.x=Math.min(...r.items.map(i=>i.x));
    r.width=Math.max(...r.items.map(i=>i.x+i.width))-r.x;
  });
  rows.sort((a,b)=>b.y-a.y);
  return rows;
}

function scoreDoc(text,doc){
  let score=0;
  for(const [rx,pts] of DOC_RULES[doc]) if(rx.test(text)) score+=pts;
  return score;
}

function assignDocuments(pages){
  const candidates=[];
  for(const p of pages){
    for(const doc of REQUIRED_DOCS){
      const score=scoreDoc(p.normalizedText,doc);
      if(score>=45) candidates.push({doc,pageIndex:p.pageIndex,score});
    }
  }
  candidates.sort((a,b)=>b.score-a.score);
  const usedDocs=new Set(), usedPages=new Set(), assigned={};
  for(const c of candidates){
    if(!usedDocs.has(c.doc)&&!usedPages.has(c.pageIndex)){
      assigned[c.doc]=c;
      usedDocs.add(c.doc); usedPages.add(c.pageIndex);
    }
  }
  return assigned;
}

function extractId(lines){
  const labels=/(C\.?\s*C\.?|C[EÉ]DULA(?:\s+DE\s+CIUDADAN[IÍ]A)?|DOCUMENTO(?:\s+DE\s+IDENTIDAD)?|IDENTIFICACI[ÓO]N)/i;
  for(let i=0;i<lines.length;i++){
    const line=lines[i].text;
    if(!labels.test(line)) continue;
    const after=line.replace(/^.*?(C\.?\s*C\.?|C[EÉ]DULA(?:\s+DE\s+CIUDADAN[IÍ]A)?|DOCUMENTO(?:\s+DE\s+IDENTIDAD)?|IDENTIFICACI[ÓO]N)/i,'');
    const m=after.match(/(?:N[°ºO.]?\s*)?[:#-]?\s*([0-9][0-9.\s-]{5,16})/i);
    if(m){ const id=normalizeId(m[1]); if(id.length>=6&&id.length<=10) return id; }
    const next=lines[i+1]?.text||'';
    const n=next.match(/\b([0-9][0-9.\s-]{5,16})\b/);
    if(n){ const id=normalizeId(n[1]); if(id.length>=6&&id.length<=10) return id; }
  }
  return '';
}

function cleanNameCandidate(raw){
  let s=String(raw||'').replace(/^[\s:;.#-]+/,' ').replace(/\s+/g,' ').trim();
  s=s.replace(/\b(C\.?C\.?|CEDULA|CÉDULA|DOCUMENTO|IDENTIFICACION|IDENTIFICACIÓN|CELULAR|TELEFONO|TELÉFONO|DIRECCION|DIRECCIÓN)\b.*$/i,'').trim();
  if(/\d/.test(s)) s=s.replace(/\d.*$/,'').trim();
  return s;
}

function extractName(lines){
  const strong=/(NOMBRE(?:S)?(?:\s+Y\s+APELLIDOS)?(?:\s+DEL\s+(?:CLIENTE|USUARIO|SOLICITANTE|DECLARANTE|TITULAR))?|NOMBRE\s+COMPLETO|SOLICITANTE|DECLARANTE|TITULAR)/i;
  for(let i=0;i<lines.length;i++){
    const line=lines[i].text;
    const m=line.match(strong);
    if(!m) continue;
    let candidate=cleanNameCandidate(line.slice((m.index||0)+m[0].length));
    if(normalizeName(candidate).split(' ').length>=2) return candidate;
    candidate=cleanNameCandidate(lines[i+1]?.text||'');
    if(normalizeName(candidate).split(' ').length>=2) return candidate;
  }
  return '';
}

function findSignatureAnchor(lines,doc){
  const wanted=SIGNATURE_TERMS[doc]||[];
  const found=[];
  for(const line of lines){
    const t=normalizeText(line.text);
    if(!/FIRMA|FIRMAR|FIRMADO/.test(t)) continue;
    let score=30;
    for(const w of wanted) if(t.includes(normalizeText(w))) score+=45;
    for(const w of BAD_SIGNATURE_TERMS) if(t.includes(normalizeText(w))) score-=65;
    if(line.y<300) score+=10;
    found.push({score,x:line.x,y:line.y,width:line.width,text:line.text});
  }
  found.sort((a,b)=>b.score-a.score);
  return found[0]&&found[0].score>0?found[0]:null;
}

async function analyzePdf(bytes){
  const loadingTask=pdfjsLib.getDocument({data:bytes.slice()});
  const pdf=await loadingTask.promise;
  const pages=[];
  for(let i=1;i<=pdf.numPages;i++){
    validationMessage.textContent=`Leyendo página ${i} de ${pdf.numPages}…`;
    const page=await pdf.getPage(i);
    const content=await page.getTextContent();
    const lines=groupLines(content.items);
    const text=lines.map(l=>l.text).join(' ');
    const viewport=page.getViewport({scale:1});
    pages.push({pageIndex:i-1,pageNumber:i,lines,text,normalizedText:normalizeText(text),width:viewport.width,height:viewport.height});
  }
  const assigned=assignDocuments(pages);
  const docs={};
  for(const doc of REQUIRED_DOCS){
    const a=assigned[doc];
    if(!a){ docs[doc]={doc,found:false}; continue; }
    const p=pages[a.pageIndex];
    docs[doc]={
      doc,found:true,pageIndex:a.pageIndex,pageNumber:p.pageNumber,score:a.score,
      id:extractId(p.lines),name:extractName(p.lines),anchor:findSignatureAnchor(p.lines,doc),
      width:p.width,height:p.height
    };
  }
  return {numPages:pdf.numPages,pages,docs};
}

function validateAnalysis(analysis){
  const issues=[];
  for(const doc of REQUIRED_DOCS){
    const d=analysis.docs[doc];
    if(!d?.found) issues.push(`Falta el documento ${doc} o no fue posible identificarlo.`);
    else if(!d.anchor) issues.push(`${doc}: no se pudo localizar automáticamente el espacio de firma del usuario.`);
    if(d?.found&&!d.id) issues.push(`${doc}: no se pudo leer la cédula del usuario.`);
    if(d?.found&&!d.name) issues.push(`${doc}: no se pudo leer el nombre del usuario.`);
  }
  const foundDocs=REQUIRED_DOCS.map(k=>analysis.docs[k]).filter(d=>d?.found);
  const ids=foundDocs.map(d=>d.id).filter(Boolean);
  if(ids.length){
    const ref=ids[0];
    for(const d of foundDocs) if(d.id&&d.id!==ref) issues.push(`${d.doc}: la cédula ${d.id} no coincide con la cédula ${ref}.`);
  }
  const named=foundDocs.filter(d=>d.name);
  if(named.length){
    const ref=named[0];
    for(const d of named.slice(1)){
      const sim=tokenSimilarity(ref.name,d.name);
      if(sim<0.6) issues.push(`${d.doc}: el nombre “${d.name}” no coincide suficientemente con “${ref.name}”.`);
    }
  }
  return issues;
}

function renderAnalysis(analysis,issues){
  validationCard.classList.remove('hidden');
  docGrid.innerHTML=REQUIRED_DOCS.map(doc=>{
    const d=analysis.docs[doc];
    const ok=d?.found&&d.anchor&&d.id&&d.name;
    return `<div class="doc-chip ${ok?'ok':'bad'}"><strong>${doc} ${ok?'✓':'!'}</strong><small>${d?.found?`Pág. ${d.pageNumber}`:'No detectado'}</small></div>`;
  }).join('');

  const first=REQUIRED_DOCS.map(k=>analysis.docs[k]).find(d=>d?.found&&d.id&&d.name);
  identityBox.innerHTML=`<h3>Identidad detectada</h3>
    <div class="identity-row"><span>Nombre</span><strong>${escapeHtml(first?.name||'No identificado')}</strong></div>
    <div class="identity-row"><span>Cédula</span><strong>${escapeHtml(first?.id||'No identificada')}</strong></div>
    <div class="identity-row"><span>Páginas</span><strong>${analysis.numPages}</strong></div>`;

  if(issues.length){
    blockingIssues.classList.remove('hidden');
    blockingIssues.innerHTML=`<strong>No es posible firmar todavía.</strong><ul>${issues.map(i=>`<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
    validationMessage.className='notice bad';
    validationMessage.textContent='El PDF tiene validaciones pendientes. Corrige el expediente y vuelve a cargarlo.';
    signatureCard.classList.add('hidden');
    isValidated=false;
  }else{
    blockingIssues.classList.add('hidden');
    validationMessage.className='notice ok';
    validationMessage.textContent='Validación correcta: E1, E6, AR, DJ y TD corresponden al mismo usuario y tienen punto de firma localizado.';
    signatureCard.classList.remove('hidden');
    isValidated=true;
    consentCheck.checked=false;
    resetSignature();
    updateSignatureEnabled();
  }
}

async function handleFile(file){
  successCard.classList.add('hidden');
  lastOutputBlob=null;
  if(!file) return;
  if(file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf')){
    validationMessage.className='notice bad'; validationMessage.textContent='Selecciona un archivo PDF.'; return;
  }
  if(file.size>50*1024*1024){
    validationMessage.className='notice bad'; validationMessage.textContent='El PDF supera 50 MB. Usa un archivo más liviano.'; return;
  }
  sourceFile=file;
  fileInfo.classList.remove('hidden');
  fileInfo.textContent=`${file.name} · ${formatBytes(file.size)}`;
  validationMessage.className='notice neutral';
  validationMessage.textContent='Validando documentos e identidad…';
  validationCard.classList.add('hidden'); signatureCard.classList.add('hidden');
  try{
    originalBytes=new Uint8Array(await file.arrayBuffer());
    pdfAnalysis=await analyzePdf(originalBytes);
    const issues=validateAnalysis(pdfAnalysis);
    renderAnalysis(pdfAnalysis,issues);
  }catch(err){
    console.error(err);
    isValidated=false;
    validationMessage.className='notice bad';
    validationMessage.textContent='No fue posible leer este PDF. Verifica que no esté protegido con contraseña ni dañado.';
  }
}

pdfInput.addEventListener('change',e=>handleFile(e.target.files?.[0]));
['dragenter','dragover'].forEach(ev=>dropzone.addEventListener(ev,e=>{e.preventDefault();dropzone.classList.add('drag')}));
['dragleave','drop'].forEach(ev=>dropzone.addEventListener(ev,e=>{e.preventDefault();dropzone.classList.remove('drag')}));
dropzone.addEventListener('drop',e=>handleFile(e.dataTransfer.files?.[0]));

let ctx=null,drawing=false,last=null;
function resizeCanvas(){
  const rect=signatureWrap.getBoundingClientRect();
  const dpr=Math.max(1,window.devicePixelRatio||1);
  const old=signatureCanvas.width&&signatureCanvas.height?signatureCanvas.toDataURL('image/png'):null;
  signatureCanvas.width=Math.max(1,Math.floor(rect.width*dpr));
  signatureCanvas.height=Math.max(1,Math.floor(rect.height*dpr));
  signatureCanvas.style.width=`${rect.width}px`; signatureCanvas.style.height=`${rect.height}px`;
  ctx=signatureCanvas.getContext('2d');
  ctx.scale(dpr,dpr); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#111'; ctx.lineWidth=2.4;
  if(old&&hasSignature){ const img=new Image(); img.onload=()=>ctx.drawImage(img,0,0,rect.width,rect.height); img.src=old; }
}
function pointerPos(e){ const r=signatureCanvas.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; }
function startDraw(e){ if(signatureWrap.classList.contains('disabled'))return; drawing=true; last=pointerPos(e); signatureCanvas.setPointerCapture?.(e.pointerId); }
function moveDraw(e){
  if(!drawing||!ctx)return; const p=pointerPos(e); ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.stroke(); last=p;
  hasSignature=true; signatureHint.classList.add('hidden'); clearSignature.disabled=false; updateGenerateButton();
}
function endDraw(e){ drawing=false; last=null; try{signatureCanvas.releasePointerCapture?.(e.pointerId)}catch{} }
signatureCanvas.addEventListener('pointerdown',startDraw); signatureCanvas.addEventListener('pointermove',moveDraw); signatureCanvas.addEventListener('pointerup',endDraw); signatureCanvas.addEventListener('pointercancel',endDraw);
window.addEventListener('resize',()=>setTimeout(resizeCanvas,50));

function resetSignature(){
  hasSignature=false; clearSignature.disabled=true; signatureHint.classList.remove('hidden');
  resizeCanvas(); if(ctx) ctx.clearRect(0,0,signatureCanvas.clientWidth,signatureCanvas.clientHeight); updateGenerateButton();
}
clearSignature.addEventListener('click',resetSignature);
consentCheck.addEventListener('change',updateSignatureEnabled);
function updateSignatureEnabled(){
  const enabled=isValidated&&consentCheck.checked;
  signatureWrap.classList.toggle('disabled',!enabled);
  updateGenerateButton();
}
function updateGenerateButton(){ generateBtn.disabled=!(isValidated&&consentCheck.checked&&hasSignature); }

function cropSignatureDataUrl(){
  const src=signatureCanvas;
  const temp=document.createElement('canvas'); temp.width=src.width; temp.height=src.height;
  const t=temp.getContext('2d'); t.drawImage(src,0,0);
  const img=t.getImageData(0,0,temp.width,temp.height); const d=img.data;
  let minX=temp.width,minY=temp.height,maxX=-1,maxY=-1;
  for(let y=0;y<temp.height;y+=2){ for(let x=0;x<temp.width;x+=2){ const a=d[(y*temp.width+x)*4+3]; if(a>20){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);} } }
  if(maxX<0) return src.toDataURL('image/png');
  const pad=18; minX=Math.max(0,minX-pad); minY=Math.max(0,minY-pad); maxX=Math.min(temp.width-1,maxX+pad); maxY=Math.min(temp.height-1,maxY+pad);
  const out=document.createElement('canvas'); out.width=maxX-minX+1; out.height=maxY-minY+1; out.getContext('2d').drawImage(temp,minX,minY,out.width,out.height,0,0,out.width,out.height);
  return out.toDataURL('image/png');
}
function dataUrlToBytes(url){
  const b64=url.split(',')[1]; const bin=atob(b64); const arr=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i); return arr;
}

function signaturePlacement(d,page){
  const a=d.anchor;
  const pageW=page.getWidth(), pageH=page.getHeight();
  const width=Math.min(155,pageW*0.28), height=48;
  let x=Math.max(16,Math.min(pageW-width-16,a.x-10));
  let y=Math.max(16,Math.min(pageH-height-16,a.y+8));
  return {x,y,width,height};
}

async function addSignatures(bytes,signaturePng){
  const {PDFDocument}=window.PDFLib||{}; if(!PDFDocument) throw new Error('PDF-Lib no está disponible');
  const doc=await PDFDocument.load(bytes.slice(),{ignoreEncryption:false});
  const form=doc.getForm();
  try{form.flatten()}catch{}
  const image=await doc.embedPng(signaturePng);
  for(const key of REQUIRED_DOCS){
    const d=pdfAnalysis.docs[key]; const page=doc.getPage(d.pageIndex); const p=signaturePlacement(d,page);
    page.drawImage(image,p);
  }
  return new Uint8Array(await doc.save({useObjectStreams:true}));
}

async function flattenPdf(bytes){
  const {PDFDocument}=window.PDFLib||{}; if(!PDFDocument) throw new Error('PDF-Lib no está disponible');
  const input=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
  const out=await PDFDocument.create();
  out.setTitle('Expediente ESPT firmado');
  out.setProducer('GS Firmas');
  for(let i=1;i<=input.numPages;i++){
    progressText.textContent=`Aplanando página ${i} de ${input.numPages}…`;
    const page=await input.getPage(i); const base=page.getViewport({scale:1}); const viewport=page.getViewport({scale:2});
    const canvas=document.createElement('canvas'); canvas.width=Math.ceil(viewport.width); canvas.height=Math.ceil(viewport.height);
    const c=canvas.getContext('2d',{alpha:false}); c.fillStyle='#fff'; c.fillRect(0,0,canvas.width,canvas.height);
    await page.render({canvasContext:c,viewport}).promise;
    const jpg=dataUrlToBytes(canvas.toDataURL('image/jpeg',0.93));
    const image=await out.embedJpg(jpg); const outPage=out.addPage([base.width,base.height]); outPage.drawImage(image,{x:0,y:0,width:base.width,height:base.height});
  }
  return new Uint8Array(await out.save({useObjectStreams:true}));
}

function downloadBlob(blob,name){
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),30000);
}

generateBtn.addEventListener('click',async()=>{
  if(generateBtn.disabled||!originalBytes||!pdfAnalysis)return;
  generateBtn.disabled=true; clearSignature.disabled=true; consentCheck.disabled=true; progressBox.classList.remove('hidden'); successCard.classList.add('hidden');
  try{
    progressText.textContent='Aplicando firma en E1, E6, AR, DJ y TD…';
    const sig=dataUrlToBytes(cropSignatureDataUrl());
    const signed=await addSignatures(originalBytes,sig);
    const flat=await flattenPdf(signed);
    lastOutputBlob=new Blob([flat],{type:'application/pdf'});
    const base=(sourceFile?.name||'expediente.pdf').replace(/\.pdf$/i,'');
    lastOutputName=`${base}_FIRMADO_PLANO.pdf`;
    downloadBlob(lastOutputBlob,lastOutputName);
    successText.textContent=`${lastOutputName} · PDF plano con firma aplicada en los cinco documentos.`;
    successCard.classList.remove('hidden'); successCard.scrollIntoView({behavior:'smooth',block:'center'});
  }catch(err){
    console.error(err); alert(`No fue posible generar el PDF: ${err?.message||err}`);
  }finally{
    progressBox.classList.add('hidden'); consentCheck.disabled=false; clearSignature.disabled=!hasSignature; updateGenerateButton();
  }
});

downloadAgainBtn.addEventListener('click',()=>{ if(lastOutputBlob) downloadBlob(lastOutputBlob,lastOutputName); });

resizeCanvas();
