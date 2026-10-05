# SPEC 11 — Mejora de UI/UX (estilo, tablero responsive, cartas nítidas)

> **Estado:** Borrador
> **Depende de:** SPEC 06
> **Fecha:** 2026-10-05
> **Objetivo:** Darle al tablero un diseño visual propio, hacerlo responsive a la pantalla y mostrar las imágenes de las cartas nítidas, sin tocar el motor ni la IA.

---

## Por qué existe esta spec

El tablero de SPEC 06 funciona, pero se ve como un prototipo (captura de referencia: `~/Desktop/ui:op.png`, partida mock, turno 3). Problemas observados:

- **Cartas pixeladas.** Los JPG descargados son de 600x838, pero se ven con bordes escalonados. El lienzo es fijo de 1280x720 y el navegador lo estira, sin tener en cuenta la densidad de píxeles (pantallas retina), y las texturas se reducen mucho de golpe.
- **Tablero chico.** Las zonas usan una fracción del lienzo y hay márgenes vacíos a los lados (el panel de zoom ocupa un área que casi nunca se usa). Con una ventana más grande, el lienzo no crece.
- **Estilo plano.** Fondo azul liso, zonas como rectángulos de línea fina, etiquetas en monoespaciada sobre el borde, DON!! como círculos con una "D", reversos de carta con un "OP" de relleno.
- **Jerarquía débil.** El estado del turno es un texto suelto a la izquierda. El diálogo de prompts tapa los Characters. No se distingue de un vistazo qué es jugable ni de quién es el turno.
- **Mano pequeña.** Las cartas de la mano son lo más difícil de leer y son lo que Nico más consulta para aprender.

Esta spec va antes de SPEC 07 porque el panel de aprendizaje y el log necesitan un espacio previsto en el layout. Se numera 11 porque el roadmap de SPEC 01 llega a 09 y SPEC 10 ya salió de secuencia; el orden de ejecución es 11, 07, 09.

---

## Alcance

**Dentro:**

- **Escalado responsive.** El lienzo ocupa toda la ventana (`Phaser.Scale.RESIZE`) y `computeLayout(width, height)` se recalcula al cambiar el tamaño. Se mantiene la proporción útil del tablero y se centra; no se deforma. Tamaño mínimo soportado: 1024x600.
- **Nitidez.**
  - Renderizar con `devicePixelRatio` para que en pantallas retina el lienzo tenga resolución real.
  - Filtro de textura lineal con mipmaps (o texturas intermedias reducidas) para que bajar de 600 px al tamaño de la carta no escalone.
  - El zoom de carta usa la imagen a resolución completa.
  - Verificar que `fetchCards` guarda la imagen original sin recomprimir; si la fuente trae mayor resolución, se usa esa.
- **Tablero más grande.** Las zonas y cartas crecen para aprovechar el ancho y alto disponibles. Se reserva una columna lateral para SPEC 07 (panel y log), que en esta spec queda vacía o colapsable.
- **Sistema de estilo.** Archivo `src/ui/theme.ts` con paleta, tipografía, radios, sombras y espaciados. Los componentes dejan de tener colores y fuentes escritos a mano.
  - Fondo del tablero con degradado o textura suave, y una mesa diferenciada para cada jugador.
  - Zonas con marco redondeado, nombre discreto y estado vacío claro.
  - Cartas con esquinas redondeadas, borde y sombra.
  - Reverso de carta propio (sin el texto "OP") para mazo, Life y mano rival.
  - DON!! con imagen oficial (ya descargada por `fetchCards`) en lugar del círculo con "D", con contador visible.
  - Tipografía legible para números (power, cost, Life) y texto de estado.
- **Jerarquía y feedback.**
  - Barra de estado con turno, fase y jugador activo, con indicador de turno claro.
  - Resaltado de lo jugable (cartas, objetivos de ataque, zonas de destino) con un solo lenguaje visual.
  - Diálogos de prompt centrados sobre un velo semitransparente, sin tapar el campo de forma ambigua.
  - Mano más grande y abanico con zoom al pasar el mouse.
- **Transiciones mínimas.** Tweens cortos al robar, jugar, descansar, atacar y recibir daño. Sin sonido (SPEC 09).

**Fuera de alcance (para otras specs):**

- Panel de aprendizaje, log y tooltips (SPEC 07). Aquí solo se reserva el espacio.
- Menú, selección de mazo, pantalla final y sonido (SPEC 09).
- Cambios al motor, a las acciones o a la IA.
- Soporte táctil y orientación vertical en móvil.
- Rediseñar las imágenes de las cartas (se usan las oficiales).

---

## Diseño

- `computeLayout` sigue siendo una función pura de `(width, height)`; se extiende con el rectángulo de la columna lateral y con márgenes seguros. Los tests de `layout.test.ts` se amplían: sin solapes y todo dentro del lienzo a 1024x600, 1280x720, 1920x1080 y 2560x1440, y en una ventana ultraancha (21:9).
- `Board` escucha el evento `resize` del `ScaleManager` y reposiciona los objetos, en lugar de recrear la escena.
- `theme.ts` es la única fuente de valores visuales. Los componentes (`Zone`, `CardSprite`, `HandView`, `LifeArea`, `DonArea`, `PromptDialog`, `CardZoom`) lo consumen.
- Los reversos y marcos se dibujan con `Graphics` o texturas generadas una vez al arrancar, para no depender de imágenes nuevas.

---

## Criterios de aceptación

- A 1280x720 y a 1920x1080 las cartas se ven nítidas a simple vista, sin bordes escalonados, también en una pantalla retina.
- Al redimensionar la ventana el tablero se ajusta sin deformarse, sin cortar zonas y sin recargar la partida.
- El tablero usa al menos 90 % del alto de la ventana y ninguna zona se solapa con otra.
- No quedan colores ni fuentes escritos a mano fuera de `theme.ts`.
- Se distingue de un vistazo de quién es el turno y qué acciones son jugables.
- `npm test`, `npm run typecheck` y `npm run build` pasan.
- Una partida completa contra la CPU sigue funcionando igual que antes.

---

## Riesgos y preguntas abiertas

| Riesgo | Mitigación |
|--------|------------|
| `RESIZE` con `devicePixelRatio` consume más GPU | Limitar el ratio a 2 y medir en un portátil sin GPU dedicada |
| Los JPG de 600 px no alcanzan para el zoom en pantallas grandes | Revisar si la API ofrece mayor resolución; si no, aceptar el límite y mostrar el zoom a tamaño moderado |
| El layout de la columna de SPEC 07 cambia el tablero después | Reservar ya el ancho y la posición, y probarlos con un panel de relleno |
| Sin diseño visual de referencia | Proponer 2 paletas en el primer commit de la spec y que Nico elija antes de implementar |

**Preguntas para Nico:**

- ¿Prefieres un estilo oscuro tipo mesa de juego, o algo más colorido temático de One Piece (mapa antiguo, madera)?
- ¿Mínimo de pantalla que debo soportar además de portátil y monitor (por ejemplo, tablet)?

---

## Verificación

- `npm test` (layout en varios tamaños) y `npm run build`.
- `npm run dev` y revisión manual en Chrome con capturas a 1280x720, 1920x1080 y con la ventana redimensionada; comparar contra `ui:op.png`.
