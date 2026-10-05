# SPEC 11 — Mejora de UI/UX (estilo, tablero responsive, cartas nítidas)

> **Estado:** Borrador
> **Depende de:** SPEC 06
> **Fecha:** 2026-10-05
> **Objetivo:** Rediseñar el tablero siguiendo la maqueta de referencia (paleta, iconografía, reversos y turno activo en dorado), hacerlo responsive a la pantalla y mostrar las imágenes de las cartas nítidas, sin tocar el motor ni la IA.

---

## Por qué existe esta spec

El tablero de SPEC 06 funciona, pero se ve como un prototipo (captura actual: `~/Desktop/ui:op.png`, partida mock, turno 3). El diseño objetivo es la maqueta `~/Desktop/UIUx.png`. Problemas observados en el tablero actual:

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
- **Sistema de estilo (según la maqueta `UIUx.png`).** Archivo `src/ui/theme.ts` con paleta, tipografía, radios, sombras y espaciados. Los componentes dejan de tener colores y fuentes escritos a mano.
  - Fondo azul marino casi negro. Cada jugador tiene un panel de mesa con marco redondeado: azul para el rival y gris azulado para el jugador local.
  - Zonas con borde punteado, esquinas redondeadas y etiqueta pequeña en mayúsculas con espaciado (`TRASH`, `COST AREA`, `DON!! DECK`, `DECK`, `STAGE`, `LEADER`, `CHARACTER AREA`). Cuando una zona está vacía muestra su nombre tenue en el centro.
  - Color de acento amarillo dorado para el turno activo y el botón principal; rojo carmesí para avisos de acción y para `LIFE`; azul claro para nombres de jugador en el log.
  - Reverso de carta propio: fondo azul violáceo con brújula dorada y el texto "ONE PIECE CARD GAME", como en la maqueta. Se usa para mazo, DON!! deck, Life y mano rival. Se genera una vez al arrancar (sin descargar imágenes nuevas) y lleva una insignia con el número de cartas restantes en la esquina inferior derecha.
  - Cartas con esquinas redondeadas, borde y sombra. DON!! con su imagen oficial (ya descargada por `fetchCards`) y contador.
  - `COST AREA` con texto de estado `ACTIVOS · INACTIVOS · ADJUNTOS` y el rótulo `SIN DON!!` cuando está vacía.
  - `LIFE · N` como etiqueta rectangular con el valor, en rojo, en lugar de la pila de cartas de SPEC 06 cuando no hay espacio.
  - Tipografía sans-serif geométrica, en negrita para nombres, números y botones. La monoespaciada actual desaparece.
  - Iconografía en línea y monocroma (línea fina): pantalla completa, reloj, sonido, modo oscuro, ajustes, reportar problema y orden de la mano. Se dibujan como textura generada o con glifos de una fuente de iconos; no se agregan imágenes sueltas.
- **Turno activo en dorado.** El panel de mesa del jugador que tiene el turno lleva un marco dorado de 2 px con un resplandor suave. Su insignia de nombre se rellena en dorado y muestra la etiqueta `TURNO`. El otro panel queda con marco tenue. Al cambiar de turno el marco hace una transición corta (200 ms). Ningún otro elemento usa el dorado, salvo el botón principal.
- **Insignias de jugador (a nivel maqueta).**
  - Cada jugador tiene una píldora con indicador de color, bandera, nombre y, si es su turno, `TURNO`. El nombre del rival va a la izquierda sobre su panel y el del jugador local (`TÚ`) sobre el suyo.
  - Debajo de cada píldora, un chip con reloj y tiempo (`17:30`).
  - **Todo esto es valor fijo escrito en código, sin lógica.** Nombre, bandera y tiempo salen de constantes en `src/ui/mockPlayers.ts` (por ejemplo `HAYAKAWAKAJIO10`, `TÚ`, `17:30`). No hay reloj que corra, ni límite de tiempo, ni cuenta atrás. Tampoco se conecta con motor, red ni cuentas de usuario.
  - El tiempo del counter se muestra con el mismo chip, también fijo: un reloj con `00:30` visible durante el paso `counter` de la batalla. No corta el paso ni fuerza ninguna acción.
- **Columna lateral derecha (según la maqueta).**
  - Arriba, la mano del rival en abanico, con reversos y el número de cartas.
  - Panel de estado con `Turno N · Fase`, un botón para colapsarlo y una fila de iconos (sonido, modo oscuro, ajustes). Los iconos son decorativos: no hacen nada en esta spec.
  - Banner carmesí `ACTÚA TÚ` con la instrucción del momento, tomada de la fase y del paso de batalla ya conocidos por el `GameController`.
  - Zona de log con texto de relleno fijo. El log real y su generación desde `GameEvent` son SPEC 07, que reutiliza este espacio.
  - Botón `¿Algo salió mal? Reportar un problema` de adorno, sin acción.
  - Botón de pantalla completa arriba a la izquierda. Este sí funciona (`Scale.startFullscreen`).
