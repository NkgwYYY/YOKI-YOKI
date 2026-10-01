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
| 4 record | Short mood/activity flow, detailed entry secondary; explicit unentered-sleep flag; recoverable daily record and checklist/reward transactions, recoverable checklist customization, retry/restart checks | Authenticated cross-device synchronization QA |
| 5 reaction | Record/care reaction and saved-energy feedback on all platforms; compact garden link, motion preference and hidden-app guards; same-day update does not replay gains | End-to-end native review of transitions; storage failure recovery remains broader data-layer work |
| 6 garden | Existing rich garden art, cable, liquid tank, one-step reward receipt; zero balance is visually empty; recoverable balance journal with retry/restart failure tests | Live-account synchronization and native persistence checks |
| 7 rewards/growth | Existing food, growth, discovery and ownership retained; room atelier integrated; offline equipment hydration; recoverable guest point-debit/inventory transaction | Authenticated purchasing/synchronization cases and flower-art variants |
| 8 rhythm | Five modes/four existing songs, points-only primary flow, practice after reward cap; recoverable count/point reward receipt with retry; late audio-load disposal and hidden-app cancellation | Native audio/interruption QA and timing-input/difficulty matrix |
| 9 conversation | Room tap/menu to conversation; existing context and safety API retained | Production AI response/auth QA |
| 10 legacy | Old runner/town code and data retained outside primary flow; gallery redirects to growth | Broader navigation regression pass |
| 11 visuals | Room/background/object sprites; sofa/vanity/bookshelf art; muted palette and dark navigation; shop fitting reuses HOME; album prioritizes original-art memories; note/report/checklist paper palette, responsive controls and original egg report calendar | Flower-art variants and final whole-app visual review |
| 12 performance/accessibility | Focus/background/reduced-motion guards, animation cleanup, keyboard chat entry, accessible resident activity description and static light feedback; static dex/checklist, accessible album disclosure/checkboxes, larger shop controls and named selected categories | Device profiling and full screen-reader pass |
| 13 verification | Typechecks, regression tests, API build and Expo export; selected local guest browser flows | Native devices, real auth/cloud round-trip, purchase flows |
| 14 handoff | Source checkpoint `2f86197eb2d8315e68db77ce63ca4b93b2fd0c74`; follow-up polish checkpoint contains this updated document | Main merge/deployment NOT performed; final product review pending |

## Validation and risks
- Workspace React dependency issue in integrations-openai-ai-react was corrected in the implementation checkpoint; typechecks now pass.
- Native iOS/Android devices and authenticated production account may be unavailable; never claim unperformed tests.
- Main risks: room coordinates across aspect ratios, gesture/animation cleanup, preservation of equipped items, async record/reward duplication.
- Installer-generated invalid allowBuilds addition was removed without changing unrelated configuration. Use existing direct binaries for verification; do not approve dependency build scripts automatically.
- ItemContext now loads saved inventory/equipment before catalog requests and caches catalog metadata. Image/audio binaries are not downloaded into a dedicated offline cache; their offline availability still depends on platform/HTTP caching. No inventory migration or deletion was introduced.

## Next action
Do not rebuild HOME, bed/meal routines, balance-journal recovery, offline equipment hydration or guest purchase recovery. PHASE 8 interruption and reward persistence are implemented in the follow-ups below. Remaining PHASE 8 work is timing-input/difficulty and native audio QA. Authenticated synchronization still needs live-account validation; PHASE 11 secondary-screen/flower-art unification remains actionable implementation work. Keep all original character assets and stored ownership/history intact.

## Resume 2026-10-01 09:56 JST — interrupted checklist checkpoint
- Fetched origin and checked both branches through GitHub: main remains `f99bf9ff3d2a9887ec88afc1321209402a2a6278` (September 23 08:08:02 JST); work branch remains `a6a06b059e6445287c2f3bee4c7c8fcfdfc43c9a` (September 30 12:17:02 JST), 15 commits ahead with no missing main commits.
- Seven staged files from the September 30 checklist implementation survived locally. They were NOT saved to GitHub: the prior create-tree action was not executed because automatic approval review hit a usage limit. No implementation was discarded or redone. Excluded export directories remain untracked.
- Reviewed prior daily-record, checklist/shop-control and record/report commits, this phase table and the interrupted checklist helper/tests. Continued PHASE 4 by rejecting malformed receipt dates/booleans and duplicate checked IDs before any write; customization cannot silently discard reward eligibility from malformed saved state. Valid legacy receipts without `earnedItemIds` remain supported.
- Workspace/mobile typechecks, all 138 unit tests, diff check and fresh all-platform Expo export PASS (JS/assets compilation, not native device builds). Browser rerun initially could not launch because the previous temporary Chromium executable was removed; no fresh browser pass is claimed at this checkpoint. The September 30 browser results above remain historical evidence only. Native/authenticated checks and PHASE 11–14 open items remain as listed above.

