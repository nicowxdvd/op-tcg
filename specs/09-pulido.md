# SPEC 09 — Pulido (menú, selección de mazo, pantalla final, sonido)

> **Estado:** Borrador
> **Depende de:** SPEC 05, SPEC 08
> **Fecha:** 2026-10-02
> **Objetivo:** Completar el flujo de la aplicación con un menú principal, selección de mazo, pantalla de fin de partida y sonido, para que Nico pueda abrir el juego, elegir mazo y jugar una partida completa contra la CPU sin tocar código.

---

## Por qué existe esta spec

Es la fase 9 de `docs/plan.md`. Hasta SPEC 08 el juego arranca directo en el tablero con mazos fijos. Esta spec arma el recorrido completo (menú, mazo, partida, resultado) y agrega sonido básico. No cambia reglas ni IA.

---

## Alcance

**Dentro:**

- Escena `Menu`: botones "Jugar contra CPU" y "Jugar entre dos personas" (hotseat de SPEC 06).
- Escena `DeckSelect`: elegir el mazo propio y el del rival entre los de `src/data/decks/` (ST01 y ST02), con el Leader y su imagen.
- Escena `GameOver`: ganador, motivo (Life 0 o mazo vacío), turnos jugados y botones "Revancha" y "Volver al menú".
- Flujo de escenas `Boot` → `Menu` → `DeckSelect` → `Board` → `GameOver`, con los parámetros de la partida pasados entre escenas.
- Sonido: efectos básicos (robar, jugar carta, atacar, daño, victoria) y una música de fondo con volumen y silencio global.
- Preferencias guardadas en `localStorage`: volumen, silencio y panel de aprendizaje activado.
- Pantalla de carga con progreso para las imágenes.
- Pasada de pulido visual: transiciones entre escenas y estados de botón (hover, deshabilitado).
- Tests Vitest de la lógica pura (configuración de partida y preferencias).

**Fuera de alcance (para otras specs):**

- Deck builder y mazos personalizados.
- Más sets que ST01 y ST02.
- Niveles de dificultad de la IA.
- Multijugador online.
- Estadísticas, historial de partidas y logros.

---

## Modelo de datos

Archivos que se crean o cambian:

```
src/scenes/Boot.ts           (cambia: carga con progreso y pasa a Menu)
src/scenes/Menu.ts
src/scenes/DeckSelect.ts
src/scenes/Board.ts          (cambia: recibe la configuración y termina en GameOver)
src/scenes/GameOver.ts
src/main.ts                  (cambia: registra las escenas)
src/ui/Button.ts
src/ui/AudioManager.ts
src/app/gameConfig.ts        (configuración de partida y construcción de GameState)
src/app/preferences.ts       (lectura y escritura de preferencias)
public/audio/                (efectos y música)
tests/app/gameConfig.test.ts
tests/app/preferences.test.ts
```

Contrato (resumen, la forma exacta se define al implementar):

```ts
interface MatchConfig {
  mode: 'cpu' | 'hotseat'
  decks: Record<PlayerId, string>
  seed: number
}

interface Preferences {
  volume: number
  muted: boolean
  learnPanel: boolean
}
```

Reglas fijadas:

- `MatchConfig` se pasa por los datos de la escena. La escena `Board` crea la partida con `createGame` del motor, y `GameOver` recibe el resultado y la misma `MatchConfig` para la revancha.
- La revancha usa una seed nueva y los mismos mazos. Si el modo es `cpu`, el jugador humano es siempre `p1`.
- Si el mazo elegido es inválido, `DeckSelect` muestra el motivo del error de `createGame` y no avanza.
- `preferences.ts` tolera `localStorage` vacío, corrupto o no disponible: usa valores por defecto y nunca lanza.
- El audio no arranca hasta la primera interacción del usuario (restricción de los navegadores). `AudioManager` maneja ese caso sin errores en consola.
- Los archivos de audio deben ser de licencia libre o generados. Se documenta su origen en `public/audio/ORIGEN.md`.
- La lógica de `gameConfig.ts` y `preferences.ts` es TypeScript puro y no importa Phaser.

---

## Plan de implementación

