# Invitación digital — Giancarlos y Danae

Sitio móvil listo para publicarse en Netlify y conectado al panel de invitados de Google Sheets.

## Publicación

1. Sube este proyecto a GitHub.
2. En Netlify, importa el repositorio. El archivo `netlify.toml` publica automáticamente la carpeta `dist`.
3. Cuando Netlify entregue la dirección final, abre el panel de Google Sheets y reemplaza el valor de `G4` por la dirección terminada en `/?i=`. Ejemplo: `https://giancarlos-danae.netlify.app/?i=`.
4. Desde la columna **Enlace personalizado**, copia el enlace correspondiente a cada invitado.

## Panel de invitados

[Abrir Panel de invitados — Giancarlos y Danae](https://docs.google.com/spreadsheets/d/1nFllZ5zUIhYqKNT_vPX8BZJ2H9JSsbdJDyjeUgA_Ykw/edit)

Los novios solo necesitan usar las columnas visibles:

- Invitado
- Pases asignados
- Pases que usará
- Pases sin usar
- Estado
- Fecha de respuesta
- Enlace personalizado

La columna técnica `ID interno` está oculta. No debe editarse, porque identifica el enlace de cada invitado.

## Respuestas de los invitados

- **Confirmar asistencia** guarda el número de pases, el estado `Confirmado` y la fecha.
- **No podré asistir, gracias** guarda `0` pases, el estado `No asistirá` y la fecha.
- El panel empieza con el estado `Pendiente`.

## Archivos importantes

- `dist/config.js`: dirección pública ya configurada del servicio de Google Apps Script.
- `apps-script/Code.gs`: respaldo del servicio que actualiza Google Sheets.
- `dist/guests.json`: datos de demostración utilizados únicamente cuando `apiUrl` está vacío.

El servicio de Google Apps Script ya está publicado y conectado. Si en el futuro se crea una implementación distinta, reemplaza `apiUrl` por la nueva dirección terminada en `/exec`.
