# SPEC 07 — Modo aprendizaje (panel de fase, log, tooltips)

> **Estado:** Borrador
> **Depende de:** SPEC 06, SPEC 11
> **Fecha:** 2026-10-02
> **Objetivo:** Agregar al tablero un panel lateral que explica la fase actual y lo que se puede hacer, un log de partida en texto legible y tooltips de keywords, para que Nico aprenda las reglas jugando.

---

## Por qué existe esta spec

Es la fase 7 de `docs/plan.md` y el motivo del proyecto: Nico quiere jugar One Piece TCG para aprender a jugar. El tablero (SPEC 06) deja jugar, pero no explica nada. Esta spec agrega la capa didáctica sin tocar las reglas.

---

## Alcance

**Dentro:**

- Panel lateral `LearnPanel` con: fase actual, turno, jugador activo, explicación breve de la fase y lista de lo que se puede hacer ahora, tomada de `getLegalActions`.
- Log de partida en texto, generado a partir de los `GameEvent` (ejemplo: "Luffy ataca al Leader rival, 6000 contra 5000").
- Tooltips de keywords (Rush, Blocker, Double Attack, Banish, `[On Play]`, `[When Attacking]`, `[On K.O.]`, `[Trigger]`, `[Counter]`, `[DON!! xN]`, `[Once Per Turn]` y los demás del plan) al pasar el mouse por el texto de la carta en el zoom.
- Textos didácticos en español en `src/learn/texts.ts`: una explicación por fase, por paso de batalla y por keyword.
- Función pura `describeEvent(event, state)` que convierte un evento en una línea de log.
- Función pura `describePhase(state, player)` que devuelve el texto de la fase y las jugadas disponibles.
- Interruptor para activar y desactivar el panel.
- Tests Vitest de las funciones puras.

**Fuera de alcance (para otras specs):**

- Tutorial guiado paso a paso con partida preparada.
- Sugerencias de la mejor jugada (ligadas a la IA, SPEC 08).
- Traducción a otros idiomas.
- Cambios en el motor. Si falta un evento, se agrega en la spec del motor correspondiente.

---

## Modelo de datos

Archivos que se crean o cambian:

```
src/learn/texts.ts
src/learn/describeEvent.ts
src/learn/describePhase.ts
src/learn/keywords.ts           (keyword -> explicación y detector sobre card_text)
src/ui/LearnPanel.ts
src/ui/GameLog.ts
src/ui/KeywordTooltip.ts
src/ui/CardZoom.ts              (cambia: marca los keywords del texto)
src/scenes/Board.ts             (cambia: monta el panel y el log)
tests/learn/describeEvent.test.ts
tests/learn/describePhase.test.ts
tests/learn/keywords.test.ts
```

Contrato (resumen, la forma exacta se define al implementar):

```ts
function describeEvent(event: GameEvent, state: GameState): string
function describePhase(state: GameState, player: PlayerId): { title: string; explanation: string; actions: string[] }
function findKeywords(cardText: string): { keyword: string; start: number; end: number }[]
```

Reglas fijadas:

- Todo el código de `src/learn/` es TypeScript puro, sin Phaser, y solo lee el estado y los eventos.
- Los textos usan el vocabulario oficial del juego: Leader, Character, DON!!, Life, Trash, Counter, Trigger. No se traducen estos términos.
- `describePhase` no decide qué es legal: muestra lo que devuelve `getLegalActions`, traducido a frases.
- El log guarda un renglón por evento y muestra los últimos 50, con desplazamiento. Nunca se pierde un evento en el motor por mostrarlo.
- Un tooltip aparece solo sobre los keywords reconocidos por `findKeywords`. El resto del texto no se marca.
- Si un `GameEvent` no tiene descripción, `describeEvent` devuelve el nombre del evento en lugar de lanzar un error, y un test comprueba que cada tipo de evento conocido tiene descripción.

---

## Plan de implementación

