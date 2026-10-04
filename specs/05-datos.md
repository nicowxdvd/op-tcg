# SPEC 05 — Datos (fetchCards, ST01 y ST02, mazos)

> **Estado:** Implementado
> **Depende de:** SPEC 02
> **Fecha:** 2026-10-02
> **Objetivo:** Tener un script que descarga las cartas de ST01 y ST02 de OPTCG API a JSON e imágenes locales, y un cargador que entrega al motor `CardDef` y mazos válidos de 50 cartas sin llamadas de red en runtime.

---

## Por qué existe esta spec

Es la fase 5 de `docs/plan.md`. El juego necesita cartas reales para que Nico aprenda con ellas. Los datos aportan stats e imagen. El texto de efectos (`card_text`) queda como dato crudo y se codifica en SPEC 10. Esta spec depende solo de los tipos de SPEC 02, así que corre en un worktree paralelo al de batalla y efectos.

---

## Alcance

**Dentro:**

- `scripts/fetchCards.ts`: descarga cartas de ST01 (Straw Hat Crew) y ST02 (Worst Generation) con volumen moderado y pausa entre llamadas.
- JSON por set en `src/data/cards/` (`ST01.json`, `ST02.json`), con los campos útiles de la API.
- Imágenes de cartas en `public/cards/<id>.jpg`, con caché: no se vuelve a bajar lo que ya existe.
- Imágenes de DON!! desde `/api/allDonCards/`, en `public/cards/don/`.
- Conversión de los campos de la API a `CardDef` de SPEC 02 (`cardFromApi`), con `keywords` deducidas del `card_text` solo para `Rush`, `Blocker`, `Double Attack` y `Banish`.
- Mazos de los dos Starter Decks en `src/data/decks/st01.json` y `st02.json`, validados contra las reglas de SPEC 02.
- Cargador `src/data/index.ts` con `loadCards()`, `loadDeck(id)` y `loadDefs()`, que leen los JSON sin tocar la red.
- Script npm `fetch:cards`.
- Tests Vitest del cargador y de los mazos, sin red.

**Fuera de alcance (para otras specs):**

- Codificar los efectos de cada carta (SPEC 10).
- Cualquier otro set o carta fuera de ST01 y ST02.
- Deck builder (futuro).
- Llamadas a la API en runtime.
- Phaser y UI (SPEC 06).

---

## Modelo de datos

Archivos que se crean o cambian:

```
scripts/fetchCards.ts
src/data/index.ts
src/data/apiTypes.ts
src/data/convert.ts
src/data/cards/ST01.json
src/data/cards/ST02.json
src/data/decks/st01.json
src/data/decks/st02.json
public/cards/                 (ignorado por git)
package.json                  (cambia: script fetch:cards)
tests/data/convert.test.ts
tests/data/decks.test.ts
```

Campos que se guardan por carta en el JSON (según `docs/plan.md`): `card_set_id`, `card_name`, `card_type`, `card_color`, `card_cost`, `card_power`, `counter_amount`, `life`, `attribute`, `sub_types`, `card_text`, `card_image`. Se agrega `image_file` con la ruta local relativa.

Forma de un mazo:

```ts
interface DeckFile {
  id: string
  name: string
  leader: string
  cards: { id: string; count: number }[]
}
```

Reglas fijadas:

- Fuente: `https://optcgapi.com/api/decks/ST-01/` y `/api/sets/card/{id}/` para el detalle. La imagen se baja desde `card_image`.
- El script espera al menos 500 ms entre llamadas y reintenta una vez ante error de red. Si falla otra vez, termina con código distinto de 0 y no deja un JSON a medias.
- Los JSON de cartas **se versionan** en git. Las imágenes (`public/cards/`) no, porque el repo es privado y no se publican imágenes oficiales (`.gitignore` de SPEC 01).
- El motor nunca importa `src/data/` ni `scripts/`. El cargador entrega objetos que el motor recibe por parámetro.
- Si un campo numérico viene vacío o `null` (por ejemplo `card_power` de un Event), `cardFromApi` lo convierte a 0.
- `colors` sale de `card_color`, separando por `/` si la carta tiene dos colores.
- `type` se valida contra `'Leader' | 'Character' | 'Event' | 'Stage'`. Un valor desconocido hace fallar la conversión con un error que incluye el id.
- Cada mazo debe cumplir las reglas de SPEC 02: 1 Leader, 50 cartas, máximo 4 copias por id y colores del Leader.

---

## Plan de implementación

1. Probar a mano las rutas de la API con `curl` y confirmar los nombres de campos reales de ST-01. Anotar las diferencias con `docs/plan.md` en la propia spec antes de escribir código. Verificar: la respuesta contiene los 17 o más ids únicos del set.
2. Crear `apiTypes.ts` y `convert.ts` (`cardFromApi`). Verificar: `convert.test.ts` cubre Leader, Character, Event, Stage, un valor `null`, dos colores y un `type` desconocido.
3. Crear `scripts/fetchCards.ts` para ST01 con pausa y reintento, y el script `fetch:cards`. Verificar: ejecutarlo crea `ST01.json` y las imágenes, y una segunda ejecución no vuelve a bajar imágenes ya presentes.
4. Extender el script a ST02 y a las imágenes de DON!!. Verificar: existen `ST02.json` y `public/cards/don/`.
5. Crear los mazos `st01.json` y `st02.json` a partir de la respuesta de `/api/decks/`. Verificar: `decks.test.ts` valida 50 cartas, máximo 4 copias y colores del Leader.
6. Crear `src/data/index.ts` con `loadCards`, `loadDeck` y `loadDefs`. Verificar: un test crea una partida con `createGame` de SPEC 02 usando `st01` contra `st02`, sin red.
7. Verificar `npm run typecheck`, `npm test`, que `git ls-files public/cards` no devuelve nada y que ningún archivo de `src/engine/` importa `src/data/`.
8. Commitear cada paso en `feature/datos`, con mensajes en español.

