# Rest scenes and grounded diary replies — 2026-10-20

Based on `8f5ce35`, the runtime source synchronized for the separate iOS review candidate. This update is a new candidate. It does not change the already-built App Store binary.

## User-facing changes

- Illustrated rest selection and full-screen fire, rainy window, lakeside sky and photographic cat. Unlimited time by default; optional one/three-minute sessions can continue. Mute, volume, back and close remain reachable.
- Generated fire/rain backgrounds, photographic alpha flame, native-driver glow/embers/rain/twinkle, and touch feedback. Cat retains existing photographic identity without a distorted body animation. Reduced-motion and app-background behavior stop animations.
- Scene audio fades in, pauses village music for the entire scene (also when muted), and unloads on exit. Browser BGM now implements the same temporary-pause contract as native BGM.
- Diary storage and daily reward commit before optional AI work. The response refers to the submitted text; the system asks for one or two specific events, acknowledgement of the stated feelings, and a concise personal reaction. Numerical mood does not override the narrative.
- An explicit, account-specific diary AI opt-in precedes any diary request, even if chat consent was already given. Only the requested entry's text/mood/date/mascot name is sent; no old entries or detailed records are bundled. Withdrawals cancel requests. Existing profile withdrawal revokes both scopes. Mood-only entries remain local.
- Responses commit only against the original entry revision and submission ID, never grant a second reward, and survive restart. Errors leave the diary saved and expose a retry. Old replies can be upgraded by requesting a response on that page.
- The server validates inputs and model output, checks quoted grounding against the actual entry, bounds requests, and cancels upstream work on disconnect/timeout. It does not log diary content.

## Asset provenance

Built-in imagegen was used for three project assets under `artifacts/mobile/assets/images/rest/`:
- `campfire.jpg`: cinematic portrait forest/lake at midnight, detailed charred logs and glowing coals at the lower center, violet/amber palette, no text or characters.
- `rain.jpg`: portrait view through a rainy Japanese wooden window, garden and amber bokeh, dark room and ceramic cup, no text or characters.
- `flame.png`: photographic translucent amber flame cluster on true transparent alpha, no logs or background. Resized to 512 pixels for the app.

The pre-existing night-sky artwork and cat photo are reused. No new dependency was added.

## Verification

- Mobile, API and shared TypeScript checks passed.
- 34 focused tests passed: diary atomic storage/reward, interrupted writes, stale replies, scope-specific consent and withdrawals, validated model grounding and inputs.
- Real web export completed. Browser QA uses the actual app with synthetic data and blocked external services: small phone, regular phone, landscape and tablet; scene selection, sound controls, orientation changes, reduced-motion cat, hidden-page reset and exit. Diary QA verifies opt-out, save before request, service failure/retry, only the intended payload, persisted reply, edited-entry response, no duplicate reward, and withdrawal.
- Browser mock replies prove wiring and lifecycle, not actual model quality. Live model checks and deployment verification must be recorded separately after synchronization.
- An iOS JavaScript/assets export is a bundling check, not physical-device or App Review acceptance. This change requires a new native build before it can appear in the installed iOS app.
