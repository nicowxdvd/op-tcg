# SPEC 04 — Efectos y keywords (sistema de efectos, Events, Stages, Trigger)

> **Estado:** Implementado
> **Depende de:** SPEC 03
> **Fecha:** 2026-10-02
> **Objetivo:** Agregar al motor de `src/engine/` un sistema de efectos por datos con decisiones del jugador, los keywords principales del juego y la jugada de Events y Stages.

---

## Por qué existe esta spec

Es la fase 4 de `docs/plan.md`. Con SPEC 02 y 03 el motor juega Characters y batalla sin efectos. Casi todas las cartas reales tienen texto. Esta spec construye el **mecanismo** (triggers, costos, condiciones, prompts, duraciones) y lo prueba con cartas de fixture. Codificar las cartas reales de ST01 y ST02 va en SPEC 10, porque necesita los datos de SPEC 05.

---

## Alcance

**Dentro:**

- Keywords interpretados por el motor: `Rush`, `Double Attack`, `Banish` (y `Blocker`, ya hecho en SPEC 03).
- Triggers de efectos: `[On Play]`, `[When Attacking]`, `[On K.O.]`, `[Activate: Main]`, `[End of Your Turn]`, `[Trigger]`, `[Counter]`.
- Condiciones de efectos: `[DON!! xN]`, `[Your Turn]`, `[Opponent's Turn]`, `[Once Per Turn]`.
- Cola de efectos pendientes y estado `awaitingChoice` para que el jugador elija objetivos u opciones.
- Modificadores de power con duración: `thisTurn`, `thisBattle`, `permanent`.
- Acciones: `PlayEvent`, `PlayStage`, `ActivateEffect`, `Choose`, `PassChoice` y la decisión de `[Trigger]` (`RevealTrigger`, `PassTrigger`).
- Events `[Counter]` jugables en el Counter step y Events `[Main]` jugables en el Main.
- Stages: una por jugador, jugar una nueva trashea la anterior.
- DSL de efectos: primitivas reutilizables (robar, K.O., modificar power, descansar, activar, buscar en el mazo, mover a Life o mano).
- `getLegalActions` y `getPower` extendidos.
- Tests Vitest con cartas de fixture.

**Fuera de alcance (para otras specs):**

- Efectos de cartas reales de ST01 y ST02 (SPEC 10).
- Carga de datos de cartas (SPEC 05).
- UI de los prompts (SPEC 06) y su explicación (SPEC 07).
- IA que elige opciones (SPEC 08).
- Cualquier keyword que no esté en la lista de arriba. Se agregan en una spec posterior si un set nuevo los necesita.

---

## Modelo de datos

Archivos que se crean o cambian:

```
src/engine/types.ts               (cambia: EffectDef, Modifier, PendingChoice, nuevas acciones y eventos)
src/engine/effects/index.ts       (nuevo: registro y resolución de efectos)
src/engine/effects/timing.ts      (nuevo: disparo de triggers por evento)
src/engine/effects/primitives.ts  (nuevo: DSL de acciones de efecto)
src/engine/effects/modifiers.ts   (nuevo: modificadores con duración)
src/engine/battle.ts              (cambia: Rush, Double Attack, Banish, When Attacking, Trigger, On K.O.)
src/engine/actions.ts             (cambia: Events, Stages, ActivateEffect, Choose)
src/engine/phases.ts              (cambia: End of Your Turn, limpieza de modificadores)
tests/engine/fixtures.ts          (cambia: cartas con efectos de prueba)
tests/engine/keywords.test.ts
tests/engine/effects.test.ts
tests/engine/choice.test.ts
tests/engine/trigger.test.ts
tests/engine/events.test.ts
tests/engine/stage.test.ts
tests/engine/modifiers.test.ts
```

Tipos nuevos (resumen, la forma exacta se define al implementar):

```ts
type Timing = 'onPlay' | 'whenAttacking' | 'onKO' | 'activateMain' | 'endOfYourTurn' | 'trigger' | 'counter' | 'main'

interface EffectDef {
  timing: Timing
  donRequired?: number
  turn?: 'yours' | 'opponents'
  oncePerTurn?: boolean
  cost?: EffectCost
  condition?: (ctx: EffectContext) => boolean
  run: (ctx: EffectContext) => EffectStep[]
}

interface Modifier {
  target: string
  power: number
  duration: 'thisTurn' | 'thisBattle' | 'permanent'
  sourceId: string
}

interface PendingChoice {
  player: PlayerId
  kind: 'target' | 'option' | 'trashFromHand' | 'orderDeck' | 'confirm'
  options: string[]
  resume: ResumeToken
}
```

