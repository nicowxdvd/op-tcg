# SPEC 03 — Batalla (ataque, Blocker, Counter, daño, Life, victoria)

> **Estado:** Borrador
> **Depende de:** SPEC 02
> **Fecha:** 2026-10-02
> **Objetivo:** Extender el motor de `src/engine/` para que un jugador pueda atacar y resolver la batalla completa (Block step, Counter step, daño), con pérdida de Life y victoria por golpear al Leader rival sin Life.

---

## Por qué existe esta spec

Es la fase 3 de `docs/plan.md`. El motor base (SPEC 02) solo juega Characters y avanza turnos. Sin batalla no hay partida. Esta spec agrega el estado de batalla y las acciones que la resuelven, siempre sobre cartas sin efectos. Los efectos y keywords van en SPEC 04.

---

## Alcance

**Dentro:**

- Estado de batalla en `GameState` (`battle`), con pasos `block` y `counter`.
- Acciones: `Attack`, `DeclareBlock`, `PassBlock`, `UseCounter`, `PassCounter`.
- Declaración de ataque: atacante activo (Leader o Character) y objetivo (Leader rival o Character rival descansado).
- Restricciones de ataque: nadie ataca en su primer turno, y un Character no ataca el turno en que entró.
- Block step: el defensor puede descansar un Character con keyword `Blocker` para redirigir el ataque.
- Counter step: el defensor puede trashear Characters de la mano con valor `counter` para sumar su valor al power del defendido durante esa batalla.
- Daño: el atacante gana si su power es mayor o igual al del defendido.
- Leader golpeado: la carta de arriba de Life va a la mano. Character golpeado: K.O., va al trash y su DON!! adjunto vuelve a `donRested`.
- Victoria: golpear al Leader rival con 0 Life deja `winner` y `phase` en `gameOver`.
- Extensión de `CardDef` con `keywords: Keyword[]`, donde en esta spec el único valor que el motor interpreta es `'Blocker'`.
- `getLegalActions` y `getPower` actualizados para la batalla.
- Tests Vitest en `tests/engine/`.

**Fuera de alcance (para otras specs):**

- `[Trigger]` al perder Life, Events `[Counter]`, Rush, Double Attack, Banish y `[When Attacking]` (SPEC 04). Esta spec deja los puntos de extensión pero no los implementa.
- Efectos de cualquier tipo.
- UI y animaciones (SPEC 06).
- IA (SPEC 08).

---

## Modelo de datos

Archivos que se crean o cambian:

```
src/engine/types.ts          (cambia: Keyword, BattleState, nuevas acciones y eventos)
src/engine/battle.ts         (nuevo)
src/engine/actions.ts        (cambia: despacha las acciones de batalla)
src/engine/phases.ts         (cambia: PassPhase bloqueado durante una batalla)
src/engine/index.ts          (cambia: exporta lo nuevo)
tests/engine/fixtures.ts     (cambia: Characters con Blocker y distinto counter)
tests/engine/attack.test.ts
tests/engine/block.test.ts
tests/engine/counter.test.ts
tests/engine/damage.test.ts
tests/engine/victory.test.ts
```

Tipos nuevos (resumen, la forma exacta se define al implementar):

```ts
type Keyword = 'Blocker' | 'Rush' | 'DoubleAttack' | 'Banish'

interface BattleState {
  attacker: 'leader' | string
  target: 'leader' | string
  attackerPlayer: PlayerId
  step: 'block' | 'counter'
  counterPower: number
}
```

`GameState` gana `battle: BattleState | null`. En SPEC 02 no existe y se inicializa en `null`. `Keyword` ya incluye `Rush`, `DoubleAttack` y `Banish` para no cambiar el tipo en SPEC 04, pero el motor no los interpreta todavía.

Acciones nuevas:

```ts
type Action =
  | ...
  | { type: 'Attack'; player: PlayerId; attacker: 'leader' | string; target: 'leader' | string }
  | { type: 'DeclareBlock'; player: PlayerId; blockerId: string }
  | { type: 'PassBlock'; player: PlayerId }
  | { type: 'UseCounter'; player: PlayerId; instanceId: string }
  | { type: 'PassCounter'; player: PlayerId }
```

