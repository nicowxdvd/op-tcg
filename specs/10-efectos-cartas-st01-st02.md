# SPEC 10 — Efectos de las cartas de ST01 y ST02

> **Estado:** Aprobado
> **Depende de:** SPEC 04, SPEC 05
> **Fecha:** 2026-10-02
> **Objetivo:** Codificar con el DSL de SPEC 04 los efectos de todas las cartas de los Starter Decks ST01 (Straw Hat Crew) y ST02 (Worst Generation), de modo que las partidas con los mazos reales apliquen el texto de cada carta.

---

## Por qué existe esta spec

`docs/plan.md` dice que `card_text` es texto libre y que los efectos se codifican a mano por carta. SPEC 04 construye el mecanismo con cartas de fixture y SPEC 05 trae los datos. Esta spec une ambas: es el trabajo carta por carta, que depende de los dos. Se separa de SPEC 04 para que el mecanismo no espere a los datos y para poder revisar cada carta contra su texto oficial.

Esta spec no figura en el roadmap original de SPEC 01 (que llega hasta 09). Se agrega como SPEC 10. Si Nico prefiere otra numeración, se renombra el archivo.

---

## Alcance

**Dentro:**

- Registro de efectos `src/engine/effects/cards/ST01.ts` y `ST02.ts`, con un `EffectDef[]` por `defId`.
- Un test por carta con efecto, que arma un estado mínimo y verifica el resultado del texto oficial.
- Inventario de cartas y su estado dentro de esta spec, sección "Inventario".
- Cartas sin efecto (vanilla): quedan registradas con lista vacía y un test que comprueba que no tienen efecto.
- Extensiones al DSL de SPEC 04 que las cartas necesiten, agregadas como primitivas nuevas sin cambiar las existentes.
- Registro completo `effectRegistry` exportado y pasado a `createGame` por el cargador de datos.
- Prueba de integración: una partida IA contra IA (SPEC 08, si ya existe) o con acciones guionadas, con ST01 contra ST02 y todos los efectos activos.

**Fuera de alcance (para otras specs):**

- Cartas de otros sets o promocionales.
- Keywords nuevos que no estén en SPEC 04. Si una carta de ST01 o ST02 necesita uno, se agrega acá como excepción documentada.
- UI o textos didácticos de las cartas (SPEC 06 y 07).
- Rulings y casos límite que no se dan en estos dos mazos.

---

## Modelo de datos

Archivos que se crean o cambian:

```
src/engine/effects/cards/ST01.ts
src/engine/effects/cards/ST02.ts
src/engine/effects/cards/index.ts      (effectRegistry)
src/engine/effects/primitives.ts       (cambia: solo si una carta lo requiere)
src/data/index.ts                      (cambia: exporta effectRegistry junto con los mazos)
tests/engine/cards/ST01.test.ts
tests/engine/cards/ST02.test.ts
tests/engine/cards/coverage.test.ts
```

Forma del registro (resumen, la define SPEC 04):

```ts
export const ST01: Record<string, EffectDef[]> = {
  'ST01-001': [ ... ],
  'ST01-002': []
}
```

Inventario (se completa en el paso 1 con la respuesta real de la API de SPEC 05):

