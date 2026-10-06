# SPEC 12 — Mano grande, selección con contorno morado y modal de acción sobre la carta

> **Estado:** Implementado
> **Depende de:** SPEC 06, SPEC 11
> **Fecha:** 2026-10-06
> **Objetivo:** Agrandar la mano local para que se superponga levemente al tablero, marcar la carta bajo el mouse con un contorno morado fosforescente y, al hacer click en una carta con acción legal, mostrar un modal pequeño sobre la mano, con una colita hacia la carta, para jugarla o usarla como counter.

---

## Por qué existe esta spec

SPEC 11 dejó la mano en la columna izquierda, con cartas chicas, y el modal de prompts centrado y con velo. Para jugar una carta hoy hay que arrastrarla. Esta spec acerca la acción a la carta: se selecciona, aparece un modal pequeño pegado a ella y se confirma con un click.

La referencia visual es `~/Desktop/op.png`. De ahí salen la posición de la mano, el abanico superpuesto al panel de mesa y el estilo del modal (título `¿Jugar …?`, botón ✓ dorado ancho, botón ✕ gris, ícono `i` y colita).

---

## Alcance

**Dentro:**

- **Mano más grande y superpuesta.**
  - La mano local sigue abajo a la izquierda, en abanico. `handCard` en `src/ui/layout.ts` crece (de `panelH * 0.30` de alto a `panelH * 0.42`) y el rectángulo `hand` puede entrar en el panel de mesa propio hasta un ancho de carta (`handCard.w`) por la derecha.
  - La superposición no cubre Life, Leader, Stage, Deck, Character Area ni Cost Area. Puede cubrir el margen del panel y parte de `DON!! DECK`.
  - El contador de cartas y el botón de orden suben junto con el abanico.
- **Contorno morado fosforescente.**
  - Nueva constante `COLORS.neon` (`0xb026ff`) en `src/ui/theme.ts`.
  - La carta de la mano bajo el mouse y la carta seleccionada se dibujan con contorno `COLORS.neon` de 4 px y un resplandor suave.
  - Aplica a toda carta de la mano, tenga o no acción legal.
  - El contorno azul de "jugable" (`PLAYABLE`) no cambia: indica qué se puede jugar, mientras que el morado indica dónde estoy posicionado.
- **Selección por click.** Click en una carta de la mano con acción legal la deja seleccionada (contorno morado fijo y elevada) y abre el modal de acción. Click en una carta sin acción legal no abre modal.
- **Modal de acción de mano.**
  - Pequeño, ubicado arriba de la carta seleccionada, con una colita (triángulo) que apunta a ella. Si el modal se desplaza por el borde de pantalla, la colita sigue apuntando a la carta.
  - Título: `¿Jugar <nombre>?` para jugar y `¿Counter con <nombre>?` para counter. El nombre largo se corta con `…`.
  - Botón ✓ dorado y ancho que ejecuta la acción. Botón ✕ gris oscuro cuadrado que cierra.
  - Ícono `i` a la derecha del título. Abre el zoom de la carta (`CardZoom`, fijado).
  - Sin velo detrás.
  - Se cierra con ✕, `Esc`, click fuera del modal o al ejecutar la acción. Al cerrarse se quita la selección.
- **Qué acción ofrece.** Se calcula desde `legal`:
  - Turno propio: `PlayCharacter`, `PlayEvent`, `PlayStage` de esa carta, mostrados como `Jugar`.
  - Paso `counter` de un ataque rival: `UseCounter` y `UseCounterEvent` de esa carta, mostrados como `Counter`. El diálogo grande que listaba los counters se elimina: en su lugar aparece un mensaje pequeño y sin velo, `Fase counter: ¿usar counter?`, con `Sí` y `No`. `No` ejecuta `PassCounter`. `Sí` habilita elegir la carta en la mano con el modal de acción, y deja un botón `No usar counter` (`PassCounter`). Si no hay counters legales, el mensaje solo ofrece continuar. El mensaje se repite tras cada counter usado.
  - Si la carta tiene más de una acción legal (por ejemplo `PlayCharacter` con distintos `replaceId`), el modal muestra un botón por acción con el texto de `describeAction` en lugar de ✓, más ✕.
