# Corrección de la geometría del producto

Se corrigieron las 16 fotografías activas de las dos páginas, sus cuatro versiones de tamaño reducido y ocho miniaturas. La galería, el zoom, el panel de compra y el carrito de demostración usan esas mismas fuentes. El paquete Shopify incluye las mismas imágenes de las páginas; las imágenes del catálogo real seguirán procediendo del producto elegido en Shopify.

## Referencias recuperadas

Los originales `assets/img/product-front.png` y `assets/img/product-top.png` del primer commit `59044e6` se recuperaron como copias idénticas en `source-assets/references/`. La vista superior evidencia un rectángulo alargado, con asas en los lados largos. Las referencias anteriores de octubre eran imágenes generadas; se sustituyó esa base de revisión por las fotos reales recuperadas.

Se conservan el contorno y sus rebajes, las asas, las dos bandas blancas, la base y la rejilla azul. Las escenas plegadas comprimen únicamente la altura. No se inventaron medidas de fábrica: las fotos permiten comparar el molde, pero no medirlo con precisión.

Las fotografías históricas muestran boquilla blanca. Se mantiene la boquilla azul de las páginas actuales y el tubo fijo indicado por el propietario. La foto original del tubo actualizado de julio no está disponible; no se afirma haber comprobado esa versión del tubo contra una nueva foto de fábrica.

## Método y archivos

Se usó **ImageGen integrado**, modo `precise-object-edit`. Primero se corrigió una imagen maestra del recipiente, contrastada con las fotos frontal y superior. Se usaron esa maestra y los originales para corregir cada escena. Dos primeras versiones de bienestar se rechazaron por cambiar la orientación de las asas y la rejilla; las versiones finales corrigieron ambos detalles.

- Originales: `source-assets/references/product-front.png` y `product-top.png`.
- Maestra guardada: `source-assets/geometry/product-master.png`.
- Prompts finales y procedencia de cada imagen: `source-assets/geometry/manifest.json`.
- Archivos finales: las 28 imágenes `assets/img/*-geometry.webp`.
- PNG de las escenas seleccionadas: `output/qa-geometry/masters/`, conservados localmente y excluidos de Git; las exportaciones finales sí están versionadas.
- Exportación: `scripts/export-geometry.cjs`. Sharp solo recorta, reduce y codifica; no modifica el contenido del producto.
- Paquete actualizado: `output/shopify/rxsubzero-shopify-theme.zip`.

Las páginas referencian nombres nuevos para que el navegador solicite las imágenes corregidas. Los nombres antiguos también se actualizaron con la misma geometría para evitar reutilizar el molde incorrecto. Las versiones antiguas del hero que ya no se usan quedan como alias de la escena actual; no representan composiciones móviles adicionales.

## Verificación

Se compararon las 16 escenas y las 28 exportaciones con los originales y la maestra. Se comprobaron los recortes y la posición de las asas, la rejilla, las bandas y el tubo. Los originales recuperados son idénticos a los archivos de `59044e6`; las referencias de imágenes y los hashes del paquete Shopify se verificaron.

Las 56 pruebas de navegación, galería, idiomas, compra y paquete Shopify pasaron. La revisión de pantalla comprobó 28 combinaciones de página, idioma y tamaño, 112 vistas de galería, tres diseños sin JavaScript, 28 diseños de producto/carrito, 112 fotos de compra y una pantalla móvil de poca altura. La revisión de tema Shopify no registró errores; conserva las 12 advertencias existentes de Dawn y fuentes externas.
