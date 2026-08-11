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
  /** 元画像の顔（目・口・頬）を覆い隠すパッチ。中心を faceCenter とは別に指定できる */
  patchColor?: string;
  patchSize?: { w: number; h: number };
  patchCenter?: { x: number; y: number };
}

/*
 * 各キャラの数値は元画像(512x512)のピクセル解析による実測値:
 * - faceCenter: 目クラスタの中心
 * - mouthOffset.y: 口クラスタ中心 - 目中心
 * - patch: 目の上端〜口の下端＋頬を覆う範囲、色は顔周辺の地肌色をサンプリング
 */
export const CHARACTERS: CharacterConfig[] = [
  { 
    id: 'egg', 
    name: 'タマゴ', 
    image: 'egg.png', 
    faceCenter: { x: 252, y: 293 }, 
    eyeSpacing: 94, 
    mouthOffset: { x: 0, y: 52 }, 
    partScale: 1, 
    patchColor: '#e8e9e4',
    patchSize: { w: 236, h: 112 },
    patchCenter: { x: 252, y: 316 }
  },
  { 
    id: 'odango', 
    name: 'オダンゴ', 
    image: 'odango.png', 
    faceCenter: { x: 256, y: 242 }, 
    eyeSpacing: 90, 
    mouthOffset: { x: 0, y: 58 }, 
    partScale: 1, 
    patchColor: '#e4e1dc',
    patchSize: { w: 240, h: 118 },
    patchCenter: { x: 256, y: 267 }
  },
  { 
    id: 'happa', 
    name: 'ハッパ', 
    image: 'happa.png', 
    faceCenter: { x: 255, y: 276 }, 
    eyeSpacing: 90, 
    mouthOffset: { x: 0, y: 54 }, 
    partScale: 1, 
    patchColor: '#dfd5cb',
    patchSize: { w: 252, h: 114 },
    patchCenter: { x: 258, y: 301 }
  },
  { 
    id: 'colorful_happa', 
    name: 'カラフルハッパ', 
    image: 'colorful_happa.png', 
    faceCenter: { x: 262, y: 278 }, 
    eyeSpacing: 90, 
    mouthOffset: { x: 0, y: 53 }, 
    partScale: 1, 
    patchColor: '#ead282',
    patchSize: { w: 252, h: 114 },
    patchCenter: { x: 262, y: 302 }
  },
  { 
    id: 'onigiri', 
    name: 'オニギリ', 
    image: 'onigiri.png', 
    faceCenter: { x: 256, y: 255 }, 
    eyeSpacing: 92, 
    mouthOffset: { x: 0, y: 55 }, 
    partScale: 1, 
    patchColor: '#dbd9d5',
    patchSize: { w: 240, h: 116 },
    patchCenter: { x: 256, y: 280 }
  },
  { 
    id: 'tako', 
    name: 'タコ', 
    image: 'tako.png', 
    faceCenter: { x: 256, y: 200 }, 
    eyeSpacing: 84, 
    mouthOffset: { x: 0, y: 38 }, 
    partScale: 0.85, 
    patchColor: '#e6e5df',
    patchSize: { w: 210, h: 96 },
    patchCenter: { x: 256, y: 219 }
  },
  { 
    id: 'ebifurai', 
    name: 'エビフライ', 
    image: 'ebifurai.png', 
    // 元画像は顔が左寄り・目が縦並びの特殊配置。顔領域の中心に横並びの顔を再構成する
    faceCenter: { x: 148, y: 258 }, 
    eyeSpacing: 56, 
    mouthOffset: { x: 0, y: 34 }, 
    partScale: 0.68, 
    patchColor: '#dcdcd8',
    patchSize: { w: 128, h: 140 },
    patchCenter: { x: 140, y: 266 }
  },
  { 
    id: 'neko', 
    name: 'ネコ', 
    image: 'neko.png', 
    faceCenter: { x: 261, y: 272 }, 
    eyeSpacing: 90, 
    mouthOffset: { x: 0, y: 54 }, 
    partScale: 1, 
    patchColor: '#c5c3bf',
    patchSize: { w: 240, h: 116 },
    patchCenter: { x: 261, y: 296 }
  },
  { 
    id: 'usagi', 
    name: 'ウサギ', 
    image: 'usagi.png', 
    faceCenter: { x: 258, y: 250 }, 
    eyeSpacing: 80, 
    mouthOffset: { x: 0, y: 46 }, 
    partScale: 0.95, 
    patchColor: '#ebeae7',
    patchSize: { w: 218, h: 102 },
    patchCenter: { x: 258, y: 271 }
  },
  { 
    id: 'lion', 
    name: 'ライオン', 
    image: 'lion.png', 
    faceCenter: { x: 258, y: 260 }, 
    eyeSpacing: 90, 
    mouthOffset: { x: 0, y: 54 }, 
    partScale: 1, 
    patchColor: '#e0ddd9',
    patchSize: { w: 238, h: 114 },
    patchCenter: { x: 258, y: 285 }
  }
];
