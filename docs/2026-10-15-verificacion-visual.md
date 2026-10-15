# Verificación visual con las medidas confirmadas

Referencia del propietario: **30 × 20 × 13 cm desplegado** y **30 × 20 × 5 cm plegado** (largo × ancho × alto). El largo recorre el eje de adelante hacia atrás. Se revisaron las 16 escenas activas contra las dos fotos originales, la maestra del producto y las relaciones con cabeza, manos y mesón.

La primera revisión había aceptado demasiado tamaño en primer plano. Esta revisión más exigente detectó cuatro escenas con personas que todavía hacían percibir un recipiente mayor: preparación y secado en ambas páginas. También se encontró una base inferior blanca incorrecta en la preparación cenital de Bienestar.

## Correcciones realizadas

| Escena | Resultado de la revisión |
| --- | --- |
| Belleza: preparación con mujer | Recipiente reducido como conjunto, sin comprimir un eje; conserva altura, molde, tubo y apoyo del cuenco de hielo. |
| Bienestar: preparación con hombre | Recipiente más compacto, menor exageración del primer plano y mano ajustada naturalmente sobre el agua. |
| Belleza: secado | Escala corregida usando la nueva preparación como referencia; cuenco apoyado y contacto completo con el mesón. |
| Bienestar: secado | Escala corregida usando la nueva preparación; se conserva la identidad, el gesto y la iluminación. |
| Bienestar: preparación cenital | Base inferior azul con relieve y dos orificios, conservando las dos bandas blancas interiores y el conjunto de tubos unido. |

Las otras **11 imágenes principales** se conservaron tras revisarlas. En particular, las dos inmersiones resultan visualmente compactas junto al rostro y las manos. Las dos vistas plegadas mantienen la huella y una pared baja compatible con 5 cm. Una duda inicial sobre el grosor de Belleza plegada no pudo sostenerse al considerar el ángulo de cámara; no se deformó esa foto para forzar una relación entre cajas de píxeles.

Esto comprueba coherencia visual, no centímetros mediante una fotografía calibrada. La perspectiva, la distancia, el redondeo y el estrechamiento de las paredes impiden medir el producto por el rectángulo que ocupa en pantalla. Las fotos originales y la ficha del propietario siguen siendo la referencia del producto; las escenas generadas no sustituyen esa evidencia.

## Archivos y procedimiento

Se usó **ImageGen integrado**, modo `precise-object-edit`, con las medidas confirmadas expresamente en cada prompt. Las correcciones humanas toman también las escenas de inmersión compacta como referencia. La corrección del secado toma la preparación recién revisada de la misma persona. Sharp solo recorta, reduce y codifica; no modifica la geometría del contenido.

- `assets/img/beauty-hero-life-1200-scaled.webp`
- `assets/img/health-hero-life-1200-scaled.webp`
- `assets/img/beauty-aspiration-scaled.webp`
- `assets/img/health-aspiration-scaled.webp`
- `assets/img/health-ritual-prepare-authentic-scaled.webp`

Los PNG seleccionados están en `output/qa-physical-scale/masters/`. Los prompts completos, referencias y procedencia se guardan en `source-assets/geometry/manifest.json`; `previousRevisions` conserva el registro de las generaciones reemplazadas. Los recortes de 600 px, miniaturas y alias anteriores también se actualizaron. La exportación selectiva fue:

```text
node scripts/export-geometry.cjs --only=beauty:hero-life,health:hero-life,beauty:aspiration,health:aspiration,health:ritual-prepare
```

Se comprobaron hashes de **25 archivos protegidos**: las otras 11 escenas en sus nombres canónicos y activos, las dos fotos originales y la maestra. No cambiaron.

## Verificación de integración

Pasaron las 56 pruebas existentes de navegación, explorador, compra y paquete Shopify. La revisión adaptable pasó 28 combinaciones de página, idioma y anchura y 112 vistas del explorador, además de tres composiciones sin JavaScript. Compra y carrito pasaron 28 composiciones, 112 fotografías y la vista móvil de poca altura. Se inspeccionaron también capturas del hero de Belleza en móvil y Bienestar en escritorio. Las dos primeras comprobaciones visuales se interrumpieron por una carga transitoria de controles de la vista previa; el diagnóstico aislado no reprodujo el fallo y ambas comprobaciones completas pasaron al ejecutarse de forma secuencial.

El generador confirmó 51 archivos Shopify sincronizados y el ZIP actualizado de 393 archivos coincide con su manifiesto. Se preservaron las referencias, las otras 11 escenas y el historial completo de las cinco generaciones sustituidas.