- **Mano y prompts.**
  - La mano local va en abanico abajo a la izquierda, más grande que hoy, con el contador de cartas y un botón `Original` de adorno para el orden. Al pasar el mouse, la carta sube y se amplía.
  - Los prompts se muestran en un diálogo centrado y oscuro, con título, subtítulo y botones. El botón principal es amarillo dorado y el secundario gris oscuro (como `Quedarse` y `Mulligan` en la maqueta). Detrás va un velo semitransparente.
  - Resaltado de lo jugable (cartas, objetivos de ataque, zonas de destino) con un solo lenguaje visual.
- **Transiciones mínimas.** Tweens cortos al robar, jugar, descansar, atacar y recibir daño. Sin sonido (SPEC 09).

**Fuera de alcance (para otras specs):**

- Panel de aprendizaje, log real y tooltips (SPEC 07). Aquí solo se reserva el espacio y se muestra texto de relleno.
- Nombres de usuario reales, cuentas, banderas elegibles, reloj de partida y límite de tiempo del counter. Aquí son valores fijos de maqueta.
- Funcionalidad de los iconos de sonido, modo oscuro, ajustes y reportar problema, y del botón de orden de la mano.
- Menú, selección de mazo, pantalla final y sonido (SPEC 09).
- Cambios al motor, a las acciones o a la IA.
- Soporte táctil y orientación vertical en móvil.
- Rediseñar las imágenes de las cartas (se usan las oficiales).

---

## Diseño

- `computeLayout` sigue siendo una función pura de `(width, height)`; se extiende con el rectángulo de la columna lateral y con márgenes seguros. Los tests de `layout.test.ts` se amplían: sin solapes y todo dentro del lienzo a 1024x600, 1280x720, 1920x1080 y 2560x1440, y en una ventana ultraancha (21:9).
- `Board` escucha el evento `resize` del `ScaleManager` y reposiciona los objetos, en lugar de recrear la escena.
- `mockPlayers.ts` concentra los datos fijos de maqueta (nombres, bandera, tiempos) para poder sustituirlos más adelante sin tocar los componentes.
- `theme.ts` es la única fuente de valores visuales. Los componentes (`Zone`, `CardSprite`, `HandView`, `LifeArea`, `DonArea`, `PromptDialog`, `CardZoom`) y los nuevos `PlayerBadge` y `SidePanel` lo consumen.
- Los reversos y marcos se dibujan con `Graphics` o texturas generadas una vez al arrancar, para no depender de imágenes nuevas.

---

## Criterios de aceptación

- A 1280x720 y a 1920x1080 las cartas se ven nítidas a simple vista, sin bordes escalonados, también en una pantalla retina.
- Al redimensionar la ventana el tablero se ajusta sin deformarse, sin cortar zonas y sin recargar la partida.
- El tablero usa al menos 90 % del alto de la ventana y ninguna zona se solapa con otra.
- No quedan colores ni fuentes escritos a mano fuera de `theme.ts`.
- El tablero se parece a la maqueta `UIUx.png` en paleta, reversos de carta, etiquetas de zona, insignias, columna derecha y diálogo de prompts.
- El jugador con el turno tiene marco dorado e insignia `TURNO`, y cambia al pasar el turno. Nada más usa dorado, salvo el botón principal.
- Nombre y tiempos se ven en pantalla desde `mockPlayers.ts`; no hay temporizador real ni nada que dependa de ellos.
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
| La maqueta tiene una resolución y proporción distintas de la ventana real | Tomarla como guía de estilo y de disposición, no como medida exacta; el layout sigue siendo función de `(width, height)` |
| Las cartas de la maqueta muestran más detalle (logo, brújula) del que se genera sin imagen | Dibujar el reverso con `Graphics` y aceptar una aproximación; si queda pobre, pedir el arte del reverso |

**Decisiones tomadas:** estilo oscuro de la maqueta; nombre de usuario y tiempos fijos, a nivel maqueta.

**Preguntas para Nico:**

- ¿Mínimo de pantalla que debo soportar además de portátil y monitor (por ejemplo, tablet)?
- ¿El reverso de carta de la maqueta (brújula dorada) es arte que puedo usar? Si no, dibujo una versión propia.

---

## Verificación

- `npm test` (layout en varios tamaños) y `npm run build`.
- `npm run dev` y revisión manual en Chrome con capturas a 1280x720, 1920x1080 y con la ventana redimensionada; comparar contra `UIUx.png` (diseño objetivo) y `ui:op.png` (estado anterior).