## Resume 2026-09-30 12:59 JST — checklist persistence
- Fetched origin: main `f99bf9ff3d2a9887ec88afc1321209402a2a6278` (September 23 08:08:02 JST); working HEAD `a6a06b059e6445287c2f3bee4c7c8fcfdfc43c9a` (12:17:02 JST). Tracked worktree/index clean; excluded exports only. Reviewed daily-record helper, journal keys/tests and phase table; no interrupted work. Earliest remaining local persistence task: checklist edits/rewards.
- `utils/checklistTransaction.ts` saves checked state, XP/level, wallet, energy and badges under the shared journal; add/remove/reset commit both definitions and check state. Operations specify target checked state, not a second toggle after recovery. Stable pending-add IDs prevent duplicate insertion on an in-session retry.
- Daily `earnedItemIds` extend the existing checked-state object, seeded from legacy `xpEarned` items. Removal/reset retain earned IDs and the full-day bonus flag until the next day, preventing reward replay through customization. Existing IDs, category definitions and reward amounts remain unchanged; no new cloud storage key or DB migration.
- `AppContext.tsx` publishes only committed checklist/reward state and queues feedback after success; obsolete independent checklist reward/badge writes removed. ChecklistSheet keeps failed input/operation available and explains retry. Authenticated cross-device reconciliation and historical inconsistencies are not claimed fixed.
- Mobile/workspace typechecks, 137 unit tests, diff check and all-platform Expo export PASS (JS/assets compilation, not native device builds). New cases cover eight reward-write interruptions, four writes for each add/remove/reset operation, receipts across uncheck/remove/reset/day rollover, parallel different checks, combined daily-record/checklist credits and invalid saved state.
- Fresh `tests/checklistRecovery.browser.cjs` PASS for in-place retry and restart: blocked wallet write retains unchecked UI until persistence completes; recovery retains 30 XP, 12 points and 10 energy for a one-item list plus full-day bonus; resetting/rechecking adds no reward. Interrupted item addition retries with one item only and persists after reload. Existing `checklist.browser.cjs` and `dailyRecord.browser.cjs` PASS on this export. No page errors; synthetic guest storage only. The initial restart test assumed HOME after recovery, but the app correctly retained the record route; corrected the test to wait for the recovery gate to clear.
- Checklist local persistence/reward tasks are complete. Remaining: authenticated cloud reconciliation/native persistence QA, flower-art variants, timing-input/native audio/device accessibility/profiling and final product review. Existing historical partial saves and cross-device races are not inferred as repaired. No main merge or deployment.

## Resume 2026-09-30 12:08 JST — PHASE 4/5 daily-record recovery
- Fetched origin: main `f99bf9ff3d2a9887ec88afc1321209402a2a6278` (September 23 08:08:02 JST), working HEAD `15e84c15fa37b96f79dad862d1d371e9f007bee8` (12:04:41 JST). Tracked worktree/index clean; excluded exports only. Reviewed checklist/shop checkpoint and this phase table. No interrupted edits. Earliest actionable persistence gap: daily record could be saved before its first-day point credit, consuming the reward eligibility on retry.
- `utils/dailyRecordTransaction.ts` computes record, XP/level/streak, food points, daily mood/diary energy flags and badges from the latest persisted snapshot. All five resulting values share the existing recoverable journal; saved date provides same-day idempotence. Existing reward amounts, legacy entered sleep and history remain compatible. Invalid stored history/progress/wallet/badges block the write instead of resetting them.
- `utils/balanceStorage.ts` allows the existing record/progress/badge keys and reads checked state for badge eligibility. `contexts/AppContext.tsx` publishes record/progress/balance/badges only after persistence succeeds; feedback follows a newly committed energy gain. Retry/restart rolls forward exact values before recomputing, preserving unrelated wallet credits and avoiding duplicate rewards. No new cloud key, DB migration or reward-rate change.
- Mobile/workspace typechecks, 113 unit tests, diff check and all-platform Expo export PASS (JS/assets compilation, not native device builds). Eleven new tests cover seven interrupted writes, concurrent saves plus independent credit, same-day diary edit/next-day streak, legacy sleep/history preservation, corrupt storage and existing level/badge thresholds. Check-master eligibility now requires a nonempty current-day checked list.
- Fresh `tests/dailyRecord.browser.cjs` PASS in both retry/restart modes: injected wallet failure after record/progress writes, no premature UI success, recovery retains one record, 15 XP, 5 points, 5 energy and first-step badge; same-day edit does not credit again. Existing `recordReport.browser.cjs`, `storage.browser.cjs` and full `room.browser.cjs` PASS, including detailed input/PNG export, garden/purchase/placement recovery, room routines, record feedback, same-day no-duplicate celebration, five-mode hidden-tab cancellation and compact onboarding/save/reload. No page errors. Synthetic guest storage only.
- PHASE 4/5 daily-record recovery is complete for this checkpoint. Scope: daily-record local transaction only. Checklist edits/rewards and authenticated cloud reconciliation are still separate work. Existing historical partial writes cannot be retrospectively inferred/repaired by this change. Passive size growth/encounter presentation remain their existing effects. Next actionable persistence task is checklist recovery; flower art and native/timing-input/authenticated validation also remain open. No main merge or deployment.

