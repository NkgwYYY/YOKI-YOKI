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
| 3 resident | Original sprites/rig, breathing/blinking, aisle movement, hold/lift/drop, depth ordering, equipment calibration | Richer bed/meal-specific behavior; native gesture QA |
| 4 record | Short mood/activity flow, detailed entry secondary; explicit unentered-sleep flag | First-run and authenticated synchronization QA |
| 5 reaction | Record/care reaction and light-energy integration; deferred reaction after returning to room | End-to-end native review of transitions |
| 6 garden | Existing rich garden art, cable, liquid tank, one-step reward receipt; zero balance is visually empty | Live-account/offline persistence failure checks |
| 7 rewards/growth | Existing food, growth, discovery and ownership retained; room atelier integrated | All purchasing/auth cases and flower-art variants |
| 8 rhythm | Five modes/four existing songs, points-only primary flow, practice after reward cap, actual-earned result chip | All-mode/device audio and interruption matrix |
| 9 conversation | Room tap/menu to conversation; existing context and safety API retained | Production AI response/auth QA |
| 10 legacy | Old runner/town code and data retained outside primary flow; gallery redirects to growth | Broader navigation regression pass |
| 11 visuals | Room/background/object sprites; sofa/vanity/bookshelf art; muted palette and dark navigation | Shop/album/detailed screens and flower art are NOT fully unified |
| 12 performance/accessibility | Focus/background/reduced-motion guards, animation cleanup, keyboard chat entry | Device profiling and full screen-reader pass |
| 13 verification | Typechecks, regression tests, API build and Expo export; selected local guest browser flows | Native devices, real auth/cloud round-trip, purchase flows |
| 14 handoff | Source checkpoint `2f86197eb2d8315e68db77ce63ca4b93b2fd0c74`; follow-up polish checkpoint contains this updated document | Main merge/deployment NOT performed; final product review pending |

## Validation and risks
- Workspace React dependency issue in integrations-openai-ai-react was corrected in the implementation checkpoint; typechecks now pass.
- Native iOS/Android devices and authenticated production account may be unavailable; never claim unperformed tests.
- Main risks: room coordinates across aspect ratios, gesture/animation cleanup, preservation of equipped items, async record/reward duplication.
- Installer-generated invalid allowBuilds addition was removed without changing unrelated configuration. Use existing direct binaries for verification; do not approve dependency build scripts automatically.
- Existing ItemContext loads local catalog equipment only after a successful catalog request. Offline catalog boot remains a known limitation; no inventory migration or deletion was introduced.

## Next action
Do not rebuild the HOME implementation. Verify the latest branch checkpoint, then prioritize native gesture/audio/safe-area QA, guest first-run and authenticated data synchronization. Continue PHASE 11 secondary-screen/flower-art unification and richer PHASE 3 bed/meal behaviors. Keep all original character assets and stored ownership/history intact.

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
No main merge or deployment, no production credentials/configuration changes, no DB migration, no authenticated live-account or native-device pass. Whole-app visual unification and all PHASE 3 behaviors are not complete. Do not label the entire 2.0 project finished.
