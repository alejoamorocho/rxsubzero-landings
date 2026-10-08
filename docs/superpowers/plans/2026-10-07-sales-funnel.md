# Sales Funnel Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for the shared layout and purchase behavior; the copy subagent owns only the four locale dictionaries.

**Goal:** Convertir las dos páginas en un recorrido claro de deseo, decisión y compra.

**Architecture:** HTML, CSS y JavaScript existentes; textos EN/ES en diccionarios. Todas las CTA de intención llegan a una oferta central; solo su botón de compra sale al enlace HTTPS configurado.

**Tech Stack:** HTML/CSS/vanilla JavaScript; Node y Playwright para verificar.

**Spec:** `docs/superpowers/specs/2026-10-07-sales-funnel.md`.

## Global Constraints

Mantener producto, fotografías, idiomas, precio de referencia y disponibilidad honesta. No publicar afirmaciones ni condiciones comerciales no confirmadas. Reutilizar el checkout local autorizado y visible en la previsualización; no tocar `_rescate-20260912/`.

## Review Focus

- Un enlace inválido no debe convertirse en un botón de compra activo.
- La URL de compra conserva parámetros y no recibe el idioma del sitio arbitrariamente.
- Traducciones largas no ocultan acciones ni imágenes, especialmente a 320 px.
- Los destinos de CTA quedan debajo de la cabecera y reciben foco de teclado.
- Las fotos de producto abierto y plegado no se interpretan como dos unidades incluidas.

### Task 1: Reorganizar el recorrido y la oferta

Files: `beauty.html`, `health.html`, `assets/css/authentic.css`, `assets/i18n/*.json`.

- [x] Reescribir deseo, razones prácticas, contenido del conjunto y cierre en las cuatro traducciones.
- [x] Retirar pain/story del HTML, mover oferta antes de preguntas y reemplazar el cierre entre audiencias por invitación a adquirir.
- [x] Añadir CTA de experiencia, contenido exacto de dos piezas, lista de oferta y diseño de cierre. Sin nuevas imágenes ni librerías.
- [x] Sincronizar respaldo inglés del HTML y comprobar visualmente móvil/escritorio.

### Task 2: Asegurar la salida comercial

Files: `assets/js/app.js`, `tests/navigation.cjs`.

- [x] Añadir regresiones para CTA hero/final/navegación → oferta, URL HTTPS exacta con parámetros en ambos idiomas y URL inválida sin compra activa.
- [x] Ejecutar las nuevas pruebas antes del cambio de comportamiento y comprobar el fallo esperado.
- [x] Validar URL HTTPS con `new URL(value)`; conservar el valor original validado en `href`. El destino vacío o inválido mantiene el estado pendiente.
- [x] Ejecutar navegación y galería; conservar todas las pruebas verdes.

### Task 3: Revisar y entregar

- [x] Ejecutar `tests/visual-qa.cjs`: dos páginas, dos idiomas, siete anchos, galería y ausencia de JavaScript.
- [x] Inspeccionar capturas y solicitar revisión independiente de cambios.
- [x] Registrar resultados y limitación de Shopify y actualizar la previsualización. La publicación seguirá la autorización vigente después de estas comprobaciones.

## Decisiones

No se añade analítica de terceros ni formularios sin destino. Esta iteración valida recorrido y presentación; no afirma mejoras de conversión medidas. La conexión de compra real depende del enlace que entregue el usuario.
