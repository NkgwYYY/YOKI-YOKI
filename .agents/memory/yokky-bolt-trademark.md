---
name: YOKKY egg bolt trademark
description: The purple bolt mark on the egg mascot's head is a trademark and must appear in every egg asset.
---
The purple lightning-bolt mark on the egg character's forehead is a user-stated trademark — it must be present in **every** egg image asset (moods, blink, roll, wake frames).

**Why:** Video-generated and AI-processed frames often lose the mark; the user explicitly complained twice when assets shipped without it.

**How to apply:** When adding/regenerating any egg asset, extract the bolt from an asset that has it via `magick src.png -fuzz 10-12% -fill none +opaque '#9C8AD8' bolt.png` (keeps only the purple), then `magick target.png bolt.png -composite out.png` — full-canvas composite keeps alignment. Verify visually against `#ccc` background before committing.
