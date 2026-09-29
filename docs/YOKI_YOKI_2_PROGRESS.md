# YOKI YOKI 2.0 — implementation progress

## Resume checkpoint
- Started: 2026-09-28; source main: `f99bf9ff3d2a9887ec88afc1321209402a2a6278` (2026-09-22 23:08:02 UTC).
- Working branch: `codex/yoki-yoki-2-room`. Never force-push or replace main.
- Current phase: core PHASE 2–10 implementation checkpoint saved; PHASE 11–14 polish, validation and review remain partial. See the phase table below before resuming.
- On every resume: fetch main, compare divergence, inspect working tree and this document before editing.

## PHASE 1: architecture and decisions
Expo Router / React Native mobile, Express API, Drizzle DB, standalone character-lab and item-admin. Existing AsyncStorage, guest/account synchronization, character art and purchased inventory remain authoritative.

HOME uses a portrait illustrated 2.5D room, independent furniture sprites, foot-position depth ordering and native character animation. No 3D engine or new runtime dependency. Original character sprites/rigs remain intact. Notebook, dining place, music player and bookshelf become accessible interaction targets. Compact overlays provide navigation and hints; HOME has no scrolling dashboard.

| Existing area | Decision |
| --- | --- |
| AppContext, auth, API, DB, storage keys | Retain; no destructive migrations |
| Mascot / BoneCharacter / StageCharacter / character-lab | Reuse original art and native rig; embedded lab remains available for other surfaces |
| RoomView and home index | Replace presentation; retain customization and owned items |
| Quick record / detailed record / checklist | Basic short flow in room; detailed/checklist remain secondary |
| Feed / shop / growth / encounters | Integrate via room and album; keep saved progress |
| LightEnergy / powerPlant | Keep balances/calculations; simplify user-facing concepts |
| Plant garden / cable / liquid tank | Reuse rich garden art and existing visualization |
| Rhythm modes / four music tracks | Primary play flow; points-only rewards |
| Runner / town-building | Retain as legacy implementation, outside primary experience |
| Development gallery | Keep unreached characters out of user-facing routes |

## Phase status (implementation is not the same as production validation)
| Phase | Implemented and retained | Remaining |
| --- | --- | --- |
| 0–1 audit/design | Main inspected; architecture above; existing data and character art retained | Recheck main and working tree on each resume |
| 2 room HOME | Illustrated fitted room, furniture hotspots, short sheets, three-tab navigation; no scrolling dashboard | Native safe-area/orientation review |
| 3 resident | Original sprites/rig, breathing/blinking, aisle movement, hold/lift/drop, depth ordering, equipment calibration; bed rest, window watching and successful-feed meal routines; browser interruption checks passed | Native gesture QA |
| 4 record | Short mood/activity flow, detailed entry secondary; explicit unentered-sleep flag; fresh guest onboarding, compact save and reload browser checks passed | Authenticated synchronization QA |
| 5 reaction | Record/care reaction and saved-energy feedback on all platforms; compact garden link, motion preference and hidden-app guards; same-day update does not replay gains | End-to-end native review of transitions; storage failure recovery remains broader data-layer work |
| 6 garden | Existing rich garden art, cable, liquid tank, one-step reward receipt; zero balance is visually empty; recoverable balance journal with retry/restart failure tests | Live-account synchronization and native persistence checks |
| 7 rewards/growth | Existing food, growth, discovery and ownership retained; room atelier integrated; offline equipment hydration; recoverable guest point-debit/inventory transaction | Authenticated purchasing/synchronization cases and flower-art variants |
| 8 rhythm | Five modes/four existing songs, points-only primary flow, practice after reward cap, actual-earned result chip; late audio-load disposal and hidden-app cancellation | Native audio/interruption QA and full-song judgment/reward matrix |
| 9 conversation | Room tap/menu to conversation; existing context and safety API retained | Production AI response/auth QA |
| 10 legacy | Old runner/town code and data retained outside primary flow; gallery redirects to growth | Broader navigation regression pass |
| 11 visuals | Room/background/object sprites; sofa/vanity/bookshelf art; muted palette and dark navigation | Shop/album/detailed screens and flower art are NOT fully unified |
| 12 performance/accessibility | Focus/background/reduced-motion guards, animation cleanup, keyboard chat entry, accessible resident activity description and static light feedback | Device profiling and full screen-reader pass |
| 13 verification | Typechecks, regression tests, API build and Expo export; selected local guest browser flows | Native devices, real auth/cloud round-trip, purchase flows |
| 14 handoff | Source checkpoint `2f86197eb2d8315e68db77ce63ca4b93b2fd0c74`; follow-up polish checkpoint contains this updated document | Main merge/deployment NOT performed; final product review pending |

