# SPEC 24 — Mazos Xebec y Luffy Elbaf (OP17)

> **Estado:** En curso
> **Depende de:** SPEC 05 (datos), SPEC 10 (efectos de cartas)
> **Fecha:** 2026-10-12
> **Objetivo:** Poder elegir en el select del lobby los mazos **Xebec** (Rocks Pirates) y **Luffy Elbaf**, con las cartas y los efectos funcionando en el motor.

---

## Mazos

Cada mazo es 1 Líder + 50 cartas. Las listas las dio Nico el 2026-10-12.

| Mazo | Líder | Cartas (cantidad) |
| ---- | ----- | ----------------- |
| `xebec` | `OP17-039` | 050×4, 045×4, 052×2, 054×4, 041×2, 042×4, 044×2, 046×4, 049×4, 040×4, 048×4, 118×4, 055×4, 056×4 |
| `luffy` | `OP17-079` | 084×2, 086×4, 094×4, 080×4, 081×4, 082×4, 087×4, 095×4, 089×4, `OP15-088`×4, 119×4, 093×4, `ST14-017`×4 |

Todas las cartas son `OP17-` salvo las marcadas. El select ya existe: `listDecks()` lee `DECKS` en `src/data/index.ts`, así que un mazo registrado aparece solo, para el lado propio y para el de la IA.

## Etapas

Cada etapa es una tanda de commits atómicos en `feature/mazos-op17`. Al cerrar cada una, `npm test` y `tsc` pasan.

### Etapa 1 — Datos y mazos sin efectos

- **Fetch.** `scripts/fetchCards.ts` usa `/api/decks/<set>/`, que solo sirve a los starters (`OP-17` da 404). Para las cartas nuevas se pide cada una a `/api/sets/card/<id>/` (única ruta que sirve también a `OP15`). La API devuelve además las versiones Alternate Art; se descarta toda fila cuyo `card_image_id` no sea igual a `card_set_id`.
- **Archivos.** `src/data/cards/OP17.json`, `OP15.json` y `ST14.json`, solo con las cartas de los dos mazos. `loadCards()` los incluye. Las imágenes bajan a `public/cards/`, que está en `.gitignore`: existen solo donde se corra el script.
- **Nombres.** La API agrega el número a los nombres repetidos (`Rocks.D.Xebec (039)`). `cardFromApi` lo quita con una regla propia y un test.
- **Mazos.** `src/data/decks/xebec.json` y `luffy.json` con el formato de `st01.json`, registrados en `DECKS` en el orden `st01`, `st02`, `xebec`, `luffy`.
- **Sin efectos todavía.** Una carta sin entrada en `effectRegistry` no rompe el motor (`state.effects[defId] ?? []`). Las cartas nuevas se registran con `[]` hasta su etapa, igual que las vanilla de ST01.
- **Tests.** `tests/data/decks.test.ts`: `DECK_IDS` y `listDecks` incluyen los mazos nuevos, cada mazo cumple `validateDeck` (50 cartas), el test de "34 cartas" pasa a contar las nuevas, y una partida IA contra IA entre los cuatro mazos termina sin error.

### Etapa 2 — Primitivas compartidas del motor

Nombres provisionales. Cada una lleva su test en `tests/engine/`. Falta leer `battle.ts` completo antes de implementar; hasta entonces la lista es una hipótesis.

