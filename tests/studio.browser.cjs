const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const { PDFDocument, degrees } = require('pdf-lib');
const JSZip = require('jszip');
const root = path.join(__dirname, '..');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFElEQVR4nGP8HyDCgA0wYRUdtBIAGpQBc7uVLZkAAAAASUVORK5CYII=', 'base64');

async function pdf(label, pages = 1) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const pg = doc.addPage([595, 842]);
    const field = doc.getForm().createTextField(label + '_' + i);
    field.setText('PRUEBA ' + label + ' ' + (i + 1));
    field.addToPage(pg, { x: 40, y: 50, width: 200, height: 30 });
  }
  return Buffer.from(await doc.save());
}
async function fixture(run) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const decoded = decodeURIComponent(url.pathname);
    const file = path.resolve(root, '.' + decoded, decoded.endsWith('/') ? 'index.html' : '');
    if (!(file.startsWith(root + path.sep)) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end(); return;
    }
    const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.PR1_CHROMIUM_PATH || undefined,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--single-process', '--disable-gpu'] });
    const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: true });
    const base = 'http://127.0.0.1:' + server.address().port;
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === base) return route.continue();
      let file;
      if (url.pathname.includes('jszip')) file = path.join(path.dirname(require.resolve('jszip/package.json')), 'dist/jszip.min.js');
      else if (url.pathname.includes('pdf-lib')) file = path.join(path.dirname(require.resolve('pdf-lib/package.json')), 'dist/pdf-lib.min.js');
      if (file) return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(file) });
      if (url.pathname.endsWith('pdf.min.js')) return route.fulfill({ contentType: 'text/javascript', body: '' });
      return route.fulfill({ contentType: 'text/css', body: '' });
    });
    const page = await context.newPage(); page.setDefaultTimeout(12000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/gs-studio/');
    await page.waitForFunction(() => !!window.PDFLib && !!window.JSZip);
    const downloadPdf = async () => {
      const wait = page.waitForEvent('download');
      await page.locator('#exportBtn').click();
      const download = await wait;
      return fs.readFileSync(await download.path());
    };
    await run({ page, context, base, errors, downloadPdf });
    assert.deepEqual(errors, [], 'No debe haber errores JavaScript inesperados');
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

test('GS Studio works with arbitrary PDFs, without opening GS Editor', { timeout: 120000 }, async () => {
  await fixture(async ({ page, downloadPdf }) => {
    const informe = await pdf('INFORME', 2), contrato = await pdf('CONTRATO', 1);
    await page.locator('#fileInput').setInputFiles([
      { name: 'informe.pdf', mimeType: 'application/pdf', buffer: informe },
      { name: 'contrato.pdf', mimeType: 'application/pdf', buffer: contrato }
    ]);
    await page.waitForFunction(() => document.querySelectorAll('.page').length === 3);
    await page.locator('.page').first().locator('nav button[title="Girar 90°"]').click();
    const joined = await PDFDocument.load(await downloadPdf());
    assert.equal(joined.getPageCount(), 3);
    assert.equal(joined.getPage(0).getRotation().angle, 90);
    assert.deepEqual(informe, await pdf('INFORME', 2), 'source PDF must be unchanged');

    await page.locator('[data-tool="split"]').click();
    await page.locator('#fileInput').setInputFiles({ name: 'informe.pdf', mimeType: 'application/pdf', buffer: informe });
    await page.waitForFunction(() => document.querySelectorAll('.page').length === 2);
    await page.locator('#rangeStart').fill('2');
    await page.locator('#rangeEnd').fill('2');
    assert.equal((await PDFDocument.load(await downloadPdf())).getPageCount(), 1);

    await page.locator('[data-tool="images"]').click();
    await page.locator('#fileInput').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: png });
    await page.waitForFunction(() => document.querySelectorAll('.page').length === 1);
    const photos = await PDFDocument.load(await downloadPdf());
    assert.equal(photos.getPageCount(), 1);
    assert.deepEqual(photos.getPage(0).getSize(), { width: 595, height: 842 });

    await page.locator('[data-tool="sign"]').click();
    await page.locator('#fileInput').setInputFiles({ name: 'contrato.pdf', mimeType: 'application/pdf', buffer: contrato });
    await page.waitForFunction(() => document.querySelectorAll('.page').length === 1);
    await page.locator('#signatureImage').setInputFiles({ name: 'firma.png', mimeType: 'image/png', buffer: png });
    const signed = await downloadPdf();
    assert.equal((await PDFDocument.load(signed)).getPageCount(), 1);
    assert.match(signed.toString('latin1'), /\/Subtype \/Image/, 'PDF must contain a real embedded image');
  });
});

test('GS Editor -> GS Studio ZIP handoff preserves support and opens PDF', { timeout: 120000 }, async () => {
  await fixture(async ({ page }) => {
    const zip = new JSZip();
    const sourcePdf = await pdf('E1');
    zip.file('E1.pdf', sourcePdf);
    zip.file('SOPORTES/soporte.txt', 'SOPORTE ORIGINAL');
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    await page.locator('#openEditorBtn').click();
    const frame = page.frameLocator('#editorFrame');
    await frame.locator('#zipInput').setInputFiles({ name: 'GS_Documentos.zip', mimeType: 'application/zip', buffer });
    await frame.locator('#workspace').waitFor({ state: 'visible' });
    const pending = page.waitForEvent('download');
    await frame.locator('#saveZipBtn').click();
    const downloaded = await pending;
    const corrected = await JSZip.loadAsync(fs.readFileSync(await downloaded.path()));
    assert.equal(await corrected.file('SOPORTES/soporte.txt').async('string'), 'SOPORTE ORIGINAL');
    assert.ok(corrected.file('E1.pdf'), 'corrected ZIP must preserve PDF');
    await page.waitForFunction(() => document.querySelectorAll('#pages .page').length === 1);
    assert.equal(await page.locator('#toolTitle').textContent(), 'Unir PDF');
    assert.match(await page.locator('#message').textContent(), /ZIP corregido descargado/);
  });
});