# One Piece TCG — Grand Line en el navegador 🏴‍☠️

Un simulador web del **One Piece Card Game** para aprender a jugar. La idea: sentarte a la mesa contra una IA local, con ayudas en pantalla, hasta que las reglas te salgan solas. Más adelante, nakamas online.

> "¡Voy a ser el Rey de los Piratas!" — y también a ganar mi primera partida de TCG.

## Estado de la travesía

| Etapa | Spec | Estado |
|-------|------|--------|
| Scaffold (Vite + Phaser 4 + Vitest) | `01-scaffold` | Zarpó (implementado) |
| Motor base | `02-motor-base` | Zarpó (implementado) |
| Batalla | `03-batalla` | Zarpó (implementado) |
| Efectos y keywords | `04-efectos-keywords` | Zarpó (implementado) |
| Datos de cartas | `05-datos` | Zarpó (implementado) |
| UI con Phaser | `06-ui-phaser` | Zarpó (implementado) |
| Mejora de UI/UX | `11-mejora-ui-ux` | Zarpó (implementado) |
| Modo aprendizaje | `07-modo-aprendizaje` | En el mapa |
| IA simple | `08-ia-simple` | Zarpó (implementado) |
| Pulido | `09-pulido` | En el mapa |
| Efectos ST-01 / ST-02 | `10-efectos-cartas-st01-st02` | Zarpó (implementado) |

El motor ya resuelve una partida completa: creación de partida, mulligan, Life, fases del turno, DON!!, jugar Characters, Events y Stages, adjuntar DON!!, la batalla (ataque, Blocker, Counter, daño, K.O. y victoria por Life) y un sistema de efectos por datos con los keywords Rush, Double Attack y Banish, los triggers `[On Play]`, `[When Attacking]`, `[On K.O.]`, `[Activate: Main]`, `[End of Your Turn]`, `[Counter]` y `[Trigger]`, y decisiones del jugador. Las cartas de ST-01 y ST-02 ya se cargan desde JSON local, con dos mazos de práctica de 50 cartas, y sus 34 cartas distintas tienen los efectos codificados. El tablero en Phaser ya permite jugar contra una CPU (IA simple). El resto del tesoro está por descubrir.

## Tripulación (stack)

- **Phaser 4**: escenas, input, tweens, assets (el barco).
- **TypeScript**: todo tipado.
- **Vite**: servidor de desarrollo y build.
- **Vitest**: tests del motor.

## Zarpar

```bash
npm install
npm run dev        # servidor de desarrollo
npm run build      # typecheck + build de producción
npm test           # tests con Vitest
npm run typecheck  # solo tsc
npm run fetch:cards # descarga cartas e imágenes de ST-01 y ST-02 (imágenes fuera de git)
```

## Mapa del proyecto

```
src/
  main.ts        # punto de entrada, configura Phaser
  scenes/        # escenas de Phaser (Boot por ahora)
  data/          # cartas y mazos de ST-01 y ST-02 en JSON, conversión a CardDef y cargador
  engine/        # motor de reglas (TypeScript puro, sin Phaser): tipos, estado, RNG, fases, acciones, batalla, efectos y consultas
scripts/         # scripts de utilidad (fetchCards)
tests/           # tests del motor, de datos y de humo
specs/           # una spec por etapa, con estado Borrador/Aprobado/Implementado
```

## Filosofía de diseño

- **El motor de reglas es independiente de Phaser.** Es TypeScript puro y testeable: `apply(state, action)` devuelve un estado nuevo, sin mutar el anterior. La UI solo envía acciones y anima eventos.
- **El mismo motor servirá para el online.** Un servidor autoritativo lo reutilizará tal cual cuando llegue el multijugador.
- **Specs primero.** Cada etapa se escribe como spec en `specs/` antes de programarla.

## Flujo de trabajo

Gitflow: `feature/*` y `bugfix/*` salen de `develop`; `release/*` y `hotfix/*` salen de `main`. Nada se commitea directo a `main` ni `develop`.

## Aviso

Proyecto personal y sin fines de lucro, hecho para aprender. Las cartas e imágenes de One Piece Card Game pertenecen a sus dueños (Bandai / Eiichiro Oda / Shueisha / Toei Animation). Las imágenes no se publican en el repo.
