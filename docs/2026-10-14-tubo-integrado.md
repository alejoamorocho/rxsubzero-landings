# Tubo integrado: corrección de imágenes y contenido

14 de octubre de 2026. Fuente del dato de producto: el propietario confirma que el tubo no se puede retirar y permanece unido al recipiente.

## Corrección

Se corrigieron las cuatro escenas que mostraban el tubo separado: oferta y almacenamiento de Belleza y Bienestar. Las ofertas muestran una sola unidad desplegada con su tubo integrado y la caja al lado. El plegado muestra el interior con el tubo unido. Las dos miniaturas de plegado se regeneraron. Las fotografías antiguas de historia, que no se usan actualmente y mostraban el recipiente sin tubo, se sustituyeron por las vistas de producto ya revisadas.

Se conserva la relación 1200 × 1000 (6:5). Los archivos antiguos de oferta, plegado y miniaturas también se sustituyeron, para que sus URL no mantengan representaciones incorrectas. Las páginas usan nombres nuevos `*-integrated.webp` para evitar reutilizar versiones anteriores en caché. El respaldo `_rescate-20260912/` no participa en las páginas ni en el paquete.

Las cuatro traducciones EN/ES, el HTML de respaldo y el popup describen un solo conjunto con tubo fijo. Se retiraron «desmontable», «dos piezas» y las indicaciones de separar el tubo para limpiar. Shopify se vuelve a generar desde esos mismos archivos, incluido el ZIP instalable.

## Método y archivos

Se usó **ImageGen integrado**, en modo `precise-object-edit`, con las fotos de producto existentes como referencia y las cuatro fotos incorrectas como objetivos. No se usó la API/CLI. Las fotos generadas se revisaron antes de convertirlas a WebP; Sharp solo exporta tamaños y miniaturas, sin retocar el contenido. No se afirma haber contrastado una fotografía original del fabricante: la permanencia del tubo la establece el propietario, y la identidad visual se conserva de las referencias existentes.

### beauty_store

Objetivo original: `assets/img/beauty-ritual-store-authentic.webp`. Archivo final: `assets/img/beauty-ritual-store-integrated.webp`.

Prompt final:

Use case: precise-object-edit. Image 1 is the correction target, showing an attached tube but the basin still too tall for its storage state. Image 2 is the original folded basin height/shape reference, with an incorrect separate tube; Image 3 is the correct attached tube product reference. Edit Image 1 ONLY to reduce its vertical wall height substantially so the basin is visibly fully compact for storage, comparable to Image 2's flat folded wall height. Compress both white folding bands into THIN layers close to the blue base; do not resize its width or depth, camera angle or handles. Keep the upper surface OPEN so the same blue integrated base/grid and the same two transparent tube lengths are visible nested inside. The transparent dual tube MUST remain continuously fixed to the blue inner base, no exposed detached ends and no accessory on the counter. Keep its small blue mouthpiece with this same unit, allow it to protrude slightly above the shallow rim. Preserve every other part of Image 1: pale bathroom counter, white ribbed drying mat, white folded towel, perspective, composition, light, texture, blue-and-white product identity. No solid lid, no new parts, no changes to scene, no text. Photorealistic6:5 landscape.

### health_store

Objetivo original: `assets/img/health-ritual-store-authentic.webp`. Archivo final: `assets/img/health-ritual-store-integrated.webp`.

Prompt final:

Use case: precise-object-edit. Image 1 is the edit target: the compact folded RX SUBZERO held by hands over a charcoal drain mat. Image 2 is the exact assembled product reference. The tube is permanently attached and must never be displayed as a removable accessory. Edit Image 1 only to correct this: remove the loose tube lying on the mat; reveal the shallow interior of the VERY FLAT collapsed basin and show the exact transparent twin tubes continuously attached at the integrated blue inner base, their lengths gently nestled inside this same collapsed unit, and the same small blue mouthpiece. Keep the two white folding bands compressed into THIN layers, preserving Image 1's compact collapsed wall height, not the expanded tall walls of Image 2. The collapsed basin must be an open shallow vessel with its integrated blue grid and permanently connected tube visible, not a separate solid lid over disconnected parts. Preserve original hands, skin texture, watch/sleeves if any, charcoal counter/mat, sink, window, folded dark towel, colors, handle positions, perspective, natural lighting and entire product framing. One connected basin assembly, no separate parts on counter, no extra tube, no invented mounting hardware or new product features. Photorealistic product edit, landscape 6:5, no text, no CGI or gloss.

### beauty_offer

Objetivo original: `assets/img/beauty-offer-authentic.webp`. Archivo final: `assets/img/beauty-offer-integrated.webp`.

Prompt final:

Use case: precise-object-edit. Image 1 is the edit target: RX SUBZERO offer photograph on a pale grey surface with its black branded box. Image 2 is the exact product construction reference. Correct the offer to show only ONE expanded blue-and-white basin with its permanently attached transparent twin breathing tubes inside. Remove the loose separate tube from the foreground and remove the second collapsed basin on the right, leaving a single complete product; naturally center the single basin in front of the existing black box. Install the exact integrated tube assembly from Image 2 within the basin, continuously connected at the blue inner base with the same blue mouthpiece, not as a free-standing accessory. Preserve the exact basin shape, two white folding bands, blue bands/base/side handles, integrated grid, materials, overall scale and proportions from Image 2. Keep the original pale stone environment, soft natural light and the existing black RX SUBZERO box with its exact original white logo, no extra packaging or text. Entire single basin with tube safely in frame, realistic shadows and transparent plastic, no detached parts, no extra basins, no fabricated connector or redesign. Premium honest natural product photograph, landscape6:5 composition.

### health_offer

Objetivo original: `assets/img/health-offer-authentic.webp`. Archivo final: `assets/img/health-offer-integrated.webp`.

Prompt final:

Use case: precise-object-edit. Image 1 is the target dark-counter RX SUBZERO offer product photograph. Image 2 is the exact assembled-product reference. Correct the product fact: twin transparent breathing tubes are permanently connected to the basin and cannot be removed. Show ONE fully expanded basin with its blue inner grid and attached twin tube assembly exactly as Image 2, their lower ends continuously anchored in the integrated base and same blue mouthpiece kept with the basin. Remove the detached tube in the foreground and the separate folded basin at left. Recenter the single complete blue-and-white basin next to and in front of the same existing black RX SUBZERO logo box. Keep original dark slate countertop, grey wall, natural side light, restrained matte surfaces, exact black box and original white logo. Preserve product dimensions, rectangular rounded shape, two white folding bands, steel-blue bands/base/side handles, exact tube identity. No additional accessories, detachable pieces, new sockets or mounting hardware, no logos added, no words, no excessive droplets or effects. Entire complete product and tube visible with realistic grounding shadow, landscape6:5 photograph, same art direction as the original.

Miniaturas finales: `assets/img/beauty-explorer-thumb-3-integrated.webp` y `assets/img/health-explorer-thumb-3-integrated.webp`.

## Verificación

56 pruebas funcionales y de paquete correctas. Revisión visual independiente de las cuatro fotos y dos miniaturas sin problemas materiales. Theme Check del tema completo: cero errores y los 12 avisos ya documentados (9 de Dawn y 3 de fuentes externas). Las verificaciones de tamaños de pantalla y del popup se repiten con las nuevas imágenes; las capturas se guardan en `output/qa/` y `output/qa-commerce/`.
