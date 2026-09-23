# El Rey de los Piratas

Tragamonedas pixel art (480×270 escalado) con post-procesado WebGL. Sin dependencias, sin build y sin imágenes: todos los assets se generan por código.

## Jugar

Abrir `index.html` en Chrome o Edge (doble clic alcanza). Un clic en cualquier parte del juego lo pone en pantalla completa (también sirve `F11`).

- Cualquier tecla o clic: comenzar / girar / volver al menú
- `M`: silenciar
- Si nadie toca nada, la máquina gira sola a los 15 s

## Control remoto desde el celular

Publicado en Vercel: el juego en https://el-rey-de-los-piratas.vercel.app y el control en https://el-rey-de-los-piratas.vercel.app/control.

- Abrir el juego en la TV y el control en cualquier celular: tocar la pantalla equivale a pulsar una tecla en el juego.
- El control muestra "BARCO A LA VISTA" cuando hay un juego conectado escuchando.
- Para usar varias máquinas a la vez, agregar `?sala=nombre` al juego y al control (la misma sala en los dos).
- El navegador bloquea el audio hasta el primer gesto: hacer un clic o tocar una tecla una vez en la TV al abrir el juego (o lanzar Chrome con `--autoplay-policy=no-user-gesture-required`).
- Funciona con Pusher: el celular hace `POST /api/press` (función de Vercel que firma con el secret) y el juego recibe el evento por WebSocket. Variables en Vercel: `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`.

## Parámetros de URL

- `?win=0.4`: probabilidad de ganar (por defecto 0.4)
- `?force=win` o `?force=lose`: fuerza el resultado (para demos)
- `?scene=title|intro|slot|win|lose`: arranca directo en una escena
- `?sala=nombre`: canal del control remoto (por defecto `principal`)

## Estructura

- `src/core.js`: utilidades, cámara y estado del post-procesado
- `src/font.js`: fuente bitmap 5×7 con bisel, contorno y extrusión
- `src/sprites.js`: símbolos, barco, máquina y demás sprites generados
- `src/fx.js`: partículas, fuego estilo Doom, rayos, relámpagos
- `src/post.js`: bloom, aberración cromática, ondas de choque, viñeta y scanlines
- `src/audio.js`: efectos y música chiptune sintetizados con Web Audio
- `src/scenes/`: título, intro, tragamonedas, victoria y derrota
- `src/net.js` y `src/remote.js`: suscripción del juego al canal de Pusher
- `control.html` y `src/control.js`: el control remoto (reusa el motor en vertical con `VIEW_W`/`VIEW_H`)
- `api/`: funciones serverless que disparan el evento y consultan si el juego está conectado
