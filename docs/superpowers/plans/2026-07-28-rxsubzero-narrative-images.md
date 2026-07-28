# RX SUBZERO Narrative Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all eighteen RX SUBZERO landing-page images with distinct, high-quality narrative scenes that show believable product use while preserving the product's steel-blue, white and transparent construction.

**Architecture:** The source workspace stores normalized product references, AI-assisted scene masters, a structured scene manifest and deterministic WebP exports. The existing image builder gains a `complete-scene` mode so finished editorial scenes are cropped and optimized without adding the repeated frontal product cutout. The publication worktree receives only the verified static HTML, CSS and final WebP files.

**Tech Stack:** Built-in image generation, Sharp, Node.js, HTML/CSS, Playwright, GitHub Pages.

## Global Constraints

- Produce exactly nine unique images for Beauty and nine unique images for Health.
- Preserve the steel-blue basin, white collapsible bands, blue inner liner, clear dual tube and recognizable mouthpiece.
- Do not invent controls, electronics, lids, accessories or alternate product colors.
- Use a different action, camera angle and product position for every slot.
- Use people only where interaction advances the funnel story.
- Desktop hero output is at least 1536 x 864; mobile hero is at least 900 x 1200; section output is at least 1200 x 1000.
- Never enlarge a source master during export.
- Keep mobile copy before media and preserve existing contrast, navigation and funnel behavior.
- Publish only after all eighteen images and four responsive production views pass verification.

---

### Task 1: Normalize Product References And Scene Metadata

**Files:**
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/references/front-open.jpeg`
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/references/top-open.jpeg`
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/references/side-open.jpeg`
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/references/collapsed.jpeg`
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/references/real-tube.jpeg`
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/references/packaging.jpeg`
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/scene-manifest.json`
- Modify: `C:/Proyectos/RxSubzero/tools/verify-landings.mjs`

**Interfaces:**
- Consumes: the approved design spec and real photographs in `C:/Users/aamor/Downloads`.
- Produces: eighteen scene records with `page`, `slot`, `action`, `cameraAngle`, `productState`, `person`, `masterSource`, `referenceSources`, `canvas`, `output` and `masterAnchor`.

- [ ] **Step 1: Add a failing scene-semantic audit**

Add `auditNarrativeScenes(entries, record = assert)` to `tools/verify-landings.mjs`. It must reject duplicate values for `${action}|${cameraAngle}|${productState}`, missing references, missing person metadata and any output count other than nine per page.

- [ ] **Step 2: Run the verifier and confirm the missing v3 manifest fails**

Run:

```powershell
node tools/verify-landings.mjs --self-test
```

Expected: failure naming the missing narrative scene metadata.

- [ ] **Step 3: Copy and normalize the six approved reference photographs**

Use the exact sources:

```text
C:/Users/aamor/Downloads/WhatsApp Image 2026-06-24 at 10.15.04 AM (1).jpeg
C:/Users/aamor/Downloads/WhatsApp Image 2026-06-24 at 10.15.04 AM (2).jpeg
C:/Users/aamor/Downloads/WhatsApp Image 2026-06-24 at 10.15.04 AM (3).jpeg
C:/Users/aamor/Downloads/WhatsApp Image 2026-06-24 at 10.15.04 AM.jpeg
C:/Users/aamor/Downloads/WhatsApp Image 2026-07-14 at 5.17.01 PM.jpeg
C:/Users/aamor/Downloads/WhatsApp Image 2026-07-14 at 5.14.41 PM.jpeg
```

- [ ] **Step 4: Create the eighteen-record scene manifest**

Use unique semantic triples and these output canvases:

```json
{
  "hero-desktop": [1536, 864],
  "hero-mobile": [900, 1200],
  "section": [1200, 1000]
}
```

The actions and views must match the approved design spec exactly.

- [ ] **Step 5: Run the verifier**

Run:

```powershell
node tools/verify-landings.mjs --self-test
```

Expected: all mutation tests and the funnel contract pass.

### Task 2: Produce Nine Beauty Masters

**Files:**
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/beauty/beauty-hero.png`
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/beauty/beauty-hero-mobile.png`
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/beauty/beauty-aspiration.png`
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/beauty/beauty-story.png`
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/beauty/beauty-ritual-prepare.png`
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/beauty/beauty-ritual-breathe.png`
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/beauty/beauty-ritual-store.png`
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/beauty/beauty-product.png`
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/beauty/beauty-offer.png`

