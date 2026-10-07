const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const {PDFDocument}=require('pdf-lib');
const JSZip=require('jszip');
const XLSX=require('xlsx');
const root=path.join(__dirname,'..');

test('complete app: TXT correction, saved record, PDF/ZIP, jornada and editor', {timeout:120000},async()=>{
  const server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://localhost');
    let file=path.join(root,decodeURIComponent(url.pathname));
    if(url.pathname.endsWith('/'))file=path.join(file,'index.html');
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return}
    const types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json'};
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.PR1_CHROMIUM_PATH||undefined,
      args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--disable-gpu']});
    const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:true});
    const base='http://127.0.0.1:'+server.address().port;
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.origin===base)return route.continue();
      let file;
      if(url.pathname.includes('jszip'))file=path.join(path.dirname(require.resolve('jszip/package.json')),'dist/jszip.min.js');
      else if(url.pathname.includes('pdf-lib'))file=path.join(path.dirname(require.resolve('pdf-lib/package.json')),'dist/pdf-lib.min.js');
      else if(url.pathname.includes('xlsx'))file=path.join(path.dirname(require.resolve('xlsx/package.json')),'dist/xlsx.full.min.js');
      if(file)return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(file)});
      return route.fulfill({contentType:'text/css',body:''});
    });
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    page.setDefaultTimeout(10000);
    await page.goto(base+'/');
    await page.waitForFunction(()=>globalThis.__GS_DOCS_V122_SIGNATURE_GPS__);
    await page.evaluate(()=>{
      state.jornada={active:true,contrato:'APPLUS',tecnico_nombre:'TECNICO PRUEBA',tecnico_cedula:'12345678'};
      show('register');
    });
    await page.locator('#txtFile').setInputFiles({name:'prueba.txt',mimeType:'text/plain',buffer:Buffer.from(
      'Orden RO|Nombres|Identificacion|Contacto|Direccion|Localidad|Sector/Barrio|Tipo Zona|Latitud|Longitud\n'+
      '1234567890|USUARIO PRUEBA|123456789|3001234567|CL 1 # 2 - 3|Ciudad Bolívar|SECTOR PRUEBA|Urbana|4.5|-74.1\n')});
    await page.locator('#txtUserSelect').selectOption('1');
    await page.evaluate(()=>{
      Object.assign(state.registration,{orden_ro:'1234567890',tipo_poblacion:'General',documento_propiedad:'Otro',tipo_material:'Ladrillo',plantas:'1',tratamiento_datos:'ACEPTO'});
      const canvas=document.createElement('canvas');canvas.width=240;canvas.height=60;
      const ctx=canvas.getContext('2d');ctx.font='20px sans-serif';ctx.fillText('FIRMA DE PRUEBA',10,35);
      state.signatures={solicitante:canvas.toDataURL(),tecnico:canvas.toDataURL()};
      state.regStep=5;renderRegistration();
    });
    await page.waitForFunction(()=>document.querySelector('#reg_lat')?.dataset.gs122==='1');
    assert.equal(await page.locator('#reg_lat').inputValue(),'4.5');
    await page.locator('#reg_lat').fill('200');
    const invalid=await page.evaluate(()=>({value:state.registration.latitud,saved:JSON.parse(localStorage.getItem(appKey)).registration.latitud,
      step:validateStep(5),registration:validateRegistration()}));
    assert.equal(invalid.value,'');assert.equal(invalid.saved,'');assert.equal(invalid.step,false);assert.equal(invalid.registration,false);
    await page.locator('#reg_lat').fill('4,5671234');await page.locator('#reg_lon').fill('-74,1234567');
    await page.locator('#saveRegister').click();
    await page.waitForFunction(()=>state.currentRecord?.id_registro);
    const record=await page.evaluate(()=>records()[0]);
    assert.equal(record.latitud,'4.5671234');assert.equal(record.longitud,'-74.1234567');assert.equal(String(record.precision||''),'');
    await page.evaluate(()=>{
      state.selected=['E1'];applyRegistrationToDocs(state.currentRecord);
      for(const fields of [FIELDS.general,FIELDS.e1])for(const [id,label,type,options] of fields){
        if(state.form[id])continue;
        state.form[id]=options?.[0]||(type==='date'?todayISO():type==='number'?'10':type==='email'?'prueba@example.com':'PRUEBA');
      }
      Object.assign(state.form,{cm_celular:'3001234567',cm_num_doc:'123456789',e1_no_solicitud:'1234567890'});
      show('generate');
    });
    assert.equal(await page.evaluate(()=>validateRequired()),true,await page.locator('#toast').textContent());
    const downloadPromise=page.waitForEvent('download');
    await page.locator('#genZip').click();const download=await downloadPromise;
    const zip=await JSZip.loadAsync(fs.readFileSync(await download.path()));
    assert.ok(zip.file('E1.pdf'));assert.ok(Object.keys(zip.files).some(p=>p.startsWith('TD_')));
    const originalE1=await zip.file('E1.pdf').async('uint8array');
    const original=await PDFDocument.load(originalE1);
    assert.equal(original.getForm().getTextField('Coordenada Y').getText(),'4.5671234');
    assert.equal(original.getForm().getTextField('Coordenada X').getText(),'-74.1234567');

    // Verify export guards against old corrupt records in the real application.
    const blocked=await page.evaluate(async()=>{
      const original=records();saveRecords([{...original[0],latitud:'200'}]);
      const result=await exportJornada();saveRecords(original);return result;
    });assert.equal(blocked,false);
    const jornadaDownloads=[];page.on('download',d=>jornadaDownloads.push(d));
    assert.equal(await page.evaluate(()=>exportJornada()),true);
    await page.waitForFunction(()=>localStorage.getItem('GS_DOCS_LAST_EXPORT_V1'));
    assert.equal(jornadaDownloads.length,2);
    const excelDownload=jornadaDownloads.find(d=>d.suggestedFilename().endsWith('.xlsx'));
    const workbook=XLSX.read(fs.readFileSync(await excelDownload.path()));
    const excelRows=XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    assert.equal(String(excelRows[0]['Latitud (Y)']),'4.5671234');
    const jsonDownload=jornadaDownloads.find(d=>d.suggestedFilename().endsWith('.json'));
    const exported=JSON.parse(fs.readFileSync(await jsonDownload.path(),'utf8'));
    assert.equal(exported.registros[0].Latitud_Y,4.5671234);

    // Use the actual GS PDF in the editor, with a selected field and preserved support.
    const dj=await PDFDocument.load(Buffer.from(fs.readFileSync(root+'/templates/base64/DJ.txt','utf8'),'base64'));
    const selected=dj.getForm().getDropdown('Identificacion');selected.select(selected.getOptions()[0]);
    zip.file('DJ.pdf',await dj.save());zip.file('SOPORTES/prueba.txt','SOPORTE DE PRUEBA');
    const buffer=await zip.generateAsync({type:'nodebuffer'});
    const editor=await context.newPage();editor.on('pageerror',e=>errors.push(e.message));
    await editor.goto(base+'/editor-pc/');
    await editor.locator('#zipInput').setInputFiles({name:'documentos-prueba.zip',mimeType:'application/zip',buffer});
    await editor.locator('#workspace').waitFor({state:'visible'});
    await editor.getByRole('button',{name:/^E1/}).click();
    await editor.locator('[data-field-name="1 Nombre o Razón Social"]').fill('NOMBRE CORREGIDO');
    await editor.getByRole('button',{name:/^DJ/}).click();
    // Locate by attribute safely; PDF field names can contain punctuation.
    const selectable=editor.locator('select[data-field-name]');
    const selectedName=selected.getName();
    const options=await selectable.evaluateAll(els=>els.map(el=>el.dataset.fieldName));
    assert.ok(options.includes(selectedName),'the app selectable field is visible');
    await editor.locator('select[data-field-name]').evaluateAll((els,name)=>{
      const el=els.find(el=>el.dataset.fieldName===name);el.value='';el.dispatchEvent(new Event('input',{bubbles:true}));
    },selectedName);
    const correctedPromise=editor.waitForEvent('download');await editor.locator('#saveZipBtn').click();
    const correctedDownload=await correctedPromise;
    const corrected=await JSZip.loadAsync(fs.readFileSync(await correctedDownload.path()));
    const e1=await PDFDocument.load(await corrected.file('E1.pdf').async('uint8array'));
    assert.equal(e1.getForm().getTextField('1 Nombre o Razón Social').getText(),'NOMBRE CORREGIDO');
    const correctedDJ=await PDFDocument.load(await corrected.file('DJ.pdf').async('uint8array'));
    const field=correctedDJ.getForm().getField(selectedName),value=field.getSelected();
    assert.ok(value===undefined||Array.isArray(value)&&value.length===0);
    const manifest=JSON.parse(await corrected.file('GS_REGISTRO.json').async('string'));
    assert.equal(manifest.master.nombre,'NOMBRE CORREGIDO');
    assert.equal(await corrected.file('SOPORTES/prueba.txt').async('string'),'SOPORTE DE PRUEBA');
    assert.deepEqual(errors,[]);
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
});