| Primitiva | Qué falta hoy | Cartas |
| --------- | ------------- | ------ |
| `search` con destino del resto | `search` deja el resto abajo del mazo; estas cartas lo botan al trash | Usopp 080, Saul 089 |
| Mover al fondo del mazo | No existe | Wang Zhi 041, Gloriosa 046 |
| Jugar desde mano o trash | `playSelf` solo juega desde el trash la carta de la fuente | Xebec 118, Luffy 093, Docking Six `OP15-088` |
| Añadir desde el trash con filtro | `toHand` mueve por `instanceId`; falta elegir con filtro (color, costo, nombre) | Marlon 052, Gerd 081 |
| Costes `revealFromHand` y `trashFromDeck` | `EffectCost` solo tiene `restSelf`, `restDon`, `trashFromHand` | Kaido 042, Docking Six |
| Revelar el tope y actuar según su tipo | No existe | Líder Xebec 039 |
| Keyword `Unblockable` por efecto | `Keyword` no la tiene; los blockers se filtran en `queries.ts` y `battle.ts` | Chopper 084, evento 055 |
| Otorgar keyword por efecto con duración | `Aura.keyword` solo es pasiva | las dos anteriores |
| Restricción "no puede atacar hasta el fin de la próxima End Phase" | `Restriction` solo cubre bloqueo (`blockerLock`) | Stussy 054 |
| Timing `onOpponentAttack` | `onBattle` dispara al atacante, no al defensor | Linlin 049, Shiki 048, Newgate 040 |
| Costo en el campo (`fieldCost`) y `Aura.cost` | El costo es siempre el de `CardDef` | ver Etapa 4 |

### Etapa 3 — Xebec completo

Efecto por carta, con las primitivas de la etapa 2:

| Carta | Efecto (resumen propio) | Falta fuera de la etapa 2 |
| ----- | ----------------------- | ------------------------- |
| 039 Líder | Al atacar, botar 1 de la mano (opcional): revelar el tope y, si es Rocks Pirates, robar 2 | — |
| 050 Streusen | Al jugar: ver 2 del tope, ordenarlas arriba o abajo, robar 1 | Verificar que `orderDeck` permite "abajo" |
| 045 Kyo | Reemplazo: si el rival remueve a uno de tus Characters, botar 2 de la mano en su lugar. Al jugar: robar 1 | Efecto de reemplazo (nuevo) |
| 052 Marlon | Al jugar: añadir 1 Event azul de costo 0 del trash | — |
| 054 Stussy | Al jugar: un Character rival con costo base ≤6 no ataca hasta el fin de su próxima End Phase. Activate Main, descansando 3 DON!!: lo mismo sin límite de costo | — |
| 041 Wang Zhi | Blocker. Al jugar: botar 1 (opcional) y mandar al fondo todos los Characters rivales de costo base 1 | — |
| 042 Kaido | Blocker. Al jugar: revelar 3 Rocks Pirates de la mano (opcional) y dar -3000 de poder a un Character rival | — |
| 044 Captain John | Si el Líder es Rocks Pirates y está descansado, el rival solo puede atacar a John. Activate Main: robar 1, botar 1 | Restricción de objetivo de ataque (nueva) |
| 046 Gloriosa | Blocker. Al jugar: mandar al fondo del mazo de su dueño 1 Character de costo ≤5, tuyo o rival | — |
| 049 Linlin | Al jugar: el rival elige robar 2 o botar 2. Al ser atacado: botar 1 y dar +1000 | — |
| 040 Newgate | Al jugar: robar 1. Una vez por turno, si tu Líder Rocks Pirates ataca o es atacado: botar 1 y +3000 al Líder | — |
| 048 Shiki | `Rush: Character`. Al atacar o ser atacado, una vez por turno: botar 1 Rocks Pirates y dar -3000 | `Rush: Character` como keyword distinta de `Rush` |
| 118 Xebec | +2000 de Counter en la mano si solo tienes Characters sin Counter. Al jugar: robar 1 y jugar hasta 2 Rocks Pirates de nombres distintos y costo total ≤9 | Counter dinámico en `battle.ts` |
| 055 Evento | Main: descansar 1 DON!!, un Xebec gana Unblockable. Counter +2000 | — |
| 056 Evento | Main: descansar 5 DON!!, devolver a la mano un Character de costo ≤6. Counter +2000 | — |

### Etapa 4 — Luffy Elbaf completo

