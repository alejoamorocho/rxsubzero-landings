# Verificación de Beauty y Health

7 de octubre de 2026. Cambios aplicados en el proyecto local; no se realizó publicación.

## Actualización: hero interactivo con personas

Ambas portadas incorporan un visor de cuatro fotografías con escenas nuevas de personas: rutina, producto, interior y plegado. Permite elegir miniaturas, usar flechas y teclado, deslizar horizontalmente y ampliar la imagen completa. Se conserva la selección al cambiar EN/ES. No hay reproducción automática ni dependencia de producción nueva.

Verificación final de esta ampliación: **27/27 pruebas funcionales pasan** (`tests/explorer.cjs` y `tests/navigation.cjs`), **28 combinaciones de página/idioma/ancho**, **112 vistas del visor** y **3 configuraciones sin JavaScript**. Se revisaron también las ampliaciones a 320 y 1440 px. La revisión independiente quedó sin hallazgos pendientes.

Las pruebas cubren cargas lentas, respuestas tardías, cancelación, reintento de una foto fallida, foco de teclado, fallos de alta resolución con conservación de la foto disponible y avisos accesibles dentro del diálogo. Se comprobaron nuevamente la sintaxis JavaScript y los espacios del diff.

[Decisión, fuentes, archivos de imagen y prompts de esta ampliación](superpowers/specs/2026-10-07-interactive-hero.md).

Los resultados de la primera mejora se conservan abajo como registro.

## Resultado

- Dos entradas rediseñadas con identidad común y ambientes distintos: Beauty claro, Health azul pizarra.
- Nuevas imágenes de portada, con referencias del producto existente. WebP de 600 y 1120 px: aproximadamente 47/105 KiB para Beauty y 52/129 KiB para Health.
- Navegación directa entre Belleza y Bienestar, estado de página activa e idioma conservado en la URL.
- EN/ES disponible en móvil, textos revisados y espacio flexible para ambas traducciones.
- Menú y anclas con foco de teclado, preguntas frecuentes estables y barra móvil que se oculta junto a la oferta.
- Aviso visible si una traducción falla; el idioma aplicado se mantiene intacto.
- Producto y escenas sin deformación; la oferta aclara que se muestra abierto y plegado.

## Comprobaciones ejecutadas

`tests/navigation.cjs`: **12 de 12 pruebas pasan** en Chromium. Incluye respuestas de idioma fuera de orden, fallo de descarga, diccionario incompleto, preferencia guardada no disponible, prioridad de URL, cambio de página, menú, foco de anclas, FAQ con clics rápidos, barra móvil, disponibilidad de compra y todas las traducciones del HTML.

`tests/visual-qa.cjs`: **28 combinaciones pasan**: dos páginas, dos idiomas y anchos de 320, 390, 600, 768, 980, 1024 y 1440 px. Comprobó desbordamientos, enlaces internos, estado activo de página, imágenes cargadas y separación entre foto y titular. **Tres comprobaciones adicionales sin JavaScript** pasan a 390, 800 y 1440 px con altura de 320 px.

Se revisaron capturas completas y portadas de ambas páginas en español e inglés, en móvil y escritorio. Se comprobó sintaxis JavaScript, coherencia de textos de respaldo y ausencia de errores de página y recursos locales. Revisión independiente de código realizada; sus correcciones de contraste y navegación sin JavaScript se integraron.

Estas comprobaciones son de Chromium y tamaños de ventana simulados; no equivalen a una prueba en dispositivos físicos o en todos los navegadores.

Capturas y reporte detallado: `output/qa/` (generados localmente, fuera del control de versiones).

## Pendiente externo

Falta el enlace real de compra en `assets/js/config.js`, propiedad `purchaseUrl`. Mientras esté vacío se muestra “Próximamente”; no hay una compra operativa. El precio de referencia existente sigue siendo USD 49.90. No se publicaron cambios ni se añadieron afirmaciones de resultados médicos o condiciones de envío.

## Documentación relacionada

- [Plan y dirección de diseño](superpowers/plans/2026-10-07-landing-polish.md)
- [Imágenes, archivos y prompts usados](superpowers/specs/2026-10-07-editorial-images.md)

## Repetir las pruebas

Se necesita Node.js con Playwright resoluble en `NODE_PATH` o instalado en el entorno de desarrollo. Las pruebas de navegación crean su propio servidor y usan Chrome (o `CHROME_PATH`). La revisión visual usa Edge (o `BROWSER_CHANNEL`) y requiere un servidor del proyecto en `http://127.0.0.1:4173` (o `PREVIEW_URL`).

```
node --test tests/navigation.cjs
node --test tests/explorer.cjs tests/navigation.cjs
node tests/visual-qa.cjs
node --check assets/js/app.js
git diff --check
```
