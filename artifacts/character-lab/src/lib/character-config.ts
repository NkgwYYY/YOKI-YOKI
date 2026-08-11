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
  faceCenter: { x: number; y: number };
  eyeSpacing: number;
  mouthOffset: { x: number; y: number };
  partScale: number;
  patchColor?: string;
  patchSize?: { w: number; h: number };
}

export const CHARACTERS: CharacterConfig[] = [
  { 
    id: 'egg', 
    name: 'タマゴ', 
    image: 'egg.png', 
    faceCenter: { x: 256, y: 280 }, 
    eyeSpacing: 100, 
    mouthOffset: { x: 0, y: 40 }, 
    partScale: 1.1, 
    patchColor: '#f7f8f9',
    patchSize: { w: 180, h: 100 }
  },
  { 
    id: 'odango', 
    name: 'オダンゴ', 
    image: 'odango.png', 
    faceCenter: { x: 256, y: 270 }, 
    eyeSpacing: 90, 
    mouthOffset: { x: 0, y: 40 }, 
    partScale: 1, 
    patchColor: '#fcfcfc',
    patchSize: { w: 160, h: 90 }
  },
  { 
    id: 'happa', 
    name: 'ハッパ', 
    image: 'happa.png', 
    faceCenter: { x: 256, y: 260 }, 
    eyeSpacing: 85, 
    mouthOffset: { x: 0, y: 40 }, 
    partScale: 1, 
    patchColor: '#fcfcfc',
    patchSize: { w: 150, h: 90 }
  },
  { 
    id: 'colorful_happa', 
    name: 'カラフルハッパ', 
    image: 'colorful_happa.png', 
    faceCenter: { x: 256, y: 260 }, 
    eyeSpacing: 85, 
    mouthOffset: { x: 0, y: 40 }, 
    partScale: 1, 
    patchColor: '#fcfcfc',
    patchSize: { w: 150, h: 90 }
  },
  { 
    id: 'onigiri', 
    name: 'オニギリ', 
    image: 'onigiri.png', 
    faceCenter: { x: 256, y: 280 }, 
    eyeSpacing: 95, 
    mouthOffset: { x: 0, y: 35 }, 
    partScale: 1.05, 
    patchColor: '#ffffff',
    patchSize: { w: 170, h: 90 }
  },
  { 
    id: 'tako', 
    name: 'タコ', 
    image: 'tako.png', 
    faceCenter: { x: 256, y: 240 }, 
    eyeSpacing: 80, 
    mouthOffset: { x: 0, y: 30 }, 
    partScale: 0.9, 
    patchColor: '#fce3eb',
    patchSize: { w: 140, h: 80 }
  },
  { 
    id: 'ebifurai', 
    name: 'エビフライ', 
    image: 'ebifurai.png', 
    faceCenter: { x: 256, y: 220 }, 
    eyeSpacing: 70, 
    mouthOffset: { x: 0, y: 30 }, 
    partScale: 0.85, 
    patchColor: '#ffe8cc',
    patchSize: { w: 120, h: 70 }
  },
  { 
    id: 'neko', 
    name: 'ネコ', 
    image: 'neko.png', 
    faceCenter: { x: 256, y: 270 }, 
    eyeSpacing: 95, 
    mouthOffset: { x: 0, y: 35 }, 
    partScale: 1.05, 
    patchColor: '#ffffff',
    patchSize: { w: 160, h: 90 }
  },
  { 
    id: 'usagi', 
    name: 'ウサギ', 
    image: 'usagi.png', 
    faceCenter: { x: 256, y: 280 }, 
    eyeSpacing: 95, 
    mouthOffset: { x: 0, y: 35 }, 
    partScale: 1.05, 
    patchColor: '#ffffff',
    patchSize: { w: 160, h: 90 }
  },
  { 
    id: 'lion', 
    name: 'ライオン', 
    image: 'lion.png', 
    faceCenter: { x: 256, y: 260 }, 
    eyeSpacing: 90, 
    mouthOffset: { x: 0, y: 35 }, 
    partScale: 1, 
    patchColor: '#ffedcc',
    patchSize: { w: 150, h: 90 }
  }
];
