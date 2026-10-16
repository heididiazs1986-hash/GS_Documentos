/* GS Studio - herramientas locales. Nunca reescribe archivos de entrada ni datos de GS Documentos. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const labels = { merge: 'Unir PDF', images: 'Imágenes a PDF', organize: 'Organizar PDF', split: 'Dividir PDF', sign: 'Firmar PDF' };
  const order = ['TD', 'E1', 'E6', 'AR', 'DJ', 'RETIE', 'EC'];
  let tool = 'merge', pages = [], signatureFile = null, signDirty = false, inEditor = false;
  const signature = $('signCanvas'), ink = signature.getContext('2d');
  ink.lineWidth = 4; ink.lineCap = 'round'; ink.lineJoin = 'round'; ink.strokeStyle = '#162033';
  const say = value => { $('message').textContent = value; };
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  function clear() {
    pages = [];
    $('fileInput').value = '';
    $('pages').replaceChildren();
    $('exportBtn').disabled = true;
    $('rangeStart').value = '1';
    $('rangeEnd').value = '1';
    say('');
  }
  function setTool(next, retain = false) {
    if (next === 'editor') {
      inEditor = true;
      $('editorWorkspace').classList.remove('hidden');
      $('workspace').classList.add('hidden');
      $('editorFrame').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    inEditor = false;
    $('editorWorkspace').classList.add('hidden');
    $('workspace').classList.remove('hidden');
    if (!retain) clear();
    tool = next;
    $('toolTitle').textContent = labels[next];
    $('signTools').classList.toggle('hidden', next !== 'sign');
    $('splitTools').classList.toggle('hidden', next !== 'split');
    $('signResultBtn').classList.toggle('hidden', !(next === 'merge' || next === 'organize') || !pages.length);
    $('fileInput').multiple = next === 'images' || next === 'merge';
    $('fileInput').accept = next === 'images' ? 'image/png,image/jpeg,.png,.jpg,.jpeg' : '.pdf,.zip,application/pdf,application/zip';
    $('dropFormats').textContent = next === 'images' ? 'Admite JPG y PNG' : 'Admite PDF y ZIP con documentos PDF';
    $('toolHint').textContent = next === 'images'
      ? 'Selecciona imágenes JPG o PNG y organízalas antes de generar el PDF.'
      : next === 'sign'
      ? 'Dibuja tu firma manuscrita o carga su imagen. Pulsa sobre la vista previa para elegir su ubicación.'
      : next === 'split'
      ? 'Abre un PDF y especifica el intervalo de páginas que deseas extraer.'
      : 'Abre documentos PDF o un ZIP de GS Documentos y organízalos en el orden que necesites.';
    $('exportBtn').textContent = next === 'sign' ? 'Guardar PDF firmado' : 'Generar PDF';
    if (retain) render();
  }
  document.querySelectorAll('[data-tool]').forEach(button => button.addEventListener('click', () => setTool(button.dataset.tool)));
  $('openToolsBtn').onclick = () => $('workspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('backToPdf').onclick = () => setTool(tool, true);
  $('clearBtn').onclick = clear;
  $('signResultBtn').onclick = () => setTool('sign', true);

  function isPdf(filename) { return /\.pdf$/i.test(filename); }
  function isZip(filename) { return /\.zip$/i.test(filename); }
  function sortZipPaths(a, b) {
    const rank = path => {
      const name = path.split('/').pop().toUpperCase();
      const index = order.findIndex(type => name === type + '.PDF' || name.startsWith(type + '_'));
      return index < 0 ? 99 : index;
    };
    return rank(a) - rank(b) || a.localeCompare(b, 'es', { numeric: true });
  }
  async function pdfSource(data, name) {
    const bytes = new Uint8Array(await data.arrayBuffer());
    let doc;
    try { doc = await PDFLib.PDFDocument.load(bytes, { updateMetadata: false }); }
    catch (error) { throw new Error('No se pudo abrir ' + name + '. Comprueba que no esté cifrado o dañado. ' + error.message); }
    return { doc, bytes, name };
  }
  function pagesFromSource(source) {
    return source.doc.getPages().map((_, index) => ({
      type: 'pdf', source, index, label: source.name + ' · ' + (index + 1), rotation: 0
    }));
  }
  async function unpackZip(file) {
    if (!window.JSZip) throw new Error('No se cargó el lector ZIP.');
    const zip = await JSZip.loadAsync(file);
    const filenames = Object.keys(zip.files)
      .filter(name => !zip.files[name].dir && isPdf(name) && !/(^|\/)SOPORTES\//i.test(name))
      .sort(sortZipPaths);
    if (!filenames.length) throw new Error('El ZIP no contiene documentos PDF.');
    const all = [];
    for (const name of filenames) {
      const bytes = await zip.file(name).async('uint8array');
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const source = await pdfSource(blob, name);
      all.push(...pagesFromSource(source));
    }
    return all;
  }
  async function readFiles(input, append = false) {
    if (!window.PDFLib) throw new Error('No se cargó el motor PDF. Revisa tu conexión.');
    const incoming = [];
    for (const file of input) {
      if (tool === 'images') {
        if (!/^(image\/png|image\/jpeg)$/.test(file.type)) throw new Error('Solo se aceptan imágenes JPG y PNG.');
        incoming.push({ type: 'image', file, label: file.name });
      } else if (isZip(file.name)) {
        incoming.push(...await unpackZip(file));
      } else if (isPdf(file.name)) {
        incoming.push(...pagesFromSource(await pdfSource(file, file.name)));
      } else {
        throw new Error('Selecciona un PDF o un ZIP de GS Documentos.');
      }
    }
    pages = append ? pages.concat(incoming) : incoming;
    render();
  }
  $('fileInput').addEventListener('change', async event => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    say('Abriendo archivos…');
    try { await readFiles(files, tool === 'merge' && pages.length > 0); }
    catch (error) { say('Error: ' + error.message); }
    finally { $('fileInput').value = ''; }
  });

  // Same input flow for clicking, dropping files, and dropping folders exposed as files.
  const dropzone = $('fileDropzone');
  let dragDepth = 0;
  dropzone.addEventListener('dragenter', event => {
    event.preventDefault();
    dragDepth++;
    dropzone.classList.add('drag-over');
  });
  dropzone.addEventListener('dragover', event => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    dropzone.classList.add('drag-over');
  });
  dropzone.addEventListener('dragleave', event => {
    event.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) dropzone.classList.remove('drag-over');
  });
  dropzone.addEventListener('drop', async event => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth = 0;
    dropzone.classList.remove('drag-over');
    const files = Array.from(event.dataTransfer?.files || []);
    if (!files.length) { say('Arrastra archivos PDF, ZIP o imágenes según la herramienta.'); return; }
    say('Abriendo archivos arrastrados…');
    try { await readFiles(files, (tool === 'merge' || tool === 'images') && pages.length > 0); }
    catch (error) { say('Error: ' + error.message); }
  });
  // Prevent a PDF dropped outside the dropzone from replacing the app in the browser.
  window.addEventListener('dragover', event => {
    if (event.dataTransfer?.types?.includes('Files')) event.preventDefault();
  });
  window.addEventListener('drop', event => {
    if (event.dataTransfer?.types?.includes('Files')) event.preventDefault();
  });

  function drawPagePreview(entry, canvas) {
    if (entry.type === 'image') {
      const url = URL.createObjectURL(entry.file);
      const image = new Image();
      image.onload = () => {
        const ratio = Math.min(160 / image.width, 180 / image.height, 1);
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
      };
      image.onerror = () => { URL.revokeObjectURL(url); };
      image.src = url;
      return;
    }
    if (!window.pdfjsLib) {
      const fallback = document.createElement('span');
      fallback.className = 'note';
      fallback.textContent = 'Vista previa no disponible (las páginas sí se pueden exportar).';
      canvas.replaceWith(fallback);
      return;
    }
    (async () => {
      // PDF.js needs its own copy; PDF-lib keeps the original for copyPages().
      const pdf = await pdfjsLib.getDocument({ data: entry.source.bytes.slice() }).promise;
      try {
        const page = await pdf.getPage(entry.index + 1);
        const original = page.getViewport({ scale: 1 });
        const scale = Math.min(160 / original.width, 180 / original.height, 1);
        const viewport = page.getViewport({ scale });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      } finally { await pdf.destroy(); }
    })().catch(() => {
      const span = document.createElement('span'); span.className = 'note';
      span.textContent = 'Miniatura no disponible.';
      if (canvas.isConnected) canvas.replaceWith(span);
    });
  }
  function render() {
    const host = $('pages'); host.replaceChildren();
    pages.forEach((entry, index) => {
      const card = document.createElement('article'); card.className = 'page';
      const canvas = document.createElement('canvas'); card.append(canvas);
      const caption = document.createElement('div'); caption.textContent = (index + 1) + '. ' + entry.label; card.append(caption);
      const nav = document.createElement('nav');
      const add = (label, title, action, disabled = false) => {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
        button.title = title; button.disabled = disabled; button.addEventListener('click', action); nav.append(button);
      };
      add('←', 'Mover a la izquierda', () => move(index, -1), index === 0);
      add('→', 'Mover a la derecha', () => move(index, 1), index === pages.length - 1);
      if (entry.type === 'pdf') add('↻', 'Girar 90°', () => { entry.rotation = (entry.rotation + 90) % 360; render(); });
      add('×', 'Eliminar de la selección', () => { pages.splice(index, 1); render(); });
      card.append(nav); host.append(card); drawPagePreview(entry, canvas);
      if (tool === 'sign' && entry.type === 'pdf') {
        card.classList.add('sign-target');
        canvas.title = 'Haz clic para ubicar la firma en esta página';
        canvas.addEventListener('click', event => {
          const pg = entry.source.doc.getPage(entry.index);
          const rotated = (pg.getRotation().angle + entry.rotation) % 360;
          if (rotated !== 0) { say('Para firmar una página girada, primero guárdala y vuelve a abrirla en Firmar PDF.'); return; }
          const rect = canvas.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const x = Math.max(0, Math.round((event.clientX - rect.left) / rect.width * pg.getWidth()));
          const y = Math.max(0, Math.round((1 - (event.clientY - rect.top) / rect.height) * pg.getHeight()));
          $('signPage').value = index + 1;
          $('signX').value = x;
          $('signY').value = y;
          say('Firma ubicada en página ' + (index + 1) + '. Ajusta las coordenadas si hace falta.');
        });
      }
    });
    $('exportBtn').disabled = !pages.length;
    $('signResultBtn').classList.toggle('hidden', !(tool === 'merge' || tool === 'organize') || !pages.length);
    $('signPage').max = String(pages.length);
    $('rangeEnd').value = String(pages.length || 1);
    say(pages.length + ' página(s) preparadas.');
  }
  function move(index, delta) {
    const next = index + delta;
    if (next < 0 || next >= pages.length) return;
    [pages[index], pages[next]] = [pages[next], pages[index]];
    render();
  }

  let drawing = false;
  const coordinates = event => {
    const rect = signature.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * signature.width / rect.width,
      y: (event.clientY - rect.top) * signature.height / rect.height };
  };
  signature.addEventListener('pointerdown', event => {
    drawing = true; signature.setPointerCapture(event.pointerId);
    const p = coordinates(event); ink.beginPath(); ink.moveTo(p.x, p.y);
    ink.lineTo(p.x + .1, p.y + .1); ink.stroke(); signDirty = true;
  });
  signature.addEventListener('pointermove', event => {
    if (!drawing) return;
    const p = coordinates(event); ink.lineTo(p.x, p.y); ink.stroke();
  });
  ['pointerup', 'pointercancel'].forEach(name => signature.addEventListener(name, () => { drawing = false; }));
  $('clearSign').onclick = () => {
    ink.clearRect(0, 0, signature.width, signature.height);
    signDirty = false; signatureFile = null; $('signatureImage').value = '';
  };
  $('signatureImage').addEventListener('change', event => {
    const file = event.target.files[0];
    if (file && !['image/png', 'image/jpeg'].includes(file.type)) {
      signatureFile = null; say('La firma debe ser PNG o JPG.'); return;
    }
    signatureFile = file || null;
  });

  async function appendPage(output, entry) {
    if (entry.type === 'image') {
      const bytes = new Uint8Array(await entry.file.arrayBuffer());
      const image = entry.file.type === 'image/png' ? await output.embedPng(bytes) : await output.embedJpg(bytes);
      const width = 595, height = 842, margin = 26;
      const scale = Math.min((width - margin * 2) / image.width, (height - margin * 2) / image.height);
      const w = image.width * scale, h = image.height * scale;
      const pg = output.addPage([width, height]);
      pg.drawImage(image, { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h });
      return pg;
    }
    const [page] = await output.copyPages(entry.source.doc, [entry.index]);
    output.addPage(page);
    if (entry.rotation) {
      page.setRotation(PDFLib.degrees((page.getRotation().angle + entry.rotation) % 360));
    }
    return page;
  }
  async function signatureBytes() {
    if (signatureFile) return { bytes: new Uint8Array(await signatureFile.arrayBuffer()), jpg: signatureFile.type === 'image/jpeg' };
    if (!signDirty) throw new Error('Dibuja o carga una firma.');
    const base64 = signature.toDataURL('image/png').split(',')[1];
    return { bytes: Uint8Array.from(atob(base64), c => c.charCodeAt(0)), jpg: false };
  }
  async function exportPdf() {
    if (!pages.length) return;
    const button = $('exportBtn'); button.disabled = true;
    say('Generando documento…');
    try {
      if (!window.PDFLib) throw new Error('No está disponible el motor PDF.');
      let selected = pages;
      if (tool === 'split') {
        const start = Number($('rangeStart').value), end = Number($('rangeEnd').value);
        if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > pages.length)
          throw new Error('Indica un rango válido.');
        selected = pages.slice(start - 1, end);
      }
      const output = await PDFLib.PDFDocument.create();
      for (const page of selected) await appendPage(output, page);
      if (tool === 'sign') {
        const number = Number($('signPage').value);
        if (!Number.isInteger(number) || number < 1 || number > selected.length)
          throw new Error('Selecciona una página válida para firmar.');
        const { bytes, jpg } = await signatureBytes();
        const image = jpg ? await output.embedJpg(bytes) : await output.embedPng(bytes);
        const page = output.getPage(number - 1);
        const x = Number($('signX').value), y = Number($('signY').value), w = Number($('signWidth').value);
        const h = w * image.height / image.width;
        if (![x, y, w, h].every(Number.isFinite) || w < 30 || x < 0 || y < 0 ||
            x + w > page.getWidth() || y + h > page.getHeight())
          throw new Error('La firma sale de la página. Ajusta sus coordenadas o tamaño.');
        if (page.getRotation().angle % 360 !== 0)
          throw new Error('Guarda primero las páginas giradas y vuelve a abrir el PDF para ubicar la firma.');
        page.drawImage(image, { x, y, width: w, height: h });
      }
      const bytes = await output.save({ useObjectStreams: false });
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      const anchor = document.createElement('a'); anchor.href = url;
      anchor.download = 'GS_Studio_' + tool + '_' + new Date().toISOString().slice(0, 10) + '.pdf';
      document.body.append(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      say('PDF descargado. Revisa el documento antes de compartirlo.');
    } catch (error) { say('Error: ' + error.message); }
    finally { button.disabled = !pages.length; }
  }
  $('exportBtn').onclick = exportPdf;

  // Receives only the corrected ZIP from our embedded, same-origin editor.
  window.addEventListener('message', async event => {
    if (event.origin !== location.origin || event.source !== $('editorFrame').contentWindow) return;
    if (!event.data || event.data.type !== 'GS_STUDIO_CORRECTED_ZIP' || !(event.data.blob instanceof Blob)) return;
    setTool('merge');
    say('Cargando los PDF del ZIP corregido…');
    try {
      await readFiles([new File([event.data.blob], event.data.filename || 'corregido.zip', { type: 'application/zip' })]);
      say('ZIP corregido descargado; PDF listos para unir y firmar. Los soportes permanecen en el ZIP.');
      $('workspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) { say('No fue posible abrir el ZIP corregido: ' + error.message); }
  });
  setTool('merge');
})();