test('existing service worker updates its cache and the fixed app loads offline',{timeout:120000},async()=>{
  let updated=false;
  const dependencies={
    '/qa/jszip.js':path.join(path.dirname(require.resolve('jszip/package.json')),'dist/jszip.min.js'),
    '/qa/pdf-lib.js':path.join(path.dirname(require.resolve('pdf-lib/package.json')),'dist/pdf-lib.min.js'),
    '/qa/xlsx.js':path.join(path.dirname(require.resolve('xlsx/package.json')),'dist/xlsx.full.min.js')
  };
  const server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://localhost');
    let file=dependencies[url.pathname]||path.join(root,decodeURIComponent(url.pathname));
    if(url.pathname.endsWith('/'))file=path.join(file,'index.html');
    if(!fs.existsSync(file)){res.writeHead(404);res.end();return}
    let body=fs.readFileSync(file);
    const types={'.js':'text/javascript','.html':'text/html','.css':'text/css'};
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
    if(url.pathname==='/sw.js'){
      body=body.toString().replace(/^const REMOTE=.*$/m,"const REMOTE=['./qa/jszip.js','./qa/pdf-lib.js','./qa/xlsx.js'];");
      if(!updated)body=body.replace('gs-docs-v122-pr1-fixes','gs-docs-v122-signature-gps');
      res.setHeader('Cache-Control','no-store');
    }else if(url.pathname==='/gsdoc-v122-signature-gps.js'&&!updated){
      body='globalThis.__OLD_COORDINATE_FIXTURE__=true;';
    }else if(url.pathname==='/'||url.pathname==='/index.html'){
      body=body.toString().replace(/https:\/\/[^"']+jszip[^"']+\.js/g,'/qa/jszip.js')
        .replace(/https:\/\/[^"']+pdf-lib[^"']+\.js/g,'/qa/pdf-lib.js')
        .replace(/https:\/\/[^"']+xlsx[^"']+\.js/g,'/qa/xlsx.js')
        .replace(/<link[^>]*https:\/\/fonts[^>]*>/g,'');
    }
    res.end(body);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.PR1_CHROMIUM_PATH||undefined,
      args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--disable-gpu']});
    const context=await browser.newContext();const page=await context.newPage();
    const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
    page.setDefaultTimeout(15000);
    const base='http://127.0.0.1:'+server.address().port;
    await page.goto(base+'/');
    await page.waitForFunction(()=>globalThis.__OLD_COORDINATE_FIXTURE__);
    await page.evaluate(()=>navigator.serviceWorker.ready);
    await page.waitForFunction(()=>navigator.serviceWorker.controller);
    updated=true;
    await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();await registration.update()});
    await page.waitForFunction(async()=>{
      const keys=await caches.keys();return keys.includes('gs-docs-v122-pr1-fixes')&&!keys.includes('gs-docs-v122-signature-gps');
    });
    await page.reload();await page.waitForFunction(()=>globalThis.__GS_DOCS_V122_SIGNATURE_GPS__);
    await context.setOffline(true);await page.reload();
    await page.waitForFunction(()=>globalThis.__GS_DOCS_V122_SIGNATURE_GPS__);
    const result=await page.evaluate(()=>{
      state.registration={latitud:'200',longitud:'-74'};
      return {valid:validateRegistration(),libs:typeof PDFLib==='object'&&typeof JSZip==='function'&&typeof XLSX==='object',old:!!globalThis.__OLD_COORDINATE_FIXTURE__};
    });
    assert.equal(result.valid,false);assert.equal(result.libs,true);assert.equal(result.old,false);
    assert.deepEqual(pageErrors,[]);
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
});