1. Crear `gameConfig.ts` y `preferences.ts`. Verificar: `gameConfig.test.ts` y `preferences.test.ts` cubren una configuración válida, un mazo inválido, seed nueva en la revancha, `localStorage` vacío, corrupto y no disponible.
2. Crear `Button.ts` y la escena `Menu`. Verificar a mano: los dos botones se ven y reaccionan al mouse.
3. Crear `DeckSelect`. Verificar a mano: se elige el mazo de cada lado, se ve el Leader y un mazo inválido muestra el error.
4. Conectar `Menu`, `DeckSelect` y `Board` con `MatchConfig`. Verificar a mano: se inicia una partida con los mazos elegidos, en modo CPU y en hotseat.
5. Crear `GameOver` y conectarla al fin de partida del motor. Verificar a mano: aparece con el ganador y el motivo, y "Revancha" y "Volver al menú" funcionan.
6. Agregar la pantalla de carga con progreso en `Boot`. Verificar a mano: la barra avanza y no hay errores si falta una imagen.
7. Crear `AudioManager` y agregar los efectos y la música, con control de volumen y silencio. Verificar a mano: cada evento suena y el silencio global funciona. La consola no muestra errores antes de la primera interacción.
8. Guardar y restaurar las preferencias. Verificar a mano: tras recargar la página, el volumen y el panel de aprendizaje mantienen su estado.
9. Agregar las transiciones entre escenas y los estados de botón. Verificar a mano con capturas de pantalla en Chrome.
10. Verificar `npm run typecheck`, `npm test` y `npm run build`, y una partida completa a mano desde el menú hasta la revancha.
11. Commitear cada paso en `feature/pulido`, con mensajes en español.

---

## Criterios de aceptación

- [ ] Al abrir la aplicación aparece el menú con "Jugar contra CPU" y "Jugar entre dos personas".
- [ ] `DeckSelect` lista ST01 y ST02 con su Leader y permite elegir el mazo de cada jugador.
- [ ] Un mazo inválido muestra el error del motor y no inicia la partida.
- [ ] Una partida completa en modo CPU pasa por `Menu`, `DeckSelect`, `Board` y `GameOver` sin errores en consola.
- [ ] `GameOver` muestra el ganador, el motivo y los turnos jugados.
- [ ] "Revancha" inicia otra partida con los mismos mazos y otra seed. "Volver al menú" vuelve a `Menu`.
- [ ] Hay sonido para robar, jugar, atacar, daño y victoria, más música de fondo.
- [ ] El volumen y el silencio funcionan y se conservan al recargar.
- [ ] Sin `localStorage` disponible la aplicación funciona con los valores por defecto.
- [ ] `public/audio/ORIGEN.md` documenta el origen y la licencia de cada archivo de audio.
- [ ] `npm run typecheck`, `npm test` y `npm run build` terminan con código 0.

---

## Decisiones

- **Sí:** `MatchConfig` como único objeto que viaja entre escenas. Hace posible la revancha y mantiene las escenas desacopladas.
- **Sí:** en modo CPU el humano es `p1`. Simplifica la UI. Si importa quién empieza, lo decide la seed del motor y no el lado.
- **Sí:** preferencias en `localStorage`. Es lo mínimo para un juego local sin cuentas.
- **Sí:** lógica de configuración y preferencias pura y testeada. Las escenas se verifican a mano.
- **No:** deck builder, más sets, estadísticas ni historial. Cada uno es otra spec.
- **Sí:** documentar el origen del audio. El repo es privado, pero es la misma regla que se aplica a las imágenes.
- **Sí:** esta spec depende de SPEC 05 (mazos) y SPEC 08 (modo CPU). Es la última del camino principal.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Los navegadores bloquean el audio hasta que hay una interacción | `AudioManager` espera el primer clic y no reproduce antes. Se verifica con la consola abierta. |
| No hay audio libre de licencia a mano | Usar efectos generados o de bancos de licencia libre y documentarlos. Si no hay, entregar la spec sin música y dejar los efectos. |
| Cambiar el flujo de escenas rompe el arranque directo de `Board` que se usaba para desarrollar | Mantener `src/dev/mockGame.ts` (SPEC 06) y un parámetro en la URL que salta el menú, solo en desarrollo. |
| `localStorage` corrupto rompe el arranque | `preferences.ts` captura el error y usa los valores por defecto. Un test lo cubre. |

---

## Lo que **no** entra en esta spec

- Deck builder y mazos personalizados.
- Más sets que ST01 y ST02.
- Niveles de dificultad.
- Estadísticas e historial.
- Multijugador online.

Cada uno de esos puntos, si se hace, va en su propia spec.
