# SPEC 25 — Modo vertical (móvil)

> **Estado:** Pendiente
> **Depende de:** PR #49 (escalado en pantallas chicas), SPEC 11, SPEC 14
> **Fecha:** 2026-10-12
> **Objetivo:** Jugar en un teléfono en vertical (referencia: iPhone 15, 393x852) sin girarlo. Hoy el juego solo entra en horizontal: el PR #49 escala el tablero bajo 1024x600 y en vertical muestra "Girá el teléfono para jugar". Esta spec reemplaza ese aviso por un layout propio para pantalla alta y deja el juego usable con el dedo.

---

## Alcance

- **Detección de orientación.** `orientation(width, height)` devuelve `'portrait'` cuando `height > width` y `width < 768`, y `'landscape'` en cualquier otro caso. Una tablet en vertical (768 o más de ancho) sigue con el layout actual escalado. `needsRotation` y el aviso de `index.html` dejan de usarse y se eliminan.
- **Tamaño lógico vertical.** Nuevo `MIN_SIZE_PORTRAIT` (`{ w: 390, h: 700 }` como punto de partida). Bajo ese tamaño el canvas se escala igual que hoy con `fitScale`; sobre él, el lienzo ocupa toda la ventana. `viewport.ts` elige el mínimo según la orientación.
- **`computePortraitLayout(width, height)`.** Función pura en `src/ui/layout.ts` que devuelve el mismo `BoardLayout` que `computeLayout`, así que `Board.ts`, `Zone`, `DonArea`, `LifeArea` y el resto de las piezas dibujan con el layout que reciban. De arriba abajo:
  1. **Barra superior:** badge y reloj del rival, y a la derecha los botones de la cabecera (salir, ajustes, sonido) en una fila compacta.
  2. **Campo del rival:** su Líder, Stage, Life, Deck, Trash, DON!! y fila de Characters, rotados 180° como hoy.
  3. **Banner contextual:** una línea de instrucción y el botón de fase (Terminar turno, Pasar, etc.) en la misma franja.
  4. **Campo propio:** misma estructura que el del rival.
  5. **Mano:** abanico en la parte baja, con las cartas visibles a tamaño legible.
  6. **Barra inferior:** badge y reloj propios.
- **Panel lateral como cajón.** El `SidePanel` no cabe al costado. En vertical se reemplaza por un cajón que sube desde abajo, con el log, el panel de aprendizaje, Reiniciar, Conceder y Reportar. Un botón de la barra superior lo abre y un gesto de arrastre hacia abajo o un toque fuera lo cierra. Cerrado, solo ocupa la franja del banner. Reutiliza `splitLearn` para repartir log y aprendizaje dentro del cajón.
- **Zoom de carta con toque.** No hay hover en el teléfono. Un toque largo (400 ms) sobre una carta abre `CardZoom` y un toque fuera lo cierra. El toque corto conserva su acción actual (jugar, atacar, elegir objetivo).
- **Mano táctil.** `FanView` usa el área de hit ampliada del bugfix de hover (commit `2791ab9`) y un toque selecciona la carta, sin depender de `pointerover`. El menú de acciones de la mano (`HandActionDialog`) se muestra anclado a la carta, dentro del lienzo.
- **Diálogos y popovers.** `PromptDialog`, `StartRollDialog`, `HandActionDialog` y `Popover` (SPEC 17) calculan su tamaño y posición desde el ancho lógico, no desde constantes de escritorio, y nunca salen del lienzo. Botones y zonas de toque de 44 px lógicos como mínimo.
- **Texto mínimo legible.** Ningún texto baja de 11 px lógicos. Lo que no entre se abrevia o pasa al cajón; no se recorta.
- **Cambio de orientación en vivo.** Al girar el teléfono, `Board` recalcula el layout y conserva el estado de la partida, el log y el cajón abierto o cerrado. No reinicia la escena.
- **Lobby y GameOver.** Se acomodan al ancho vertical: una columna, mazos apilados y botones a ancho completo. Mismo contenido que hoy.
- **Sin cambios en motor ni IA.**

## Qué **no** entra en esta spec

- Soporte multitáctil (pellizcar para zoom, dos dedos).
- Vibración háptica y Wake Lock para que la pantalla no se apague.
- PWA, instalación en pantalla de inicio y modo offline.
- Teléfonos chicos por debajo de 360 de ancho; no se garantiza el layout.
- Vista de tablet optimizada: se queda con el layout horizontal escalado.
- Rediseño visual del tablero ni cambios de paleta.
- Arrastrar y soltar como gesto principal en el teléfono. Se mantiene el toque (ver Decisiones).

## Decisiones abiertas

| # | Pregunta | Recomendación |
| - | -------- | ------------- |
| 1 | Tamaño de las cartas del campo. A 390 de ancho entran 5 Characters de unos 52 px de ancho. ¿Se aceptan chicas con zoom por toque largo, o la fila de Characters se parte en dos? | Chicas con zoom: una sola fila conserva la lectura del tablero. |
| 2 | ¿Fijar la orientación horizontal como alternativa, con un botón para elegir? | No. El layout se elige solo por orientación. |
| 3 | Modo DON!! en el teléfono: ¿tocar el DON!! y luego la carta, o arrastrar? | Tocar y luego la carta, el mismo gesto en toda la UI. |
| 4 | ¿El cajón arranca abierto o cerrado en la primera partida? | Cerrado, con el log accesible desde el botón de la barra superior. |

