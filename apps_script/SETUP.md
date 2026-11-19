# Configuración de Google Apps Script (5 minutos, una sola vez)

1. Abrí tu Google Sheet **`Tracker Gym - Base de Datos`**.
2. En el menú superior entrá en **Extensiones → Apps Script**.
3. Borrá el contenido inicial de `Código.gs` y pegá todo el contenido de [`code.gs`](./code.gs). Guardá (`⌘ + S`).
4. Configurá tu PIN privado:
   - En el menú izquierdo de Apps Script hacé clic en **Configuración del proyecto** (ícono de engranaje).
   - Bajá hasta **Propiedades de secuencia de comandos** → **Agregar propiedad de secuencia de comandos**.
   - **Propiedad:** `APP_PIN`
   - **Valor:** el PIN que elijas (ej. `4829`) → **Guardar**.
5. Publicá el Web App:
   - Arriba a la derecha hacé clic en **Implementar → Nueva implementación**.
   - Tipo: **Aplicación web** (ícono de engranaje junto a "Seleccionar tipo").
   - **Ejecutar como:** `Yo (diegopirazabal@gmail.com)`.
   - **Quién tiene acceso:** `Cualquier usuario` *(el acceso real está protegido por tu `APP_PIN`)*.
   - Clic en **Implementar** → autorizá los permisos de Google Sheets la primera vez → copiá la **URL de la aplicación web** (`https://script.google.com/macros/s/.../exec`).

> **Importante:** Si alguna vez modificás `code.gs` en el futuro, usá **Implementar → Administrar implementaciones → Editar (lápiz) → Nueva versión** para conservar la misma URL.
