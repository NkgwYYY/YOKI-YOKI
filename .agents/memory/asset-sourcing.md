---
name: Asset sourcing for YOKKY
description: What works for fetching/generating photos and audio assets in this project
---
- Real photos: Unsplash CDN (`images.unsplash.com/photo-<id>?w=...&fit=crop`) and Pexels work with UA-set curl; Wikimedia often 400/404s.
- Audio samples: freesound/mixkit/pixabay CDNs blocked (403/404); myinstants.com works.
- **Why:** random stock-photo IDs can't give the *same animal* in multiple expressions. For state-based character images (e.g. cat sleeping/alert/purring), AI-generate with a shared base prompt ("the same adult orange tabby with white chest, …") — this yielded a visually consistent set the user's expression-switching UI needs.
- **How to apply:** mobile app assets go in `artifacts/mobile/assets/`; after any change run `npx expo export --platform web --output-dir ../../static-build/web` then commit. Publish is manual by the user.
