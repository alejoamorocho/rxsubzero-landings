# Hero interactivo con escenas de personas

7 de octubre de 2026. Extensión del diseño de Beauty y Health solicitada por el usuario, con decisión de implementación delegada explícitamente.

## Decisión

Se añade un visor fotográfico con cuatro vistas: **En tu rutina**, **Producto**, **Interior** y **Plegado**. La primera incorpora una escena nueva con una persona; las demás enseñan la forma, el tubo y el almacenamiento. El cambio es manual mediante miniaturas, flechas, teclado o deslizamiento horizontal. La ampliación conserva la fotografía completa y permite recorrer las vistas sin cerrar el diálogo.

La interacción usa JavaScript y CSS del proyecto, sin dependencia de producción adicional. No hay reproducción automática ni simulación de giro 360°. No existe en el repositorio un modelo 3D ni una secuencia fotográfica de giro con la que representar con fidelidad todos los ángulos. Para evaluar la alternativa 3D se consultó [la documentación oficial de model-viewer](https://modelviewer.dev/docs/index.html), que trabaja con modelos glTF/GLB. Los controles del visor toman como referencia [las recomendaciones de W3C para carruseles](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/).

## Diseño e integración

Se conserva la paleta, tipografía, alineación y estructura bilingüe del plan anterior. La fotografía dispone de un marco 6:5, seguida por descripción y miniaturas. Las etiquetas están fuera de las fotografías y los controles no cubren el rostro ni el producto. Se mantiene la composición clara de Beauty y azul pizarra de Health.

- `assets/css/explorer.css`: marco, controles, miniaturas, diálogo y movimiento reducido.
- `assets/js/explorer.js`: selección, teclado, gestos, cargas de imágenes, estado y ampliación.
- `beauty.html` y `health.html`: estructura semántica del visor y fotografía inicial visible sin JavaScript.
- Cuatro diccionarios: nombres, descripciones, texto alternativo, controles y errores EN/ES.
- `tests/explorer.cjs`: regresiones del visor.
- `tests/visual-qa.cjs`: tamaños de pantalla, todos los estados del visor y respaldo sin JavaScript.

## Imágenes nuevas

Generadas con la herramienta ImageGen integrada y las referencias de producto ya existentes. Se revisaron color, bandas, asas, proporciones, base y tubo doble. Las escenas muestran una pausa junto al producto, sin inventar inmersión ni interacción física con la boquilla.

Archivos finales:

- `assets/img/beauty-hero-life-1200.webp`
- `assets/img/beauty-hero-life-600.webp`
- `assets/img/health-hero-life-1200.webp`
- `assets/img/health-hero-life-600.webp`
- Miniaturas `assets/img/beauty-explorer-thumb-0.webp` a `beauty-explorer-thumb-3.webp` y `health-explorer-thumb-0.webp` a `health-explorer-thumb-3.webp`.

Las variantes de 600 px pesan aproximadamente 36 y 44 KiB. Las variantes de 1200 px pesan aproximadamente 91 y 126 KiB. La primera escena tiene prioridad de carga; las fotografías secundarias se decodifican antes de mostrarse. Las miniaturas son decorativas y cada botón tiene su propia etiqueta.

### Prompt Beauty

Use case: photorealistic-natural, using a precise product reference. Asset: RX SUBZERO Beauty interactive website hero, landscape 6:5 composition, 1200x1000. Create a believable candid morning photograph of an adult woman in her early 30s with natural skin texture, subtle freckles, dark hair loosely tied, simple pale cotton sleeveless top, standing comfortably behind a bathroom vanity, softly smiling to herself while holding a white cotton face towel near her chest after her facial routine. In front of her on the pale grey vanity show the EXACT basin in the reference: steel-blue rectangular basin with rounded corners and handles, two white collapsible bands, blue inner base, two clear tubes joined to the exact blue mouthpiece. Preserve reference proportions, construction, color and all tube geometry. Entire product fully visible, plausible tabletop size roughly the width of her shoulders, NOT giant. Product centered lower middle, person face fully visible upper left/middle; at least 8% margins around product and person head. No immersion, no tube in mouth, no invented use. Basin sits naturally supported by the counter with contact shadows. Gentle side window daylight, simple real home bathroom, imperfect natural materials. Editorial photography 50mm lens, moderate depth of field keeping product sharp and woman readable. No artificial skin smoothing, no glow, no CGI, no mist, no splash, no ice, no overproduced spa, no text or logos. Quiet genuine human moment; the person's face and product never overlap. Keep all meaningful content within frame for the full 6:5 image.

Referencia: `assets/img/beauty-product-authentic.webp`.

### Prompt Health

Use case: photorealistic-natural using precise product reference. Asset: RX SUBZERO Wellness interactive website hero. Landscape 6:5 image, 1200x1000. A believable everyday editorial photograph of a healthy-looking adult man in his late 30s with short dark hair and subtle stubble, natural unretouched skin, dark charcoal cotton T-shirt, standing comfortably at a dark slate bathroom counter near a diffuse daylight window. His head fully visible in upper half with generous margin, calm unposed expression, one hand casually holding a grey towel beside him, hands anatomically correct. The EXACT referenced steel-blue-and-white rectangular collapsible facial basin rests on counter in front of him, shown fully at three-quarter angle in the lower middle. Preserve same two white flexible bands, blue integrated base, blue handles, rectangular rounded-corner shape, transparent twin breathing tubes and precise blue mouthpiece from reference. Product plausibly around shoulder-width, not oversized; all product edges and mouthpiece in frame. Person is preparing a quiet home routine, not exercising or immersing; no mouthpiece in mouth. Clear face and separate readable product. Modern modest real home, no gym, no spa fantasy. Soft window sidelight, realistic matte materials, textured slate, restrained natural tones, nuanced contact shadows. 50mm editorial camera, sharp product, medium depth of field, no HDR, no artificial fog, no glow, no excessive droplets, no ice, no 3D CGI appearance. No text, labels or graphics. Every product part unchanged from reference. Photography feels candid rather than staged stock.

Referencia: `assets/img/health-product-authentic.webp`.

## Alcance de la entrega

Validación final: 27/27 pruebas funcionales, 28 combinaciones de página/idioma/ancho, 112 vistas y tres configuraciones sin JavaScript. Se comprobaron los fallos de carga y la ampliación con conexión lenta, y la revisión independiente no dejó hallazgos pendientes.

Cambios locales, sin publicación. Continúa pendiente el enlace de compra en `assets/js/config.js`. La compra no se activa hasta que se configure.