## Resume 2026-09-30 11:50 JST — PHASE 11/12 checklist
- Fetched origin: main `f99bf9ff3d2a9887ec88afc1321209402a2a6278` (September 23 08:08:02 JST); working HEAD `ff15394d6e68613708e40086ccd4fc3a49974f56` (11:42:00 JST). Tracked worktree/index clean; excluded exports only. Reviewed the preceding record/report changes and phase table; no interrupted implementation. Earlier core implementation retained, native/authenticated and broader multi-key persistence work still open.
- `components/ChecklistItemRow.tsx`: static, non-flashing rows with full wrapping text and checkbox role/state; edit-only deletion is actually unmounted in normal mode, avoiding invisible focusable delete actions and nested buttons. `PressScale.tsx` bridges checked state to Web ARIA as well as native accessibility state.
- `components/record/ChecklistSheet.tsx`: paper palette and gentle optional-completion copy; static progress; Web/native confirmation dialogs replace unsupported Web Alert actions for deletion/reset. Add form scrolls within 90% height, supports keyboard avoidance, names its input/category actions and offers explicit cancellation. Pending writes are guarded against repeated taps; rejected promises show an inline status message. Existing storage/reward logic is unchanged and is NOT claimed atomic.
- Mobile/workspace typechecks, 102 unit tests, all-platform Expo export and diff check PASS. `tests/checklist.browser.cjs` PASS: checkbox ARIA state and persisted check, absence of delete buttons outside editing, 320×400 add/long text, cancel/confirm delete/reset and reload. Do not mark physical-device keyboard, screen reader or authenticated sync verified.
- Continued PHASE 11/12 shop controls: named button/tab roles with selected category; 44px category/action/direction targets, wrapping fitting controls and heading. Placement writes now catch failures and show them inside the modal; Done retries/persists the latest draft before closing. Unequip failure also remains visible in the modal.
- Final mobile/workspace typechecks, diff check and all-platform Expo export PASS. Fresh `tests/storage.browser.cjs` PASS: garden partial-save retry/restart, offline cached equipment/reconnect, guest purchase recovery, 320px fitting, selected category and 44px target, injected placement-write failure retaining the preview, successful retry/close and placement preserved after reload. Checklist browser suite also passed again on this export. No page errors in either suite.
- Checklist and shop-control tasks are saved as complete; PHASE 11 still needs flower-art variants/final visual review and PHASE 12 still needs physical-device profiling/screen-reader/keyboard checks. Broader record/checklist multi-key recovery, native/audio/timing-input, authenticated synchronization and final release review remain open. No main merge or deployment.

