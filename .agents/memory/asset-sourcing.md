---
name: Asset sourcing for YOKKY
description: What works for fetching/generating photos and audio assets in this project
---
- Real photos: Unsplash CDN (`images.unsplash.com/photo-<id>?w=...&fit=crop`) and Pexels work with UA-set curl; Wikimedia often 400/404s.
- Audio samples: freesound/mixkit/pixabay CDNs blocked (403/404); myinstants.com works.
- **Why:** random stock-photo IDs can't give the *same animal* in multiple expressions. For state-based character images (e.g. cat sleeping/alert/purring), AI-generate with a shared base prompt ("the same adult orange tabby with white chest, …") — this yielded a visually consistent set the user's expression-switching UI needs.
- Expression frames without video: generate ONE 3x3 sprite-sheet image per character ("the exact same character repeated 9 times, only the facial expression changes, tile1→9 frown→blink→big smile") — within-image consistency beats separate generations. Slice equal tiles, then per-tile `removeImageBackground` (fuzz/floodfill eats white fur on gray bg and keeps drop shadows), trim, and bottom-align to the base PNG's trim bbox.
- Character expression sets: user-provided AI videos (Kling) are a good frame source — extract frames with ffmpeg at fps=4, crop 86% to drop the watermark, then removeImageBackground → transparent PNGs per mood. Static mood images feel "frozen"; pair them with a breathing squish loop + random blink-frame swap.
- Night (22–6時) forces sleepy mood; users testing at night think the character is broken — wake-on-tap override (90s) solved this.
- **How to apply:** mobile app assets go in `artifacts/mobile/assets/`; after any change run `npx expo export --platform web --output-dir ../../static-build/web` then commit. Publish is manual by the user.
- AI image edits that request a transparent background may return a checkerboard baked into opaque pixels. **Why:** the edit model can render transparency rather than encode alpha. **How to apply:** inspect `%[opaque]`, then run background removal before replacing a wearable asset.

## 笑顔アニメ（表情フレーム）は全キャラで却下済み（2026-08-11）
スプライトシート方式（6キャラ）も動画切り出し方式（おだんご・はっぱ・カラフルはっぱ）も最終的に「笑顔がひどい／明るさが合わない／画像が化けてる」と却下され全ロールバック。SMILE_FRAMES は空にしてある。AI生成・動画由来のフレームは元画像と明るさ・画質が揃わず違和感が出る。今後キャラの表情アニメを頼まれたら、この経緯を伝えて元画像の変形（スケール・回転等のモーション）ベースを提案すること。

## 360度回転ビューはNG（2026-08-11）
AI生成のターンアラウンドシートで4キャラの8方向回転ビューを作ったが、ユーザーが「顔が変わっちゃってる」と却下し全面ロールバック。斜め・横向きはAI生成だと顔のデザインが維持できない。今後、回転・別アングル系の依頼が来たら「AI生成では顔の一貫性が保てない」旨を先に伝えること。
