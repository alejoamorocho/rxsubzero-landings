# Referencia del molde RX SUBZERO

`product-front.png` y `product-top.png` son fotografías de cámara recuperadas sin modificación desde `59044e6:assets/img/`. No son imágenes generadas. Conservar estos originales.

Para cualquier imagen nueva del producto, comparar las dos fotografías y la imagen maestra `../geometry/product-master.png`. Las imágenes de las páginas son escenas generadas y no sustituyen estos originales como prueba del molde.

Referencia numérica confirmada por el propietario el **15 de octubre de 2026**: **30 cm de largo × 20 cm de ancho × 13 cm de alto**, con el recipiente desplegado. La fuente constante para futuras escenas es [`product-spec.json`](product-spec.json). El largo recorre el eje de adelante hacia atrás; la planta es un rectángulo moderado **3:2** y la altura equivale a **0,65 veces el ancho**. Mantener el mismo tamaño físico respecto a manos, rostro y mesón. La perspectiva cambia la proyección visible: no estirar una imagen por ejes para forzar una caja de píxeles 3:2. No se ha proporcionado altura plegada ni capacidad.

Invariantes visibles: recipiente rectangular alargado con esquinas redondeadas; eje largo de adelante hacia atrás; asas en ambos lados largos; rebajes en los bordes cortos; dos bandas blancas plegables; base y rejilla integradas azules con nervadura central alargada. Al plegarlo cambia la altura, no la huella ni la ubicación de las asas. Una vista frontal puede comprimir visualmente la profundidad; no convertir por eso el molde en un cuadrado.

El propietario confirma que el tubo permanece unido. Estas fotos históricas llevan boquilla blanca. Las páginas actuales conservan la boquilla azul introducida en julio; los JPEG originales de esa actualización no se recuperaron. Las fotografías históricas definen el recipiente, no prueban el diseño exacto del tubo actualizado. No inventar piezas, uniones, tapas, pestillos ni medidas físicas.

El propietario aclaró el uso el 14 de octubre de 2026: agua con hielo, inmersión del rostro y boquilla del tubo integrado para respirar. Las escenas de uso deben representar ese gesto, con un solo conjunto de dos tubos y una boquilla. No sustituirlo por una persona bebiendo o simplemente acercándose al recipiente. La imagen editorial no demuestra por sí sola el recorrido interno del aire; no inventar entradas, válvulas ni accesorios para explicarlo.

Prompts y exportaciones revisadas: `../geometry/manifest.json`. La imagen maestra del recipiente es una edición generada con ImageGen integrado, basada en estas dos fotos, conservando el tubo azul de la versión anterior de las páginas.

Revisar también la física de la escena: cada recipiente auxiliar debe tener una base apoyada y sombra de contacto visibles, o una mano sujetándolo de forma inequívoca. Comparar tamaño relativo al rostro, manos y torso entre escenas; evitar primeros planos que conviertan el recipiente en una tina gigante. La corrección debe conservar el rectángulo moderado del molde, sin comprimir el ancho ni estirar el largo por separado. Las fotos sirven para comprobar coherencia visual; no sustituyen medidas físicas de fábrica.
