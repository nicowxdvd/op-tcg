# SPEC 02 — Motor base (tipos, setup, mulligan, fases, DON!!, Character, límite 5)

> **Estado:** Borrador
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-02
> **Objetivo:** Tener en `src/engine/` un motor TypeScript puro y testeado que crea una partida, resuelve el mulligan y avanza los turnos con DON!!, permitiendo jugar Characters sin efectos con el límite de 5.

---

## Por qué existe esta spec

Es la fase 2 de `docs/plan.md`. Fija los tipos compartidos (`engine/types.ts`), que son la mayor fuente de conflictos entre worktrees. Por eso va sola y antes de batalla (SPEC 03), efectos (SPEC 04), datos (SPEC 05) y UI (SPEC 06).

---

## Alcance

**Dentro:**

- Tipos: `CardDef`, `CardInstance`, `PlayerState`, `GameState`, `Action`, `GameEvent`.
- RNG con seed (`rng.ts`) para barajar y decidir quién empieza, reproducible en tests.
- `createGame(config)`: valida mazos, baraja, decide primer jugador, roba 5, deja el estado en fase `mulligan`.
- Mulligan: una decisión por jugador (conservar o rehacer), luego se colocan las cartas de Life y empieza el turno 1.
- Máquina de fases: Refresh → Draw → DON!! → Main → End.
- Reglas de DON!! del turno: primer jugador +1 en su turno 1, el resto +2, tope de 10 DON!! en juego.
- Acciones: `Mulligan`, `PlayCharacter`, `AttachDon`, `PassPhase` (termina el Main y el turno).
- Límite de 5 Characters, con reemplazo elegido por el jugador al jugar el sexto.
- Pérdida por robar con el mazo vacío.
- `apply(state, action)` puro e inmutable, que devuelve `{ state, events }`.
- `getLegalActions(state, playerId)`.
- `getPower(state, instanceId)` con +1000 por DON!! adjunto en el turno del dueño.
- Tests Vitest en `tests/engine/`.

**Fuera de alcance (para otras specs):**

- Ataque, Blocker, Counter, daño, Life perdido y victoria por Life 0 (SPEC 03).
- Events, Stages, keywords, efectos y `[Trigger]` (SPEC 04). Las cartas de este spec no tienen efectos.
- Carga de JSON de cartas e imágenes (SPEC 05). Los tests usan fixtures definidos en `tests/engine/fixtures.ts`.
- Cualquier código de Phaser o UI (SPEC 06 en adelante).
- IA (SPEC 08).

---

## Modelo de datos

Archivos que se crean:

```
src/engine/types.ts
src/engine/rng.ts
src/engine/state.ts
src/engine/phases.ts
src/engine/actions.ts
src/engine/index.ts
tests/engine/fixtures.ts
tests/engine/rng.test.ts
tests/engine/setup.test.ts
tests/engine/phases.test.ts
tests/engine/play.test.ts
tests/engine/don.test.ts
```

`src/engine/.gitkeep` se elimina porque la carpeta ya tiene archivos.

Tipos principales (resumen, la forma exacta se define al implementar):

```ts
type PlayerId = 'p1' | 'p2'
type Phase = 'mulligan' | 'refresh' | 'draw' | 'don' | 'main' | 'end' | 'gameOver'

interface CardDef {
  id: string
  name: string
  type: 'Leader' | 'Character' | 'Event' | 'Stage'
  cost: number
  power: number
  counter: number
  life: number
  colors: string[]
}

interface CardInstance { instanceId: string; defId: string; owner: PlayerId }

interface PlayerState {
  leader: CardInstance
  deck: CardInstance[]
  hand: CardInstance[]
  life: CardInstance[]
  trash: CardInstance[]
  characters: { card: CardInstance; rested: boolean; attachedDon: number; playedTurn: number }[]
  leaderRested: boolean
  leaderAttachedDon: number
  donDeck: number
  donActive: number
  donRested: number
  mulliganDone: boolean
}

interface GameState {
  seed: number
  defs: Record<string, CardDef>
  players: Record<PlayerId, PlayerState>
  first: PlayerId
  active: PlayerId
  turn: number
  phase: Phase
  winner: PlayerId | null
}
```

