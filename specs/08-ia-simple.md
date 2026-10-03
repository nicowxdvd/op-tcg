# SPEC 08 — IA simple (1 vs CPU)

> **Estado:** Borrador
> **Depende de:** SPEC 04, SPEC 06
> **Fecha:** 2026-10-02
> **Objetivo:** Tener una IA heurística en `src/ai/` que elige acciones de `getLegalActions` y juega una partida completa contra Nico, conectada al `GameController` de la UI.

---

## Por qué existe esta spec

Es la fase 8 de `docs/plan.md`. Hasta SPEC 07 las partidas son hotseat (una sola persona controla a los dos jugadores). Para aprender a jugar, Nico necesita un rival. La IA debe ser simple y predecible: no busca ganar con fuerza, sino jugar de forma razonable y legal para que las partidas se completen.

---

## Alcance

**Dentro:**

- `chooseAction(state, playerId, rng)`: función pura que devuelve una acción de `getLegalActions(state, playerId)`.
- Heurística para el mulligan, el Main (jugar, adjuntar DON!!, atacar), el Block step, el Counter step, las decisiones de `awaitingChoice` y la decisión de `[Trigger]`.
- Orden de prioridad del Main: jugar el Character de mayor cost pagable, adjuntar los DON!! restantes al atacante con más probabilidad de conectar, atacar al Leader rival, pasar fase.
- Defensa: bloquear con un Blocker si el ataque es letal o si el Blocker sobrevive, usar Counters si perder Life pone al jugador en riesgo y el Counter alcanza para evitarlo.
- Aleatoriedad con el RNG con seed del motor, para que las partidas de IA sean reproducibles en los tests.
- Integración con el `GameController`: modo "1 vs CPU" donde el jugador `p2` lo controla la IA, con una pausa corta entre acciones para que Nico las vea.
- Simulación de partidas IA contra IA en los tests para detectar bloqueos y acciones ilegales.
- Tests Vitest.

**Fuera de alcance (para otras specs):**

- Búsqueda en árbol, Monte Carlo o aprendizaje. Esta IA es heurística.
- Niveles de dificultad.
- Elegir mazo o aprender del historial.
- Menú para elegir el modo (SPEC 09).
- Multijugador.

---

## Modelo de datos

Archivos que se crean o cambian:

```
src/ai/simpleAI.ts
src/ai/heuristics.ts
src/ai/index.ts
src/ui/GameController.ts      (cambia: soporte de jugadores controlados por IA)
src/scenes/Board.ts           (cambia: deshabilita la entrada del jugador de la IA)
tests/ai/simpleAI.test.ts
tests/ai/heuristics.test.ts
tests/ai/simulation.test.ts
```

Contrato (resumen, la forma exacta se define al implementar):

```ts
function chooseAction(state: GameState, player: PlayerId, rng: Rng): Action

interface AIPlayer {
  player: PlayerId
  delayMs: number
}
```

Reglas fijadas:

- La IA solo devuelve acciones que están en `getLegalActions(state, player)`. Si la lista está vacía para un jugador que debe decidir, es un error del motor y la IA lo lanza con el estado resumido.
- `chooseAction` es una función pura: mismo estado y mismo estado del RNG, misma acción.
- La IA no ve información oculta: no mira la mano del rival ni el orden del mazo. Solo usa lo que un jugador ve en la mesa y su propia mano.
- Prioridad de ataque: primero Characters rivales descansados que pueda K.O. sin riesgo, luego el Leader rival. Nunca ataca si el power del atacante no supera al del objetivo y no hay Counter que ayude, salvo que tenga Life de sobra.
- Counter: gasta cartas de la mano solo si la Life restante es 2 o menos, o si el ataque es letal. Prefiere la menor cantidad de cartas que alcance.
- Mulligan: rehace la mano si tiene 0 Characters con cost 3 o menos.
- Si la heurística no encuentra nada mejor, pasa la fase (`PassPhase`, `PassBlock`, `PassCounter` o `PassChoice`) en lugar de bloquearse.
- La pausa entre acciones es solo de presentación: vive en el controlador, no en `chooseAction`.

---

## Plan de implementación

