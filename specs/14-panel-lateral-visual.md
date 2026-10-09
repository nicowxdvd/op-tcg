# SPEC 14 — Paleta y panel lateral visual

> **Estado:** En curso
> **Depende de:** SPEC 11, SPEC 13
> **Fecha:** 2026-10-09
> **Objetivo:** Acercar el aspecto del tablero a la referencia de OPlayTCG: paneles teñidos con el color del Líder, banner azul, cabecera del panel lateral con controles y botón Conceder. Solo diseño: los controles nuevos no hacen nada todavía (SPEC 17).

---

## Alcance

- **Paneles teñidos.** Cada panel de jugador toma el color de su Líder: relleno oscuro y borde atenuado. Sale de `leaderColor()` en `Board.ts` y `panelTint()` en `theme.ts`.
- **Banner azul.** El aviso `ACTÚA TÚ` pasa de carmesí a azul (`COLORS.banner`).
- **Cabecera del panel lateral.** Tres filas: `← Salir`, título de fase, pill `BETA` y botón `–`; fila `Reiniciar`; fila de controles con sonido, luna, pill `Normal`, pill `Asistido` y engranaje.
- **Terminar turno.** Se agrega el ícono `play` al botón.
- **Conceder.** Botón discreto a la derecha de `Reportar un problema` (`concede` en `layout.ts`).

## Qué **no** entra en esta spec

- Acciones de Salir, Reiniciar, Conceder, sonido, velocidad, `Asistido` y `–` (SPEC 17).
- Log con chips y separadores (SPEC 15).
- Relojes y nombres reales (SPEC 16).

## Riesgos conocidos

| Riesgo | Mitigación |
| ------ | ---------- |
| Líder Black o Yellow da un panel casi negro o muy claro. | `panelTint` mezcla poco color con el fondo; revisar con ambos. |
| La cabecera más alta reduce el log. | Probar a 1024×600 con `allRects` en `layout.test.ts`. |
