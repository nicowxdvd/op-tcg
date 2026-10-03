# SPEC 06 — UI Phaser (tablero, mano, drag-and-drop, zoom de carta)

> **Estado:** Borrador
> **Depende de:** SPEC 02
> **Fecha:** 2026-10-02
> **Objetivo:** Tener en el navegador un tablero de Phaser que muestra una partida del motor, resalta las jugadas legales y permite jugar con mouse (arrastrar, hacer clic, hacer zoom a las cartas), con ambos jugadores controlados por una persona.

---

## Por qué existe esta spec

Es la fase 6 de `docs/plan.md`. El motor ya existe como TypeScript puro (SPEC 02 en adelante). La UI solo envía acciones y anima eventos. Depende de los tipos de SPEC 02, así que corre en un worktree paralelo (B) al de batalla y efectos. Las acciones de batalla y efectos se conectan cuando SPEC 03 y 04 estén mergeadas.

---

## Alcance

**Dentro:**

- Escena `Board` con las zonas de ambos jugadores: Leader, Characters (5), Stage, Life, mazo, trash, mano, área de costo (DON!!).
- `CardSprite`: carta con imagen oficial si existe en `public/cards/` y con una carta dibujada (nombre, cost, power) si no existe.
- `GameController`: mantiene el `GameState`, envía acciones a `apply`, expone `getLegalActions` y emite los `GameEvent` a la escena.
- Resaltado de lo que se puede jugar según `getLegalActions` del jugador activo.
- Interacciones: arrastrar una carta de la mano a la zona de Characters, arrastrar DON!! sobre un Leader o Character, clic para pasar de fase, clic en cartas del mulligan.
- Zoom: pasar el mouse (hover) o clic derecho sobre cualquier carta visible la muestra grande con su texto.
- Diálogo `PromptDialog` para el mulligan y para el reemplazo con 5 Characters.
- Animaciones simples (tween) de robar, jugar, descansar y pasar DON!!.
- Mano del rival oculta (dorso de carta). Modo hotseat: ambos jugadores los controla la misma persona y se alterna la vista según el jugador activo.
- Partida de desarrollo `src/dev/mockGame.ts` que usa el motor con un mazo generado, sin depender de SPEC 05.
- Tests Vitest de las funciones puras de layout y de `GameController`.

**Fuera de alcance (para otras specs):**

- Ataques, Block, Counter y daño en la UI (se conectan al integrar SPEC 03, con su propio paso en esta spec, ver plan).
- Prompts de efectos y de `[Trigger]` (se conectan al integrar SPEC 04).
- Panel de aprendizaje, log y tooltips (SPEC 07).
- IA (SPEC 08).
- Menú, selección de mazo, pantalla final y sonido (SPEC 09).

---

## Modelo de datos

Archivos que se crean o cambian (la estructura sigue la de SPEC 01: `src/scenes/` y `src/ui/` en vez de `src/game/`):

```
src/scenes/Board.ts
src/main.ts                      (cambia: registra la escena Board)
src/ui/CardSprite.ts
src/ui/Zone.ts
src/ui/DonArea.ts
src/ui/LifeArea.ts
src/ui/HandView.ts
src/ui/PromptDialog.ts
src/ui/CardZoom.ts
src/ui/layout.ts                 (funciones puras de posiciones)
src/ui/GameController.ts
src/ui/textures.ts               (carga de imágenes con carta de reemplazo)
src/dev/mockGame.ts
tests/ui/layout.test.ts
tests/ui/gameController.test.ts
```

Contrato del `GameController` (resumen, la forma exacta se define al implementar):

```ts
interface GameController {
  getState(): GameState
  getLegal(player: PlayerId): Action[]
  dispatch(action: Action): void
  on(handler: (events: GameEvent[]) => void): () => void
}
```

Reglas fijadas:

- La UI no calcula reglas: cada resaltado y cada interacción sale de `getLegalActions`. Si una acción no está en la lista, la interacción no se ofrece.
- Un arrastre solto en una zona inválida devuelve la carta a su lugar sin enviar acciones.
- Si `dispatch` lanza un error del motor, la UI lo muestra como mensaje breve y no cambia el estado.
- La escena nunca importa el estado como mutable: lee de `getState()` y se redibuja con los eventos.
- Las imágenes se cargan desde `public/cards/<id>.jpg`. Si la imagen no existe, `textures.ts` genera la carta de reemplazo, así la UI funciona antes de SPEC 05.
- El motor (`src/engine/`) sigue sin importar Phaser. Solo `src/scenes/` y `src/ui/` importan Phaser.
- `layout.ts` es TypeScript puro, sin Phaser, para poder testearlo.

---

## Plan de implementación

