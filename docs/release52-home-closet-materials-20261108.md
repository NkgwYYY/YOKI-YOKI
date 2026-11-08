# YOKI YOKI 1.2.5 (52): room-integrated wardrobe

The separate wardrobe sprite in build 51 overlapped the lounge chair and did
not match the room's materials or lighting. Build 52 removes that sprite.
The existing wooden cabinet now stores two costume hoods in its upper section;
its original frame, feet, floor shadow, nearby plant and room background remain
unchanged. Separate day/night interiors follow the room lighting and all four
room perspectives. Only two small bundled WebP patches are added (under 20 KB
combined), with no network image dependency.

The wardrobe label and its full touch target follow the upper cabinet. The
calendar is on the free wall to the left, and the existing memory entry remains
on the lower shelf. Hiding the cabinet hides its costume contents and exposes
the compact wardrobe entry instead. The close and eye-level views keep their
compact entry. The existing costume catalog, 500-point / localized StoreKit
price choices, and battle matching, questions and rewards are unchanged.

## Validation

- TypeScript check and native resident source verification passed.
- 312 targeted unit tests passed, including room persistence, battle state,
  costume entitlements and existing ad reward handling.
- Production web export passed. Visual/browser checks passed at 390×844 day
  and night, 320×568 day, and 844×390 night across overview/close/eye views.
  The wardrobe label is visible and receives taps; it does not overlap the
  calendar. Cabinet-hidden and lounge-hidden compositions passed too.
- Costume preview, points purchase, explicit equip, reload, StoreKit cancel /
  pending / success / restore / refund journeys passed. Native StoreKit was
  simulated; these checks did not make real purchases.
- Current-day battle defer, start, intermediate return/resume, completion and
  previous-day hiding passed against the production export.
- Visual checks use the browser renderer. They establish room compositing and
  layout, not a new physical-iPhone or real-AdMob playback verification.

## Assets

Final project assets:

- `artifacts/mobile/assets/images/world/closet-interior-day-v2.webp`
- `artifacts/mobile/assets/images/world/closet-interior-night-v2.webp`

The built-in image editor was used for the artwork; the selected interiors were
mechanically cropped and WebP encoded for bundling. Rendering clips the patches
to the cabinet interior, so generated pixels outside it never replace the room.

Final day edit instruction: edit only the upper interior of the existing arched
bookcase, replacing its upper books/plant/vase with a wooden rail and two tiny
soft plush animal hoods, panda left and cream rabbit right. Empty face openings,
hoods only, no bodies, limbs, buttons or characters. Match matte wood, cream
fleece, warm daylight and shadows. Preserve the cabinet outline, lower lamp
shelf, drawers, floor contact, camera, framing and entire surrounding room.

Final night edit instruction: use the original night room as the edit target
and the selected day edit as the design reference. Reproduce the same two hoods
and rail inside the existing cabinet, matching muted purple night ambient light
and the existing lamp's warm glow. Preserve all original night scenery and
geometry outside the cabinet interior; no sunlight, new furniture, UI or text.

## Distribution

Build 52 uses the existing signing and upload workflow. The preflight refuses
to archive 1.2.5 if Apple has already approved that version. Apple upload,
processing, internal TestFlight attachment and App Store review submission are
separate statuses; no review submission is claimed by this source checkpoint.

Proposed Japanese release note:

ホームから着ぐるみを選びやすくなりました。着ぐるみの収納を、お部屋の色や
質感になじむ配置に見直しました。中断したモヤモヤバトルもホームから再開できます。
