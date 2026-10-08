# SPEC 13 — Rediseño de mulligan, zona LIFE, zoom de carta y ataque por flecha

> **Estado:** Implementado
> **Depende de:** SPEC 06, SPEC 11, SPEC 12
> **Fecha:** 2026-10-08
> **Objetivo:** Acercar la UI a las referencias de Nico: diálogo de mulligan en español, zona LIFE con cartas acostadas, zoom de carta grande con el efecto en español y ataque arrastrando una flecha hasta el objetivo, con efecto de choque.

---

## Alcance

- **Diálogo de mulligan.** Título `Tu mano inicial — ¿quedártela o rebarajar?`, subtítulo dorado `Vas primero` / `Vas segundo`, aviso gris y botones `Quedarse` (dorado) y `Mulligan`. Fuente Outfit cargada desde Google Fonts (`DIALOG_FONT` en `theme.ts`, con Montserrat de respaldo). Tamaño al 62,5 % del diálogo normal. Los demás diálogos no cambian.
- **Zona LIFE.** Título `LIFE · N` arriba; cartas acostadas (90°) y apiladas con la primera encima (`LifeArea.ts`).
- **Zoom de carta.** Arriba a la izquierda, al 62 % de la altura de la ventana, con borde dorado. Debajo, panel con el efecto en español (`cardText.ts`, traducción manual de ST01 y ST02; sin traducción cae al inglés). Los keywords entre corchetes quedan en inglés porque los tooltips dependen de esos nombres. El zoom sale de la lista de zonas que no pueden solaparse en `layout.ts`.
- **Ataque por flecha.** Se presiona un atacante resaltado y se arrastra: una flecha punteada y curva, en degradado del color del Líder atacante al del Líder objetivo (`AttackArrow.ts`), sigue el cursor y se engancha al objetivo válido. Al soltar sobre un objetivo aparece sobre él el diálogo `¿Atacar a X?` (reutiliza `HandActionDialog`, con `kind: 'attack'`) con confirmar, cerrar e info. Soltar fuera cancela. Se quitó el arrastre de carta completa para atacar; el de mano y DON!! sigue igual.
- **Efecto de ataque.** El atacante embiste; en el impacto ambas cartas vibran (±3°) y muestran un borde breve del color de su Líder (`CardSprite.shake` y `outline`). El sonido de ataque suma un golpe grave y un chasquido en el impacto. Si el Líder pierde vida, aparece un `-1` en su color que baja mientras se desvanece (`animations.ts`).

## Qué **no** entra en esta spec

- Traducción de cartas fuera de ST01 y ST02.
- Cambios al motor, la IA o las reglas de batalla.
- Soporte táctil del arrastre de flecha.

## Riesgos conocidos

| Riesgo | Mitigación |
| ------ | ---------- |
| `-1` poco legible con Líderes de color oscuro (Black). | Si pasa, usar contorno claro en esos casos. |
| La fuente depende de Google Fonts. | Montserrat queda como respaldo; se puede quitar la carga externa. |
| El panel de texto del zoom puede tapar la parte alta de la mano. | Reducir el alto del zoom si ocurre. |
