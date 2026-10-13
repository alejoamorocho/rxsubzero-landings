# RX SUBZERO: instalación en Shopify

Las páginas públicas de GitHub muestran el diseño y permiten probar la experiencia de compra. Su carrito es una demostración: no cobra dinero ni envía pedidos. El archivo **`output/shopify/rxsubzero-shopify-theme.zip`** contiene un tema completo preparado para subir a una tienda nueva. La versión instalada toma el producto, los precios, las variantes, la disponibilidad, las imágenes y el carrito de Shopify.

El ZIP incluye Shopify Dawn 16.0.0 como base y las dos páginas RX SUBZERO. La carpeta `shopify/`, por separado, es una **ampliación para un tema existente**. Ambos incluyen un layout propio para evitar que la cabecera del tema se duplique sobre las páginas, dos plantillas de página y una sección configurable.

## Instalación sencilla en una tienda nueva

1. En Shopify, abre **Tienda online → Temas → Añadir / Importar tema → Subir archivo ZIP** y selecciona `rxsubzero-shopify-theme.zip`. Déjalo como tema sin publicar durante la preparación.
2. Crea el producto RX SUBZERO con su precio, disponibilidad e imágenes, y actívalo para el canal «Tienda online».
3. Crea las páginas «RX SUBZERO · Belleza» y «RX SUBZERO · Bienestar». En el editor del tema nuevo, elige las plantillas `rxsz-beauty` y `rxsz-health`, usa cada página como recurso de vista previa y selecciona el producto y ambas páginas en la sección RX SUBZERO. Guarda los cambios.
4. Configura EN/ES, pagos, envíos y políticas. Prueba la compra como se explica abajo. Cuando esté listo el tema, publícalo y asigna definitivamente `rxsz-beauty` y `rxsz-health` a sus páginas desde el administrador. Mantén la tienda privada durante la preparación si todavía no está lista para abrir al público.