**Interfaces:**
- Consumes: normalized product references and Beauty scene records.
- Produces: nine high-resolution masters that already include the product, environment and any person/hands.

- [ ] **Step 1: Inspect all referenced product photographs**

Open each local reference before using it for image editing. Record visible invariants: two clear tubes, central mouthpiece, blue liner, white bands, blue rim and side handles.

- [ ] **Step 2: Generate the two Beauty hero compositions**

Use front, side and tube references. The desktop scene places an open basin in the right foreground with a woman preparing at a mineral vanity. The portrait scene is separately composed with the product lower center and clean upper copy space. Reject outputs that merely crop the desktop scene.

- [ ] **Step 3: Generate aspiration and story**

Aspiration shows a fresh-faced woman patting her skin dry with the open basin on the left. Story shows hands unfolding the real collapsed basin from a close three-quarter angle.

- [ ] **Step 4: Generate the three ritual steps**

Prepare is a true overhead water-and-ice action. Breathe is a profile interaction with the real dual tube and gradual approach. Store shows rinsing, drying and partial collapse.

- [ ] **Step 5: Generate product and offer**

Product is a clean low three-quarter object portrait. Offer combines the open product, collapsed state, clear tube and real black box without inventing contents.

- [ ] **Step 6: Review every Beauty master at full resolution**

Reject any master with malformed anatomy, changed colors, a single tube, a different mouthpiece, extra handles, duplicated composition, unreadable product or implausible interaction.

### Task 3: Produce Nine Health Masters

**Files:**
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/health/health-hero.png`
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/health/health-hero-mobile.png`
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/health/health-aspiration.png`
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/health/health-story.png`
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/health/health-ritual-prepare.png`
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/health/health-ritual-breathe.png`
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/health/health-ritual-store.png`
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/health/health-product.png`
- Create: `C:/Proyectos/RxSubzero/source-assets/editorial/v3/health/health-offer.png`

**Interfaces:**
- Consumes: normalized product references and Health scene records.
- Produces: nine high-resolution masters distinct from all Beauty masters.

- [ ] **Step 1: Generate the two Health hero compositions**

Desktop shows a quiet recovery moment with the product in the left foreground. Mobile is a dedicated portrait scene with the product lower right and a calm person in the middle distance.

- [ ] **Step 2: Generate aspiration and story**

Aspiration shows a composed post-ritual recovery moment with the product on the right. Story shows hands moving the basin from collapsed to open after exercise.

- [ ] **Step 3: Generate the three ritual steps**

Prepare uses a diagonal overhead setup distinct from Beauty. Breathe uses a low side angle with face, tube and basin in one plane. Store shows rinsing and air-drying in a calm utility space.

- [ ] **Step 4: Generate product and offer**

Product is a strong three-quarter object portrait on dark mineral stone. Offer arranges the open basin, collapsed basin and black box diagonally.

- [ ] **Step 5: Review every Health master at full resolution**

Apply the same product and anatomy rejection rules, then compare all eighteen masters side by side to confirm no repeated camera setup or narrative action.

### Task 4: Export Complete Scenes Without Repeated Cutouts

