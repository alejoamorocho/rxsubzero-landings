# RX SUBZERO: producto, carrito y Shopify

## Resultado solicitado

Completar ahora la experiencia de compra y todos sus recursos, antes de crear la tienda. La demostración pública permite abrir el producto, ver imágenes, elegir cantidad, añadir, editar y eliminar del carrito. El paquete de tema usa la misma interfaz con catálogo, disponibilidad, precios y carrito reales de Shopify.

## Diseño

Se conserva la paleta hielo/blanco/azul, Manrope/Inter y el producto visible completo. Panel de producto centrado con fotografías a la izquierda y decisión de compra a la derecha; en móvil, una columna con acciones claras. Carrito lateral con líneas editables, subtotal, condiciones de tienda y paso al checkout. Diálogos nativos, Escape, foco restaurado, mensajes traducidos y sin animación automática.

## Ejecución

- [x] Crear paneles compartidos y traducciones EN/ES, sin nuevas fotografías inventadas ni datos comerciales supuestos.
- [x] Implementar carrito de demostración persistente y adaptador Shopify con rutas de idioma y mutaciones serializadas.
- [x] Verificar cantidad, stock, errores, doble clic, imágenes, conservación del idioma, foco, carrito mixto y checkout mediante pruebas de navegador.
- [x] Generar overlay de tema: layout, sección configurable, dos plantillas, locales y todos los recursos; formulario nativo sin JavaScript.
- [x] Comprobar el paquete, capturas y revisión independiente y documentar instalación. La demostración se publica en GitHub después de guardar los cambios verificados.

## Contratos y límites

`RXSZ_CONFIG.commerce` declara `mode` (`demo` o `shopify`), `root`, `cartUrl`, `checkoutUrl`, `currency`, `product` y `policies`. El producto contiene imágenes y variantes con reglas de cantidad. El adaptador real usa `cart/add.js`, `cart/change.js` por clave de línea y `cart.js`; conserva las otras líneas de la tienda. Tras error de stock se vuelve a leer el carrito porque Shopify puede haber añadido una cantidad parcial. Ninguna operación se reintenta automáticamente.

`RXSZ_CONFIG.i18nUrls` resuelve los recursos del tema. `nativeLocale` respeta el idioma servido por Shopify y sus formularios de localización. Sin producto seleccionado, la versión Shopify permanece sin compra disponible. El modo de demostración está identificado y no permite pagar.

La activación real requiere crear tienda y producto, seleccionar ese producto en la sección y configurar pagos/envíos/políticas en Shopify. El paquete no inventa catálogo ni sustituye el checkout. El alcance es compra única; no incluye productos de suscripción o bundles de apps.

## Fuentes verificadas

- https://shopify.dev/docs/api/ajax/reference/cart
- https://shopify.dev/docs/storefronts/themes/architecture/templates/json-templates
- https://shopify.dev/docs/storefronts/themes/product-merchandising/variants