Reglas fijadas:

- `Attack` exige fase `main`, jugador activo, sin batalla en curso y atacante activo (no descansado). Descansa al atacante (`rested = true` o `leaderRested = true`) y abre la batalla en paso `block`.
- Primer turno: ningún jugador ataca mientras `turn <= 2`. El turno 1 es del primer jugador y el 2 del segundo, así que cada uno queda sin atacar en su primer turno.
- Un Character no puede atacar si `playedTurn === turn`. El Leader no tiene esta restricción.
- Objetivo válido: el Leader rival, o un Character rival con `rested = true`.
- Block step: decide el defensor. `DeclareBlock` exige un Character propio activo con keyword `Blocker`. Lo descansa y cambia `target` al blocker. `PassBlock` deja el objetivo. En ambos casos la batalla pasa al paso `counter`. Un Character que ya está descansado no puede bloquear.
- Counter step: decide el defensor. `UseCounter` exige un Character en la mano con `counter > 0`. Lo mueve al trash y suma su `counter` a `counterPower`. Se puede repetir las veces que quiera. `PassCounter` cierra el paso y resuelve el daño.
- Power en batalla: atacante = `getPower` en su turno (con DON!! adjunto). Defendido = `getPower` en turno rival (sin bono de DON!!) + `counterPower`.
- Daño: si power del atacante >= power del defendido, el ataque conecta. Si no, no pasa nada y la batalla termina.
- Conexión sobre Leader con Life > 0: la carta del tope de `life` va a la mano del defensor. Con Life = 0: gana el atacante.
- Conexión sobre Character: va al trash. El DON!! que tenía adjunto suma a `donRested`.
- Si el objetivo ya no existe al resolver (por ejemplo por un efecto de SPEC 04), la batalla termina sin daño. En esta spec no puede ocurrir pero el motor no debe romperse.
- Con una batalla en curso, `PassPhase`, `PlayCharacter` y `AttachDon` lanzan error. Solo el defensor actúa en `block` y `counter`.
- `getLegalActions` devuelve, según el estado: en `main` sin batalla, las acciones de SPEC 02 más cada `Attack` posible. En `block`, `DeclareBlock` por cada blocker legal y `PassBlock`, solo para el defensor. En `counter`, `UseCounter` por cada Character con counter y `PassCounter`, solo para el defensor.
- `apply` sigue siendo puro e inmutable.

---

## Plan de implementación

1. Extender `types.ts` con `Keyword`, `BattleState`, las acciones y eventos de batalla, y `battle: null` en el estado inicial. Agregar `keywords` a `CardDef`. Verificar: `npm run typecheck` pasa y los tests de SPEC 02 siguen verdes.
2. Agregar a `fixtures.ts` Characters con `Blocker` y con distintos `counter`. Verificar: los tests existentes siguen verdes.
3. Crear `battle.ts` con la declaración de `Attack` y sus restricciones. Verificar: `attack.test.ts` cubre atacante descansado, primer turno, Character recién jugado, objetivo Character activo (ilegal) y objetivo Leader.
4. Agregar `DeclareBlock` y `PassBlock`. Verificar: `block.test.ts` cubre blocker válido, blocker sin keyword, blocker descansado, redirección del objetivo y que solo el defensor puede decidir.
5. Agregar `UseCounter` y `PassCounter`. Verificar: `counter.test.ts` cubre carta sin counter, sumas acumuladas, carta que va al trash y cierre del paso.
6. Agregar la resolución del daño con Life y K.O. Verificar: `damage.test.ts` cubre empate (atacante gana), atacante con menos power, Life a la mano, K.O. con devolución de DON!! adjunto, y que un Counter cambia el resultado.
7. Agregar la victoria por Life 0 y bloquear acciones durante la batalla. Verificar: `victory.test.ts` cubre `winner`, `phase = 'gameOver'` y que en `gameOver` no hay acciones legales.
8. Actualizar `getLegalActions` y exportar desde `index.ts`. Verificar: cada acción devuelta se aplica sin error y una fuera de la lista lanza error. Correr `npm run typecheck`, `npm test` y comprobar que nada de `src/engine/` importa `phaser`.
9. Commitear cada paso en `feature/batalla`, con mensajes en español.