## Resume 2026-09-30 11:33 JST — PHASE 11 detailed record/report
- Fetched origin: main `f99bf9ff3d2a9887ec88afc1321209402a2a6278` (September 23 08:08:02 JST), latest working commit `d74b8dfc9358f11e15293f7c4d421d8e3aeaa87c` (11:31:45 JST). Tracked worktree/index clean; only excluded export directories. Reviewed the prior growth/dex/PressScale changes and phase table. No interrupted implementation remained.
- Continuing earliest actionable local UI work: PHASE 11 detailed records and monthly report. Earlier core phases remain implemented with native/authenticated validation outstanding. Album work is retained.
- `components/record/MoodRecordSheet.tsx`: wrapped mood controls for narrow screens, warm paper palette, optional sleep explicitly selected instead of silently converting an unentered value to seven hours; existing legacy sleep remains entered. Inline save failure/retry, synchronous double-submit guard, save-confirmation guard, close-timer cleanup and named inputs. Removed extra mood/save bounce sequences. `app/(tabs)/record.tsx` uses the same paper background.
- `app/monthly-report.tsx`: warm album palette, original egg expression assets instead of the unrelated SVG face, Japanese labels, wrapping header/content-driven card height, readable wrapping statistics, named month actions and calendar days, inline PNG failure/retry and export locking. `utils/monthlyReport.ts` now counts mood frequencies after deduplicating dates, consistently with recorded-day count/calendar.
- Mobile/workspace typechecks, unit suite 102/102 and diff check PASS; final all-platform Expo export PASS (JS/assets compilation, not native device builds). `tests/recordReport.browser.cjs` PASS: 320px mood controls, injected record-write failure with retained input and successful retry, unentered sleep preserved across save/reload, explicit 7.5-hour entry, existing behavior/activity fields retained, previous/current month navigation with future disabled, injected canvas-export failure with visible retry and successful high-resolution PNG download. No page errors; all records are isolated synthetic guest data.
- PHASE 11 detailed record/report implementation and PHASE 12 form/report control improvements complete for this checkpoint. Remaining: shop/checklist polish, flower art, native/audio/timing-input and authenticated checks. Save error UI does not make the entire record/progress/reward sequence atomic; that broader persistence issue remains open. Physical keyboard/safe-area, real screen-reader and full Japanese font rendering still need device QA. No main merge or deployment.

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

## Resume 2026-09-29 17:55 JST — PHASE 8 reward persistence
- Successfully fetched origin. Main remains `f99bf9ff3d2a9887ec88afc1321209402a2a6278`; HEAD/remote working branch match `ac5b02bbd86c996d42ebb71b449d0dbeb3ccdf73` (17:36:32 JST). No unfinished tracked edits, only excluded exports. Reviewed the phase table, `RhythmGameFlow.tsx`, `useSongClock.ts`, prior tests and reward flow before editing.
- Found a remaining failure path: `completeMiniGame` saved/incremented the slot before persisting its point reward. A failed wallet write could consume the reward allowance; the result modal offered no retry.
- `utils/rhythmReward.ts` now prepares slot count and wallet credit in the existing recoverable transaction. Recent play receipts (bounded to 32) make retry idempotent, including a day rollover. Legacy boolean slot counts remain readable. A capped practice returns zero actual earned points.
- `AppContext.tsx` publishes the saved game/wallet only after persistence. The only caller now receives the actual earned number. The unused XP reward branch was removed from this points-only flow; the existing small growth reaction remains outside the balance transaction and is not guaranteed after a crash.
- `MiniGameModal.tsx` retains the pending reward/play ID on save failure and exposes a retry action. `app/(tabs)/index.tsx` returns the authoritative saved amount rather than pre-checking stale rendered allowance.
- Added six recovery/concurrency/legacy/day-rollover tests; complete unit suite 40/40 PASS. Mobile/workspace typechecks PASS. All-platform Expo export PASS; this is JS/assets compilation, not a native-device build.
- `tests/rhythm.browser.cjs` passed five EASY no-input full plays rotating all four bundled songs: TAP/Boogie, JUMP/Barometer, SWIPE/Rolling, COPY/Bouncy, RELAX/Boogie. First play injected wallet-write failure and successfully retried once; second received its reward; remaining three were capped practice with no extra points/counts. Reload retained the exact balance. XP was unchanged and no page errors occurred. This is five combinations, NOT the full 5×4×3 mode/song/difficulty or timing-input matrix.
- Result-header text now flexes beside the close control to accommodate the longer save-failure message. Native audio/device checks, real authenticated sync, judgment-input coverage and PHASE 11 visual unification remain pending. No main merge/deployment performed.

## Resume 2026-09-30 05:20 JST — chart coverage and PHASE 11 shop preview
- Fetched origin; main remains `f99bf9ff3d2a9887ec88afc1321209402a2a6278`. Working branch/HEAD match `b3693bb3993989a6a9c79dc48ca312c097d2d59f` (September 29 18:06:12 JST). The preceding interrupted turn only inspected state: no unfinished tracked edits; excluded exports remain.
- Reviewed the phase table and prior reward changes (`MiniGameModal`, `AppContext`, `rhythmReward`, tests). PHASE 8 now has a reproducible 60-chart data matrix (four songs × five modes × three difficulties): nonempty, ordered, finite in-song timing, valid lanes/directions and minimum jump spacing all PASS. This does not certify timing-input precision on a device.
- PHASE 11: `app/shop.tsx` replaces its legacy CSS/StageCharacter room preview with the same illustrated `RoomView` and native original-character rendering as HOME. It uses the same saved equipment/placement mapping and stops room animation during fitting. Wearable drag conversion is based on the actual fitted character size, replacing the old fixed multiplier.
- The fitting modal scrolls within the viewport; shop title and points have separate rows so they fit narrow screens. Existing item IDs, ownership, prices, original art and persistence keys are preserved.
- Unit suite 100/100 PASS (including the 60-chart matrix); mobile/workspace typechecks, diff check and all-platform Expo export PASS. Fresh `tests/storage.browser.cjs` checks PASS: garden recovery/restart, cached offline equipment, purchase interruption recovery, 320px current-room preview, placement adjustment, reachable close action and reload persistence; no page errors. Preview screenshot inspection uses a headless environment without full Japanese/emoji fonts and does not certify native text/art rendering.
- Album/detailed screens and flower variants remain unfinished, as do native/authenticated checks. Next implementation should continue PHASE 11 secondary-screen/flower-art work; retain the outstanding timing-input/native/audio/auth test items instead of marking them complete. No main merge/deployment performed.