- **Convivencia con lo existente.** El arrastre de cartas jugables sigue funcionando. El diálogo centrado de `PromptDialog` (mulligan, elecciones pendientes, bloqueo, trigger) no cambia.

**Fuera de alcance (para otras specs):**

- Cambios al diálogo centrado `PromptDialog` y a `buildPrompt` fuera del paso `counter`.
- Mostrar acciones ilegales o botones deshabilitados.
- Modal para cartas fuera de la mano (Characters, Leader, efectos `ActivateEffect`).
- Cambios al motor, a las acciones o a la IA.
- Abanico de la mano del rival.
- Soporte táctil.
- Sonido y animaciones nuevas más allá de la elevación y el contorno.

---

## Modelo de datos

No hay estado nuevo en el motor. Se agregan estos tipos de UI:

```ts
export interface HandAction {
  kind: 'play' | 'counter'
  action: Action
  label: string
}

export interface HandSelection {
  instanceId: string
  actions: HandAction[]
}
```

- `handActionsFor(state, legal, instanceId): HandAction[]` vive en `src/ui/handActions.ts`. Es una función pura que filtra `legal`.
- `Board` guarda `private selection: HandSelection | null`. Se limpia con cualquier actualización de estado, al cerrar el modal y al cambiar de carta.
- Constante nueva: `COLORS.neon = 0xb026ff` en `src/ui/theme.ts`.

---

## Plan de implementación

1. **Tema e íconos.** Agregar `COLORS.neon` en `src/ui/theme.ts` y los íconos `check`, `close` e `info` en `src/ui/icons.ts`. Verificación: la app compila y se ve igual.
2. **Acciones de mano.** Crear `src/ui/handActions.ts` con `handActionsFor` y `src/ui/handActions.test.ts`: jugar en turno propio, counter en paso `counter`, carta sin acción, carta con varios `replaceId`.
3. **Layout de la mano.** En `src/ui/layout.ts`, agrandar `handCard` y extender el rectángulo `hand` sobre el panel propio. Ampliar `src/ui/layout.test.ts`: la mano cae dentro del lienzo y no cubre Life, Leader, Stage, Deck, Character Area ni Cost Area a 1024x600, 1280x720, 1920x1080 y 2560x1440. Verificación: la mano se ve más grande y superpuesta.
4. **Contorno morado.** Agregar `setFocus(on)` en `src/ui/CardSprite.ts`, con un marcador independiente de `setHighlight`. Llamarlo desde los eventos `pointerover` y `pointerout` de `FanView`. Verificación: pasar el mouse por cualquier carta de la mano la marca en morado.
5. **Modal.** Crear `src/ui/HandActionDialog.ts` con título, ✓, ✕, ícono `i` y colita, posicionado sobre la carta. Se prueba aislado desde `Board` con una carta fija.
6. **Selección en `Board`.** En `drawHand` de `src/scenes/Board.ts`, el click en una carta con `handActionsFor` no vacío fija `selection`, mantiene el contorno morado y abre el modal. ✓ llama a `send(action)`. Verificación: jugar una carta con click en partida mock.
7. **Cierre y detalles.** Cerrar con ✕, `Esc` y click fuera. Cambiar de carta mueve el modal. `i` abre `CardZoom` fijado. Verificar que arrastrar sigue jugando y que un arrastre no abre el modal.

---

## Criterios de aceptación