## Validation and risks
- Workspace React dependency issue in integrations-openai-ai-react was corrected in the implementation checkpoint; typechecks now pass.
- Native iOS/Android devices and authenticated production account may be unavailable; never claim unperformed tests.
- Main risks: room coordinates across aspect ratios, gesture/animation cleanup, preservation of equipped items, async record/reward duplication.
- Installer-generated invalid allowBuilds addition was removed without changing unrelated configuration. Use existing direct binaries for verification; do not approve dependency build scripts automatically.
- ItemContext now loads saved inventory/equipment before catalog requests and caches catalog metadata. Image/audio binaries are not downloaded into a dedicated offline cache; their offline availability still depends on platform/HTTP caching. No inventory migration or deletion was introduced.

## Next action
Do not rebuild HOME, bed/meal routines, balance-journal recovery or offline equipment hydration. PHASE 7 guest compound purchase recovery is implemented in the latest follow-up below; authenticated synchronization still needs live-account validation. Native gesture/audio/safe-area QA and PHASE 11 secondary-screen/flower-art unification remain open. Keep all original character assets and stored ownership/history intact.

## Resume 2026-09-28
- Re-fetched GitHub: main still `f99bf9ff3d2a9887ec88afc1321209402a2a6278`.
- GitHub working branch contains initial progress commit `5c29870505873ebcbc5508a0ce5d2d50b89082c1`. Local original documentation commit had the same tree; local base aligned without discarding implementation changes.
- Recovered uncommitted implementation (not reimplemented): illustrated RoomView, native RoomResident, short record, equipment, room atelier, three-tab navigation, rhythm-only primary flow, garden and one-step reward conversion.
- Mobile, API and workspace-library TypeScript checks PASS on resume. Unit tests 7/7 PASS.
- Fixed a pre-existing guest merge bug that treated `{list: encounters}` as an array and lost encounter history. Test verifies shape, union and earliest meeting dates.
- Basic records mark sleepRecorded=false; calendar, averages, AI context and insight API exclude unentered sleep. Existing records remain compatible (missing flag means entered).
- New room images optimized to ~936 KB total. Original character assets unchanged.
- Browser verification in progress; bundled browser download endpoint returned truncated archives. Trying an isolated test browser package (no app dependency change).
- Remaining: visual/runtime QA; purchased-furniture art consistency; interaction/equipment review; final build; source/image commit to GitHub. Native devices and authenticated live-account checks still outstanding.

## Follow-up checkpoint (resumed after implementation commit)
- GitHub connector reverified main at `f99bf9ff3d2a9887ec88afc1321209402a2a6278` (2026-09-22 23:08:02 UTC / September 23 08:08:02 JST), and working branch at `2f86197eb2d8315e68db77ce63ca4b93b2fd0c74` (2026-09-28 09:42:20 UTC).
- Initial working tree: 9 modified source/test files, 5 new source/art files, and two untracked export directories. Existing changes were reviewed and retained, not restarted. Export directories are build products and must NOT be committed.
- Shell git fetch was unavailable because the configured proxy could not be reached. The connected GitHub API was used to verify live refs and save the fast-forward checkpoint; no credential extraction, force push or main update.
- Finished inherited polish: illustrated purchased furniture, Character Lab-scale wearable offsets, keyboard/menu chat entry, inactive animation reset, feed re-entry/error handling, dark navigation, and reward result chips based on saved points instead of a fabricated refresh bonus.
- Main paths: `artifacts/mobile/components/room/RoomFurnitureArt.tsx`, `utils/roomWearable.ts`, `components/room/RoomResident.tsx`, `components/FeedModal.tsx`, `components/MiniGameModal.tsx`, `components/rhythm/RhythmGameFlow.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/_layout.tsx` (paths after the first are relative to `artifacts/mobile`).