Acciones:

```ts
type Action =
  | { type: 'Mulligan'; player: PlayerId; redraw: boolean }
  | { type: 'PlayCharacter'; player: PlayerId; instanceId: string; replaceId?: string }
  | { type: 'AttachDon'; player: PlayerId; target: 'leader' | string }
  | { type: 'PassPhase'; player: PlayerId }
```

Reglas fijadas:

- `turn` cuenta turnos globales desde 1. El turno 1 es del primer jugador y el turno 2 del segundo.
- Mazo válido: 1 Leader, 50 cartas, máximo 4 copias por `id`, colores contenidos en los del Leader. Si no cumple, `createGame` lanza un error con el motivo.
- DON!! total por jugador: 10. Todos empiezan en `donDeck`.
- Mulligan: `redraw: true` devuelve la mano al mazo, baraja y roba 5. Cada jugador decide una sola vez, primero el primer jugador.
- Life: tras el mulligan de ambos, cada jugador pone `leader.life` cartas del tope del mazo en Life.
- Refresh: todo `donRested` y el DON!! adjunto vuelven a `donActive`, y los Characters y el Leader pasan a activos.
- Draw: roba 1, salvo el primer jugador en el turno 1. Con mazo vacío, el jugador pierde y `phase` pasa a `gameOver`.
- DON!!: mueve de `donDeck` a `donActive` 2 cartas (1 para el primer jugador en el turno 1), sin pasar de lo que haya en `donDeck`.
- Main: el jugador activo puede jugar Characters y adjuntar DON!!. `PassPhase` pasa a End y luego al Refresh del rival con `turn + 1`. Refresh, Draw, DON!! y End se resuelven automáticamente dentro de `apply`.
- PlayCharacter: exige fase `main`, jugador activo, carta de tipo Character en la mano y `donActive >= cost`. Descansa `cost` DON!! activos (`donActive -= cost`, `donRested += cost`).
- Límite 5: con 5 Characters en juego, `replaceId` es obligatorio y debe apuntar a uno de ellos. Ese Character va al trash antes de entrar el nuevo.
- AttachDon: mueve 1 DON!! de `donActive` al Leader o a un Character en juego. Cada DON!! adjunto da +1000 de power solo durante el turno de su dueño.
- Toda acción ilegal lanza un error. `apply` nunca muta el estado recibido.

---

## Plan de implementación

1. Crear `types.ts` con los tipos de arriba y `rng.ts` con un RNG determinista por seed (`next`, `shuffle`). Verificar: `rng.test.ts` comprueba que la misma seed da el mismo orden y que `shuffle` conserva los elementos.
2. Crear `tests/engine/fixtures.ts` con defs de prueba (un Leader de 5 Life, Characters de distinto cost) y un helper que arma un mazo válido de 50.
3. Crear `state.ts` con `createGame` y la validación de mazos. Verificar: `setup.test.ts` cubre mazo inválido, mano de 5, primer jugador reproducible por seed y fase inicial `mulligan`.
4. Agregar el mulligan a `actions.ts` y la colocación de Life. Verificar: `setup.test.ts` cubre conservar, rehacer, orden de decisión y Life igual a `leader.life` al terminar.
5. Crear `phases.ts` con la secuencia Refresh, Draw, DON!!, Main, End y las reglas del turno 1. Verificar: `phases.test.ts` cubre que el primer jugador no roba en el turno 1, DON!! +1 y luego +2, refresh de DON!! y pérdida por mazo vacío.
6. Agregar `PlayCharacter` y `AttachDon` con el límite de 5. Verificar: `play.test.ts` y `don.test.ts` cubren cost insuficiente, jugar fuera de turno o de fase, reemplazo obligatorio con 5 y power con DON!! adjunto.
7. Agregar `getLegalActions` y `getPower`, y exportar todo desde `index.ts`. Verificar: cada acción devuelta por `getLegalActions` se aplica sin error y una acción fuera de la lista lanza error.
8. Verificar `npm run typecheck`, `npm test` y que ningún archivo de `src/engine/` importa `phaser`. Commitear cada paso en `feature/motor-base`, con mensajes en español.

