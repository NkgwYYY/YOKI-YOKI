export type CharacterId = 
  | 'egg' 
  | 'odango' 
  | 'happa' 
  | 'colorful_happa' 
  | 'onigiri' 
  | 'tako' 
  | 'ebifurai' 
  | 'neko' 
  | 'usagi' 
  | 'lion';

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  image: string;
  /** 元画像の目の中心（左右の目の中点）。パーツはここを基準に配置される */
  faceCenter: { x: number; y: number };
  eyeSpacing: number;
  mouthOffset: { x: number; y: number };
  partScale: number;
}

/*
 * 各キャラの数値は元画像(512x512)のピクセル解析による実測値:
 * - faceCenter: 目クラスタの中心
 * - mouthOffset.y: 口クラスタ中心 - 目中心
 * image は顔パーツを除去済みの body 画像（public/characters/body/）を指す
 */
export const CHARACTERS: CharacterConfig[] = [
  { 
    id: 'egg', 
    name: 'タマゴ', 
    image: 'body/egg.png', 
    faceCenter: { x: 252, y: 293 }, 
    eyeSpacing: 94, 
    mouthOffset: { x: 0, y: 52 }, 
    partScale: 1, 
  },
  { 
    id: 'odango', 
    name: 'オダンゴ', 
    image: 'body/odango.png', 
    faceCenter: { x: 256, y: 242 }, 
    eyeSpacing: 90, 
    mouthOffset: { x: 0, y: 58 }, 
    partScale: 1, 
  },
  { 
    id: 'happa', 
    name: 'ハッパ', 
    image: 'body/happa.png', 
    faceCenter: { x: 255, y: 276 }, 
    eyeSpacing: 90, 
    mouthOffset: { x: 0, y: 54 }, 
    partScale: 1, 
  },
  { 
    id: 'colorful_happa', 
    name: 'カラフルハッパ', 
    image: 'body/colorful_happa.png', 
    faceCenter: { x: 262, y: 278 }, 
    eyeSpacing: 90, 
    mouthOffset: { x: 0, y: 53 }, 
    partScale: 1, 
  },
  { 
    id: 'onigiri', 
    name: 'オニギリ', 
    image: 'body/onigiri.png', 
    faceCenter: { x: 256, y: 255 }, 
    eyeSpacing: 92, 
    mouthOffset: { x: 0, y: 55 }, 
    partScale: 1, 
  },
  { 
    id: 'tako', 
    name: 'タコ', 
    image: 'body/tako.png', 
    faceCenter: { x: 256, y: 200 }, 
    eyeSpacing: 84, 
    mouthOffset: { x: 0, y: 38 }, 
    partScale: 0.85, 
  },
  { 
    id: 'ebifurai', 
    name: 'エビフライ', 
    image: 'body/ebifurai.png', 
    // 元画像は顔が左寄り・目が縦並びの特殊配置。顔領域の中心に横並びの顔を再構成する
    faceCenter: { x: 148, y: 258 }, 
    eyeSpacing: 56, 
    mouthOffset: { x: 0, y: 34 }, 
    partScale: 0.68, 
  },
  { 
    id: 'neko', 
    name: 'ネコ', 
    image: 'body/neko.png', 
    faceCenter: { x: 261, y: 272 }, 
    eyeSpacing: 90, 
    mouthOffset: { x: 0, y: 54 }, 
    partScale: 1, 
  },
  { 
    id: 'usagi', 
    name: 'ウサギ', 
    image: 'body/usagi.png', 
    faceCenter: { x: 258, y: 250 }, 
    eyeSpacing: 80, 
    mouthOffset: { x: 0, y: 46 }, 
    partScale: 0.95, 
  },
  { 
    id: 'lion', 
    name: 'ライオン', 
    image: 'body/lion.png', 
    faceCenter: { x: 258, y: 260 }, 
    eyeSpacing: 90, 
    mouthOffset: { x: 0, y: 54 }, 
    partScale: 1, 
  }
];
