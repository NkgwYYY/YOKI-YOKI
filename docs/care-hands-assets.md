# Caretaker hands — 2026-10-27

The built-in image generation tool produced these project assets with a transparent background. Both use the same warm skin, soft lighting and lavender knit sleeve. They are compressed to WebP with the original dimensions and alpha preserved; their combined download size is 180 KB.

- `artifacts/mobile/assets/images/world/care-hand-offer.webp` — food contact at (135, 419) in the 1536 × 1024 source.
- `artifacts/mobile/assets/images/world/care-hand-wash.webp` — cloth contact at (155, 438) in the same canvas.

`CareHandArt.tsx` displays the hand without distortion and tiles only the distant sleeve in layout. The source images are unchanged. Feeding shares the existing 6.8-second meal clock; bath input remains the sole source of wash coverage. Motion reduction removes entry and exit travel. Changing screens cancels and hides the bath hand immediately.

## Offer prompt

Use case: stylized-concept. Production game sprite for a cozy miniature pet game, one single adult human right hand and a long forearm reaching in horizontally from the RIGHT edge, fingers pointing LEFT. Pose: gently holding one tiny invisible morsel between the index fingertip above and the thumb tip below, with a very small gap between them, remaining three fingers naturally relaxed and curled below, anatomically correct five fingers. No food or prop: only the hand and arm. The pinch point should be near x=12%, y=46% of the image; palm and curled fingers near x=28%, cuff near x=43%, long lavender knitted sweater sleeve extending continuously to and CUT OFF at the entire right edge of the image, so it can come from offscreen. Wide landscape 1536x1024. Hand and sleeve span y=20% to y=75%, completely isolated on true transparent alpha. Style: high quality soft tactile 3D storybook illustration, plush cozy pastel game aesthetics, warm peach skin, softly rounded fingers and natural tiny fingernails, smooth subsurface scattering, delicate shading and warm light from upper left. Slightly simplified cute human anatomy, matte surface, no hard black outlines, no photorealistic pores, no jewelry, no text, no background, no drop shadow outside the hand. The hand must look like a kind human caretaker reaching gently into a tiny world, not an animal paw, mitten, claw, or pointing cursor.

## Wash prompt

Reference: the offer sprite above. Built-in edit, with transparency preserved.

Create a second animation sprite from this reference. Preserve exactly this kind adult human hand's warm soft 3D storybook materials, skin tone, scale, lavender knitted sweater cuff, long rightward sleeve, lighting and 1536x1024 canvas. Change the hand pose only: a relaxed hand gently holding a small folded cream terrycloth washcloth, the fingers resting over the cloth from upper right, thumb curled naturally beneath it. The cloth is used to softly wash a tiny pet; only hand, cloth, forearm and sleeve. The little cloth contact center is around x=150,y=440 on the left, with a few delicate white suds at the cloth edge. Keep the hand and wrist near the same location as the reference, sleeve continues off the RIGHT edge. All five fingers anatomically correct, most fingers naturally overlapping from this side view. The washcloth must be clearly visible at the very left under the fingertips, with delicate lavender seam. Very soft rounded anatomy and fabric texture. True clean transparent background, no glow/background/shadow outside the subject, no scene, no pet, no text. This will be moved as a single cohesive game sprite.

## Wide bathroom

`artifacts/mobile/assets/images/world/home-bath-wide.webp` is a responsive background generated with the built-in tool from `home-bath-v2.jpg`. Its water ellipse is calibrated separately at (0.50, 0.397). The image fills the viewport while the resident size is capped on wide screens.

Prompt: Create a WIDE 16:9 landscape version of this exact cozy miniature bathroom game background. Preserve its warm wood, pastel lavender tiles, soft 3D storybook rendering, rounded wooden bathtub, turquoise water with floating flowers, flower pots, lavender towels and sunlit garden window. This is a responsive game asset. Composition is crucial: the center of the visible water ellipse must be around 50% of width and 33% of height, its water surface spans x18%-82%, y27%-39%; tub front extends to approximately y52%. Leave a large clear wooden floor from y56% to bottom for a small pet, especially around x53%, y64%. Expand the room horizontally with matching shelves, towels, plants and wall details, keeping the central tub and open floor. Soft dreamy warm lighting, tactile softness, no hard outlines. No people, hands, pets, UI, icons, labels or text. Full frame room scene with no borders or blank sidebars.
