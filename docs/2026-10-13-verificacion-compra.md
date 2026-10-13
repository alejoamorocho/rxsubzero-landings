# Verificación del recorrido de compra

13 de octubre de 2026, America/Bogota.

## Implementado

Las dos páginas abren un panel de producto con galería, cantidad, piezas incluidas y añadir al carrito. El carrito lateral conserva sus productos entre páginas y permite cambiar cantidades y eliminar líneas. En GitHub funciona como demostración marcada y no permite pagar.

En Shopify, el mismo componente recibe el producto seleccionado en el editor, sus variantes, precios, reglas de cantidad, disponibilidad y fotografías. Usa rutas locales de carrito y continúa al checkout nativo. El paquete incluye layout, plantillas, sección, traducciones, imágenes y respaldo de compra sin JavaScript. Los idiomas nativos respetan el mercado y la moneda de la tienda.

## Evidencia

- `tests/commerce.cjs`, `tests/explorer.cjs` y `tests/navigation.cjs`: **47/47 pruebas funcionales**. Incluyen 16 de comercio; con las 9 del generador, se verifican **56/56 pruebas** entre las suites ejecutadas.
- `tests/shopify-package.cjs`: **9/9 comprobaciones** de plantilla, recursos, traducciones, integridad, conservación del tema existente, estructura del ZIP y consistencia de archivos Windows/Linux.
- `tests/visual-qa.cjs`: **28 combinaciones** de página, idioma y ancho; **112 vistas** de galería y **3 configuraciones sin JavaScript**.
- `tests/commerce-visual.cjs`: **28 diseños** de panel/carrito, **112 fotografías** elegidas y una pantalla móvil corta de 320 × 480 px.
- Capturas revisadas en EN/ES a 390 y 1440 px. El producto queda completo, el botón de cerrar accesible al desplazarse y los importes no se desbordan.
- Revisión independiente: se corrigió una lectura antigua que podía borrar visualmente un añadido reciente, la restauración de foco tras editar carrito y la foto inicial de variante. Hay pruebas específicas de estas correcciones.
- Shopify Theme Check sobre el tema completo final: **0 errores**, 12 avisos (9 del tema base Dawn y 3 por fuentes externas). ZIP de 393 archivos validado, sin carpeta envolvente, con licencia y huellas del origen.

Las pruebas comerciales usan respuestas locales de Shopify simuladas; no se realizó ningún pago ni pedido real. Cubren carrito con otros productos, eliminación por clave de línea, descuentos del servidor, stock parcial, fallo de red, clic repetido, opciones agotadas y conservación del idioma.

## Instalación real

La guía y el generador explican cómo subir el tema completo o integrar los componentes en otro tema. El archivo final para subir se genera en `output/shopify/rxsubzero-shopify-theme.zip`; los controles del paquete y el origen de su base quedan documentados en la guía y en `output/shopify/provenance.json`.

Todavía no existe la tienda, según confirmó el propietario. Antes de vender se deben crear el producto y las páginas, seleccionar el producto en las secciones, publicar los idiomas, configurar pagos/envíos/políticas y completar un pedido de prueba. Estos pasos aportan los datos reales que el diseño no puede inventar.

[Guía de instalación](2026-10-13-shopify-install.md) · [Plan](superpowers/plans/2026-10-13-purchase-flow.md).
