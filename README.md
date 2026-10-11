# Electrolineras Cercanas

App Android que complementa a [Electrolineras](https://github.com/jualas/electrolineras): encuentra el cargador más cercano que cumple tu filtro de potencia y **manda su ubicación al Tesla** para que el coche navegue hasta él.

Electrolineras es la herramienta completa para planificar viajes (búsqueda en corredor de ruta, plan de carga, asistente IA). Durante el viaje basta con algo más directo: abrir la app, ver el cargador adecuado más cercano y enviarlo al coche, sin gestionar rutas ni paradas.

**Fuera de alcance a propósito:** planificador de rutas / OSRM (consume demasiados recursos en el miniPC). La navegación la hacen el propio coche o Google Maps.

## Qué incluye

- Botón / modo **Más cercano** → `GET /api/v1/stations/nearest-live`
- **Filtro de potencia** (Viaje, Ultra, Lento, Todo, personalizado…) persistido en el dispositivo
- **Búsqueda de ubicación** (geocode Nominatim vía API existente) como punto de referencia alternativo al GPS
- Mapa MapLibre con tu posición, el resultado y cargadores cercanos
- **Enviar al Tesla**: comparte el cargador con la app de Tesla con el mismo formato que usa Google Maps (menú «Compartir» nativo o intent directo a la app), y el coche lo recibe como destino
- **Navegar** abre Google Maps (sin calcular ruta en nuestro backend)
- **Copiar coordenadas** como alternativa
- Login TOTP o token privado (`X-Private-Token`), misma API que `electro.jualas.es`

## Stack

- React + Vite (UI)
- Capacitor 7 (empaquetado Android)
- Backend: API ya desplegada de Electrolineras (**sin** arrancar OSRM)

## Desarrollo web

```bash
cd electrolineras-cercanas
cp .env.example .env   # opcional
npm install
npm run dev            # http://127.0.0.1:5174  (proxy a electro.jualas.es)
```

Para APK, en `.env` deja:

```env
VITE_API_URL=https://electro.jualas.es
```

## Build Android

Requisitos: Android Studio / SDK (`ANDROID_HOME`), JDK 21.

```bash
npm install
npm run build
npx cap add android    # solo la primera vez
npm run cap:sync
npx cap open android   # genera/firma APK desde Android Studio
```

Permisos de ubicación los añade el plugin `@capacitor/geolocation`.

### No metas el token en el APK

Vite incrusta en el JavaScript compilado cualquier variable `VITE_*`. Si `VITE_PRIVATE_TOKEN` tiene valor al compilar, el token queda dentro del APK y cualquiera que lo tenga puede extraerlo. Para un APK que vaya a salir de tu dispositivo, compila sin él y entra con TOTP o pegando el token en la pantalla de login (se guarda solo en el dispositivo):

```bash
VITE_PRIVATE_TOKEN= npm run cap:sync
```

### Login TOTP en el APK

En el APK la web corre en `https://localhost` y la API está en otro dominio, así que el WebView trataría la cookie de sesión (`SameSite=Lax`) como de terceros y no la enviaría. Por eso `capacitor.config.ts` activa `CapacitorHttp` y `CapacitorCookies`: las peticiones salen por la pila HTTP nativa de Android, que guarda la sesión. En el navegador (`npm run dev`) el proxy de Vite sirve la API en el mismo origen.

## Relación con el monolito

| Pieza | Electrolineras | Este spinoff |
|-------|----------------|--------------|
| nearest-live / nearby / geocode | ✅ | consume |
| along-route / charging-plan / OSRM | ✅ | ❌ no usa |
| Nominatim | opcional | solo geocode ligero |
| Cliente mapas + rutas | web completa | mapa + Google Maps externo |

Repo independiente del monolito: [jualas/electrolineras](https://github.com/jualas/electrolineras).

## Licencia

[MIT](LICENSE) © 2026 Juan Antonio Francés Pérez