- [x] A 1280x720 la altura de `handCard` es al menos 1,3 veces la de SPEC 11.
- [x] El rectángulo de la mano se superpone al panel de mesa propio y no cubre Life, Leader, Stage, Deck, Character Area ni Cost Area en las cuatro resoluciones de `layout.test.ts`.
- [x] Pasar el mouse sobre cualquier carta de la mano dibuja un contorno `COLORS.neon` y lo quita al salir.
- [x] Click en una carta jugable en mi turno abre el modal con el título `¿Jugar <nombre>?`.
- [x] Click en ✓ ejecuta `PlayCharacter`, `PlayEvent` o `PlayStage` y la carta sale de la mano.
- [x] En el paso `counter` de un ataque rival, click en una carta con counter abre `¿Counter con <nombre>?` y ✓ ejecuta `UseCounter` o `UseCounterEvent`.
- [x] Click en una carta de la mano sin acción legal no abre modal.
- [x] El modal aparece arriba de la carta seleccionada, con la colita apuntando a ella, y queda dentro de la pantalla a 1024x600 y 2560x1440.
- [x] ✕, `Esc` y click fuera cierran el modal y quitan la selección.
- [x] Click en otra carta jugable mueve el modal a esa carta.
- [x] El ícono `i` abre el zoom de la carta.
- [x] Una carta con varias acciones legales muestra un botón por acción más ✕.
- [x] Arrastrar una carta jugable al tablero sigue jugándola y no abre el modal.
- [x] El diálogo centrado de mulligan, elección, bloqueo y trigger se ve igual que en SPEC 11.
- [x] `handActions.test.ts` y `layout.test.ts` pasan, y no hay errores en la consola del navegador.

---

## Decisiones

- **Sí:** la mano se queda abajo a la izquierda, más grande y superpuesta al panel, como en `op.png`. **No:** moverla a una franja inferior centrada, porque la maqueta de SPEC 11 y la referencia la ubican a la izquierda.
- **Sí:** modal con ✓ y ✕ y título `¿Jugar …?` o `¿Counter con …?`. **No:** botones con texto `Jugar` y `Counter`, porque la referencia usa íconos y un modal más pequeño.
- **Sí:** ícono `i` que abre `CardZoom`. Reutiliza un componente existente.
- **Sí:** mostrar solo acciones presentes en `legal`. **No:** mostrar acciones deshabilitadas. El motor ya separa jugar y counter por momento, así que no se pregunta cuál elegir.
- **Sí:** cartas sin acción legal solo tienen contorno morado al pasar el mouse, sin modal.
- **Sí:** el contorno azul de "jugable" se mantiene y el morado marca posición. Dos señales distintas evitan confundir "se puede jugar" con "estoy sobre esta carta".
- **Sí:** sin velo detrás del modal. El tablero sigue visible mientras decido.
- **Sí:** `PromptDialog` centrado queda igual, porque mulligan, elecciones y bloqueo no parten de una carta de la mano.
- **Sí:** varias acciones legales sobre la misma carta se listan una por botón. **No:** abrir un segundo diálogo.
- **Sí:** `COLORS.neon` nuevo en `theme.ts`. El dorado sigue reservado al turno activo y al botón principal (SPEC 11); el ✓ del modal usa el dorado como botón principal.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| El click y el arrastre de `setDraggable` chocan en la misma carta. | Abrir el modal solo en `pointerup` sin movimiento de arrastre. El paso 7 lo verifica. |
| La mano más grande tapa zonas clicables. | `layout.test.ts` comprueba que no hay solape con zonas interactivas en cuatro resoluciones. |
| El modal sale de pantalla en las cartas de los extremos del abanico. | Se limita su posición al lienzo y la colita conserva la posición de la carta. |
| La mano se redibuja tras cada estado y la selección se pierde. | Limpiar `selection` en cada actualización de estado es el comportamiento esperado, y el modal se cierra con él. |
| El hover pisa el área de hit de las cartas vecinas (ver bugfixes recientes de `FanView`). | No tocar `hitWidth` ni `fitHit`; el contorno se dibuja solo sobre el marcador de la carta. |

---

## Qué **no** entra en esta spec

- Cambios al diálogo centrado de prompts.
- Acciones ilegales o botones deshabilitados en el modal.
- Modal para Characters, Leader o efectos activables.
- Cambios al motor, a la IA o a las acciones.
- Mano del rival y soporte táctil.

Cada punto, si se hace, va en su propia spec.