1. Crear `texts.ts` con las explicaciones de las fases (Refresh, Draw, DON!!, Main, End), los pasos de batalla y los keywords. Verificar: revisar el contenido contra las Comprehensive Rules (`docs/plan.md`, sección Fuentes).
2. Crear `describeEvent.ts`. Verificar: `describeEvent.test.ts` cubre cada tipo de `GameEvent` existente y el caso desconocido.
3. Crear `describePhase.ts`. Verificar: `describePhase.test.ts` cubre cada fase, el turno 1 (el primer jugador no roba y recibe 1 DON!!) y la lista de jugadas.
4. Crear `keywords.ts` con `findKeywords`. Verificar: `keywords.test.ts` cubre cada keyword, varios en un texto, mayúsculas y un texto sin keywords.
5. Crear `GameLog` y `LearnPanel` y montarlos en `Board`. Verificar a mano: el panel cambia con la fase y el log suma una línea por acción.
6. Crear `KeywordTooltip` e integrarlo en `CardZoom`. Verificar a mano: el mouse sobre un keyword muestra su explicación.
7. Agregar el interruptor del panel. Verificar a mano: se oculta y vuelve a aparecer sin perder el log.
8. Cuando SPEC 03 y 04 estén mergeadas: cubrir los eventos de batalla y de efectos y los pasos Block y Counter. Verificar con una partida completa a mano.
9. Verificar `npm run typecheck`, `npm test` y `npm run build`.
10. Commitear cada paso en `feature/aprendizaje`, con mensajes en español.

---

## Criterios de aceptación

- [ ] El panel muestra la fase actual con una explicación en español y las jugadas disponibles.
- [ ] En el turno 1 el panel explica que el primer jugador no roba y recibe 1 DON!!.
- [ ] El log agrega una línea legible por cada evento del motor.
- [ ] Con SPEC 03 integrada, el log muestra los ataques con los power comparados, por ejemplo "6000 contra 5000".
- [ ] Un keyword en el texto del zoom muestra su explicación al pasar el mouse.
- [ ] Todo tipo de `GameEvent` conocido tiene descripción, verificado por un test.
- [ ] El interruptor oculta y muestra el panel sin perder el log.
- [ ] `src/learn/` no importa Phaser.
- [ ] `npm run typecheck`, `npm test` y `npm run build` terminan con código 0.

---

## Decisiones

- **Sí:** lógica didáctica en funciones puras (`describeEvent`, `describePhase`, `findKeywords`) separadas de Phaser, para testearla con Vitest.
- **Sí:** textos en español con los términos oficiales en inglés (Leader, DON!!, Trigger). Es lo que Nico va a ver en las cartas.
- **Sí:** el panel muestra `getLegalActions` traducido y no otra lista. Una sola fuente de verdad sobre lo que se puede hacer.
- **No:** tutorial guiado ni sugerencias de jugada. Son otra spec, y las sugerencias dependen de la IA.
- **Sí:** el modo aprendizaje es un interruptor y no un modo aparte. Se puede jugar con y sin explicaciones.
- **Sí:** el log no se persiste. Cada partida empieza vacía.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Una explicación incorrecta enseña mal una regla | Contrastar cada texto con las Comprehensive Rules en el paso 1 y citar la sección en un comentario solo si la regla no es obvia. |
| Los `GameEvent` no traen los datos que el log necesita (power, nombres) | `describeEvent` recibe el estado para consultar nombres y power. Si falta un dato en el evento, pedir el campo en la spec del motor correspondiente. |
| El texto del panel tapa el tablero en pantallas chicas | El panel es colapsable y `layout.ts` de SPEC 06 reserva su ancho. Probar a 1280x720. |
| Detección de keywords falla con variantes del `card_text` | Cubrir con tests las variantes que traen ST01 y ST02 reales y ajustar `findKeywords` con ellas. |

---

## Lo que **no** entra en esta spec

- Tutorial guiado.
- Sugerencias de la mejor jugada.
- Otros idiomas.
- Cambios al motor.
- IA y multijugador.

Cada uno de esos puntos, si se hace, va en su propia spec.