**Files:**
- Modify: `C:/Proyectos/RxSubzero/source-assets/editorial/image-manifest.json`
- Modify: `C:/Proyectos/RxSubzero/tools/build-editorial-images.mjs`
- Modify: `C:/Proyectos/RxSubzero/tools/verify-landings.mjs`
- Modify: `C:/Proyectos/RxSubzero/preview/assets/img/*-authentic.webp`
- Modify: `C:/Proyectos/RxSubzero/shopify/assets/*-authentic.webp`

**Interfaces:**
- Consumes: eighteen approved v3 masters and their scene metadata.
- Produces: eighteen deterministic WebP outputs with matching preview and Shopify hashes.

- [ ] **Step 1: Add a failing complete-scene build test**

The builder must fail if an entry uses `compositionMode: "complete-scene"` but still defines `productPosition` or if exporting requires source enlargement.

- [ ] **Step 2: Implement complete-scene mode**

In `composeEntry(entry, cutouts)`, return the cropped master directly when:

```js
entry.compositionMode === "complete-scene"
```

Keep the existing cutout path available for historical manifests, but do not use it for v3 outputs.

- [ ] **Step 3: Point all eighteen entries to v3 masters**

Every entry uses `compositionMode: "complete-scene"` and preserves its existing output filename so HTML and Shopify references remain stable.

- [ ] **Step 4: Build and verify**

Run:

```powershell
node tools/build-editorial-images.mjs
node tools/build-editorial-images.mjs --verify
node tools/verify-landings.mjs --self-test
```

Expected: eighteen outputs built, eighteen verified, all verifier mutation tests pass.

### Task 5: Responsive Visual Review

**Files:**
- Modify only if required: `C:/Proyectos/RxSubzero/preview/assets/css/authentic.css`
- Modify only if required: `C:/Proyectos/RxSubzero/shopify/assets/rxsz-authentic.css`

**Interfaces:**
- Consumes: the complete rendered landing pages.
- Produces: approved layouts at desktop and mobile viewports.

- [ ] **Step 1: Render both pages at 1440 x 1000**

Confirm alternating media placement, product readability, hero copy contrast, no duplicated visual rhythm and no navigation overflow.

- [ ] **Step 2: Render both pages at 390 x 844**

Confirm mobile copy appears before media, hero subjects are not hidden by copy, buttons remain stable and all product interactions remain understandable.

- [ ] **Step 3: Audit runtime behavior**

Assert:

```text
HTTP 200
zero console errors
zero horizontal overflow
all 10 page images loaded
navbar logo contained
button text-decoration none
```

- [ ] **Step 4: Run final source verification**

Run:

```powershell
node tools/verify-landings.mjs --self-test
node tools/build-editorial-images.mjs --verify
```

Expected: all checks pass.

### Task 6: Publish And Verify Production

**Files:**
- Modify: `C:/Proyectos/RxSubzero-worktrees/sales-funnel/assets/img/*-authentic.webp`
- Modify only if required: `C:/Proyectos/RxSubzero-worktrees/sales-funnel/assets/css/authentic.css`

**Interfaces:**
- Consumes: the exact verified preview files.
- Produces: two updated GitHub Pages landing pages.

- [ ] **Step 1: Synchronize verified files**

Copy the eighteen final WebPs and any required CSS changes from `preview` into the publication worktree.

- [ ] **Step 2: Verify source/publication parity**

Compute SHA-256 for every copied file and require exact equality.

- [ ] **Step 3: Commit**

```powershell
git add assets/img/*-authentic.webp assets/css/authentic.css
git commit -m "Replace RX SUBZERO imagery with narrative scenes"
```

- [ ] **Step 4: Push the approved branch and main**

```powershell
git push origin codex/rxsubzero-sales-funnel
git push origin HEAD:main
```

- [ ] **Step 5: Verify production**

Require exact hash parity for all published assets and repeat the four Playwright audits against:

```text
https://alejoamorocho.github.io/rxsubzero-landings/beauty.html
https://alejoamorocho.github.io/rxsubzero-landings/health.html
```
