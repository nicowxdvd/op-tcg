# SPEC 17 — Ajustes y sonido

> **Estado:** Pendiente
> **Depende de:** SPEC 14, SPEC 16
> **Fecha:** 2026-10-12
> **Objetivo:** Dar vida a los controles de la cabecera del panel lateral que la SPEC 14 dejó como dibujo: popovers de ajustes y sonido, pausa de la IA, modo de confirmación, interacción, modo DON!!, niveles de animación y música. Deja listo el `Popover` que usará la SPEC 18.

---

## Alcance

- **`Preferences` ampliado.** Se suman `confirm` (`fast` | `assisted` | `cautious`), `interaction` (`click` | `drag` | `hybrid`), `donMode` (`cards` | `panel`), `aiPause` (`long` | `normal` | `short` | `none`), `animations` (`immersive` | `full` | `reduced` | `minimal`), `effects` (boolean) y `music` (boolean). Valores por defecto: `assisted`, `hybrid`, `cards`, `normal`, `immersive`, `true`, `false`. `sanitize` descarta valores fuera del conjunto y usa el defecto; no se pierde ninguna clave existente (`volume`, `muted`, `learnPanel`).
- **Componentes UI nuevos.** `Popover` (panel anclado a un rectángulo, se cierra con clic fuera y con Escape), `Toggle` (interruptor) y `Segmented` (opciones exclusivas con descripción). Solo Phaser y `theme.ts`; sin lógica de juego.
- **Popover ⚙ (Ajustes).** Se abre bajo el engranaje con cuatro secciones: INTERACCIÓN (Clic · Arrastrar · Híbrido), DAR DON!! (Cartas · Panel), PAUSA DE LA IA (Larga · Normal · Corta · Ninguna) y ANIMACIONES (Inmersivo · Completo · Reducido · Mínimo). Cada sección muestra su descripción, tomada de `docs/analisis-oplaytcg.md` §F15.
- **Popover 🔊 (Sonido).** `Efectos` (interruptor), `VOLUMEN` (medidor de 4 barras sobre el `volume` actual, pasos de 0.25) y `Música` (interruptor). Reemplaza el mute directo del botón 🔊; el icono sigue tachado cuando `effects` está apagado o el volumen es 0.
- **Píldora "Normal".** Cicla la pausa de la IA en cada clic: Larga → Normal → Corta → Ninguna. Su etiqueta refleja el valor y su `title` dice "Pausa de la IA: <valor>".
- **Píldora "Asistido".** Cicla Rápido → Asistido → Cauteloso. Etiqueta `✓ <modo>`, tooltip "Cuánto te frena el simulador antes de ejecutar una jugada". Esta spec solo guarda y muestra el modo; qué acciones confirma se define en la SPEC 18.
- **Pausa de la IA conectada.** `delayMs` deja de ser fijo: Larga 1200, Normal 600, Corta 250, Ninguna 0. El `GameController` lee el valor al programar cada jugada, así que un cambio en medio de la partida aplica a la jugada siguiente. El sorteo de inicio conserva su mínimo `ROLL_DELAY_MS`.
- **Música.** El interruptor llama a `AudioManager.startMusic()` / `stopMusic()` y guarda `music`. `AudioManager` lee `effects` y `music` de `Preferences` al construirse. Con `effects` apagado, `play()` no suena; la música no depende de ese interruptor.
- **Niveles de animación.** `animations.ts` recibe el nivel y escala las duraciones de `DURATION` (Inmersivo ×1, Completo ×0.8, Reducido ×0.5, Mínimo sin tween: la carta salta a su destino). Los efectos de impacto extra (flash del Líder, sacudida) solo corren en Inmersivo y Completo.
- **Interacción.** `Clic` desactiva `setDraggable` en las cartas; `Arrastrar` desactiva el clic como gesto de jugar y atacar y deja solo el arrastre; `Híbrido` conserva el comportamiento actual (ambos).
- **Persistencia.** Todo cambio se guarda al instante con `savePreferences`, sin pisar las otras claves.
- **Accesibilidad.** `aria-label` no existe en Phaser; se cubre con el `title` de cada píldora y con el texto visible de cada opción.

## Qué **no** entra en esta spec

