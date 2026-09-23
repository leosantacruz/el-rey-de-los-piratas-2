# El Rey de los Piratas

Tragamonedas pixel art (480×270 escalado) con post-procesado WebGL. Sin dependencias, sin build y sin imágenes: todos los assets se generan por código.

## Jugar

Abrir `index.html` en Chrome o Edge (doble clic alcanza) y poner pantalla completa con `F11`.

- Cualquier tecla o clic: comenzar / girar / volver al menú
- `M`: silenciar
- Si nadie toca nada, la máquina gira sola a los 15 s

## Parámetros de URL

- `?win=0.4`: probabilidad de ganar (por defecto 0.4)
- `?force=win` o `?force=lose`: fuerza el resultado (para demos)
- `?scene=title|intro|slot|win|lose`: arranca directo en una escena

## Estructura

- `src/core.js`: utilidades, cámara y estado del post-procesado
- `src/font.js`: fuente bitmap 5×7 con bisel, contorno y extrusión
- `src/sprites.js`: símbolos, barco, máquina y demás sprites generados
- `src/fx.js`: partículas, fuego estilo Doom, rayos, relámpagos
- `src/post.js`: bloom, aberración cromática, ondas de choque, viñeta y scanlines
- `src/audio.js`: efectos y música chiptune sintetizados con Web Audio
- `src/scenes/`: título, intro, tragamonedas, victoria y derrota