## Resume 2026-09-30 06:22 JST — PHASE 11 album and PHASE 12 dex motion
- Fetched origin successfully. Main remains `f99bf9ff3d2a9887ec88afc1321209402a2a6278`; working branch/HEAD match `2c80262bccf66f093b85aad2190d47588e592ba6` (05:28:26 JST). Tracked worktree/index were clean; only excluded exports remained. Reviewed prior shop/chart/storage-test changes and this phase table; no interrupted implementation was found.
- `app/(tabs)/growth.tsx` now presents the album title, original-art growth comparison, history and discovered characters before metrics. Existing level/XP, insights, reports, mood charts/calendar and badges remain available under an accessible detail disclosure. Account controls remain available. The page uses the room/shop paper palette.
- Fixed weekly averages to use the actual last seven calendar dates (matching GrowthChart), not the last seven recorded entries spanning arbitrary months. Unentered sleep remains excluded. Viewing growth is only marked while the album is focused and foregrounded.
- `components/dex/CharacterDexModal.tsx` wraps actions on narrow screens, preserves bottom safe area, and uses the original static mascot when motion is reduced or the app is hidden. Action animations and timers stop/reset on hiding or unmounting; reduced-motion actions retain speech/expression without jump/shake/walk movement. `PressScale` now accepts React Native's full AccessibilityState type for the disclosure's expanded state.
- Initial mobile typecheck PASS; build/unit/320px browser checks were interrupted before this work was committed. Resumed and completed below. No original character art, encounter eligibility, stored records, ownership or API/DB schema was changed.

## Resume 2026-09-30 11:26 JST — complete interrupted album checkpoint
- Fetched origin and verified GitHub working-branch ref. Main remains `f99bf9ff3d2a9887ec88afc1321209402a2a6278` (September 23 08:08:02 JST); HEAD and saved branch remain `2c80262bccf66f093b85aad2190d47588e592ba6` (05:28:26 JST). Main has no commits absent from the working branch. Initial diff: four modified files (growth, CharacterDexModal, PressScale, progress document), new album browser test, excluded exports. Retained and finished those edits instead of rebuilding completed work.
- Reviewed prior shop fitting, rhythm receipt/audio fixes and the phase table. PHASE 2–10 core remains implemented with outstanding native/authenticated QA; the earliest actionable local implementation was the interrupted PHASE 11 album, followed by PHASE 12 dex accessibility/motion.
- Browser QA found that React Native Web did not expose `accessibilityState.expanded` on the shared animated pressable. Added an explicit Web `aria-expanded` bridge while retaining native accessibility state. Dex actions now have explicit accessible names, reduced-motion actions do not scale on press, and speech uses a polite live region. Removed duplicate timer cleanup.
- Fresh mobile/workspace TypeScript checks PASS; unit suite 100/100 PASS; `git diff --check` PASS. Final all-platform Expo export PASS: Web 3.44 MB, iOS 6.73 MB, Android 6.74 MB. This compiles JS/assets, not Xcode/Gradle device builds.
- Fresh `tests/album.browser.cjs` PASS at 320×568: discovered-only dex, narrow action bounds, reduced-motion static pose, normal jump cancellation/reset on hiding, disclosure `aria-expanded`, correct seven-calendar-day mood/sleep/count values, unchanged stored records and reload. No page errors. Test uses isolated synthetic guest storage and no production writes. QA-only Chromium was restored under /tmp without app dependency changes.
- PHASE 11 album and PHASE 12 dex tasks are complete for this checkpoint; whole phases remain partial. Remaining work: detailed record/report and remaining shop styling, flower-art variants, timing-input/native audio coverage, native safe areas/gestures/screen reader/profiling, real authenticated synchronization/purchases and final product review. Original character art and persisted ownership/history remain authoritative. No main merge or deployment.
