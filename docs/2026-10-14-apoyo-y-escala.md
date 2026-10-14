# Apoyo de objetos y escala del producto

Se corrigieron tres escenas: preparación de Belleza y las dos inmersiones. El cuenco de hielo de la primera foto estaba suspendido detrás del mesón. Los primeros planos de inmersión agrandaban el recipiente y hacían que su planta pareciera cuadrada.

El cuenco ahora apoya completamente sobre la piedra en primer plano, con base y sombra de contacto visibles. Las inmersiones tienen encuadre más abierto, mesón visible alrededor del producto, manos apoyadas junto a él y una proporción más coherente entre persona y recipiente. Se rechazó una primera corrección que estrechaba demasiado el producto y se recuperó su rectángulo moderado comparando la maestra y la foto superior original.

## Referencias y límites

Se conservaron las fotos reales `source-assets/references/product-front.png` y `product-top.png`, además de `source-assets/geometry/product-master.png`. Se compararon rebajes, asas de los lados largos, dos bandas blancas, rejilla, base y el único conjunto de dos tubos unidos. Las otras trece escenas principales mantuvieron sus archivos; se protegieron 29 archivos de imágenes y referencias mediante hashes.

No se inventaron centímetros ni se afirma una validación de medidas de fábrica. La revisión comprueba proporciones visuales contra las fotos disponibles y el tamaño relativo de cabeza, manos y torso. Las dimensiones físicas exactas siguen pendientes de confirmación del propietario. Se conservó el mecanismo aprobado sin añadir entradas de aire, válvulas ni conexiones imaginadas.

## Método y archivos

Se usó **ImageGen integrado**, en modo `precise-object-edit`. Sharp solo recorta, reduce y codifica las imágenes finales.

- Principales: `assets/img/beauty-hero-life-1200-coherent.webp`, `beauty-ritual-breathe-coherent.webp` y `health-ritual-breathe-coherent.webp`.
- Derivados nuevos: `assets/img/beauty-hero-life-600-coherent.webp` y `beauty-explorer-thumb-0-coherent.webp`.
- PNG seleccionados: `output/qa-scale/masters/`.
- Versiones estrechas rechazadas: `output/qa-scale/rejected/`.
- Prompts finales y procedencia: `source-assets/geometry/manifest.json`.
- Exportación selectiva: `scripts/export-geometry.cjs --only=beauty:hero-life,beauty:ritual-breathe,health:ritual-breathe`.

Los nombres nuevos evitan reutilizar recortes anteriores del navegador; los alias anteriores también se actualizaron. La imagen social de Shopify se obtiene del hero real de cada página, de modo que Belleza y Bienestar pueden usar revisiones distintas. Se corrigieron las descripciones antiguas del manifiesto que todavía exigían mantener el rostro sobre el agua, en contradicción con el uso aclarado por el propietario.

## Verificación

Pasaron las 56 pruebas de navegación, explorador, compra y paquete Shopify. La revisión adaptable cubrió 28 combinaciones de página, idioma y tamaño de pantalla, además de 28 composiciones del panel de compra y carrito. Se inspeccionaron también las inmersiones renderizadas en escritorio y móvil. Theme Check terminó con cero errores y doce avisos existentes del tema Dawn y las fuentes. Los 29 hashes de imágenes protegidas coinciden y el ZIP de Shopify corresponde al manifiesto actualizado.