---

## Criterios de aceptación

- [ ] `createGame` con un mazo inválido (49 cartas, 5 copias o color ajeno) lanza error.
- [ ] Con la misma seed, `createGame` produce el mismo primer jugador y las mismas manos.
- [ ] Tras el mulligan de ambos jugadores, cada uno tiene 5 cartas en mano y `leader.life` cartas en Life.
- [ ] En el turno 1 el primer jugador no roba y recibe 1 DON!!. En el turno 2 el segundo jugador roba 1 y recibe 2 DON!!.
- [ ] Del turno 3 en adelante cada jugador roba 1 y recibe 2 DON!! en su turno, sin superar 10 en total.
- [ ] En Refresh, el DON!! descansado y el adjunto vuelven a `donActive`.
- [ ] Robar con el mazo vacío deja `winner` en el rival y `phase` en `gameOver`.
- [ ] `PlayCharacter` descansa exactamente `cost` DON!! y mueve la carta de la mano a `characters`.
- [ ] `PlayCharacter` falla con DON!! insuficiente, fuera del Main o fuera del turno del jugador.
- [ ] Con 5 Characters, jugar el sexto sin `replaceId` falla. Con `replaceId` válido, el reemplazado va al trash y quedan 5.
- [ ] `getPower` suma +1000 por DON!! adjunto en el turno del dueño y 0 de bono en el turno rival.
- [ ] `apply` no muta el estado de entrada (verificado con una copia profunda en los tests).
- [ ] `npm run typecheck` y `npm test` terminan con código 0.
- [ ] Ningún archivo bajo `src/engine/` importa `phaser`.

---

## Decisiones

- **Sí:** `apply` puro e inmutable con `{ state, events }`, como define `docs/plan.md`. La UI y la IA solo envían acciones.
- **Sí:** `getLegalActions` desde ahora. La UI resalta jugadas y la IA elige de ahí.
- **Sí:** RNG propio con seed. Hace los tests y los replays reproducibles.
- **Sí:** reemplazo por `replaceId` dentro de `PlayCharacter` en lugar de un estado `awaitingChoice`. Con cartas sin efectos es la única decisión posible. `awaitingChoice` entra en SPEC 04 con los efectos.
- **Sí:** Refresh, Draw, DON!! y End automáticos. No hay decisiones del jugador en esas fases. Solo el Main y el mulligan esperan acciones.
- **Sí:** pérdida por mazo vacío en esta spec. Es parte del Draw y no depende de la batalla.
- **No:** victoria por Life 0 acá. Depende del daño (SPEC 03).
- **Sí:** el tipo `CardDef` incluye `Event` y `Stage`, pero el motor solo juega `Character`. Evita cambiar el tipo en SPEC 04.
- **Sí:** tests con fixtures propios. No dependen de la SPEC 05 ni de la red.
- **Sí:** rama `feature/motor-base` desde `develop`, como pide Gitflow.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Los tipos de `types.ts` quedan cortos para batalla y efectos y obligan a cambios tras abrir worktrees | Incluir ya en `PlayerState` los campos de reposo, DON!! adjunto y `playedTurn`. Mergear esta spec a `develop` antes de abrir los worktrees A, B y C del plan. |
| Ambigüedad en las reglas de DON!! y mulligan | Contrastar cada regla con las Comprehensive Rules (`docs/plan.md`, sección Fuentes) al escribir el test correspondiente. |
| Estado inmutable costoso o engorroso | Usar copia estructural simple (spread) por acción. Optimizar solo si un test lo pide. |

---

## Lo que **no** entra en esta spec

- Ataques, Blocker, Counter, daño y Life perdido.
- Efectos, keywords, Events y Stages.
- JSON de cartas, imágenes y mazos reales.
- Phaser, UI y modo aprendizaje.
- IA.
- Multijugador.

Cada uno de esos puntos, si se hace, va en su propia spec.