### Verification record
Re-run successfully at this checkpoint:
```sh
node --test artifacts/mobile/tests/*.test.mjs
node_modules/.bin/tsc --build
node_modules/.bin/tsc -p artifacts/mobile/tsconfig.json --noEmit
node_modules/.bin/tsc -p artifacts/api-server/tsconfig.json --noEmit
node_modules/.bin/tsc -p artifacts/character-lab/tsconfig.json --noEmit
git diff --check
# from artifacts/api-server
node ./build.mjs
```
The two regression test files contain eight cases: room fitting/drop bounds, encounter merging, balance preservation, wearable calibration, and three home-comment timing cases.

Previous browser session (local guest data, not production): room rendering; new mood record and same-day update without duplicate points; feeding; garden energy receipt; one RHYTHM RELAX play-through with points and no XP; conversation entry; 320×568 record-save visibility. These flows reported no page errors. The temporary browser and screenshots did not survive the session reset. Do not claim this is a fresh browser run or full five-mode coverage. The final lift/drag/hidden-tab check was interrupted and is still pending.

All-platform Expo export passed again at this checkpoint: `CI=1 EXPO_NO_TELEMETRY=1 node_modules/.bin/expo export --platform all --output-dir ../../build-yoki-v2-final` from `artifacts/mobile`. Output: Web 3.42 MB, iOS 6.70 MB, Android 6.72 MB. Expo export is JS/assets compilation, NOT an Xcode/Gradle device build.

### Art provenance and scope
The image-generation workflow supplied room/furniture bitmap art only; original character sprites and expressions were not regenerated. Files live in `artifacts/mobile/assets/images/room/`:
- `room-night.jpg`: warm portrait bedroom, window/bed/rug, clear central floor; separate desk and record player sprites.
- `sofa.png`, `vanity.png`, `bookshelf.png`: individually generated transparent square sprites, elevated approximately 35-degree front-left view, amber upper-left lighting, honey oak/lavender materials, textured painted game style, no people or text. Optimized to 384px with alpha retained.
- Existing milk/plant art reused. Furniture purchase IDs/costs and saved customization remain unchanged.

### Explicitly not done
No main merge or deployment, no production credentials/configuration changes, no DB migration, no authenticated live-account or native-device pass. Whole-app visual unification and production validation are not complete. Do not label the entire 2.0 project finished.

## Resume 2026-09-29 JST — PHASE 3 implementation
- Live main remains `f99bf9ff3d2a9887ec88afc1321209402a2a6278`; latest prior implementation is `d1a5ddcfe30601f8691276cccea275d4d2ff6caf` (2026-09-29 06:41:43 JST).
- `git fetch` succeeded this time. The 15 staged files were identical to the remote commit's tree (`99fa82defbcbd835b5d74d3e6ac1e7ae563ca30b`). Soft-aligned local HEAD without rewriting or discarding files. No unfinished source delta remained; only excluded build outputs were untracked.
- Earliest outstanding implementation: PHASE 3 bed/meal-specific behaviors. Added pure routine planning in `artifacts/mobile/utils/residentRoutine.ts` and cancellable native-animation scheduling in `components/room/useResidentRoutine.ts`.
- Bed hotspot and accessible menu entry request a rest. Character walks via the aisle to the painted mattress and uses the original sleepy expression. Successful feeding alone requests a visit beside the meal bowl, happy expression and a small whole-character nod; no new purchase or reward operation occurs in animation.
- Meals take priority over rest. Backgrounding, sheets and gestures stop timers/position animations; unfinished visual requests remain resumable. Reduced motion retains expressions without room travel or nodding. Dragging before the hold threshold no longer accidentally opens chat.
- Mobile typecheck PASS; regression suite 12/12 PASS, including new priority, bed exit path, stationary rest and reduced-motion cases. Web export PASS. Native device verification remains pending.
- Next: runtime QA of these routines; PHASE 5/12 review of energy feedback (existing global LightFlowHost is currently excluded on iOS and lacks background/reduced-motion guards).