`GameState` gana `pending: PendingChoice | null`, `effectQueue`, `modifiers: Modifier[]`, `stage` por jugador y `oncePerTurnUsed: string[]`.

Las definiciones de efectos viven en un registro `Record<defId, EffectDef[]>` que se pasa a `createGame` junto con los mazos. SPEC 10 lo llena con las cartas reales.

Reglas fijadas:

- Rush: el Character puede atacar el turno en que entra (se salta la restricción `playedTurn === turn` de SPEC 03).
- Double Attack: si el ataque conecta al Leader, se pierden 2 Life en lugar de 1.
- Banish: la carta de Life perdida va al trash sin pasar por la mano y sin activar `[Trigger]`.
- `[On Play]`: se dispara cuando la carta entra al área. `[When Attacking]`: se dispara al declarar el ataque, antes del Block step. `[On K.O.]`: se dispara cuando el Character va al trash por K.O. en batalla o por efecto.
- `[Activate: Main]`: acción explícita del jugador en su Main. Puede tener costo (descansar la carta, descansar DON!!, trashear de la mano).
- `[End of Your Turn]`: se resuelve al terminar el Main, antes de pasar el turno.
- `[Trigger]`: cuando un Leader pierde Life sin Banish, el defensor decide `RevealTrigger` (se resuelve el efecto y la carta va al trash) o `PassTrigger` (va a la mano). Solo si la carta tiene efecto `trigger`.
- `[Counter]`: Event jugable en el Counter step pagando su cost con DON!! activos. Suma su valor al `counterPower` y resuelve su efecto.
- `[DON!! xN]`: el efecto se aplica solo si la carta tiene N o más DON!! adjuntos. `[Your Turn]` y `[Opponent's Turn]` restringen el turno en que el efecto es válido.
- `[Once Per Turn]`: la clave `defId + instanceId + índice del efecto` queda en `oncePerTurnUsed` hasta el fin del turno.
- Cuando se disparan varios efectos a la vez, el jugador activo los ordena primero. En esta spec se resuelven en orden de aparición, y el orden elegido por el jugador queda fuera de alcance.
- Si un efecto necesita una decisión, el motor deja `pending` con el jugador que decide y pone el resto de la resolución en la cola. `getLegalActions` devuelve solo `Choose` y `PassChoice` (si es opcional) para ese jugador hasta resolverla.
- Modificadores: `getPower` suma los modificadores vigentes. `thisBattle` se limpia al terminar la batalla y `thisTurn` al terminar el turno.
- Events: se juegan desde la mano pagando su cost y van al trash al resolverse.
- Stages: una por jugador. Jugar una nueva manda la anterior al trash.
- Las funciones `condition` y `run` son TypeScript puro y no deben acceder a nada fuera de `EffectContext`, para que el motor siga siendo determinista y reutilizable en un servidor.

---

## Plan de implementación

1. Extender `types.ts` con `EffectDef`, `Modifier`, `PendingChoice` y los campos nuevos de `GameState`. Verificar: `npm run typecheck` pasa y los tests de SPEC 02 y 03 siguen verdes.
2. Implementar `Rush`, `Double Attack` y `Banish` en `battle.ts`. Verificar: `keywords.test.ts` cubre atacar con Rush el turno de entrada, pérdida de 2 Life y Life a trash sin Trigger.
3. Crear `effects/modifiers.ts` e integrarlo en `getPower`. Verificar: `modifiers.test.ts` cubre las tres duraciones y su limpieza.
4. Crear `effects/timing.ts` y `effects/index.ts` con el disparo de `onPlay`, `whenAttacking`, `onKO` y `endOfYourTurn`, más las condiciones `donRequired`, `turn` y `oncePerTurn`. Verificar: `effects.test.ts` cubre cada trigger y cada condición.
5. Agregar `primitives.ts` (robar, K.O., modificar power, descansar, activar, buscar, mover a Life o mano). Verificar: un test por primitiva.
6. Agregar `pending` y las acciones `Choose` y `PassChoice`. Verificar: `choice.test.ts` cubre que solo decide el jugador indicado, que el resto del efecto continúa tras elegir y que una opción fuera de la lista lanza error.
7. Agregar `ActivateEffect` con sus costos. Verificar: `effects.test.ts` cubre costo impagable, `Once Per Turn` y reinicio al cambiar de turno.
8. Agregar `PlayEvent` (`[Main]` y `[Counter]`) y `PlayStage`. Verificar: `events.test.ts` y `stage.test.ts` cubren cost, fase correcta, Event que va al trash y reemplazo de Stage.
9. Agregar `[Trigger]` con `RevealTrigger` y `PassTrigger`. Verificar: `trigger.test.ts` cubre revelar, pasar, carta sin Trigger y que Banish lo evita.
10. Actualizar `getLegalActions` y `index.ts`. Verificar: cada acción devuelta se aplica sin error y una fuera de la lista lanza error. Correr `npm run typecheck`, `npm test` y comprobar que nada de `src/engine/` importa `phaser`.
11. Commitear cada paso en `feature/efectos`, con mensajes en español.

