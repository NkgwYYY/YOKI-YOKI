# YOKI YOKI 2.0 — implementation progress

## Resume checkpoint
- Started: 2026-09-28; source main: `f99bf9ff3d2a9887ec88afc1321209402a2a6278` (2026-09-22 23:08:02 UTC).
- Working branch: `codex/yoki-yoki-2-room`. Never force-push or replace main.
- Current phase: PHASE 1 design complete; PHASE 2 room HOME in progress.
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

## Planned phases
1. Audit/design — complete.
2. Room HOME — in progress.
3. Resident behavior/physics — pending.
4. Basic recording — pending.
5. World reaction — pending.
6. Garden/battery — pending.
7. Rewards — pending.
8. Rhythm — pending.
9. Conversation — pending.
10. Legacy organization — pending.
11. Art integration — pending.
12. Performance/accessibility — pending.
13. Typecheck/build/runtime — pending.
14. Review and GitHub checkpoint — pending.

## Validation and risks
- Baseline mobile typecheck running. Workspace typecheck previously reports missing React dependency in integrations-openai-ai-react; verify and fix separately if reproducible.
- Native iOS/Android devices and authenticated production account may be unavailable; never claim unperformed tests.
- Main risks: room coordinates across aspect ratios, gesture/animation cleanup, preservation of equipped items, async record/reward duplication.
- Installer had appended invalid allowBuilds choices to pnpm-workspace.yaml before this implementation; remove only that local generated addition.

## Next action
Integrate room art, implement bounded room layout and resident, then wire existing record/feed/rhythm/chat/album flows. Run mobile typecheck after each substantial phase and update this checkpoint.

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