El costo `+12` y `+6` solo rige en el campo: jugar desde la mano sigue pagando el costo base. Por eso los chequeos de `actions.ts`, `battle.ts` y `queries.ts` no cambian. Hace falta `fieldCost(state, instanceId)` para las condiciones "costo 12 o más", "costo ≤8" o "costo total ≤4", y que `Aura` pueda sumar costo.

| Carta | Efecto (resumen propio) | Falta fuera de la etapa 2 |
| ----- | ----------------------- | ------------------------- |
| 079 Líder | Tus Characters con costo 12 o más ganan Blocker | `fieldCost` |
| 084 Chopper | Al jugar: si hay un Character de costo ≥12, uno de los tuyos gana Unblockable | — |
| 086 Nami | Al jugar: botar 1 Elbaph de la mano (opcional) y robar 2 | — |
| 094 Rodo, 081 Gerd, 089 Saul | Con Líder Elbaph (Saul sin condición) ganan +12 de costo. Gerd: botar 1 y recuperar un Character ≤8 del trash. Saul: ver 3, añadir 1 Elbaph, botar el resto | `Aura.cost` |
| 080 Usopp, 082 Sanji, 087 Robin, 095 Zoro | +3000 de poder si hay un Character de costo ≥12. Usopp: ver 3 y añadir 1 Elbaph. Sanji: robar 2, botar 2. Robin: -3000 al rival. Zoro: reemplazo, mandar 3 del trash al fondo | Efecto de reemplazo |
| `OP15-088` Docking Six | +6 de costo. Al jugar: botar 3 del tope (opcional) y jugar un Straw Hat Crew de costo ≤2 del trash | — |
| 119 Loki | +12 de costo, +3000 de poder en turno rival. Al jugar: K.O. a Characters rivales con costo total ≤4 | K.O. por costo total (nuevo) |
| 093 Luffy | Rush si hay un Character de costo ≥12. Al jugar: robar 1 y jugar un Character ≤2 del trash | — |
| `ST14-017` Thousand Sunny | Stage. Los Characters negros Straw Hat Crew ganan +1 de costo. Al jugar: robar 1 si el Líder es Straw Hat Crew | Auras y `onPlay` de un Stage (hoy `fieldCards` no incluye el Stage) |

## Qué **no** entra en esta spec

- Otros mazos del set OP17 o de OP14 y ST32.
- Cambios de UI. Los prompts nuevos (revelar, ordenar, elegir quién roba) usan `PromptDialog` tal como está; la spec 19 los rehace después.
- Descargar el set completo de OP17.

## Riesgos conocidos

| Riesgo | Mitigación |
| ------ | ---------- |
| Los textos de optcgapi tienen errores ("Look 3 cards top deck", "poser"). | No implementar un efecto con texto dudoso sin confirmarlo con Nico antes de cada etapa. |
| Hay efectos con costo opcional en medio de un ataque (Linlin, Newgate, Shiki) y piden un prompt al defensor. | Reusar `choose` con `confirm` y `trashFromHand`. Probar con el defensor humano y con la IA. |
| El efecto de reemplazo (Kyo, Zoro) toca `ko`, `toHand` y el fondo del mazo. | Implementarlo al final de la etapa 2 y con tests de cada ruta de remoción. |
| `public/cards/` no se versiona. | El script es la fuente; documentar `npm run fetch:cards` en el PR. |
| La IA simple no sabe usar las cartas nuevas. | Basta con que no se bloquee. La calidad de juego de la IA queda fuera. |

## Decisiones (Nico, 2026-10-12)

- Nombres en el select: `Xebec · Rocks Pirates` y `Luffy · Elbaf`.
- Kaido 042 da -3000 de poder.
- Gloriosa 046 afecta a cualquier Character de costo ≤5, de cualquier lado.
- Stussy 054: el Activate Main cuesta descansar 3 DON!!. Si además descansa a la propia carta, se confirma al implementar la etapa 3.
- Usopp 080 y Saul 089: el resto de las cartas vistas va al trash.
