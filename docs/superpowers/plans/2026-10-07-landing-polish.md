# RX SUBZERO: revisión de Beauty y Health

Fecha: 7 de octubre de 2026.

## Objetivo y alcance

Mejorar las dos páginas existentes, preservar la identidad del producto y hacer que navegación, imágenes y cambios EN/ES funcionen en móvil y escritorio. Se conserva la arquitectura estática HTML/CSS/JavaScript, sin dependencias de producción nuevas. La carpeta de rescate queda intacta.

## Dirección de diseño

Paleta: blanco `#FFFFFF`, hielo `#F5F8FA`, niebla `#E7EEF3`, azul producto `#415F85`, tinta `#182C3C`, pizarra `#213748`. Manrope para titulares y precio; Inter para lectura y controles. Beauty usa una entrada clara; Health una entrada azul pizarra. Alineación izquierda, imágenes completas en su propio espacio y contenidos que crecen con la traducción.

```
Escritorio
[Logo                      secciones    EN/ES]
[                 Belleza | Bienestar        ]
[Titular + descripción    |                  ]
[Acciones + precio       | Foto del producto]
[Características         |                  ]
[Contexto / escenas / ritual en tres columnas]
[Producto / preguntas / oferta / otra página ]

Móvil
[Logo                  EN/ES  menú]
[        Belleza | Bienestar      ]
[Titular, descripción y acciones  ]
[Foto completa del producto       ]
[Características                 ]
[Secciones y pasos en una columna]
```

Se descartó mantener texto sobre fotos: ocultaba el producto y hacía depender la legibilidad de la extensión de cada idioma. Se quitaron numeraciones en beneficios, copos decorativos grandes y revelados repetitivos. Los números se reservan para los pasos reales del ritual.

## Ejecución

- [x] Auditar HTML, traducciones, escenas, estilos y comportamiento.
- [x] Crear dos imágenes de entrada con referencias del producto existente, revisarlas y exportar WebP a 600 y 1120 px.
- [x] Reorganizar hero, navegación, pasos, oferta y enlace entre páginas en `beauty.html`, `health.html` y `assets/css/authentic.css`.
- [x] Revisar los cuatro diccionarios EN/ES y sincronizar el contenido inglés de respaldo del HTML.
- [x] Reproducir y corregir errores de idioma, menú, foco, FAQ y barra móvil en `assets/js/app.js`.
- [x] Verificar con `tests/navigation.cjs` y `tests/visual-qa.cjs`, capturas y revisión independiente.

## Criterios de aceptación

- Ningún desbordamiento entre 320 y 1440 px en ambas páginas e idiomas.
- Idioma disponible también en pantallas pequeñas y conservado al pasar entre páginas.
- Una petición fallida o tardía no mezcla idiomas ni anuncia un idioma distinto del contenido visible.
- Menú utilizable con teclado; destino de anclas enfocado bajo la cabecera.
- FAQ consistente durante clics rápidos; barra móvil fuera del foco cuando se oculta.
- Producto sin estirar, texto sin superposición, recursos locales cargando correctamente.
- Contenido y navegación legibles sin JavaScript; movimiento reducido respetado.

## Límite de publicación

`assets/js/config.js` todavía tiene `purchaseUrl` vacío. Las páginas muestran disponibilidad próxima y permiten conocer el producto. Al añadir el enlace de compra válido, la aplicación activa la compra y oculta el aviso. No se inventaron un checkout, envíos, descuentos, testimonios ni resultados médicos.
