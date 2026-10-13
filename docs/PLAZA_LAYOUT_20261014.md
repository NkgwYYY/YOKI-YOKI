# Plaza layout — 2026-10-14

Separate the story neighbours, random encounter and arriving player. Keep the central foreground available for walking. Market story residents share two distinct spots, with in-progress stories retaining priority; any additional available story enters as a spot opens, without changing saved progress.

Only the closest encounter has a hint and a talk action. The selected destination keeps its hint while approaching. Hint placement avoids the player, other encounter sprites and the phone edges; if no clear position is available, the hint stays hidden. Conversation approaches stop beside the speaker. Ordinary visitors do not spawn on occupied encounter spots. Idle plaza strolls stay in the clear centre foreground.

No new art downloads or per-frame React state updates. Saved story choices, farming unlocks, daily event rewards and dates are unchanged.

Validation: encounter geometry at 390/533/680 scene pixels; hint placement at 320/390/430 phone widths; portal hit regions; queue handoff; nearest/hysteresis selection; approach positions; existing story progression tests. Replit TypeScript check and phone preview, including grandmother and random encounter conversations.
