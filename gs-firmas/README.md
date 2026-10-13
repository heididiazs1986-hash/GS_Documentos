# GS Firmas

Herramienta independiente y sencilla para líderes comunales.

## Flujo
1. Cargar un único PDF consolidado.
2. Validar inmediatamente E1, E6, AR, DJ y TD.
3. Verificar que los documentos correspondan al mismo usuario.
4. Capturar una sola firma.
5. Aplicar la firma en los cinco documentos.
6. Generar un único PDF final plano.

## Campos de firma calibrados con documentos actuales de GS Documentos
- E1: `signature_480n0a`
- E6: `signature_337f0v`
- AR: `signature_126y9t`
- DJ: `signature_131z3s`
- TD: `Firma usuario`

La validación de identidad usa los campos disponibles de nombre y cédula. E6 no contiene cédula del usuario, por lo que allí se valida el nombre.