## PHASE 5/12 follow-up — saved-energy feedback
- PHASE 3 checkpoint: `998c90756217bcff5e0c727144db4a927ff1c3b8`. Runtime review found that React Native Web does not translate the combined `accessibilityValue` object on this button. The resident's accessible label now also describes the current activity; behavior itself correctly reached the mattress.
- Reworked `artifacts/mobile/components/LightFlowEffect.tsx` with lightweight Native Animated particles and a compact warm-colored garden link. Window dimensions/safe areas update with layout. All particle animations and completion timers clean up on unmount. Reduced motion shows a static message without particle travel.
- `components/LightFlowHost.tsx` now pauses its visual queue while hidden/backgrounded using the shared `useAppActivity` hook. Finishing an old event cannot accidentally discard the next queued event.
- `app/(tabs)/_layout.tsx` mounts energy feedback on iOS too. The existing iOS discovery-modal policy was not changed. Native exports pass, but this is NOT an iPhone runtime test.
- `contexts/AppContext.tsx` queues the positive energy message only after the energy storage write succeeds. Existing daily gain flags remain authoritative; no extra reward calculation, balance migration or charging operation was introduced. Full multi-key transaction recovery is still not implemented.
- Fresh headless Chromium guest checks passed: bed arrival/rest; bed-to-meal route and exactly one food debit; lift/release during a routine; routines frozen behind a sheet; reduced-motion rest with unchanged position; saved-record static light feedback; hidden-tab feedback pause/resume; garden link; no duplicated energy celebration on a same-day record update. No page errors in these flows.
- Additional fresh guest browser checks passed at 320×568: onboarding without pre-seeded profile, basic record save button within the viewport, successful first save, and reload without replaying an old energy event.
- Regression tests: 12/12 PASS. Workspace, mobile, API and character-lab TypeScript checks PASS. Final Expo all-platform export PASS (Web 3.43 MB, iOS 6.71 MB, Android 6.72 MB). API source was unchanged; no backend deployment performed.
- Next actionable gaps: PHASE 6 storage-failure recovery review; PHASE 7 offline catalog/equipment hydration; PHASE 11 secondary-screen and flower-art consistency. Native device/authenticated cloud/purchase validation remains open. Do not repeat the completed room/routine work.

### Reproducible browser checks
`artifacts/mobile/tests/room.browser.cjs` serves a local export and uses isolated browser contexts with synthetic guest data. It never signs in or writes production data. Playwright/Chromium are QA-only prerequisites, not new app dependencies.
```sh
# From artifacts/mobile; build-yoki-v2-life is an untracked output directory
CI=1 EXPO_NO_TELEMETRY=1 node_modules/.bin/expo export --platform all --output-dir ../../build-yoki-v2-life
# From repository root, with QA-only tools installed separately
YOKI_QA_PLAYWRIGHT=/absolute/path/to/playwright \
YOKI_QA_BROWSER=/absolute/path/to/chromium \
node artifacts/mobile/tests/room.browser.cjs
```
`YOKI_QA_EXPORT` can override the export directory. The runtime checks use browser DOM/state and local storage; they do not certify native gestures/audio or Japanese font rendering on a physical device.

