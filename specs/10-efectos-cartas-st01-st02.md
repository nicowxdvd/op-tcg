# SPEC 10 — Efectos de las cartas de ST01 y ST02

> **Estado:** Borrador
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
| (se llena en el paso 1 con las cartas distintas de ST01 y ST02) | | | | Pendiente |

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
| El `card_text` de la API tiene errores o cambia | Los JSON de SPEC 05 están versionados. Contrastar los casos dudosos con las Comprehensive Rules (`docs/plan.md`, sección Fuentes) y anotar la diferencia en el inventario. |
| Un efecto codificado mal pasa los tests porque el test repite el mismo error | Escribir cada test a partir del texto oficial y no del código, y revisar el inventario carta por carta antes de marcar `Verificada`. |
| Muchas cartas parecidas generan código duplicado | Extraer fábricas de efectos comunes (por ejemplo "roba N", "da +N de power") en `primitives.ts` y reutilizarlas. |

---

## Lo que **no** entra en esta spec

- Cartas de otros sets o promocionales.
- Keywords nuevos fuera de SPEC 04, salvo excepción documentada.
- UI, textos didácticos y modo aprendizaje.
- Multijugador.

Cada uno de esos puntos, si se hace, va en su propia spec.
