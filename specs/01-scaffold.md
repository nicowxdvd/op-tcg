# SPEC 01 — Scaffold del proyecto (Vite + TypeScript + Phaser 4 + Vitest)

> **Estado:** Borrador
> **Depende de:** ninguna
> **Fecha:** 2026-10-02
> **Objetivo:** Dejar un repo git con Gitflow y un proyecto Vite + TypeScript + Phaser 4 + Vitest que arranca, compila y corre un test trivial.

---

## Por qué existe esta spec

`docs/plan.md` define 10 fases para el juego de One Piece TCG. Es demasiado para una sola spec. Se divide una spec por fase, y esta cubre solo la fase 1 porque todas las demás dependen de ella.

Roadmap de specs (cada una se escribe con su propio `/spec`):

| Spec | Contenido |
| ---- | --------- |
| 01 | Scaffold (esta) |
| 02 | Motor base: tipos, setup, mulligan, fases, DON!!, Character sin efectos, límite 5 |
| 03 | Batalla: ataque, Blocker, Counter, daño, Life, victoria |
| 04 | Efectos y keywords |
| 05 | Datos: `fetchCards.ts`, ST01 y ST02, mazos |
| 06 | UI Phaser: tablero, mano, drag-and-drop, zoom de carta |
| 07 | Modo aprendizaje: panel de fase, log, tooltips |
| 08 | IA simple 1 vs CPU |
| 09 | Pulido: menú, selección de mazo, sonido |

---

## Alcance

**Dentro:**

- Repo git inicializado con ramas `main`, `develop` y `feature/scaffold`.
- `.gitignore` en la raíz con `docs/`, `node_modules/`, `public/cards/` y `dist/`.
- Proyecto npm con TypeScript en modo `strict`.
- Vite como dev server y bundler.
- Phaser 4 instalado, con una escena `Boot` que levanta el canvas.
- Vitest con un test trivial.
- Scripts npm: `dev`, `build`, `test`, `typecheck`.
- Carpeta `src/engine/` vacía y `tests/engine/` con el test trivial, para fijar la ubicación del motor.
- `specs/` versionado en git.

**Fuera de alcance (para otras specs):**

- Cualquier tipo, estado o regla del motor (SPEC 02 en adelante).
- Script `fetchCards.ts`, JSON de cartas e imágenes (SPEC 05).
- Escenas `Menu`, `DeckSelect`, `Board`, `GameOver` y componentes `ui/` (SPEC 06 y 09).
- IA (SPEC 08).
- ESLint y Prettier.
- Colyseus y multijugador.
- Carpetas `src/data/`, `src/ai/`, `src/ui/` y `scripts/`: las crea la spec que las usa.

---

## Modelo de datos

Esta feature no introduce estructuras de datos. Solo fija la ubicación del motor en `src/engine/` y de sus tests en `tests/engine/`.

Archivos que se crean o cambian:

```
.gitignore
package.json
tsconfig.json
vite.config.ts
vitest.config.ts        (solo si Vitest no puede compartir vite.config.ts)
index.html
src/main.ts
src/scenes/Boot.ts
src/engine/.gitkeep
tests/engine/smoke.test.ts
specs/01-scaffold.md
specs/.spec-config.yml
```

Convenciones:

- El motor en `src/engine/` es TypeScript puro y no importa Phaser.
- Los tests viven en `tests/engine/*.test.ts`.

---

## Plan de implementación

1. Ejecutar `git init` y crear `.gitignore` con `docs/`, `node_modules/`, `public/cards/` y `dist/`. Crear el commit inicial en `main`, luego la rama `develop` y desde ella `feature/scaffold`. Verificar con `git branch --show-current`.
2. Crear `package.json` con los scripts y `tsconfig.json` con `strict: true`. Instalar Vite y TypeScript. Verificar: `npm run typecheck` pasa sin archivos fuente.
3. Crear `index.html` y `src/main.ts` mínimos servidos por Vite. Verificar: `npm run dev` sirve la página y `npm run build` genera `dist/`.
4. Instalar Phaser 4. Crear `src/scenes/Boot.ts` y registrarla en `src/main.ts` con un `Phaser.Game`. La escena muestra un texto fijo. Verificar: el canvas aparece en el navegador sin errores en consola.
5. Instalar Vitest. Crear `tests/engine/smoke.test.ts` con una aserción trivial y `src/engine/.gitkeep`. Verificar: `npm test` pasa.
6. Commitear los pasos 2 a 5 en `feature/scaffold`, uno por paso, con mensajes en español.

---

## Criterios de aceptación

- [ ] `git branch --list` muestra `main`, `develop` y `feature/scaffold`.
- [ ] `git branch --show-current` devuelve `feature/scaffold` al terminar.
- [ ] `.gitignore` contiene las líneas `docs/`, `node_modules/`, `public/cards/` y `dist/`.
- [ ] `git ls-files docs` no devuelve nada.
- [ ] `git ls-files specs` incluye `specs/01-scaffold.md`.
- [ ] `npm run typecheck` termina con código 0 y `tsconfig.json` tiene `"strict": true`.
- [ ] `npm run build` termina con código 0 y crea `dist/index.html`.
- [ ] `npm test` termina con código 0 y reporta al menos 1 test pasado.
- [ ] `npm run dev` sirve la app y el canvas de Phaser muestra el texto de la escena `Boot`.
- [ ] La consola del navegador no muestra errores al cargar la app.
- [ ] Ningún archivo bajo `src/engine/` importa `phaser`.

---

## Decisiones

- **Sí:** una spec por fase del plan. Una spec con las 10 fases no cabe en un objetivo de una oración.
- **Sí:** SPEC 01 cubre solo el scaffold (fase 1). Es chica, verificable y desbloquea los worktrees paralelos del plan.
- **No:** scaffold más motor base en la misma spec. Es más grande y rompe la regla del objetivo en una oración.
- **Sí:** specs en español con estados `Borrador` / `Aprobado` / `Implementado`, igual que `docs/plan.md`.
- **Sí:** `specs/` versionado en git. Es el contrato que usa `/spec-impl`.
- **No:** ignorar `specs/` como `docs/`.
- **Sí:** npm y TypeScript `strict`, sin linters. Es lo mínimo para arrancar.
- **No:** ESLint y Prettier por ahora. Se agregan en una spec aparte si hacen falta.
- **No:** pnpm. Sin necesidad que justifique cambiar de gestor.
- **Sí:** commit inicial directo en `main` para crear el repo. Gitflow necesita un primer commit para poder ramificar. A partir de ahí, ningún commit va a `main` ni a `develop`.
- **Sí:** `public/cards/` ignorado desde el inicio. Las imágenes oficiales no se publican (repo privado).
- **Sí:** crear solo `src/engine/` y `tests/engine/`. El resto de carpetas del plan las crea la spec que las necesita, para no dejar carpetas vacías sin dueño.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Phaser 4 no tiene paquete npm estable o su API difiere de la documentación de Phaser 3 | Verificar versión y API en el paso 4 antes de escribir `Boot.ts`. Si falla, parar y reabrir la decisión con Nico en lugar de caer a Phaser 3. |
| Vitest y Vite con versiones incompatibles | Instalar ambos con versiones compatibles según la documentación de Vitest. Si hace falta, usar `vitest.config.ts` separado. |

---

## Lo que **no** entra en esta spec

- Reglas, tipos o estado del motor.
- Datos de cartas, imágenes y script de descarga.
- Menú, tablero y cualquier escena además de `Boot`.
- IA.
- ESLint y Prettier.
- Multijugador.

Cada uno de esos puntos, si se hace, va en su propia spec.
