# YOKI YOKI 1.2.5 (51): home closet and battle return

## Changes
- A bundled 41 KB wardrobe furniture entry on the home screen, with a compact entry for close/eye views.
- A closet featuring the existing resident, local-only costume previews, all/owned/shop filters, and explicit equip actions.
- Existing 500-point or localized StoreKit purchases, restore, pending purchases and refunds remain in use. Previewing never grants ownership, spends points, or changes the saved outfit.
- A small cloud-icon “モヤモヤバトル” return button for today's unfinished self-reported concern. Deferring or returning home no longer repeatedly opens the encounter sheet. Explicit resume preserves HP, scenario, selected answers and the daily reward receipt.
- New check-ins still open the existing encounter; question content and emotion matching are unchanged. Completed, absent and previous-day concerns do not show a home battle button.
- Build 50 rewarded-ad handling remains included.

## Validation
- Mobile TypeScript check passed.
- 309 selected release regression and home-view checks passed.
- Browser journeys at 390×844 and 320×568: local previews, ownership filters, point purchase/equip/persistence; simulated native purchase cancellation, pending approval, delivery, restore and refund. No actual Apple purchase was made.
- Battle journeys: initial encounter, defer/reload, explicit start, one-turn exit/resume, finish/hide, and previous-day suppression.
- Exact-source native renderer check passed.
- Distribution and Apple review status will be recorded after verification.

## Artwork
`artifacts/mobile/assets/images/world/closet-v1.webp` is a compressed transparent furniture sprite generated from the approved closet concept. Prompt: isolated rounded warm-wood wardrobe, lavender open door, hanging panda/rabbit hoods and baskets, matching the miniature wool-and-wood room, without a character or UI. The existing mascot renderers and costume geometry are reused unchanged.