- Qué acciones pide confirmar cada modo y el popover ✓ / ✕ de confirmación (SPEC 18). El modo `Asistido` ya es el defecto; hasta la SPEC 18 el comportamiento de confirmación no cambia.
- Cambio de tema Día / Noche (🌙). No existe tema claro; el botón queda como está.
- Minimizar el panel (─). No se observó su comportamiento en la referencia.
- Modo DON!! `Panel`: se guarda y se muestra la preferencia, pero el modo `Cartas` es el único con comportamiento hasta que se defina el gesto (ver Decisiones).
- El botón **▷ Ver ejemplo** de las animaciones.
- Pérdida por tiempo y reloj opcional (SPEC 22).
- Cambiar `Reiniciar`, `Conceder` o `← Salir`.

## Decisiones

- **Modo DON!! Panel.** Se guarda la preferencia y la opción aparece deshabilitada en el popover con la etiqueta "Próximamente", hasta definir el gesto.
- **Volumen.** Medidor de 4 barras, como la referencia.
- **Interacción.** `Clic` significa "sin arrastre" y `Arrastrar` significa "sin clic para jugar ni atacar", sin gestos nuevos. `Híbrido` conserva ambos.

## Archivos

| Archivo | Cambio |
| ------- | ------ |
| `src/app/preferences.ts` | Campos nuevos, tipos de unión, `sanitize` y defectos. |
| `src/app/createController.ts` | `delayMs` según `aiPause`; mapa `AI_PAUSE_MS`. |
| `src/ui/GameController.ts` | Leer `delayMs` en cada `scheduleCpu`; método para cambiar la pausa. |
| `src/ui/AudioManager.ts` | `effects`, `music`, `setEffects`, `setMusic`; `play` respeta `effects`. |
| `src/ui/Popover.ts`, `Toggle.ts`, `Segmented.ts` | Nuevos. |
| `src/ui/SidePanel.ts` | Acciones reales en 🔊, ⚙, "Normal" y "Asistido"; datos en `SideData`. |
| `src/ui/animations.ts`, `theme.ts` | Escala de duración por nivel. |
| `src/scenes/Board.ts` | Conectar popovers, interacción y preferencias; mínimo de cambios en `drawSidePanel`. |
| `tests/app/preferences.test.ts` | Valores inválidos, defectos y retrocompatibilidad. |
| `tests/ui/gameController.test.ts` | La pausa cambia entre jugadas de la IA. |
| `tests/ui/animations.test.ts` | Escala por nivel (función pura). |

## Criterios de aceptación

- Un `localStorage` guardado antes de esta spec carga sin errores y conserva `volume`, `muted` y `learnPanel`.
- Cambiar la pausa de la IA en la partida cambia el tiempo entre sus jugadas sin reiniciar.
- Con `Ninguna`, la IA juega sin espera salvo el sorteo.
- El interruptor de música enciende y apaga la melodía; el estado persiste al recargar.
- Los popovers se cierran con clic fuera y con Escape, y solo hay uno abierto a la vez.
- Los cuatro niveles de animación se pueden elegir; Mínimo no usa tweens de movimiento.
- `npm test` y `tsc` pasan.

## Riesgos conocidos

| Riesgo | Mitigación |
| ------ | ---------- |
| `Board.ts` (959 líneas) se redibuja entero y puede cerrar el popover al marcar `dirty`. | El popover vive en una capa propia, fuera de `layer`, y no se destruye en el redibujado. |
| La SPEC 18 y la 22 también tocan `SidePanel.ts` y `Board.ts`. | Esta spec va primero; la 18 reutiliza `Popover` y `confirm`. |
| `AudioManager` es un singleton creado al importar y lee `Preferences` en el constructor. | Los setters nuevos guardan en `apply()` como `setVolume`; los tests usan el `PreferencesStorage` inyectable. |
| Reducir animaciones puede dejar sprites sin llegar a su destino. | Con Mínimo se asigna `x`/`y` final directo, sin tween. |

## Orden sugerido

1. `Preferences` y tests (base de todo).
2. `Popover`, `Toggle`, `Segmented`.
3. Sonido: `AudioManager`, popover 🔊, música.
4. Pausa de la IA y píldora "Normal".
5. Píldora "Asistido" y popover ⚙ (interacción, DON!!).
6. Niveles de animación.