## Resume 2026-09-29 afternoon JST — PHASE 6 storage recovery
- Fetched main and working branch again. Main: `f99bf9ff3d2a9887ec88afc1321209402a2a6278`. Previous checkpoint: `d9096aecd027dc3a8a2615014c045dd8c7420cac`. No unfinished source edits; only generated export directories were untracked. Previous room/record/light feedback implementation was retained.
- Earliest actionable gap was garden persistence. Replaced the primary garden's two separate conversion/exchange calls with `receiveGardenReward`: stored energy, legacy eco points and food points are committed as one recoverable operation.
- `utils/recoverableStorage.ts` serializes writes and keeps a local write-ahead journal of exact resulting values. Preparation failure touches no balance; interruption after preparation rolls forward before the next operation or load. Replaying values does not reapply a reward delta. Unknown/corrupt journal shapes are preserved and block recovery rather than deleting data.
- `utils/balanceStorage.ts` shares the coordinator with AppContext storage operations. The journal key is intentionally absent from cloud-synchronized KEYS. Existing balance keys, conversion rate, fractional energy, satiety and legacy town history are retained.
- `contexts/AppContext.tsx` uses the same transaction queue for garden receipt, legacy conversions, energy gains/passive settlement and food-point changes; React balance state is published only after successful persistence. Record/progress/inventory multi-key operations outside those balances are NOT all transactional yet.
- Root AuthGate and tabs show a retryable storage recovery state instead of redirecting an unreadable existing profile to new-user onboarding. This regression was discovered by the restart browser test and fixed in `app/_layout.tsx` and `app/(tabs)/_layout.tsx`.
- Regression tests 21/21 PASS (nine new cases: fractional/history preservation; interruptions at prepare, each balance write and journal deletion; concurrent credit; write/recovery ordering; invalid journal). Mobile typecheck and Web export PASS.
- Fresh browser injection of a quota error during the food-point write passed both in-place retry and restart/recovery. Exactly 19 points were received from 12 whole energy + 7 legacy eco points; 0.75 fractional energy and town history survived. No page errors. Reproducer: `tests/storage.browser.cjs`, using the same QA environment variables as `room.browser.cjs`, export default `build-yoki-v2-storage`.
- Next: PHASE 7 offline catalog/equipment hydration, then full build and regression verification. Main has not been merged or deployed.

## PHASE 7 follow-up — offline owned equipment
- PHASE 6 recovery checkpoint saved on GitHub: `5cc96c34028840ca29263648552d07d82040df92`. Continued without redoing prior HOME work.
- `artifacts/mobile/contexts/ItemContext.tsx` now hydrates saved inventory, equipment and placements before waiting for the catalog. Successful catalog metadata and server-owned IDs are retained for subsequent offline boots. Catalog refresh waits for AppContext recovery, aborts superseded requests, times out after eight seconds and rereads local equipment before applying a response.
- `utils/itemCache.ts` validates the versioned display cache, preserves inactive item metadata for existing equipment and retains unknown legacy ownership IDs. Cached prices never authorize a new offline exchange. Removed duplicate signed-in refresh and point-change-driven refetches.
- `app/shop.tsx` keeps saved items visible beside the connection error and offers explicit reconnection. New exchanges are disabled until a successful request; owned equipment can be removed and saved. Equipment/placement state is published after local persistence succeeds.
- Regression tests 25/25 PASS, including four new cache/legacy ownership cases. Workspace, mobile, API and character-lab typechecks and `git diff --check` PASS. Expo export for Web, iOS and Android PASS; this compiles JS/assets and is not a native device build.
- Fresh isolated guest browser checks PASS: both garden partial-write retry/restart cases; cached equipped art on an offline catalog boot; retained ownership; unequip and reload; disabled new exchanges; reconnection restores exchange controls with no point debit. No page errors. `tests/storage.browser.cjs` contains the reproducer; its catalog/image responses are mocked and no production purchase is performed.
- Existing `tests/room.browser.cjs` also passed against this export: bed/meal and single food debit, lift/release, sheet interruption, reduced motion, saved-record/hidden-tab feedback, garden link, same-day duplicate guard, 320×568 guest onboarding and record save/reload. No page errors.
- Offline image/audio binary storage, signed-in cloud round-trips and native-device behavior remain unverified. Purchases still require a separate review of debit-plus-inventory failure recovery; this checkpoint does not claim every multi-key operation is atomic. Main merge and deployment were not performed.