---

## Criterios de aceptación

- [x] `npm run fetch:cards` crea `src/data/cards/ST01.json` y `ST02.json` y las imágenes en `public/cards/`.
- [x] Una segunda ejecución no baja de nuevo imágenes existentes.
- [x] Si la API falla dos veces seguidas, el script termina con código distinto de 0 y no sobrescribe un JSON válido previo.
- [x] Cada carta de los JSON se convierte a `CardDef` sin error.
- [x] `st01.json` y `st02.json` tienen 1 Leader y 50 cartas, máximo 4 copias por id y solo colores del Leader.
- [x] `createGame` de SPEC 02 acepta `st01` contra `st02` usando solo `loadDefs()` y `loadDeck()`.
- [x] Los tests de esta spec pasan sin acceso a la red.
- [x] `git ls-files public/cards` no devuelve nada y `git ls-files src/data` incluye los JSON.
- [x] `npm run typecheck` y `npm test` terminan con código 0.
- [x] Ningún archivo bajo `src/engine/` importa `phaser` ni `src/data/`.

---

## Decisiones

- **Sí:** JSON versionado, imágenes ignoradas. El JSON es pequeño y hace reproducible el build sin red. Las imágenes oficiales no se publican.
- **Sí:** caché local y cero llamadas en runtime. La API pide volumen moderado y el juego tiene que funcionar sin conexión.
- **Sí:** guardar el `card_text` crudo y no interpretarlo acá. Solo se deducen los keywords simples de SPEC 03 y 04. El resto de efectos va en SPEC 10.
- **Sí:** esta spec depende solo de SPEC 02, no de 03 ni 04. Habilita el worktree C del plan en paralelo al motor.
- **No:** deck builder, otros sets ni descarga automática en el arranque del juego.
- **Sí:** conversión estricta con error por `type` desconocido. Un dato mal convertido en silencio rompe reglas más adelante.
- **Sí:** los mazos se arman de la respuesta de `/api/decks/` y no a mano, para reproducir el Starter Deck oficial.

---

## Hallazgos de la implementación

Diferencias entre lo que asumía esta spec y lo que devuelve la API (verificado el 2026-10-04):

- **Composición de mazos:** `/api/decks/{set}/` devuelve las 17 cartas únicas del set, sin cantidades de copias. No existe un endpoint con la lista de 50. Las cantidades salen de One Piece Player.
- **`st02.json`:** suma exacto 50 (Scalpel ×2 y Repel ×4 según la nota oficial de Bandai; Straw Sword ×2 por resta).
- **`st01.json` no es la lista oficial:** las fuentes se contradicen y no hay una confirmada. Son 4 copias de los Characters 002 a 010, Brook ×2, Luffy 012 ×2, Zoro 013 ×2, y los tres Events y el Stage ×2. Es un mazo de práctica válido de 50 cartas. Se corrige cuando haya una fuente fiable.
- **Valores numéricos:** `card_cost`, `card_power` y `life` llegan como string, `null` o el string `"NULL"` (el Stage `ST01-017` en `card_power`). `cardFromApi` convierte los tres casos a 0.
- **Rutas:** `/api/sets/ST-01/` y `/api/decks/` dan error o 404. Solo se usan `/api/decks/{set}/` y `/api/allDonCards/`.
- **Mezcla de sets:** una descarga sin pausa devolvió datos de ST-02 en la respuesta de ST-01. El script valida el `set_id` de cada carta.
- **Imágenes:** las de cartas llegan como PNG con extensión `.jpg`. Los navegadores las abren igual.
- **DON!!:** `/api/allDonCards/` trae 187 variantes y 4 sin imagen. Se bajan solo el genérico (`don_8`) y el de ST-01 (`don_3`). No hay DON!! de ST-02.
- **Keywords deducidos:** solo cuentan los que abren el texto de la carta. `[DON!! x2] ... gains [Rush]` o `cannot activate [Blocker]` no son keywords propios.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| La API cambia o sus campos no coinciden con `docs/plan.md` | El paso 1 confirma los campos reales antes de escribir código. Los JSON versionados evitan depender de la API después. |
| La API limita o bloquea por volumen | Pausa de 500 ms, caché de imágenes y solo 2 sets. Si bloquea, bajar de a pocos y reanudar sin repetir. |
| `card_text` mezcla keywords con texto libre y la deducción falla | Limitar la deducción a los 4 keywords simples y cubrirla con un test por keyword. Lo demás queda para SPEC 10. |
| Disponibilidad de imágenes de DON!! | Si `/api/allDonCards/` no sirve, usar un DON!! dibujado por Phaser en SPEC 06 y anotarlo en esa spec. |

---

## Lo que **no** entra en esta spec

- Efectos codificados por carta.
- Otros sets, deck builder y personalización de mazos.
- Phaser, UI y modo aprendizaje.
- IA.
- Multijugador.

Cada uno de esos puntos, si se hace, va en su propia spec.