---

## Criterios de aceptación

- [ ] Un Character con Rush ataca el turno en que entra. Sin Rush, no.
- [ ] Un ataque conectado con Double Attack quita 2 Life. Con Banish, esas cartas van al trash y no se activa ningún `[Trigger]`.
- [ ] `[On Play]`, `[When Attacking]` y `[On K.O.]` disparan su efecto en el momento correcto y una sola vez.
- [ ] `[DON!! xN]`, `[Your Turn]` y `[Opponent's Turn]` activan o bloquean el efecto según corresponda.
- [ ] `[Once Per Turn]` impide repetir el efecto en el mismo turno y se reinicia al siguiente.
- [ ] `[Activate: Main]` paga su costo, resuelve y falla si el costo no se puede pagar.
- [ ] Un efecto con elección deja `pending` y solo `Choose` o `PassChoice` del jugador indicado son legales hasta resolverlo.
- [ ] Un modificador `thisBattle` desaparece al terminar la batalla y `thisTurn` al terminar el turno. `permanent` se mantiene.
- [ ] Un Event `[Counter]` se juega en el Counter step, suma su valor y va al trash. Un Event `[Main]` se juega en el Main.
- [ ] Jugar una segunda Stage manda la primera al trash.
- [ ] Un Leader que pierde Life con carta `[Trigger]` permite revelar o pasar. Sin efecto `trigger`, la carta va a la mano.
- [ ] `apply` no muta el estado de entrada.
- [ ] `npm run typecheck` y `npm test` terminan con código 0.
- [ ] Ningún archivo bajo `src/engine/` importa `phaser`.

---

## Decisiones

- **Sí:** efectos como datos y funciones puras sobre un `EffectContext`, como define `docs/plan.md`. Mantiene el motor determinista y utilizable en un servidor.
- **Sí:** `awaitingChoice` entra acá (como `pending`). SPEC 02 lo dejó afuera porque sin efectos no hay decisiones salvo el reemplazo por `replaceId`.
- **Sí:** los efectos de cartas reales van en SPEC 10, no acá. Necesitan el texto oficial de SPEC 05 y mezclarlos con el mecanismo agrandaría esta spec.
- **Sí:** registro de efectos inyectado en `createGame`. Los tests usan efectos de fixture y el juego real usa el registro de SPEC 10.
- **Sí:** orden de resolución por aparición, no elegido por el jugador. Cubre los casos de ST01 y ST02. Se reabre si una carta futura necesita elegir el orden.
- **No:** keywords fuera de la lista. Cada uno nuevo se agrega en la spec del set que lo necesite.
- **Sí:** el tipo `Keyword` ya existe desde SPEC 03, así que esta spec no cambia `CardDef`.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| La spec es grande y mezcla keywords, efectos, Events, Stages y Trigger | El plan va en pasos independientes con commit cada uno. Si el avance se atasca en el paso 6 o 7, partir en SPEC 04a (keywords y modificadores) y 04b (efectos con elección, Events y Trigger) antes de seguir. |
| El DSL queda corto para las cartas reales y SPEC 10 lo descubre tarde | Antes de cerrar el paso 5, leer el `card_text` de las cartas de ST01 y ST02 (si SPEC 05 ya está) y comprobar que cada texto se puede expresar con las primitivas. Anotar las que no. |
| Interacciones entre efectos, modificadores y batalla producen estados inconsistentes | Un test por interacción y la comprobación de invariantes (total de DON!! y de cartas por jugador) al final de cada test de efectos. |
| `pending` bloquea el flujo y deja la partida colgada | `getLegalActions` siempre devuelve al menos una acción para el jugador que debe decidir. Un test lo comprueba para cada `kind`. |

---

## Lo que **no** entra en esta spec

- Efectos de cartas reales de ST01 y ST02.
- Datos de cartas, imágenes y mazos.
- Phaser, UI y modo aprendizaje.
- IA.
- Multijugador.

Cada uno de esos puntos, si se hace, va en su propia spec.