1. Crear `GameController` y `mockGame.ts`. Verificar: `gameController.test.ts` cubre que `dispatch` actualiza el estado, que un error del motor no lo cambia y que los eventos llegan a los suscriptores.
2. Crear `layout.ts` con las posiciones de cada zona para un lienzo de tamaño dado. Verificar: `layout.test.ts` cubre que las zonas no se superponen y que escalan con el tamaño del lienzo.
3. Crear `textures.ts` y `CardSprite` con imagen o carta de reemplazo. Verificar a mano en el navegador: se ven cartas con y sin imagen.
4. Crear `Zone`, `LifeArea`, `DonArea` y `HandView`, y componer la escena `Board` con el estado de `mockGame`. Verificar a mano: se ven ambos lados del tablero con mano propia visible y mano rival oculta.
5. Agregar zoom con hover y clic derecho (`CardZoom`). Verificar a mano: el zoom muestra nombre, cost, power y texto.
6. Agregar el flujo de mulligan con `PromptDialog`. Verificar a mano: se puede conservar o rehacer y el tablero pasa a mostrar Life.
7. Agregar resaltado de jugadas legales, arrastrar para jugar Character y arrastrar DON!!, y botón de pasar fase. Verificar a mano: se puede jugar un turno completo y pasar al rival, y una jugada ilegal no se ofrece.
8. Agregar el reemplazo con 5 Characters mediante `PromptDialog`. Verificar a mano: con 5 Characters en juego, jugar el sexto pide elegir cuál reemplazar.
9. Agregar animaciones simples de los eventos de robar, jugar, descansar y DON!!. Verificar a mano: cada evento anima y el estado final coincide con `getState()`.
10. Cuando SPEC 03 esté mergeada: agregar arrastrar un atacante a un objetivo, y los prompts de Block y Counter. Cuando SPEC 04 esté mergeada: agregar el prompt de `awaitingChoice`, la decisión de `[Trigger]` y la jugada de Events y Stages. Verificar a mano una partida completa hotseat.
11. Verificar `npm run typecheck`, `npm test`, `npm run build` y revisar a mano la consola del navegador sin errores, con capturas de pantalla del tablero tomadas con Chrome.
12. Commitear cada paso en `feature/ui-tablero`, con mensajes en español.

---

## Criterios de aceptación

- [ ] `npm run dev` muestra el tablero con ambos lados, la mano propia visible y la mano rival oculta.
- [ ] Con el mock del motor, el mulligan se resuelve desde la UI y las cartas de Life aparecen.
- [ ] Las cartas jugables de la mano y los DON!! asignables se resaltan según `getLegalActions`.
- [ ] Arrastrar un Character de la mano a la zona de Characters lo juega y descansa el DON!! correspondiente.
- [ ] Arrastrar una carta a una zona inválida la devuelve a su lugar sin cambiar el estado.
- [ ] Con 5 Characters, jugar el sexto pide elegir cuál reemplazar.
- [ ] Hover o clic derecho sobre una carta visible muestra el zoom con su texto.
- [ ] Con imágenes en `public/cards/` se ven las oficiales. Sin ellas, se ven cartas de reemplazo y no hay errores.
- [ ] El botón de pasar fase avanza el turno y la vista cambia al jugador activo.
- [ ] Tras integrar SPEC 03, un ataque se declara arrastrando al objetivo y el defensor resuelve Block y Counter desde la UI.
- [ ] La consola del navegador no muestra errores durante una partida de prueba.
- [ ] `npm run typecheck`, `npm test` y `npm run build` terminan con código 0.
- [ ] Ningún archivo bajo `src/engine/` importa `phaser`.

---

## Decisiones

- **Sí:** la UI solo envía acciones y anima eventos, como define `docs/plan.md`. Todas las reglas viven en el motor.
- **Sí:** `GameController` como único punto de contacto entre la UI y el motor. Es lo que se reemplaza después por un cliente de red o por la IA.
- **Sí:** modo hotseat con vista alternada. Es lo mínimo para probar la UI antes de la IA (SPEC 08).
- **Sí:** carta de reemplazo dibujada cuando no hay imagen. Desacopla esta spec de SPEC 05 y permite el worktree paralelo.
- **Sí:** estructura `src/scenes/` y `src/ui/` de SPEC 01, no `src/game/` del plan, para no mover el `Boot.ts` ya creado.
- **Sí:** `layout.ts` puro. Es la parte de la UI que se puede testear con Vitest. El resto se verifica a mano en el navegador.
- **No:** panel de aprendizaje ni log en esta spec. Es la SPEC 07.
- **Sí:** los pasos de batalla y efectos (paso 10) se hacen al integrar. La spec queda "Implementada" recién entonces, y hasta ahí el criterio de ataque queda pendiente.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| La API de Phaser 4 difiere de Phaser 3 en drag-and-drop o tweens | Probar un arrastre mínimo antes del paso 7. Si la API difiere, ajustar el plan en la propia spec y avisar a Nico. |
| Los `GameEvent` de SPEC 02 no alcanzan para animar | Pedir los eventos que falten en el paso 9 y cambiar `types.ts` solo agregando campos o variantes, para no romper el worktree del motor. |
| Conflictos con el worktree de batalla y efectos por `types.ts` | No editar `src/engine/`. Si hace falta un tipo, abrir el cambio en la rama del motor. |
| La UI no se puede testear de forma automática | Concentrar la lógica en `GameController` y `layout.ts`, que sí tienen tests. El resto se verifica con Chrome y capturas. |
| Tamaño de pantalla y escalado | `layout.ts` recibe el tamaño del lienzo. Probar a 1280x720 y 1920x1080. |

---

## Lo que **no** entra en esta spec

- Panel de aprendizaje, log de partida y tooltips de keywords.
- IA y modo contra la CPU.
- Menú, selección de mazo, pantalla final y sonido.
- Multijugador.

Cada uno de esos puntos, si se hace, va en su propia spec.
