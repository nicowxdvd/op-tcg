# SPEC 15 — Log con formato rico

> **Estado:** En curso
> **Depende de:** SPEC 14
> **Fecha:** 2026-10-09
> **Objetivo:** Que el log del panel lateral se lea como el de la referencia de OPlayTCG: nombres coloreados, chips de carta y de timing, separadores de turno y nombres reales (`Tú`, `IA · Normal`) en lugar de `Jugador 1/2`.

---

## Alcance

- **Entradas con segmentos.** `describeEntry` (`src/learn/logEntry.ts`) convierte un `GameEvent` en una `LogEntry`: una línea con segmentos (`actor`, `self`, `card`, `timing`, `dim`, `text`) o un separador de turno. Es puro, sin Phaser.
- **Eventos con formato propio.** Inicio de partida, robo, DON!! ganado, jugar Character/Event/Stage, ataque y efecto activado. El resto reutiliza `describeEvent` y solo reemplaza `Jugador 1/2` por el nombre del jugador.
- **Separador de turno.** Al empezar el Refresh de cada turno: barra dorada `TURNO N · NOMBRE`. Las demás fases dejan de escribirse en el log (siguen en el panel de aprendizaje).
- **Chips.** Carta: código y nombre (`OP14-023 Kikunojo`) con fondo dorado oscuro. Timing: texto sin corchetes sobre azul.
- **Nombres.** `playerNames(config)` en `src/app/players.ts`: `Tú` e `IA · Normal/Difícil/Experto`, o `Jugador 1/2` en hotseat. El jugador propio va en dorado y el rival en azul.
- **Vista.** `LogView` dibuja las entradas con ícono de persona y salto de línea por palabra. El cálculo de posiciones está en `flow` (`src/ui/logLayout.ts`), puro y testeable.
- `GameLog` guarda `LogEntry` en vez de texto.

## Qué **no** entra en esta spec

- Cambios al panel de aprendizaje ni a `describeEvent` (se mantiene su texto plano).
- Costo de DON!! junto a la carta jugada (el evento no lo trae).
- Reloj y nombres de los badges (SPEC 16).

## Riesgos conocidos

| Riesgo | Mitigación |
| ------ | ---------- |
| Un chip más ancho que la columna se sale. | Va solo en su fila; revisar con nombres largos. |
| Sin las fases en el log se pierde contexto al aprender. | El panel de aprendizaje las sigue explicando. |