| Carta | Tipo | Texto oficial | Primitivas necesarias | Estado |
| ----- | ---- | ------------- | --------------------- | ------ |
| ST01-001 Monkey.D.Luffy | Leader | [Activate: Main] [Once Per Turn] Give this Leader or 1 of your Characters up to 1 rested DON!! card. | `attachDon` (nueva) | Verificada |
| ST01-002 Usopp | Character | [DON!! x2] [When Attacking] Your opponent cannot activate a [Blocker] Character that has 5000 or more power during this battle. [Trigger] Play this card. | `blockerLock` y `playSelf` (nuevas) | Verificada |
| ST01-003 Karoo | Character | (sin texto) | vanilla | Verificada |
| ST01-004 Sanji | Character | [DON!! x2] This Character gains [Rush]. | `grantKeyword` pasivo (nueva) | Verificada |
| ST01-005 Jinbe | Character | [DON!! x1] [When Attacking] Up to 1 of your Leader or Character cards other than this card gains +1000 power during this turn. | `power`, `choose` | Verificada |
| ST01-006 Tony Tony.Chopper | Character | [Blocker] | keyword `Blocker` (SPEC 04), lista vacía | Verificada |
| ST01-007 Nami | Character | [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! card to your Leader or 1 of your Characters. | `attachDon` (nueva) | Verificada |
| ST01-008 Nico Robin | Character | (sin texto) | vanilla | Verificada |
| ST01-009 Nefeltari Vivi | Character | (sin texto) | vanilla | Verificada |
| ST01-010 Franky | Character | (sin texto) | vanilla | Verificada |
| ST01-011 Brook | Character | [On Play] Give up to 2 rested DON!! cards to your Leader or 1 of your Characters. | `attachDon` (nueva) | Verificada |
| ST01-012 Monkey.D.Luffy | Character | [Rush] [DON!! x2] [When Attacking] Your opponent cannot activate [Blocker] during this battle. | keyword `Rush`, `blockerLock` (nueva) | Verificada |
| ST01-013 Roronoa Zoro | Character | [DON!! x1] This Character gains +1000 power. | `passivePower` (nueva) | Verificada |
| ST01-014 Guard Point | Event | [Counter] Up to 1 of your Leader or Character cards gains +3000 power during this battle. [Trigger] Up to 1 of your Leader or Character cards gains +1000 power during this turn. | `power`, `choose` | Verificada |
| ST01-015 Gum-Gum Jet Pistol | Event | [Main] K.O. up to 1 of your opponent's Characters with 6000 power or less. [Trigger] Activate this card's [Main] effect. | `ko`, `choose`; el Trigger reutiliza la función del Main | Verificada |
| ST01-016 Diable Jambe | Event | [Main] Select up to 1 of your {Straw Hat Crew} type Leader or Character cards. Your opponent cannot activate [Blocker] if that Leader or Character attacks during this turn. [Trigger] K.O. up to 1 of your opponent's [Blocker] Characters with a cost of 3 or less. | `blockerLock` (nueva), `ko`, `choose`, tipos (`traits`, nuevo en `CardDef`) | Verificada |
| ST01-017 Thousand Sunny | Stage | [Activate: Main] You may rest this Stage: Up to 1 {Straw Hat Crew} type Leader or Character card on your field gains +1000 power during this turn. | `power`, `choose`, costo `restSelf`, `traits` | Verificada (simplificación: `oncePerTurn` en vez de descansar el Stage, el motor no permite descansar un Stage como costo) |
| ST02-001 Eustass"Captain"Kid | Leader | [Activate: Main] [Once Per Turn] (3) You may trash 1 card from your hand: Set this Leader as active. | `activate`, costo `restDon` y `trashFromHand` | Verificada |
| ST02-002 Vito | Character | (sin texto) | vanilla | Verificada |
| ST02-003 Urouge | Character | [DON!! x1] If you have 3 or more Characters, this card gains +2000 power. | `passivePower` con condición (nueva) | Verificada |
| ST02-004 Capone"Gang"Bege | Character | [Blocker] | keyword `Blocker`, lista vacía | Verificada |
| ST02-005 Killer | Character | [On Play] K.O. up to 1 of your opponent's rested Characters with a cost of 3 or less. [Trigger] Play this card. | `ko`, `choose`, `playSelf` (nueva) | Verificada |
| ST02-006 Koby | Character | (sin texto) | vanilla | Verificada |
| ST02-007 Jewelry Bonney | Character | [Activate: Main] (1) You may rest this card: Look at 5 cards from the top of your deck; reveal up to 1 "Supernovas" type card and add it to your hand. Then, place the rest at the bottom of your deck in any order. | `search` con filtro por tipo `traits` (cambia), costo `restDon` y `restSelf`, `choose` `orderDeck` | Verificada (simplificación: `search` deja las cartas no elegidas al fondo en su orden original; el texto dice "in any order") |
| ST02-008 Scratchmen Apoo | Character | [DON!! x1] [When Attacking] Rest up to 1 of your opponent's DON!! cards. | `restDon` (nueva) | Verificada |
| ST02-009 Trafalgar Law | Character | [On Play] Set up to 1 of your "Supernovas" or "Heart Pirates" type rested Characters with a cost of 5 or less as active. | `activate`, `choose`, `traits` | Verificada |
| ST02-010 Basil Hawkins | Character | [DON!! x1] [Once Per Turn] [Your Turn] If this Character battles your opponent's Character, set this card as active. | timing `onBattle` (nuevo), `activate` | Verificada |
| ST02-011 Heat | Character | (sin texto) | vanilla | Verificada |
| ST02-012 Bepo | Character | (sin texto) | vanilla | Verificada |
| ST02-013 Eustass"Captain"Kid | Character | [Blocker] [DON!! x1] [End of Your Turn] Set this card as active. (errata oficial) | keyword `Blocker`, `activate` en `endOfYourTurn` | Verificada |
| ST02-014 X.Drake | Character | [DON!! x1] [Your Turn] If this Character is rested, your "Supernovas" or "Navy" type Leaders and Characters gain +1000 power. | `passivePower` con condición y alcance múltiple (nueva), `traits` | Verificada |
| ST02-015 Scalpel | Event | [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, set up to 1 of your DON!! cards as active. [Trigger] Set up to 2 of your DON!! cards as active. | `power`, `choose`, `activateDon` (nueva) | Verificada |
| ST02-016 Repel | Event | [Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, set up to 1 of your DON!! cards as active. | `power`, `choose`, `activateDon` (nueva) | Verificada |
| ST02-017 Straw Sword | Event | [Main] Rest up to 1 of your opponent's Characters. | `rest`, `choose` | Verificada |

Hallazgos del paso 1 (lo que el DSL de SPEC 04 no cubre y el paso 2 debe agregar):

- `attachDon`: dar DON!! descansados a un Leader o Character (ST01-001, 007 y 011).
- `passivePower` y `grantKeyword`: efectos continuos con condición (`DON!! xN`, cantidad de Characters, Character descansado). SPEC 04 solo modela efectos disparados por timing (ST01-004, ST01-013, ST02-003 y ST02-014).
- `blockerLock`: impedir Blocker durante la batalla, por power mínimo o durante el turno (ST01-002, 012 y 016).
- `playSelf`: jugar la propia carta desde `[Trigger]` (ST01-002 y ST02-005).
- `restDon` (rival) y `activateDon` (propios): ST02-008, 015 y 016.
- Timing `onBattle`: ST02-010.
- `CardDef` no guarda los tipos (`sub_types` del JSON). Hay que agregar `traits` en `convert.ts` y un filtro por tipo en `search` y en la selección de objetivos (ST01-016, 017 y ST02-007, 009, 014).
- Vanilla (8 cartas): ST01-003, 008, 009, 010 y ST02-002, 006, 011, 012. Solo con keyword (2 cartas): ST01-006 y ST02-004.

Reglas fijadas:

- El texto oficial (`card_text` de los JSON de SPEC 05) es la fuente. Si el código y el texto difieren, gana el texto.
- Cada `defId` presente en los mazos de ST01 y ST02 tiene entrada en el registro, aunque sea vacía. Un test de cobertura lo comprueba contra los JSON.
- Cada carta con efecto tiene al menos un test que verifica el resultado y uno que verifica que no se aplica cuando la condición falla (si el efecto tiene condición).
- Si una carta no se puede expresar con las primitivas de SPEC 04, se agrega una primitiva nueva con su test. No se sale del DSL con código suelto.
- Las funciones de efecto no acceden a nada fuera de `EffectContext` (regla de SPEC 04).
- Estado de cada carta en el inventario: `Pendiente`, `Codificada` o `Verificada`. Solo se pasa a `Verificada` con su test en verde y revisada contra el texto.

---

## Plan de implementación

1. Leer los JSON de SPEC 05 y completar el inventario de esta spec con cada carta distinta de ST01 y ST02, su texto y las primitivas que necesita. Marcar las que el DSL de SPEC 04 no cubre. Verificar: el inventario tiene todas las cartas distintas de los dos mazos.
2. Agregar las primitivas faltantes a `primitives.ts` con un test por cada una. Verificar: `npm test` pasa y los tests de SPEC 04 siguen verdes.
3. Crear `effects/cards/index.ts` y `coverage.test.ts`. Verificar: el test de cobertura falla listando las cartas sin entrada.
4. Codificar ST01 por grupos (Leader, Characters con `[On Play]`, con `[When Attacking]`, con `[Activate: Main]`, Events y Stages). Verificar: `ST01.test.ts` pasa para cada grupo y el inventario se actualiza.
5. Codificar ST02 con el mismo método. Verificar: `ST02.test.ts` pasa para cada grupo.
6. Conectar `effectRegistry` al cargador de `src/data/index.ts`. Verificar: `createGame` con `st01` contra `st02` usa los efectos.
7. Prueba de integración con una partida completa de ST01 contra ST02, con IA si SPEC 08 está mergeada, o con acciones guionadas si no. Verificar: no hay errores, se respetan los invariantes (total de DON!! y de cartas) y la partida termina.
8. Revisar el inventario: toda carta pasa a `Verificada` o queda anotada con el motivo. Verificar `npm run typecheck` y `npm test`.
9. Commitear cada paso en `feature/efectos-cartas`, con mensajes en español.

---

## Criterios de aceptación

- [ ] El inventario de esta spec lista todas las cartas distintas de ST01 y ST02 con su estado.
- [ ] `coverage.test.ts` comprueba que cada `defId` de los mazos de ST01 y ST02 está en el registro.
- [ ] Cada carta con efecto tiene un test que verifica el resultado del texto oficial.
- [ ] Cada efecto con condición (`DON!! xN`, turno, `Once Per Turn`) tiene un test que verifica que no se aplica si la condición falla.
- [ ] Las cartas sin efecto tienen entrada vacía y un test que lo confirma.
- [ ] Una partida completa de ST01 contra ST02 con efectos activos termina sin errores y sin romper los invariantes del motor.
- [ ] Ninguna carta queda en estado `Pendiente` en el inventario sin un motivo anotado.
- [ ] `npm run typecheck` y `npm test` terminan con código 0.
- [ ] Ningún archivo bajo `src/engine/` importa `phaser`.

---

## Decisiones

- **Sí:** una spec propia para los efectos reales. Mantiene SPEC 04 acotada al mecanismo y deja el trabajo repetitivo (carta por carta) separado.
- **Sí:** inventario dentro de la spec en vez de un documento en `docs/`. `docs/` no se versiona y esta lista es parte del contrato de la spec.
- **Sí:** el texto oficial gana ante el código. Es lo que Nico ve en la carta y lo que quiere aprender.
- **Sí:** nuevas primitivas antes que código suelto. Mantiene el DSL como única vía de efectos.
- **Sí:** el registro de efectos se inyecta en `createGame`, como define SPEC 04, y el cargador de datos lo entrega junto con los mazos.
- **No:** otros sets. Cada set nuevo tendrá su propia spec con su inventario.
- **Sí:** numerarla 10 y no insertarla antes. No renumera las specs ya escritas y su dependencia (SPEC 04 y 05) la deja en el lugar correcto del grafo.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Una carta tiene un texto que el DSL de SPEC 04 no puede expresar | El paso 1 las detecta antes de codificar. Se agregan primitivas con test en el paso 2, o se marca la carta como no soportada con su motivo. |
| El `card_text` de la API tiene errores o cambia | Los JSON de SPEC 05 están versionados. Contrastar los casos dudosos con las Comprehensive Rules (https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf) y anotar la diferencia en el inventario. |
| Un efecto codificado mal pasa los tests porque el test repite el mismo error | Escribir cada test a partir del texto oficial y no del código, y revisar el inventario carta por carta antes de marcar `Verificada`. |
| Muchas cartas parecidas generan código duplicado | Extraer fábricas de efectos comunes (por ejemplo "roba N", "da +N de power") en `primitives.ts` y reutilizarlas. |

---

## Lo que **no** entra en esta spec

- Cartas de otros sets o promocionales.
- Keywords nuevos fuera de SPEC 04, salvo excepción documentada.
- UI, textos didácticos y modo aprendizaje.
- Multijugador.

Cada uno de esos puntos, si se hace, va en su propia spec.
