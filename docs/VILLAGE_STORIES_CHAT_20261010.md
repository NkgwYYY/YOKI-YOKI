# Village stories and calmer character chat — 2026-10-10

## Changes
- Five curated six-episode arcs (30 episodes): newcomer, ramen recipe, village bowling tournament, fortune cat’s missing bell, and village festival.
- Newcomer and ramen start available; completing them unlocks cat and bowling; completing both later arcs unlocks the festival.
- Each arc advances once per local calendar day. Missed days never expire chapters. Two available arcs can progress independently on the same day.
- Choices, completion dates, and bowling results are saved in the existing recoverable feed journal and cloud backup. Duplicate taps and interrupted writes return the first committed choice. Backdated device clocks cannot advance new episodes.
- Location-aware story entry from the scene and map; the Memories tab opens the story archive. Travel from the archive returns to the correct place. All episode locations are available from level 1.
- Lasting changes: a recurring newcomer in the plaza, 55-point komorebi ramen, a bowling reception cup, the cat’s moon bell, and festival lanterns in the chosen color. Illustrated keepsakes and all previous decisions can be reread.
- Two bowling chapters require a real throw from that day; any result including zero pins qualifies. Existing five-throw daily limit and normal rewards are unchanged. No practice mode or story entry fee.
- Existing world art and character renders are reused; no generated image payloads or extra animation libraries.
- Chat now defaults to acknowledgements and reactions. Recent assistant questions trigger a pause in follow-up questions, with necessary clarification and urgent safety checks allowed.
- The model returns structured content and a reference topic. Ordinary conversation gets no references; health explanations and urgent support get only the appropriate official resource. The client no longer inserts fallback links, and historical blanket links are hidden. Text history is retained.

## Verification
- Mobile and API TypeScript checks pass. The final cat/keepsake visual changes also pass mobile type checking.
- 43 tests pass across village stories, chat policy, chat history, and bowling; coverage includes all 30 episodes, unlock order, skipped days, invalid operations, interrupted writes, duplicate clicks, and saved bowling receipts.
- Actual API calls after restarting the API: casual conversation and celebration return no links and no question; a general stress/sleep self-care request returns one relevant official reference.
- 390px browser preview: story selection, travel to plaza, first choice/result, day gating, persistence after reload, Memories archive, and travel from archive to ramen confirmed. The preview guest account already contains test records; only one newcomer story chapter was added during this UI check, with points unchanged.
- Replit development preview updated. No production republish.
