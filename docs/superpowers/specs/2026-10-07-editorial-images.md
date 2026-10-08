# Imágenes de entrada · 7 de octubre de 2026

Método: herramienta ImageGen integrada, usando las imágenes de producto del repositorio como referencias. No se usó la API/CLI. Se revisaron color, dos bandas blancas, asas, base y tubo doble contra las referencias disponibles. Las fotografías originales mencionadas en la documentación histórica no estaban disponibles en Descargas; no se afirma una comparación con esos originales.

## Archivos finales

- `assets/img/beauty-hero-editorial-1120.webp`
- `assets/img/beauty-hero-editorial-600.webp`
- `assets/img/health-hero-editorial-1120.webp`
- `assets/img/health-hero-editorial-600.webp`

Las páginas usan srcset y sizes para descargar el tamaño apropiado. En escritorio se presenta el marco vertical completo; en móvil el recorte 6:5 mantiene el recipiente, asas y boquilla visibles. Las otras escenas conservan su proporción 6:5 con object-fit:contain. Los originales de las imágenes anteriores permanecen intactos.

## Prompt Beauty

Use case: precise-object-edit. Create a premium natural editorial product photograph for the Beauty landing page of RX SUBZERO. Input image is the product identity reference: preserve the exact blue-and-white collapsible rectangular facial basin, same two white flexible bands, blue bands and base, blue side handles, inner blue grid and same transparent twin breathing tubes with blue mouthpiece. Keep the product construction, dimensions and relative proportions unchanged; do not invent logos, controls, attachments or new tube shapes. Reframe the WHOLE basin with generous breathing room (at least 12% margins on all sides) centered on a real pale grey stone bathroom vanity in soft morning window light. A casually folded white cotton towel is the only secondary object, behind and to the left. Product occupies about 65% of image width, three-quarter view looking slightly downward, natural grounding/contact shadow and believable reflection, subtly imperfect stone texture, restrained realistic color and exposure, no excessive water droplets, no artificial mist, no ice, no human. Quiet photographic art direction, like a high-end still-life magazine photograph taken on a 50mm lens, not 3D render, not glossy plastic CGI. Vertical 4:5 frame that also allows square crops without cutting any product part. No text or overlays.

Referencia: `assets/img/beauty-product-authentic.webp`.

## Prompt Health

Use case: precise-object-edit. Create a natural editorial still-life photograph for the Wellness landing page RX SUBZERO. Reference image defines EXACT product identity: preserve the same steel-blue rectangular collapsible facial basin, two white folding bands alternating blue, integrated blue ridged interior base, small side handles, transparent twin tubes and exactly the same blue mouthpiece. No redesign, no extra parts, no color changes, no brand text. Scene: the product resting flat and solid on a real charcoal slate counter beside a window in a quiet uncluttered home. Gentle morning sidelight, subtle stone texture and natural soft shadow. A dark grey folded linen towel behind the left edge, no other props, no person, no fog, no dramatic frost, no simulated neon. Show ENTIRE basin at three-quarter angle similar to reference but step the camera back so it occupies 65% width with at least 12% safe margin around every part. Basin in lower middle of vertical 4:5 frame, window diffuse light upper left, calm muted blue grey background, natural exposure, realistic material imperfections, honest still-life photography, not a 3D render, realistic transparent tubes. No text, no overlays. Allow square crops keeping all product parts visible.

Referencia: `assets/img/health-product-authentic.webp`.
