# Village conversations, continuous shop music and five bowling attempts

## Changes
- Removed personal names from visiting and neighbouring villagers, retaining species labels for accessible conversation controls.
- Added conversations to both smoking-area residents. On eligible dates one resident can offer one cigarette; accept or decline explicitly. Gift receipts and inventory persist, retries grant once, and starting a new smoking session consumes one gifted cigarette without changing existing smoking effects.
- Hoisted village BGM into one provider shared by home/world and the shop. Product categories and back navigation preserve the existing player. The shop now has its own BGM toggle; other screens and background activity retain pause behavior.
- Bowling allows five attempts per local date, showing remaining attempts and a play-again action. The original daily receipt counts as the first attempt. Attempts and rewards commit together; retry, concurrent requests and clock rollback remain guarded.

## Validation
- PASS: mobile TypeScript locally and in Replit.
- PASS: 43 focused bowling, smoking and village visitor tests locally and in Replit, including the five-attempt concurrency cap, legacy receipt migration, interrupted writes, daily reset, gift retry and single consumption.
- PASS: actual Replit preview at 390 x 800. Five real bowling throws reduced remaining attempts from five to zero, awarded each result and disabled the sixth throw.
- PASS: shop navigation retained exactly one playing audio element; its playback time continued from 24.066 to 25.666 seconds across entry. Category switching and returning to the village kept playback active; the shop toggle paused and resumed it.
- PASS: both smoking residents responded with species-only labels, and the shopkeeper sheet displayed gifted cigarette stock. The current date had no gift offer; offer branches and persistence were verified by deterministic tests.
- Preview-only delivery. Existing Replit authentication differences were preserved; production publishing is separate.