Shopify muestra en el selector de plantillas del administrador las del tema publicado. Mientras el nuevo tema está sin publicar, puedes probar sus plantillas desde el editor; la asignación definitiva a las páginas se hace después de publicar ese tema. [Referencia de Shopify sobre plantillas y vista previa](https://help.shopify.com/en/manual/online-store/themes/theme-structure/templates).

El ZIP ya lleva todas las imágenes revisadas de ambas páginas. La galería de compra usa las imágenes del producto que subas al catálogo; si aún no has subido ninguna, muestra las imágenes de presentación incluidas. Puedes reutilizar en el catálogo las vistas de producto, interior y plegado, además de añadir tus fotografías definitivas.

## Lo que se activa al seleccionar el producto

- La ventana de compra y su galería muestran las imágenes del producto seleccionado en Shopify.
- Las variantes, sus precios y la disponibilidad provienen del catálogo. Se respetan las reglas de cantidad enviadas por Shopify.
- Añadir, cambiar cantidades y eliminar productos actualizan el carrito real mediante la API de carrito de la tienda. El pago continúa en el checkout alojado por Shopify.
- Las políticas que existan en la tienda aparecen como enlaces. Las condiciones de envío y los impuestos se determinan por la configuración comercial y el checkout.
- EN y ES utilizan formularios de idioma nativos de Shopify y solo aparecen cuando esos idiomas están publicados. Cambiar el idioma respeta el mercado y la moneda activos.
- Sin JavaScript, la oferta incluye un formulario nativo de producto para añadir una variante al carrito.

No hace falta introducir un enlace de compra manual en `config.js` al instalar este paquete. La selección del producto en el editor conecta la página con Shopify. Sin producto seleccionado, la página muestra que la compra todavía no está disponible.

## Alternativa: conservar un tema que ya tengas

Este procedimiento técnico combina únicamente las páginas RX SUBZERO con una copia de tu tema habitual. Para una tienda nueva, usa el ZIP completo del apartado anterior.

1. Cuando exista la tienda, duplica su tema y trabaja sobre la copia sin publicar. Descarga esa copia y extrae sus archivos en una carpeta local que contenga `layout/theme.liquid`, `assets/`, `sections/` y `locales/`.
2. Desde la carpeta de este proyecto, actualiza el paquete con:

   ```text
   node scripts/build-shopify.cjs
   node scripts/build-shopify.cjs --check
   ```

3. Combina el paquete con la copia local del tema:

   ```text
   node scripts/build-shopify.cjs --merge-theme "D:\Temas\rxsubzero-tienda"
   ```

   Sustituye la ruta por la carpeta extraída del tema. El comando añade los archivos de RX SUBZERO y combina únicamente su espacio de traducciones `rxsz` con los idiomas existentes. Conserva las demás traducciones y el idioma principal del tema. No contacta ninguna tienda ni publica cambios.

4. Sube **el tema completo ya combinado**, mediante Shopify CLI o un ZIP del tema, como tema sin publicar. No subas únicamente `shopify/` mediante «Añadir tema»: a esa carpeta le faltan las plantillas del resto de la tienda por diseño.

Los archivos generados utilizan el prefijo `rxsz-`. `shopify/manifest.json` registra los archivos y sus huellas para comprobar que el paquete coincide con las páginas revisadas. No es necesario subir ese manifiesto a Shopify.

## Configuración de las dos páginas

En el editor del tema, abre `rxsz-beauty` y `rxsz-health`, selecciona las páginas que has creado como recursos de vista previa y configura su sección «RX SUBZERO landing» / «Página RX SUBZERO». Elige el producto real y las dos páginas en los selectores de belleza y bienestar. Ambas pueden vender el mismo producto. El enfoque visual y los textos corresponden a cada plantilla.

Publica EN y ES en la configuración de idiomas y traduce también el nombre del producto, las variantes y las políticas mediante las herramientas de traducción de Shopify. Los textos de las páginas ya incluyen ambos idiomas.

Cuando el tema esté publicado, abre cada página en el administrador, selecciona su plantilla `rxsz-beauty` o `rxsz-health` y guarda.

Si una página relacionada todavía no está seleccionada, su enlace se oculta en lugar de llevar a una dirección inexistente. Los enlaces se adaptan a las rutas e idiomas de la tienda.

## Configuración comercial que requiere la tienda

El diseño y el componente de compra quedan preparados en el código. Para cobrar y entregar pedidos hacen falta datos reales del negocio:

- Producto publicado en el canal «Tienda online», con fotografías definitivas, precio, SKU y disponibilidad. El precio de referencia de la demostración no se instala como precio del catálogo.
- Peso, ubicaciones, zonas y tarifas de envío; moneda, mercados e impuestos aplicables.
- Métodos de pago, datos de contacto y políticas de envío, devolución y privacidad.
- Dominio de la tienda o su dirección inicial `myshopify.com`.

Este componente está preparado para venta de compra única de RX SUBZERO. Las variantes que exijan un plan de suscripción no se habilitan. El paquete carga hasta 250 variantes y 50 imágenes por producto; las necesidades de suscripción o catálogos con más variantes requieren una adaptación específica.

## Comprobar antes de publicar

En la vista previa del tema, prueba las dos páginas en móvil y escritorio, en EN y ES. Comprueba la galería, el precio del catálogo, los cambios de variante, las cantidades, el mensaje de agotado y los errores al añadir al carrito. Añade un producto, vuelve a abrir el carrito, cambia su cantidad y elimínalo. Revisa también un carrito que ya contenga otros productos de la tienda.

Continúa al checkout y realiza un pedido de prueba con el modo de prueba del proveedor de pagos. Confirma la dirección, el envío, los impuestos, el total y la confirmación del pedido. Desactiva después el modo de prueba según las instrucciones del proveedor. Esta verificación requiere la tienda real; GitHub no puede verificar pagos, inventario ni entregas.

Repite una compra con JavaScript desactivado para verificar el formulario nativo y comprueba que las páginas relacionadas y las políticas llevan al destino correcto. Publica el tema cuando estas pruebas con los datos comerciales reales estén completas.

## Actualizar el diseño después

Edita las páginas y los recursos originales del proyecto, vuelve a generar `shopify/` y combina el paquete con una copia actualizada del tema. Evita editar directamente los archivos generados: la siguiente generación los reemplaza. El comando `--merge-theme` conserva la selección de producto y páginas de las plantillas existentes, además de las traducciones ajenas al paquete. En el editor de Shopify, la vista previa de estas páginas se recarga al actualizar su sección para que el componente de compra refleje el producto recién seleccionado.

La carpeta `_rescate-20260912/` es un respaldo anterior y no forma parte de este paquete.

## Regenerar el ZIP completo

Desde este proyecto, con Node.js 18 o posterior:

```text
node scripts/build-shopify.cjs --package
```

El comando descarga una copia oficial de Dawn la primera vez, genera la ampliación, combina ambos y crea el ZIP sin comunicarse con ninguna tienda. Usa siempre **Dawn 16.0.0**, publicación oficial del 10 de agosto de 2026, fijada al commit **`bc39a7d2024f1e5c14c42f855bd3552b4913e204`**. La licencia MIT original se conserva en `assets/rxsz-dawn-LICENSE.txt` dentro del ZIP. [Publicación oficial de Dawn 16.0.0](https://github.com/Shopify/dawn/releases/tag/v16.0.0).

`output/shopify/provenance.json` registra el origen, las huellas del archivo fuente y del ZIP, y la carpeta completa generada para revisarla con Theme Check. El código de Dawn y el ZIP quedan en `output/`, fuera de Git; el generador y la ampliación RX SUBZERO sí se guardan en el repositorio.

Verificación del paquete del 13 de octubre de 2026: nueve comprobaciones del generador correctas; Shopify Theme Check sobre el tema completo, **cero errores**, con doce avisos (nueve del código de Dawn y tres de rendimiento por las fuentes externas de la página); comprobación independiente del ZIP sin errores de integridad ni carpeta envolvente. La publicación y una compra real se comprueban cuando exista la tienda.

## Referencias de Shopify

- [API Ajax de carrito](https://shopify.dev/docs/api/ajax/reference/cart)
- [Formularios nativos de producto y localización](https://shopify.dev/docs/api/liquid/tags/form)
- [Idiomas, mercados y monedas en temas](https://shopify.dev/docs/storefronts/themes/markets/multiple-currencies-languages)
- [Plantillas JSON](https://shopify.dev/docs/storefronts/themes/architecture/templates/json-templates)
- [Theme Check](https://shopify.dev/docs/storefronts/themes/tools/theme-check)
