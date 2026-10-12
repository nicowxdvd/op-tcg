# SPEC 16 — Jugadores y relojes reales

> **Estado:** En curso
> **Depende de:** SPEC 14, SPEC 15
> **Fecha:** 2026-10-09
> **Objetivo:** Que los badges de jugador muestren nombres reales y un reloj que corre de verdad, en lugar de los datos fijos de `mockPlayers.ts`.

---

## Alcance

- **Nombres.** `playersFor(config)` en `src/app/players.ts` devuelve nombre en mayúsculas e indicador por jugador: `TÚ` (azul) e `IA · NORMAL` (verde), o `JUGADOR 1/2` en hotseat. Se quitan las banderas.
- **Reloj.** `MatchClock` (`src/app/clock.ts`) lleva el tiempo restante de cada jugador, 20:00 al empezar. Corre para quien tiene que actuar (`controller.actor()`) y se detiene al terminar la partida. Es puro, sin Phaser.
- **Badge.** `PlayerBadge` muestra `mm:ss`, un punto naranja junto al reloj del jugador que corre y rojo cuando quedan menos de 60 s o llegó a 0. `setClock` cambia solo el texto, sin redibujar el tablero.
- **Tick.** Un evento de `Board` cada segundo avanza el reloj y actualiza los textos sin marcar el tablero como sucio.
- Se elimina `src/ui/mockPlayers.ts` y el reloj de Counter de 00:30.

## Qué **no** entra en esta spec

- Perder la partida al llegar a 0: solo se marca en rojo.
- Pausar el reloj durante diálogos o animaciones.
- Reloj distinto por fase (Counter, Block).

## Riesgos conocidos

| Riesgo | Mitigación |
| ------ | ---------- |
| El reloj corre mientras la IA espera su `delayMs`. | Es tiempo de ese jugador, igual que en la referencia. |
| Reiniciar con Reiniciar/Revancha debe empezar en 20:00. | El reloj se crea en `init` de `Board`. |