1. Crear `heuristics.ts` con funciones puras de evaluación (puntaje de un Character, riesgo de Life, si un ataque es letal). Verificar: `heuristics.test.ts` cubre cada función con estados de fixture.
2. Crear `simpleAI.ts` con `chooseAction` para el mulligan y el Main sin batalla (jugar y adjuntar DON!!). Verificar: `simpleAI.test.ts` cubre que juega el Character de mayor cost, que adjunta DON!! y que pasa fase si no hay nada.
3. Agregar la decisión de ataque. Verificar: el test cubre que ataca al Leader, que ataca a un Character descansado solo si lo puede K.O. y que no ataca en desventaja.
4. Agregar la defensa (Block y Counter). Verificar: el test cubre bloquear un ataque letal, no gastar Counter con Life alta y gastar el mínimo necesario.
5. Agregar `awaitingChoice` y `[Trigger]`. Verificar: el test cubre que elige una opción legal y que revela un Trigger cuando conviene.
6. Crear `simulation.test.ts`: jugar 50 partidas IA contra IA con seeds distintas y los mazos de SPEC 05. Verificar: ninguna lanza un error, todas terminan con un `winner` y ninguna supera un máximo razonable de turnos (por ejemplo 100).
7. Integrar en `GameController` el soporte de `AIPlayer` con pausa, y deshabilitar la entrada del jugador de la IA en `Board`. Verificar a mano: Nico juega una partida completa contra la CPU en el navegador.
8. Verificar `npm run typecheck`, `npm test` y `npm run build`.
9. Commitear cada paso en `feature/ia`, con mensajes en español.

---

## Criterios de aceptación

- [ ] `chooseAction` devuelve siempre una acción incluida en `getLegalActions`.
- [ ] Con las mismas entradas y seed, `chooseAction` devuelve la misma acción.
- [ ] La IA nunca deja la partida bloqueada: siempre devuelve una acción cuando le toca decidir.
- [ ] 50 partidas IA contra IA con distintas seeds terminan sin error y con ganador.
- [ ] La IA juega Characters, adjunta DON!!, ataca, bloquea y usa Counter en una partida de prueba.
- [ ] La IA no usa información oculta del rival. Un test verifica que la decisión no cambia al alterar la mano rival.
- [ ] En el navegador, Nico juega una partida completa contra la CPU y puede ver cada acción de la IA con una pausa.
- [ ] `src/ai/` no importa Phaser.
- [ ] `npm run typecheck`, `npm test` y `npm run build` terminan con código 0.

---

## Decisiones

- **Sí:** heurística simple y no búsqueda. El objetivo es un rival para aprender, no un rival fuerte. Mantiene el código corto y las partidas predecibles.
- **Sí:** `chooseAction` elige siempre de `getLegalActions`. La IA no puede hacer una jugada ilegal por construcción.
- **Sí:** la IA no ve información oculta. Si hiciera trampa, enseñaría mal el juego.
- **Sí:** simulación IA contra IA como test. Es la forma más barata de encontrar bloqueos del motor en SPEC 03 y 04.
- **Sí:** la pausa vive en el controlador y no en la IA, para que los tests corran rápido.
- **No:** niveles de dificultad. Si hacen falta, es otra spec.
- **Sí:** depende de SPEC 04 (no solo de 03), porque sin efectos, Events y Trigger la IA jugaría con las decisiones de `awaitingChoice` sin cubrir.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| La IA se queda atascada en un estado que el motor no previó | La simulación del paso 6 con 50 seeds lo detecta. Cada bloqueo se convierte en un test de regresión. |
| Partidas IA contra IA que no terminan (ambas pasan siempre) | Tope de turnos en la simulación. Si se supera, ajustar la heurística para atacar al Leader cuando no hay riesgo. |
| La IA es demasiado débil o demasiado predecible para aprender | Aceptable para esta spec. Si Nico lo pide, abrir una spec de dificultad. |
| Las decisiones de `awaitingChoice` varían mucho según la carta | La IA elige con reglas genéricas (el objetivo con más power para K.O., el propio con menos para sacrificar). Los casos raros se agregan al detectarlos en la simulación. |

---

## Lo que **no** entra en esta spec

- Búsqueda en árbol o aprendizaje.
- Niveles de dificultad.
- Menú para elegir el modo de juego.
- Multijugador.

Cada uno de esos puntos, si se hace, va en su propia spec.