## Archivos

| Archivo | Cambio |
| ------- | ------ |
| `src/ui/viewport.ts` | `orientation`, `MIN_SIZE_PORTRAIT` y mínimo por orientación en `fitScale` y `logicalSize`; se elimina `needsRotation`. |
| `src/ui/theme.ts` | `MIN_SIZE_PORTRAIT`, tamaño de toque mínimo y texto mínimo. |
| `src/ui/layout.ts` | `computePortraitLayout`; campo nuevo opcional `drawer` en `BoardLayout`. |
| `src/ui/Drawer.ts` | Nuevo: cajón inferior con apertura, cierre y arrastre. |
| `src/ui/SidePanel.ts` | Contenido reutilizable dentro del cajón. |
| `src/ui/CardSprite.ts`, `FanView.ts`, `CardZoom.ts` | Toque largo para zoom; selección sin hover. |
| `src/ui/HandActionDialog.ts`, `PromptDialog.ts`, `StartRollDialog.ts`, `Popover.ts` | Posición y tamaño desde el ancho lógico. |
| `src/scenes/Board.ts` | Elegir layout por orientación, cajón y recálculo al girar. |
| `src/scenes/Lobby.ts`, `GameOver.ts` | Variante de una columna. |
| `src/main.ts`, `index.html` | Quitar el aviso de rotación y `needsRotation`. |
| `tests/ui/viewport.test.ts` | Orientación, mínimos y escala en vertical. |
| `tests/ui/layout.test.ts` | Ninguna zona se superpone ni sale del lienzo en 390x700, 393x852 y 430x932. |

## Criterios de aceptación

- En 393x852 el juego carga y se juega una partida completa, sin scroll y sin aviso de rotación.
- Ninguna zona del layout vertical se superpone con otra ni sale del lienzo, en 390x700, 393x852 y 430x932 (test sobre `allRects`).
- Todo elemento tocable mide 44 px lógicos o más.
- Un toque largo sobre cualquier carta abre el zoom y un toque fuera lo cierra.
- Se puede jugar una carta, dar DON!!, atacar, bloquear y terminar el turno solo con toques.
- El cajón abre y cierra sin perder el log ni el estado de aprendizaje.
- Girar el teléfono a mitad de partida cambia de layout sin reiniciar la partida.
- En tablet vertical (768x1024) y en escritorio no cambia nada respecto del layout actual.
- `npm test` y `tsc` pasan.

## Riesgos conocidos

| Riesgo | Mitigación |
| ------ | ---------- |
| `computeLayout` y `SideLayout` asumen un tablero ancho con un panel lateral. | `computePortraitLayout` devuelve el mismo `BoardLayout`; el campo `drawer` es opcional y el resto de las piezas no cambia. |
| `Board.ts` (959 líneas) ya concentra mucha lógica y el layout se recalcula en `fitCamera`. | Elegir el layout en un único punto (`fitCamera`) y mantener el estado de la partida fuera del layout. |
| Las cartas del campo quedan chicas (unos 52 px de ancho). | Zoom con toque largo y área de hit ampliada; decisión 1. |
| `pointerover` está en `Button`, `FanView`, `KeywordTooltip` y otros. En táctil no dispara igual. | Cada pieza con hover debe tener su equivalente por toque; revisar las 8 apariciones de `pointerover` y `setDraggable`. |
| La SPEC 18, 19 y 20 también tocan `Board.ts` y `SidePanel.ts`. | Esta spec va después de la 17 y, de preferencia, después de la 19 (barra de acciones), porque la barra de acciones cambia el banner del layout vertical. |
| Los popovers y diálogos nuevos de las SPEC 18 a 21 se escriben sin pensar en vertical. | Regla desde ahora: toda pieza nueva calcula posición y tamaño desde el ancho lógico. |

## Orden sugerido

1. `viewport.ts`: `orientation`, mínimos por orientación y tests.
2. `computePortraitLayout` con su test de no superposición.
3. `Board.ts`: elegir layout por orientación y recalcular al girar.
4. Cajón (`Drawer`) y traslado del `SidePanel`.
5. Táctil: toque largo, mano y zoom.
6. Diálogos y popovers anclados al ancho lógico.
7. Lobby y GameOver en una columna.
8. Quitar el aviso de rotación.

## Worktrees

Los pasos 1 y 2 son la base y van primero, en una sola rama. Después se pueden repartir en paralelo: (a) cajón y `SidePanel` (pasos 3 y 4), (b) táctil y mano (paso 5) y (c) Lobby y GameOver (paso 7). El paso 6 va al final, porque toca los mismos diálogos que reescriben las SPEC 18 y 19. Conflictos probables: `Board.ts` entre (a) y (b), y `layout.ts` si (c) agrega rects.
