# 畑の見た目と操作の更新 — 2026-10-13

4つの箱を描く方式をやめ、家の庭に直接続く一枚の畑に変更。土の畝に野菜を並べ、常時表示の説明札と長い育て方の説明を削除しました。

水が必要な野菜は水滴、収穫できる野菜は光、種をまける場所は芽の合図で表示。野菜または合図をタップして近づくと、その場で水やり・収穫を行います。種まきは3種類の種と所持数だけの小さな選択画面です。水やり済みの野菜は短い状態表示と7つの成長目盛りで確認できます。

既存の4件の植え付けデータをそのまま畝に割り当てるため、移行・初期化は不要です。7日分の水やり、収穫、販売、卸売のルールは変更していません。

## 素材

組み込みの image_gen ツールを使用。以下は生成結果を配信用サイズ・形式に変換したものです。Webでは背景233KB、共通の野菜アトラス185KB。アトラス1枚を複数の株で共有し、畑に入る際に先読みします。

- `/workspace/scratch/e5c65962f54a/yoki/artifacts/mobile/assets/images/world/grandmother-garden.webp`
- `/workspace/scratch/e5c65962f54a/yoki/artifacts/mobile/assets/images/world/grandmother-garden.jpg`
- `/workspace/scratch/e5c65962f54a/yoki/artifacts/mobile/assets/images/world/garden-crops.webp`
- `/workspace/scratch/e5c65962f54a/yoki/artifacts/mobile/assets/images/world/garden-crops.png`

## 生成プロンプト

### 背景の編集

Use case: precise-object-edit. Edit target: supplied portrait 3D cozy cottage game background. Preserve cottage, trees, flowers, fence, lighting, camera angle and portrait composition exactly. Change only the empty ochre dirt clearing in the middle foreground into a beautiful real vegetable field integrated directly into the ground. ONE connected irregular patch of rich crumbly tilled brown earth, not separate square plots, no wood borders, no raised planter boxes, no grid. Main cultivated earth occupies x=36% to 77% and y=47% to 70% of full image. Four long closely spaced gently diagonal furrows running almost horizontally across this one continuous patch, from left slightly lower to right slightly higher. Soft realistic moist soil clumps, warm highlights, convincing ridges and recesses, natural grassy uneven edges. NO vegetables yet, no plants within the furrows: these are an empty game layer for later crop sprites. Leave a walkable narrow path along the left edge and foreground. Tiny terracotta seed pot and weathered watering can at the far right edge are okay. Keep beautiful soft detailed 3D storybook game style. No UI, no words, no frames, no people.

### 透過の野菜アトラス

Use case: stylized-concept. Asset type: transparent 2 by 2 game sprite atlas, square image. Four distinct isolated vegetable PLANTS for a cozy high quality 3D garden game. TRUE transparent background. Divide canvas into exactly equal quadrants, ample transparent padding within EACH cell, no overlap between cells. Each plant base center aligned within its cell at 75 percent height, plant fits between 15 and 85 percent width and 10 and 80 percent height. Top left: a small delicate seedling with four vibrant fleshy green leaves and short stalk, rooted in tiny natural dark soil crumbs. Top right: lush small white turnip plant growing in ground, spherical white bulb shoulder only partly exposed above soil, a generous cluster of curling green leaves. Bottom left: lush carrot plant with feathery natural fine fernlike green foliage, tiny orange shoulder peeking at base, most of root remains underground, NOT a harvested carrot. Bottom right: compact bushy tomato plant with leafy curved stems, several ripe small red and orange tomatoes and a slender bamboo support stake. Exact same isometric view from above around 40 degrees, soft golden light upper left, detailed sculpted 3D leaves with subtle translucency and curled edges, believable small soft contact shadows. Beautiful soft tactile 3D rendering, natural farm garden plants, not icons, not cartoon flat vectors. Each object is standalone and fully contained in its allotted square quadrant. No pots, no boxes, no floor tile, no labels, no letters, no grid lines, no background.

## 確認

- 畑・物語の既存テスト22件成功。
- Replitの390 × 800表示で、直接の水やり・収穫、種の選択と種まき、会話人物と野菜の重なりを確認。
- 確認用の状態はメモリ上のみ。保存済みのプロフィール・日記・畑のデータは変更していません。
