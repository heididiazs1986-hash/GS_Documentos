# PR #1: correcciones y verificación

Revisión original: `6237b0efca9a1d283538fbe2c1f6558ae0385bc1`.
Integración con `main`: `0ea306a2c2ba92edb309a4291b6635a4c98b709c`.

## Cambios por archivo

| Archivo | Resultado |
| --- | --- |
| `editor-pc/editor.js` | Las correcciones directas de campos vinculados actualizan la ficha maestra y los documentos dependientes. Los valores vacíos borran desplegables, listas y grupos de opciones mediante PDF-lib. Los errores detienen la exportación. Se valida el rango de coordenadas antes de generar ZIP. |
| `gsdoc-v122-signature-gps.js` | Captura decimal con coma o punto, rangos de latitud/longitud y validez inmediata sin depender de blur. Las correcciones inválidas no se persisten. Validación antes de guardar y generar PDF, y al exportar registros a Excel/JSON. Los registros antiguos inválidos no se exportan, pero pueden corregirse. La precisión continúa siendo opcional. |
| `gsdoc-v119-case-rule.js` | Comparte el alias del normalizador de dirección usado por la app y los complementos; corrige un error de referencia encontrado al probar el flujo real. |
| `editor-pc/editor.css`, `editor-pc/index.html` | Conflictos resueltos conservando el diseño actual de main y la vista de campos operativos, sin checkboxes. Recursos del editor con versión de caché actualizada. |
| `index.html`, `sw.js` | Nuevas versiones de recursos y caché. La caché puede encontrar archivos precargados sin parámetros de versión. Un recurso JavaScript ausente ya no recibe HTML de respaldo. |
| `tests/pr1-regressions.test.cjs` | Tres pruebas de regresión de modelos, PDF y ZIP. |
| `tests/pr1.browser.cjs` | Dos pruebas de navegador: flujo completo y actualización/recarga offline. |
| `package.json`, `package-lock.json`, `.gitignore` | Dependencias de desarrollo y comandos reproducibles. |
| `.github/workflows/pr-regressions.yml` | Ejecuta las regresiones y pruebas de Chromium en pushes y PR. |

## Verificación

Historia comprobada: importar TXT → corregir coordenadas → guardar registro → generar ZIP con E1 y TD → comprobar PDF → exportar Excel/JSON de jornada → abrir ZIP en editor → corregir nombre y borrar selección → descargar ZIP corregido.

- `npm ci && npm test`: tres pruebas aprobadas. Se serializan y reabren PDF/ZIP reales con campos sintéticos; se verifica propagación del nombre entre E1 y TD, limpieza de desplegable/lista/grupo de opciones, persistencia del manifiesto y conservación de soportes.
- `npm run test:browser`: dos pruebas aprobadas en Chromium. La prueba usa la aplicación completa y las plantillas PDF del repositorio, con un usuario, TXT y firmas de prueba; no usa ni altera datos de producción.
- La captura rechaza latitud `200` sin blur. La corrección `4,5671234 / -74,1234567` se guarda con punto decimal y coincide en registro, E1, Excel y JSON.
- Los registros antiguos con coordenadas inválidas bloquean la exportación de jornada.
- El editor conserva el nombre corregido en E1 y el manifiesto; deja en blanco un desplegable de la plantilla DJ y conserva un soporte.
- Se simula una instalación con caché anterior: el service worker se actualiza, elimina la caché antigua y permite recargar la app sin conexión con la validación corregida y las dependencias disponibles.
- Sin errores no controlados en los dos flujos de navegador.
- Comprobaciones de sintaxis de los JavaScript modificados y `git diff --check`: aprobadas.

Para ejecutar las pruebas de navegador: `npx playwright install --with-deps chromium`, seguido de `npm run test:browser`. Se puede indicar un ejecutable existente con `PR1_CHROMIUM_PATH`. En el entorno de trabajo se usó Chromium disponible por paquete porque falló la descarga directa de Playwright. Las dependencias CDN se sirven desde los paquetes instalados durante las pruebas para que la comprobación no dependa de servicios externos.

## Alcance de cierre

Los conflictos del PR con main están resueltos en la integración. La implementación conserva la interfaz actual de main y los ajustes de firma/coordenadas de la rama del PR.

Queda pendiente la evaluación independiente de Codex y el resultado de GitHub Actions sobre el commit publicado. Las pruebas no sustituyen una aceptación de campo en un dispositivo real. No se fusiona el PR ni se publica la aplicación como parte de esta corrección.
