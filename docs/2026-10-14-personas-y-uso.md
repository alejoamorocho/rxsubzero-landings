# Personas y representación del uso

Se renovaron las seis escenas con personas: preparación en el hero, secado del rostro e inmersión, para Belleza y Bienestar. El propietario confirmó que el producto se utiliza con agua y hielo, el rostro sumergido y la boquilla del tubo integrado para respirar.

Las nuevas imágenes muestran una acción concreta, piel con textura, cabello y ropa cotidianos, agua con hielo y una misma identidad adulta por página. Las tomas de inmersión sustituyen las anteriores, que mostraban el rostro por encima del agua como si la boquilla fuera una pajilla. Se rechazó y corrigió una primera versión de Bienestar que duplicaba el tubo.

## Método y conservación del producto

Se utilizó **ImageGen integrado**, en modo de edición, con las escenas anteriores, las nuevas referencias de identidad de cada persona, la maestra aprobada del producto y las fotos de cámara recuperadas. Siguen siendo imágenes editoriales generadas; no son fotografías de compradores ni testimonios de resultados. La mejora visual no convierte estas escenas en prueba técnica del circuito respiratorio.

La biblioteca **Sharp** solo reduce, recorta y codifica los archivos. La consistencia del producto procede de las referencias y la revisión visual, no de una biblioteca que garantice bloquear su geometría. Se mantuvieron intactas las diez escenas sin personas: producto, hero editorial, preparación cenital, plegado y oferta. También se conservaron las fotos originales y la maestra, con comprobación de sus hashes antes y después.

## Archivos

- Fotos principales: `assets/img/{beauty,health}-{hero-life-1200,aspiration,ritual-breathe}-people.webp`.
- Hero reducido: `assets/img/{beauty,health}-hero-life-600-people.webp`.
- Miniaturas: `assets/img/{beauty,health}-explorer-thumb-0-people.webp`.
- Prompts finales, archivos de generación y procedencia: `source-assets/geometry/manifest.json`.
- PNG seleccionados, conservados localmente: `output/qa-people/masters/`.
- Exportador: `scripts/export-geometry.cjs --people-only`. El modo sin filtro sigue exportando las 16 escenas del manifiesto.

Las páginas usan nombres nuevos para actualizar las imágenes en el navegador. Los alias anteriores de las seis escenas también se actualizaron para evitar su reutilización accidental. La galería, el zoom y la foto de rutina del panel de compra reciben las nuevas escenas desde el HTML; las fotos de producto y carrito conservan la referencia de producto aprobada.

Los cuatro diccionarios ES/EN y los textos de respaldo HTML ahora explican agua con hielo, inmersión y función respiratoria del tubo unido. Se actualizó el texto alternativo de las fotos para describir su contenido real. No se añadieron resultados médicos, duraciones ni testimonios.

El paquete Shopify se generó de nuevo desde estas fuentes. Las 56 pruebas de navegación, idiomas, galería, compra y paquete pasaron. La revisión de pantalla comprobó 28 combinaciones de página, idioma y tamaño, 112 vistas de galería y tres diseños sin JavaScript; la revisión de compra comprobó 28 diseños de producto/carrito, 112 fotos y una pantalla móvil de poca altura. Shopify Theme Check registró cero errores y las 12 advertencias preexistentes de Dawn y fuentes externas. Los 23 archivos protegidos de producto y referencias conservaron exactamente sus hashes.
