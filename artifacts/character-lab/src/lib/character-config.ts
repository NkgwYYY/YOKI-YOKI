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

/** キャラ固有の顔パーツデザイン（すべて元画像512x512の実測値ベース） */
export interface PartStyle {
  eye: {
    rx: number;          // 目の横半径
    ry: number;          // 目の縦半径
    color: string;       // 元画像の目の色
    highlight: boolean;  // ハイライトの有無
  };
  mouth: {
    halfWidth: number;   // 口の半幅
    stroke: number;      // 線の太さ
    color: string;
  };
  cheek: {
    rx: number;
    ry: number;
    color: string;
    offsetY: number;     // 目の高さからの縦オフセット
  };
}

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  image: string;
  /** 元画像の目の中心（左右の目の中点） */
  faceCenter: { x: number; y: number };
  eyeSpacing: number;
  mouthOffset: { x: number; y: number };
  partScale: number;
  parts: PartStyle;
  /** 体アニメーションの強さ（1が標準） */
  motion?: number;
}

/*
 * 各キャラの数値は元画像(512x512)のピクセル解析による実測値:
 * - faceCenter / eyeSpacing: 左右の目クラスタの中心と間隔
 * - parts.eye: 目クラスタの大きさと平均色
 * - parts.mouth.halfWidth: 口クラスタの半幅
 * image は顔パーツを除去済みの body 画像（public/characters/body/）を指す
 */
export const CHARACTERS: CharacterConfig[] = [
  { 
    id: 'egg', 
    name: 'タマゴ', 
    image: 'body/egg.png', 
    faceCenter: { x: 252, y: 292 }, 
    eyeSpacing: 99, 
    mouthOffset: { x: 0, y: 53 }, 
    partScale: 1,
    parts: {
      eye: { rx: 18, ry: 19, color: '#0a0b09', highlight: true },
      mouth: { halfWidth: 31, stroke: 8, color: '#1a1a1a' },
      cheek: { rx: 26, ry: 15, color: '#f0b3ba', offsetY: 22 }
    }
  },
  { 
    id: 'odango', 
    name: 'オダンゴ', 
    image: 'body/odango.png', 
    faceCenter: { x: 256, y: 242 }, 
    eyeSpacing: 105, 
    mouthOffset: { x: 0, y: 57 }, 
    partScale: 1,
    parts: {
      eye: { rx: 19, ry: 20, color: '#302f2c', highlight: true },
      mouth: { halfWidth: 36, stroke: 8, color: '#2b2a27' },
      cheek: { rx: 25, ry: 14, color: '#eabab2', offsetY: 24 }
    }
  },
  { 
    id: 'happa', 
    name: 'ハッパ', 
    image: 'body/happa.png', 
    faceCenter: { x: 255, y: 277 }, 
    eyeSpacing: 103, 
    mouthOffset: { x: 0, y: 53 }, 
    partScale: 1,
    parts: {
      eye: { rx: 19, ry: 20, color: '#222120', highlight: true },
      mouth: { halfWidth: 36, stroke: 8, color: '#1f1e1d' },
      cheek: { rx: 25, ry: 14, color: '#e3a99f', offsetY: 26 }
    }
  },
  { 
    id: 'colorful_happa', 
    name: 'カラフルハッパ', 
    image: 'body/colorful_happa.png', 
    faceCenter: { x: 262, y: 278 }, 
    eyeSpacing: 102, 
    mouthOffset: { x: 0, y: 53 }, 
    partScale: 1,
    parts: {
      eye: { rx: 19, ry: 20, color: '#1d1c18', highlight: true },
      mouth: { halfWidth: 35, stroke: 8, color: '#1b1a17' },
      cheek: { rx: 25, ry: 14, color: '#f0b18e', offsetY: 26 }
    }
  },
  { 
    id: 'onigiri', 
    name: 'オニギリ', 
    image: 'body/onigiri.png', 
    faceCenter: { x: 255, y: 256 }, 
    eyeSpacing: 103, 
    mouthOffset: { x: 0, y: 54 }, 
    partScale: 1,
    parts: {
      eye: { rx: 18, ry: 20, color: '#393730', highlight: true },
      mouth: { halfWidth: 36, stroke: 8, color: '#33312b' },
      cheek: { rx: 25, ry: 14, color: '#e8b7b2', offsetY: 26 }
    }
  },
  { 
    id: 'tako', 
    name: 'タコ', 
    image: 'body/tako.png', 
    faceCenter: { x: 256, y: 201 }, 
    eyeSpacing: 73, 
    mouthOffset: { x: 0, y: 37 }, 
    partScale: 0.85,
    parts: {
      eye: { rx: 13, ry: 13, color: '#2c2a21', highlight: true },
      mouth: { halfWidth: 27, stroke: 6, color: '#282619' },
      cheek: { rx: 18, ry: 10, color: '#dba9a0', offsetY: 20 }
    }
  },
  { 
    id: 'ebifurai', 
    name: 'エビフライ', 
    image: 'body/ebifurai.png', 
    // 元画像は顔が左寄り。顔領域の中心に顔を再構成する
    faceCenter: { x: 140, y: 262 }, 
    eyeSpacing: 46, 
    mouthOffset: { x: 6, y: 30 }, 
    partScale: 0.6,
    parts: {
      eye: { rx: 9, ry: 11, color: '#41413b', highlight: true },
      mouth: { halfWidth: 14, stroke: 5, color: '#3b3b35' },
      cheek: { rx: 12, ry: 7, color: '#e0a48b', offsetY: 15 }
    }
  },
  { 
    id: 'neko', 
    name: 'ネコ', 
    image: 'body/neko.png', 
    faceCenter: { x: 261, y: 273 }, 
    eyeSpacing: 105, 
    mouthOffset: { x: 0, y: 54 }, 
    partScale: 1,
    parts: {
      eye: { rx: 19, ry: 20, color: '#24241d', highlight: true },
      mouth: { halfWidth: 38, stroke: 8, color: '#21211b' },
      cheek: { rx: 25, ry: 14, color: '#dfb0ab', offsetY: 26 }
    }
  },
  { 
    id: 'usagi', 
    name: 'ウサギ', 
    image: 'body/usagi.png', 
    faceCenter: { x: 258, y: 250 }, 
    eyeSpacing: 87, 
    mouthOffset: { x: 0, y: 46 }, 
    partScale: 0.95,
    parts: {
      eye: { rx: 15, ry: 16, color: '#33332c', highlight: true },
      mouth: { halfWidth: 30, stroke: 7, color: '#2e2e28' },
      cheek: { rx: 21, ry: 12, color: '#ecc0bd', offsetY: 22 }
    }
  },
  { 
    id: 'lion', 
    name: 'ライオン', 
    image: 'body/lion.png', 
    faceCenter: { x: 257, y: 261 }, 
    eyeSpacing: 102, 
    mouthOffset: { x: 0, y: 53 }, 
    partScale: 1,
    parts: {
      eye: { rx: 18, ry: 19, color: '#3b3933', highlight: true },
      mouth: { halfWidth: 36, stroke: 8, color: '#353329' },
      cheek: { rx: 25, ry: 14, color: '#dfb2ac', offsetY: 26 }
    }
  }
];
