# RX SUBZERO Narrative Image System

## Objective

Replace the current background-plus-cutout image set with eighteen distinct,
high-quality editorial scenes that explain how RX SUBZERO fits into two
different customer journeys:

- Beauty: wanting to look fresh, cared for and ready for skincare.
- Health: wanting to feel calm, clear and restored through a deliberate
  cold-water pause.

The pages keep their current copy, funnel structure, brand palette and product
identity. This project changes the image system and only the layout details
needed to present those images correctly.

## Chosen Direction

Use a controlled hybrid workflow:

1. Exact product photography for catalog, offer and high-identity scenes.
2. AI-assisted compositing for human interaction, hands, water, perspective,
   lighting and environmental integration.
3. Local product compositing or retouching when AI output changes identifying
   details beyond the allowed tolerance.

This direction balances realism with product fidelity. It avoids both the
rigidity of placing the same frontal cutout on every background and the shape
drift of unconstrained full-scene generation.

## Product Invariants

Every scene must preserve:

- Steel-blue outer basin and handles.
- White collapsible bands.
- Blue integrated inner liner/base.
- Clear dual breathing tube and recognizable mouthpiece.
- Rectangular basin proportions and rounded corners.
- A physically plausible relationship between basin, tube, person and surface.

Allowed adjustments:

- Perspective and foreshortening.
- Open, partially collapsed and fully collapsed positions.
- Natural reflections, wet surfaces, condensation and shadows.
- Occlusion by hands, water, towels or a person's face.
- Small material and lighting corrections needed to integrate the product.

Not allowed:

- New product colors.
- Invented controls, electronics, logos, lids or accessories.
- A single tube, a different mouthpiece or a different basin construction.
- Impossible scale, floating placement or a face submerged without a clear,
  believable setup.

## Source References

The generation workflow will use the real product photographs available in
`C:\Users\aamor\Downloads`:

- Front-open product:
  `WhatsApp Image 2026-06-24 at 10.15.04 AM (1).jpeg`
- Top-down product:
  `WhatsApp Image 2026-06-24 at 10.15.04 AM (2).jpeg`
- Low side angle:
  `WhatsApp Image 2026-06-24 at 10.15.04 AM (3).jpeg`
- Fully collapsed product:
  `WhatsApp Image 2026-06-24 at 10.15.04 AM.jpeg`
- Real lifestyle and tube references:
  `WhatsApp Image 2026-07-14 at 5.15.57 PM.jpeg` through
  `WhatsApp Image 2026-07-14 at 5.17.09 PM.jpeg`
- Packaging:
  `WhatsApp Image 2026-07-14 at 5.14.41 PM.jpeg`

## Beauty Image Narrative

| Slot | Story | Product Position / View |
| --- | --- | --- |
| Hero desktop | Refined morning vanity; a woman prepares for a facial cold-water ritual. | Open basin in three-quarter view on the right foreground. |
| Hero mobile | Portrait variation of the morning ritual, composed specifically for mobile copy. | Open basin lower center; woman and hands remain secondary. |
| Aspiration | Fresh-faced woman patting her skin dry beside the completed setup. | Product open on the left side of the vanity. |
| Story | Hands unfolding the collapsed basin into its usable shape. | Close three-quarter side view, centered low. |
| Prepare | Water and ice being added with restrained, premium styling. | True overhead view with hands entering from one corner. |
| Breathe | Woman using the clear mouthpiece and approaching the basin gradually. | Side/profile composition with the product crossing the lower frame. |
| Store | Hands rinsing, drying and collapsing the basin after use. | Partially collapsed side view, placed opposite the copy. |
| Product | Clean premium object portrait showing construction and tube. | Low three-quarter view, no person, controlled frost and condensation. |
| Offer | Complete purchase presentation with product, tube and real black box. | Open product plus collapsed profile and packaging in one coherent set. |

Beauty environments use cool white, mineral gray, pale steel blue, clear glass
and soft daylight. Skin should look natural rather than cosmetically perfect.

## Health Image Narrative

| Slot | Story | Product Position / View |
| --- | --- | --- |
| Hero desktop | Quiet post-workout or early-morning recovery moment near a window. | Product on the left foreground; person seated or kneeling behind it. |
| Hero mobile | Portrait mental-reset scene designed specifically for mobile copy. | Product lower right, person breathing calmly in the middle distance. |
| Aspiration | Person feeling composed after the ritual, towel in hand. | Product open on the right side, seen at table height. |
| Story | Hands setting up the basin as part of a simple recovery routine. | Collapsed-to-open transition in a close side angle. |
| Prepare | Cold water, a few ice cubes and the tube arranged deliberately. | Diagonal overhead composition, not the Beauty overhead setup. |
| Breathe | Person using the mouthpiece and pausing before gradual immersion. | Low side angle with face, tube and basin in one believable plane. |
| Store | Product being rinsed and placed to air-dry in a calm utility space. | Tilted side view with the collapsed bands visible. |
| Product | Strong object portrait for clarity and trust. | Front three-quarter view on dark mineral stone, no person. |
| Offer | Product system ready for purchase with packaging and compact storage state. | Open basin, collapsed basin and box arranged diagonally. |

Health environments use charcoal, cool gray, muted steel blue, misted glass and
soft dawn light. The mood is restorative and focused, not extreme or athletic.

## Composition Rules

- No scene or camera angle repeats across the eighteen outputs.
- Desktop editorial sections continue alternating image and copy placement.
- Mobile sections present copy first, then the relevant image.
- The subject and product must remain readable at the final card size.
- Human interaction is used in narrative moments, while product and offer
  images remain object-led.
- Water, ice and frost are restrained physical details, not decorative effects.
- No triangles, abstract alert shapes, excessive overlays or artificial glow.

## Image Production

Each slot receives a dedicated high-resolution master. Human-interaction scenes
are generated or edited with the closest real product angle as a reference.
Object-led scenes use exact photography and controlled local compositing where
possible.

Outputs:

- Desktop hero: minimum 1536 x 864.
- Mobile hero: minimum 1080 x 1440 master, exported at 900 x 1200 or higher.
- Editorial sections: minimum 1200 x 1000.
- Final delivery: high-quality WebP with no source enlargement.

## Validation

Before publication:

- Compare product color and construction against all real reference angles.
- Reject any output with duplicated composition, malformed tube, changed color,
  extra product parts, implausible anatomy or nonsensical interaction.
- Check image sharpness at 100 percent and in the rendered page.
- Verify text contrast over both hero images.
- Verify all images load, no horizontal overflow appears, and logo/buttons
  remain contained at 1440 x 1000 and 390 x 844.
- Verify Beauty and Health still communicate distinct emotional objectives.
- Publish only after all eighteen assets and both public URLs pass review.
