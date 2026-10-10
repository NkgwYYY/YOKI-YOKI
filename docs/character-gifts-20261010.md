# Character gifts — 2026-10-10

A saved low-mood record, tiredness report, or completed-effort report prepares a keepsake for the following local calendar day. Home presents the oldest due gift. Missed days do not expire it, repeated submissions share one gift per day, and received gifts retain their original message and sender. Existing recoverable feed transactions and account backup store the ledger; points and care meters are unaffected. Only saved user messages are considered, not character replies. Text cues run locally and are not a diagnosis.

The home menu and Memories both open /gifts. BGM continues into the collection. Village visitors remain tappable with accessible labels, without the visible ellipsis badge.

## Art provenance

Mode: built-in imagegen, three new images, transparent_background=true, no reference images. Native PNG and web WebP derivatives are 480×480, preserving alpha. The three WebP files total 137,076 bytes and load only where displayed.

Prompt template:

Use case: stylized-concept. Asset type: transparent collectible gift sprite for YOKI YOKI, a cozy high quality 3D miniature village game. Primary request: [subject] Style: tactile storybook 3D render, beautifully modeled volume and subtle material detail, soft warm studio lighting, restrained pastel palette, premium handcrafted look. Composition: one isolated object centered, square image, full object entirely visible with generous empty transparent margins, 3/4 view slightly from above. Actual transparent background, no backdrop, no frame, no scene, no character, no lettering, no text, no watermark. Clear silhouette and recognizability at 96px.

### flowers

Subject: A small hand-picked bouquet of cream daisies and pale lavender wildflowers, a few delicate green leaves, short stems tied with a soft mauve ribbon. An affectionate modest gift picked by a small village companion.

Assets: artifacts/mobile/assets/images/gifts/flowers.png and .webp.

### cake

Subject: A single tiny strawberry shortcake, fluffy ivory whipped cream and sponge layers, one ripe red strawberry and a tiny fresh mint leaf, on a simple small cream porcelain saucer. A thoughtful homemade congratulatory gift, appealing and delicate.

Assets: artifacts/mobile/assets/images/gifts/cake.png and .webp.

### stone

Subject: One beautiful smooth oval pebble found in a river, pale lavender grey with an elegant milky quartz vein and a little softly iridescent aqua glint, resting alone. Natural worn shape, realistic polished mineral texture, a humble cherished treasure, not a faceted gemstone.

Assets: artifacts/mobile/assets/images/gifts/stone.png and .webp.

## Verification

TypeScript passed. Gift timing, repeated reports, receipt idempotency, missed days, clock rollback, journal recovery, and existing diary/record/visitor behavior were checked with 43 passing tests. A temporary in-memory review screen exercises the actual world, receiving sheet, and collection across three dates without adding gifts to the user's account. Mobile visual QA passed for all three gifts, receiving and rereading letters, the home menu and Memories entry points, and badge-free villagers that still respond when tapped. The temporary review route and wrapper were removed before committing.
