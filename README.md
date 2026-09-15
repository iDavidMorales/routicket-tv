# Routicket TV

Routicket TV es el reproductor y administrador de pantallas del ecosistema Routicket.

## Arquitectura

- **Routicket Play**: gestor/biblioteca de contenido.
- **Routicket TV Manager**: selecciona pantallas y decide qué contenido mostrar.
- **Routicket TV Screen**: reproductor que corre en TV, monitor, tablet o navegador.

## V1 incluida

- Panel de pantallas.
- Estado online/offline de ejemplo.
- Selector de contenido: Routicket Play, URL, QR, imagen y video.
- Acción **Enviar a pantalla**.
- Reproductor independiente en `screen.html`.
- Sin backend obligatorio: la demo usa `localStorage` + `BroadcastChannel` para probar manager y pantalla en el mismo navegador.

## Probar localmente

Sirve la carpeta con cualquier servidor HTTP, por ejemplo:

```bash
npx serve .
```

Abre:

- Manager: `/`
- Pantalla demo: `/screen.html?id=recepcion`

Abre ambos en pestañas separadas. Desde el manager selecciona una pantalla y envía contenido.

## Integración siguiente

La demo deja preparada la separación para sustituir el almacenamiento local por una API persistente con:

- `GET /api/screens`
- `POST /api/screens/:id/play`
- `POST /api/screens/:id/heartbeat`
- `GET /api/content`

El catálogo principal debe seguir viviendo en Routicket Play; Routicket TV consume y reproduce ese contenido.
