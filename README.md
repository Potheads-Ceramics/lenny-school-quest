# Lenny's School Quest (NL)

Juego en el navegador (Phaser 3) para elegir escuela secundaria en Rotterdam. Sin instalaciones: son archivos estáticos servidos con GitHub Pages.

## Guardado online con código de jugador

La primera vez en cada dispositivo, Lenny elige **"Ik ben nieuw"** (recibe un código tipo `VOS-WOLK-482`) o **"Ik heb al een code"**. Después el dispositivo recuerda el código y él solo juega. Todo se guarda primero en el dispositivo y unos segundos después online; si no hay internet, se sube más tarde. Al abrir el juego gana el guardado más nuevo.

Mientras `js/cloud-config.js` esté vacío, el juego guarda solo en el dispositivo.

### Activar el guardado online (una sola vez)

1. Crear una cuenta y un proyecto gratis en https://supabase.com (región Europa).
2. En el proyecto: **SQL Editor → New query**, pegar todo `supabase-setup.sql` y darle **Run**.
3. Copiar la **Project URL** y la **anon / publishable key** (Project Settings → API) en `js/cloud-config.js`.

## Archivos

- `index.html`: página y estilos
- `js/`: código por partes (mapa, jugador, escuelas, desafíos, puntaje, monedas, mini-mapa, UI)
- `js/cloud.js` + `js/cloud-config.js`: código de jugador y guardado online
- `data/schools.json`: base de datos de escuelas (se puede actualizar sin tocar el código)
- `supabase-setup.sql`: la base de datos del guardado online

Esta versión pública no incluye los lugares de la familia que tiene la versión de claude.ai.