---

## Criterios de aceptación

- [ ] `Attack` falla en `turn <= 2`, con atacante descansado, con Character jugado ese mismo turno o contra un Character rival activo.
- [ ] `Attack` descansa al atacante y deja `battle` en paso `block`.
- [ ] `DeclareBlock` solo acepta un Character activo con `Blocker`, lo descansa y redirige el objetivo.
- [ ] `UseCounter` trashea la carta de la mano y suma su `counter` a `counterPower`. Falla con `counter = 0`.
- [ ] Un ataque con power igual al del defendido conecta.
- [ ] Un ataque conectado al Leader con Life > 0 mueve la carta del tope de Life a la mano del defensor.
- [ ] Un ataque conectado a un Character lo manda al trash y devuelve su DON!! adjunto a `donRested`.
- [ ] Un ataque conectado al Leader con 0 Life deja `winner` en el atacante y `phase` en `gameOver`.
- [ ] Un Counter que sube el power del defendido sobre el del atacante evita el daño.
- [ ] Durante una batalla, `PassPhase`, `PlayCharacter` y `AttachDon` lanzan error.
- [ ] `apply` no muta el estado de entrada.
- [ ] `npm run typecheck` y `npm test` terminan con código 0.
- [ ] Ningún archivo bajo `src/engine/` importa `phaser`.

---

## Decisiones

- **Sí:** la batalla es un estado explícito (`battle`) con pasos, no una sola acción atómica. El defensor decide en Block y en Counter, y la UI y la IA necesitan esos puntos de espera.
- **Sí:** un `PassBlock` y un `PassCounter` explícitos en vez de timeouts. Es lo que el defensor elige cuando no quiere actuar.
- **Sí:** `keywords` en `CardDef` desde esta spec, solo con `Blocker` interpretado. Evita volver a cambiar `CardDef` en SPEC 04.
- **Sí:** el DON!! de un Character eliminado vuelve a `donRested`. Es lo que hacen las reglas oficiales y mantiene el total en 10.
- **Sí:** el defendido no recibe bono de DON!! en el turno rival, porque `getPower` ya lo resuelve así en SPEC 02.
- **No:** Events `[Counter]` acá. Son Events y entran con SPEC 04. Aquí solo cuentan Characters de la mano.
- **No:** `[Trigger]` acá. El punto de extensión es el paso donde la carta de Life va a la mano, y SPEC 04 inserta ahí la decisión.
- **Sí:** victoria por Life 0 y por mazo vacío conviven. Ambas dejan `phase = 'gameOver'`.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Los pasos de batalla no dejan espacio para `[When Attacking]` y `[Trigger]` y obligan a reescribir en SPEC 04 | Resolver cada paso en una función propia (`startBattle`, `resolveBlock`, `resolveCounter`, `resolveDamage`). SPEC 04 inserta ahí sus triggers sin cambiar el flujo. |
| Ambigüedad de las reglas sobre el primer turno y el power del defensor | Contrastar con las Comprehensive Rules (`docs/plan.md`, sección Fuentes) al escribir cada test. |
| Cambiar `types.ts` rompe los worktrees abiertos | Mergear SPEC 02 antes de abrir worktrees. Esta spec solo agrega campos, no cambia los existentes. |

---

## Lo que **no** entra en esta spec

- Efectos, keywords distintos de `Blocker`, Events y Stages.
- `[Trigger]` y Events `[Counter]`.
- Datos reales de cartas.
- Phaser, UI y modo aprendizaje.
- IA.
- Multijugador.

Cada uno de esos puntos, si se hace, va en su propia spec.