## Resume 2026-09-29 JST — PHASE 7 compound guest purchases
- GitHub API reverified main `f99bf9ff3d2a9887ec88afc1321209402a2a6278` (September 23 08:08:02 JST) and working branch `a4fbc06883130863d4152b52b1ec65c7e03c4ef9` (September 29 12:28:05 JST). Both match local objects; main has no additional commits. Shell fetch failed because its configured proxy was unavailable. Initial tracked worktree/index were clean; only excluded exports remained.
- Prior changes reviewed: `AppContext.tsx`, `ItemContext.tsx`, `shop.tsx`, `balanceStorage.ts`, `recoverableStorage.ts`, `itemCache.ts`, storage tests and this document. No interrupted source edit was found. Existing PHASE 2–10 core implementation retained; phase table remains authoritative (8 = rhythm, 9 = conversation, 11–14 = polish/validation/handoff).
- `utils/itemPurchase.ts` prepares guest point debit and inventory grant together under the existing recovery journal. Saved ownership prevents repeat charging after interruption/restart; concurrent purchases read the latest persisted wallet and inventory. Free items work; invalid prices or malformed saved purchase data cannot silently reset ownership.
- ItemContext now uses the shared storage queue. Equipment persistence retains newer owned IDs. Signed-in purchase responses also persist owned IDs for offline restart, without pushing an old wallet to cloud during this write. Server purchase already uses a DB transaction; authenticated response-loss/cloud-sync reconciliation remains unverified and is not claimed fixed.
- Shop blocks concurrent action taps and shows a persistent inline failure message. Tests cover each purchase write interruption, recovery/retry, duplicate and concurrent purchases, insufficient points, free items and corrupt saved data.
- Validation: six unit test files PASS, including six new purchase cases; workspace/mobile/API/character-lab typechecks and all-platform Expo export PASS. Fresh browser tests PASS for garden retry/restart, offline equipment/reconnect and an interrupted purchase followed by retry/reload with exactly one 50-point debit and retained ownership. No page errors. Local HTTP QA required escalated execution after an initial EPERM; no production account or purchase was used. Expo export is not a native device build. Do not mark the entire phase or project complete.

## Resume 2026-09-29 17:28 JST — PHASE 8 interruption handling
- Re-fetched origin successfully; main remains `f99bf9ff3d2a9887ec88afc1321209402a2a6278`. Local HEAD and GitHub working branch match `4093095548477ecc793dd7949bc26b4463c39be7` (September 29 12:41:51 JST), the completed guest-purchase checkpoint. No unfinished tracked edits, only excluded build products.
- Reviewed progress table and prior `AppContext`, `ItemContext`, purchase helper/tests and shop changes. Native/authenticated checks in earlier phases require devices/accounts; the next actionable implementation gap is PHASE 8 audio/interruption handling.
- `components/rhythm/RhythmGameFlow.tsx` stops previews when hidden and returns interrupted games to difficulty selection without results/rewards. Song, mode and difficulty remain selected; restarting is explicit. This is cancellation/restart, not mid-song resume.
- `utils/rhythm/useSongClock.ts` invalidates superseded loads, disposes late-created sounds, ignores stale playback callbacks and prevents late play completions from reviving a closed clock.
- `tests/songClock.test.mjs` exercises the actual hook with deterministic React/audio adapters: unmount during load, out-of-order loads/stale callbacks, and play completion after unload. Unit suite 34/34 PASS; mobile and workspace typechecks PASS. All-platform Expo export PASS (JS/assets, not device builds).
- Fresh browser checks passed hidden-tab cancellation in all five modes (TAP BEAT/JUMP/SWIPE/COPY/RELAX), retaining wallet and play history without rewards. Original room/record checks and compact onboarding/save/reload checks also PASS, with no page errors. The temporary Chromium from the earlier session was missing; the official installer returned truncated archives. Restored a QA-only Chromium from `@sparticuz/chromium@153.0.0` under `/tmp/yoki-qa`, with no app dependency changes.
- Next: full-song judgment/reward and native audio matrix in PHASE 8; production conversation/auth verification in PHASE 9; PHASE 11 shop/album/flower-art polish. Earlier authenticated cloud/purchase and native-room checks remain open. No main merge/deployment performed.
