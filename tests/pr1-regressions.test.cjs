const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const PDFLib=require('pdf-lib');
const JSZip=require('jszip');
const root=require('node:path').join(__dirname,'..');

async function editor(){
  const dom=new JSDOM(fs.readFileSync(root+'/editor-pc/index.html','utf8'));
  let downloaded;
  dom.window.HTMLAnchorElement.prototype.click=function(){};
  const ctx=vm.createContext({document:dom.window.document,PDFLib,JSZip,TextDecoder,console,
    setTimeout:()=>0,URL:{createObjectURL:b=>{downloaded=b;return 'blob:test'},revokeObjectURL(){}},location:{reload(){}}});
  // Expose closure state only in the test VM; production has no test hooks.
  const source=fs.readFileSync(root+'/editor-pc/editor.js','utf8').replace(/\}\)\(\);\s*$/,'globalThis.editorTest={S,openZip,saveZip,renderActiveFields};})();');
  vm.runInContext(source,ctx);
  const pdf=await PDFLib.PDFDocument.create();pdf.addPage();const form=pdf.getForm();
  form.createTextField('1 Nombre o Razón Social').setText('ORIGINAL');
  const dropdown=form.createDropdown('4 Municipio');dropdown.addOptions(['A','B']);dropdown.select('A');
  const list=form.createOptionList('Descripcion');list.addOptions(['A','B']);list.select('B');
  const radio=form.createRadioGroup('Identificacion');radio.addOptionToPage('A',pdf.getPages()[0]);radio.select('A');
  const zip=new JSZip();zip.file('E1.pdf',await pdf.save());zip.file('SOPORTES/evidencia.txt','conservar');
  const td=await PDFLib.PDFDocument.create();td.addPage();td.getForm().createTextField('usuario').setText('ORIGINAL');
  zip.file('TD_usuario.pdf',await td.save());
  const bytes=await zip.generateAsync({type:'uint8array'});bytes.name='entrada.zip';
  await ctx.editorTest.openZip(bytes);
  return {api:ctx.editorTest,document:dom.window.document,download:()=>downloaded};
}

test('direct linked edits and empty selections survive ZIP/PDF save and reopen',async()=>{
  const {api,document,download}=await editor();
  api.S.active='E1';
  api.renderActiveFields(false);
  const input=document.querySelector('[data-field-name="1 Nombre o Razón Social"]');
  input.value='CORREGIDO';input.oninput();
  assert.equal(api.S.master.nombre,'CORREGIDO');
  for(const name of ['4 Municipio','Identificacion','Descripcion']){
    const el=document.querySelector('[data-field-name="'+name+'"]');el.value='';el.oninput();
  }
  await api.saveZip();assert.ok(download());
  const zip=await JSZip.loadAsync(await download().arrayBuffer());
  const pdf=await PDFLib.PDFDocument.load(await zip.file('E1.pdf').async('uint8array'));
  const form=pdf.getForm();
  assert.equal(form.getTextField('1 Nombre o Razón Social').getText(),'CORREGIDO');
  const td=await PDFLib.PDFDocument.load(await zip.file('TD_usuario.pdf').async('uint8array'));
  assert.equal(td.getForm().getTextField('usuario').getText(),'CORREGIDO');
  assert.deepEqual(form.getDropdown('4 Municipio').getSelected(),[]);
  assert.deepEqual(form.getOptionList('Descripcion').getSelected(),[]);
  assert.equal(form.getRadioGroup('Identificacion').getSelected(),undefined);
  const manifest=JSON.parse(await zip.file('GS_REGISTRO.json').async('string'));
  assert.equal(manifest.master.nombre,'CORREGIDO');
  assert.equal(manifest.documents.E1.fields['4 Municipio'].value,'');
  assert.equal(await zip.file('SOPORTES/evidencia.txt').async('string'),'conservar');
  const reopen=await zip.generateAsync({type:'uint8array'});reopen.name='corregido.zip';
  await api.openZip(reopen);assert.equal(api.S.master.nombre,'CORREGIDO');
  assert.equal(api.S.docs.get('E1').fields.get('Identificacion').value,'');
});

test('editor refuses invalid coordinates before generating a ZIP',async()=>{
  const {api,download}=await editor();api.S.master.latitud='200';
  await api.saveZip();assert.equal(download(),undefined);
});

function coordinates(){
  const dom=new JSDOM('<div class="gps-row"><input id="reg_lat"><input id="reg_lon"></div><input id="reg_precision">');
  const messages=[];
  const ctx=vm.createContext({document:dom.window.document,console,setTimeout:()=>0,
    state:{registration:{_txt_selected:'TXT',latitud:'4.5',longitud:'-74'},form:{},currentRecord:null},
    toast:m=>messages.push(m),save(){},validateStep:()=>true,validateRegistration:()=>true,validateRequired:()=>true,
    makePDF:async()=> 'pdf',buildExcelBytes:()=> 'xlsx',jsonRecord:r=>r});
  const source=fs.readFileSync(root+'/gsdoc-v122-signature-gps.js','utf8').replace(/\}\)\(\);\s*$/,'globalThis.coordTest={enhanceManualCoordinates,coordinateValue};})();');
  vm.runInContext(source,ctx);ctx.coordTest.enhanceManualCoordinates();
  return {ctx,document:dom.window.document,messages};
}

test('TXT corrections cannot persist or export invalid coordinates, even without blur',async()=>{
  const {ctx,document}=coordinates();const lat=document.querySelector('#reg_lat');
  for(const value of ['200','texto','Infinity','0x20','1e2']){
    lat.value=value;lat.oninput();assert.equal(ctx.state.registration.latitud,'');
    assert.equal(ctx.validateStep(5),false);assert.equal(ctx.validateRegistration(),false);
    assert.equal(ctx.validateRequired(),false);await assert.rejects(ctx.makePDF(),/coordenadas/);
  }
  for(const record of [{latitud:'200',longitud:'-74'},{latitud:'4',longitud:'-181'}]){
    assert.throws(()=>ctx.buildExcelBytes([record]),/inválida/);
    assert.throws(()=>ctx.jsonRecord(record),/inválida/);
  }
  lat.value='4,567';lat.oninput();assert.equal(ctx.state.registration.latitud,'4.567');
  assert.equal(ctx.validateStep(5),true);assert.equal(await ctx.makePDF(),'pdf');
  ctx.state.currentRecord={latitud:'200',longitud:'-74'};
  assert.equal(ctx.validateRegistration(),true,'a valid correction can replace an invalid saved record');
  assert.equal(ctx.validateRequired(),false,'the old invalid record still cannot be exported');
  for(const value of ['-90','90','0'])assert.notEqual(ctx.coordTest.coordinateValue(value,-90,90),null);
  assert.equal(document.querySelector('#reg_precision').required,false);
  assert.equal(lat.readOnly,false);
});
