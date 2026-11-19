# Hypertrophy Tracker — iPhone PWA ↔ Google Sheets

PWA mobile-first (modo oscuro minimalista, sin paso de build) conectada en tiempo real a **`Tracker Gym - Base de Datos`** mediante un **Google Apps Script Web App** protegido con PIN privado.

## Estructura del Repositorio

```text
App/
├── apps_script/
│   ├── code.gs           # Backend Web App para pegar en Google Sheets -> Extensiones -> Apps Script
│   └── SETUP.md          # Guía paso a paso (5 min) para configurar APP_PIN y publicar la URL
└── docs/                 # Sitio estático listo para GitHub Pages (Branch: main, Folder: /docs)
    ├── index.html
    ├── manifest.webmanifest
    ├── sw.js
    ├── test.html         # Suite de tests unitarios de dominio
    ├── css/styles.css
    ├── icons/
    └── js/
        ├── app.js
        ├── api.js
        ├── domain.js
        ├── storage.js
        ├── demo-data.js
        └── ui/
```

## Despliegue en 3 Pasos

### 1. Publicar el Apps Script (en tu Google Sheet)
Seguí los 5 pasos de [`apps_script/SETUP.md`](./apps_script/SETUP.md) y copiá la URL final `https://script.google.com/macros/s/.../exec`.

### 2. Publicar la PWA gratis en GitHub Pages
```bash
cd /Users/diego/Documents/seguimiento_gym/App
git remote add origin https://github.com/<TU_USUARIO>/<TU_REPO>.git
git push -u origin main
```
En GitHub: **Settings → Pages → Build and deployment → Branch: `main` / Folder: `/docs` → Save**.

### 3. Instalar en tu iPhone
1. Abrí `https://<TU_USUARIO>.github.io/<TU_REPO>/` en **Safari**.
2. Tocá **Compartir (`□↑`) → Agregar a pantalla de inicio**.
3. Abrí el ícono **Gym Tracker**, ingresá la **URL del Apps Script** y tu **`APP_PIN`** una sola vez.

## Probar en local en tu Mac

```bash
python3 -m http.server 8765 --directory /Users/diego/Documents/seguimiento_gym/App/docs
```
- App (Modo Demo): `http://127.0.0.1:8765/?demo=1`
- Tests unitarios: `http://127.0.0.1:8765/test.html`
