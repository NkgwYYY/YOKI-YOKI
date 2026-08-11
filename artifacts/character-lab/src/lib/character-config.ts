import manifest from './parts-manifest.json';

/** 進化順: たまご → おだんご → ハッパ → カラフルハッパ */
export type CharacterId =
  | 'egg'
  | 'odango'
  | 'happa'
  | 'colorful_happa';

/** 元画像から切り出したパーツの配置(512x512座標系、元画像の位置そのまま) */
export interface PartBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PartsManifest {
  leftEye: PartBox;
  rightEye: PartBox;
  mouth: PartBox;
  leftCheek?: PartBox;
  rightCheek?: PartBox;
  /** 元パーツから生成した表情バリエーション(色・質感は元パーツ由来) */
  leftEyeHappy?: PartBox;
  rightEyeHappy?: PartBox;
  mouthSmile?: PartBox;
  mouthOpen?: PartBox;
  mouthO?: PartBox;
}

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  /** 顔パーツ除去済みのbody画像 */
  body: string;
  /** 元画像から切り出した顔パーツ(デザインは元画像そのもの) */
  parts: PartsManifest;
  /** 表情変化の強さ(変化量)。1が標準。小さいほど控えめに動く */
  expressiveness: number;
}

const MANIFEST = manifest as Record<string, PartsManifest>;

const NAMES: Record<CharacterId, string> = {
  egg: 'タマゴ',
  odango: 'オダンゴ',
  happa: 'ハッパ',
  colorful_happa: 'カラフルハッパ',
};

/**
 * 各キャラの顔パーツは public/characters/parts/<id>/*.png にある
 * 「元画像から切り出したピクセルそのまま」の画像。
 * 再デザイン・描き直しは一切していない。配置座標も元画像と同一。
 */
/** キャラごとの表情変化の強さ。個性に合わせて調整する(未指定は1) */
const EXPRESSIVENESS: Partial<Record<CharacterId, number>> = {};

export const CHARACTERS: CharacterConfig[] = (Object.keys(NAMES) as CharacterId[]).map((id) => ({
  id,
  name: NAMES[id],
  body: `body/${id}.png`,
  parts: MANIFEST[id],
  expressiveness: EXPRESSIVENESS[id] ?? 1,
}));
