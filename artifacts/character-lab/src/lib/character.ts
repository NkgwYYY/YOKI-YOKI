import { CharacterConfig, PartBox } from './character-config';

export type Emotion = 'normal' | 'happy' | 'angry' | 'sad' | 'fun' | 'surprised';
export type WearableConfig = { url: string; x: number; y: number; size: number };

/** 画像差し替え時にインクリメントしてブラウザキャッシュを回避する */
const ASSET_VERSION = 3;

const SVG_NS = 'http://www.w3.org/2000/svg';

// ============================================================
// 物理パラメータ(調整用)
// ============================================================
const PHYSICS = {
  /** 重力(px/s^2) */
  gravity: 2600,
  /** ジャンプ初速(px/s) */
  jumpVelocity: 900,
  /** 着地圧縮の最大値(縦方向の縮み率)。0.16 = 16% */
  maxSquash: 0.40,
  /** 離陸時の伸びの最大値 */
  maxStretch: 0.06,
  /** 横方向の広がり = 圧縮量 × この係数(体積感の維持) */
  lateralRatio: 0.6,
  /** 着地速度 → 圧縮量 の変換係数 */
  impactSensitivity: 0.00044,
  /** SoftBody圧縮バネ: 硬さ(低め=柔らかい) */
  squashStiffness: 0.14,
  /** SoftBody圧縮バネ: 減衰(高め=2〜3回の小さな反発で収束) */
  squashDamping: 0.88,
  /** 骨格の硬さ: 顔(骨格側)は SoftBody の圧縮の平方根しか受けない(0.5乗) */
  skeletonRigidity: 0.5,
  /** バウンド時の反発係数 */
  restitution: 0.42,
};

/**
 * Grab / Lift / Drop(掴んで持ち上げて落とす)のパラメータ。
 * キャラごとに上書きできる(CharacterConfig.interaction 想定の共通既定値)。
 * リアル寄り・柔らかめの初期値。
 */
const INTERACTION = {
  /** 長押しでGrabと判定するまでの時間(ms)。短いタップは通常リアクション */
  grabThresholdMs: 180,
  /** 掴んだ点とキャラ中心のオフセットを保持(指に中心を固定しない) */
  grabOffset: true,
  /** 指への追従の強さ(大きいほど機敏。小さいほど重く感じる) */
  dragResponsiveness: 0.16,
  /** 追従の減衰(小さいほどよく揺れる) */
  dragDamping: 0.72,
  /** 離した瞬間の速度の引き継ぎ率(大きすぎると飛んでいく) */
  releaseVelocityMultiplier: 0.55,
  /** 重さ(1が標準。大きいほど追従が遅くなる) */
  mass: 1.0,
  /** 離した時の速度の上限(px/s, 512座標系) */
  maxReleaseSpeed: 1400,
  /** 横方向の地面摩擦(着地後に横速度が減衰する係数/frame) */
  groundFriction: 0.90,
  /** 画面端マージン(512座標系。これ以上外へは持ち出せない) */
  edgeMarginX: 150,
  /** 持ち上げ高さの上限(負の値 = 上方向) */
  minHoldY: -300,
  /** 持ち上げ中、上向きに動くとSoftBody下側が遅れる(伸び)係数 */
  hangStretchFactor: 0.00006,
};

// ============================================================
// Spring / Damper (自然な追従・慣性・柔らかい反動)
// dtScale = 実フレーム時間 / 60fps基準。フレームレート非依存。
// ============================================================
class Spring {
  value: number;
  target: number;
  velocity: number;
  stiffness: number;
  damping: number;

  constructor(initial: number, stiffness = 0.1, damping = 0.8) {
    this.value = initial;
    this.target = initial;
    this.velocity = 0;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  update(dtScale = 1) {
    const force = (this.target - this.value) * this.stiffness * dtScale;
    this.velocity = (this.velocity + force) * Math.pow(this.damping, dtScale);
    this.value += this.velocity * dtScale;
    return this.value;
  }
}

// ============================================================
// Bone: 位置・回転のみを持つ骨。scale による変形は持たない。
// 親の動きに「少し遅れて追従」する二次モーション(follow)を実装。
// ============================================================
interface BoneOptions {
  /** 親の移動に対する遅れ追従の強さ(0 = 遅れなし)。大きいほど揺れる */
  follow?: number;
  stiffness?: number;
  damping?: number;
  originX?: number;
  originY?: number;
}

class Bone {
  readonly group: SVGGElement;
  readonly x: Spring;
  readonly y: Spring;
  readonly rot: Spring;
  private follow: number;
  private children: Bone[] = [];
  private prevAppliedX = 0;
  private prevAppliedY = 0;

  constructor(parent: SVGElement, opts: BoneOptions = {}) {
    this.group = document.createElementNS(SVG_NS, 'g');
    if (opts.originX !== undefined && opts.originY !== undefined) {
      this.group.style.transformOrigin = `${opts.originX}px ${opts.originY}px`;
    }
    parent.appendChild(this.group);
    const st = opts.stiffness ?? 0.12;
    const dp = opts.damping ?? 0.8;
    this.x = new Spring(0, st, dp);
    this.y = new Spring(0, st, dp);
    this.rot = new Spring(0, st, dp);
    this.follow = opts.follow ?? 0;
  }

  addChild(bone: Bone) {
    this.children.push(bone);
  }

  update(dtScale = 1, addX = 0, addY = 0, addRot = 0) {
    const x = this.x.update(dtScale);
    const y = this.y.update(dtScale);
    const r = this.rot.update(dtScale);
    // 付加的な揺れ(呼吸など)も含めた「実際に適用された移動量」を子へ伝える
    const appliedX = x + addX;
    const appliedY = y + addY;
    const dx = appliedX - this.prevAppliedX;
    const dy = appliedY - this.prevAppliedY;
    this.prevAppliedX = appliedX;
    this.prevAppliedY = appliedY;

    // 子へ慣性を伝播(親が動くと子は一瞬取り残される)
    if (dx !== 0 || dy !== 0) {
      for (const c of this.children) {
        c.x.velocity -= dx * c.follow;
        c.y.velocity -= dy * c.follow;
      }
    }

    this.group.style.transform =
      `translate(${appliedX}px, ${appliedY}px) rotate(${r + addRot}deg)`;
  }
}

type JumpPhase = 'idle' | 'crouch' | 'air';

/**
 * キャラクターリグ(元画像パーツ方式 + 骨格 + 柔らかい身体)
 *
 * 【最重要ルール】元画像 = 正解。
 * 顔パーツ(目・口・頬)はすべて「元画像から切り出したPNG」を
 * 元画像と同じ座標に配置して表示する。SVGで顔を描き直すことはしない。
 *
 * 【構造】= 硬い芯(骨格) + 柔らかい表面(SoftBody)
 * Root(位置のみ。ジャンプ・着地の運動学)
 * └── Body(骨格の中心。ごく小さな慣性)
 *     └── SoftBody(柔らかい身体。着地時に下端基準で圧縮・横に膨張)
 *         ├── body画像(SoftBodyの変形をそのまま受ける = 柔らかい表面)
 *         ├── Sprout(存在するキャラのみ。少し遅れて揺れる)
 *         └── Face(骨格側。SoftBodyの圧縮を平方根だけ受ける
 *                    = 芯は完全には潰れない。位置はSoftBodyに完全追従)
 *             ├── Eye_L / Eye_R / Mouth
 *             └── Cheek_L / Cheek_R(常に最前面。形状固定)
 *
 * 【SoftBodyの物理】
 * 圧縮量 c は Spring/Damper で管理し、着地速度(impactVelocity)に
 * 比例した圧縮が入り(上限あり)、2〜3回の小さな反発で収束する。
 * scaleY = 1 - c / scaleX = 1 + c×lateralRatio(体積感の維持)。
 * 全体への単純なscaleではなく、SoftBodyレイヤーの変形として
 * 下端(地面)基準で適用する。顔は骨格として圧縮を半分だけ受ける。
 *
 * 【表情との分離】
 * Emotion System → 目・口のスプライト切替と顔パーツ内の表現のみ。
 * Physics System → Root/Body/SoftBody。表情がBodyを動かすことはない。
 */
export class CharacterRig {
  private config: CharacterConfig;
  private container: SVGElement;

  // ボーン階層
  private root: Bone;
  private body: Bone;
  /** 顔グループ: SoftBodyに完全追従(独立した物理演算なし) */
  private face: SVGGElement;
  private sprout: Bone | null = null;

  // SoftBody(柔らかい身体)レイヤー
  private softBody: SVGGElement;
  /** 骨格補正レイヤー(顔は圧縮を弱く受ける) */
  private faceComp: SVGGElement;
  /** 圧縮量 c (+ = 縦に潰れる / - = 縦に伸びる)。target は常に 0 */
  private squash = new Spring(0, PHYSICS.squashStiffness, PHYSICS.squashDamping);

  // 垂直方向の運動学(ジャンプ・着地)
  private jumpPhase: JumpPhase = 'idle';
  private airY = 0;          // 0 = 地面。負 = 上空
  private airVelocity = 0;   // px/s(正 = 下向き)
  private bouncesLeft = 0;
  /** 横方向の投げ出し速度(px/s)。着地後は摩擦で減衰 */
  private throwVX = 0;
  /** 投げ出しによる横オフセット(rootのspringとは別) */
  private throwX = 0;

  // ─── Grab / Lift / Drop(Interaction Layer) ───
  private grabbed = false;
  private grabTimer: number | null = null;
  private pointerDown = false;
  /** 掴んだ点とキャラ中心のオフセット(512座標系) */
  private grabDX = 0;
  private grabDY = 0;
  /** 指の目標位置(512座標系のオフセット) */
  private holdTargetX = 0;
  private holdTargetY = 0;
  /** ドラッグ用の縦位置スプリング状態(airYを直接駆動) */
  private holdVY = 0;
  /** 指の速度推定用の履歴 */
  private pointerTrail: { x: number; y: number; t: number }[] = [];
  private onPointerDown: (e: PointerEvent) => void;
  private onTouchMove!: (e: TouchEvent) => void;
  private onPointerMove: (e: PointerEvent) => void;
  private onPointerUp: (e: PointerEvent) => void;

  // 顔パーツ内アニメ用 Spring(パーツ自体の表現。骨とは独立)
  private eyeScaleY = new Spring(1, 0.3, 0.6);
  private eyeScaleX = new Spring(1, 0.3, 0.6);
  /** 目の傾き(左目 +r / 右目 -r)。怒=正、哀=負 */
  private eyeRotate = new Spring(0, 0.2, 0.7);
  private mouthScaleX = new Spring(1, 0.25, 0.7);
  private mouthScaleY = new Spring(1, 0.25, 0.7);
  private gazeX = new Spring(0, 0.1, 0.7);
  private gazeY = new Spring(0, 0.1, 0.7);
  private cheekOpacity = new Spring(1, 0.15, 0.8);

  // State
  private emotion: Emotion = 'normal';
  private time = 0;
  private talking = false;
  private shaking = false;
  private walking = false;
  private breathing = true;
  private winkingUntil = 0;
  private winkSide: 'left' | 'right' = 'right';
  private animationFrameId = 0;
  private transitionTimers: number[] = [];
  private actionTimers: number[] = [];

  // DOM Elements (すべて元画像から切り出した <image>)
  private leftEye: SVGImageElement;
  private rightEye: SVGImageElement;
  private mouth: SVGImageElement;
  private leftCheek: SVGImageElement | null = null;
  private rightCheek: SVGImageElement | null = null;
  private wearableLayer: SVGGElement;

  constructor(svgElement: SVGElement, config: CharacterConfig) {
    this.container = svgElement;
    this.config = config;

    this.container.innerHTML = '';
    this.container.setAttribute('viewBox', '0 0 512 512');

    // --- 骨格の構築 ---
    // Root: 移動・ジャンプ・着地(位置のみ)
    this.root = new Bone(this.container, {
      stiffness: 0.12, damping: 0.8, originX: 256, originY: 450,
    });
    // Body: 骨格の中心。Rootにごく小さく遅れて追従(慣性)
    this.body = new Bone(this.root.group, {
      follow: 0.12, stiffness: 0.22, damping: 0.7, originX: 256, originY: 450,
    });
    this.root.addChild(this.body);

    // --- SoftBody(柔らかい身体)レイヤー ---
    // 着地時の圧縮・膨張はこのレイヤーだけに適用する(下端 = 地面基準)
    this.softBody = document.createElementNS(SVG_NS, 'g');
    this.softBody.style.transformOrigin = '256px 462px';
    this.body.group.appendChild(this.softBody);

    // Body画像(顔除去済み) = 柔らかい表面。SoftBodyの変形を100%受ける
    const bodyImg = document.createElementNS(SVG_NS, 'image');
    bodyImg.setAttribute('href', `${import.meta.env.BASE_URL}characters/${config.body}?v=${ASSET_VERSION}`);
    bodyImg.setAttribute('width', '512');
    bodyImg.setAttribute('height', '512');
    this.softBody.appendChild(bodyImg);

    // Sprout(頭の葉など): 存在するキャラのみ。少し遅れて揺れる柔らかいパーツ
    if (config.parts.sprout) {
      this.sprout = new Bone(this.softBody, {
        follow: 0.35, stiffness: 0.12, damping: 0.78,
        originX: config.parts.sprout.x + config.parts.sprout.w / 2,
        originY: config.parts.sprout.y + config.parts.sprout.h,
      });
      this.body.addChild(this.sprout);
      const sproutImg = document.createElementNS(SVG_NS, 'image');
      this.applySpriteTo(sproutImg, 'sprout', config.parts.sprout);
      this.sprout.group.appendChild(sproutImg);
    }

    // Face: 骨格側。SoftBodyの子として身体に「完全」追従する(独立した物理なし)。
    // faceComp で圧縮だけを弱める(芯は完全には潰れない)
    this.face = document.createElementNS(SVG_NS, 'g');
    this.softBody.appendChild(this.face);

    const p = config.parts;
    // 顔の中心(骨格補正の基準点) = 目と口の中心
    const faceCx = (p.leftEye.x + p.rightEye.x + p.rightEye.w) / 2;
    const faceCy = (p.leftEye.y + p.mouth.y + p.mouth.h) / 2;
    this.faceComp = document.createElementNS(SVG_NS, 'g');
    this.faceComp.style.transformOrigin = `${faceCx}px ${faceCy}px`;
    this.face.appendChild(this.faceComp);

    // 描画順: Body → Mouth → Eye → Cheek(頬は常に最前面)
    this.mouth = this.createPart('mouth', p.mouth);
    this.leftEye = this.createPart('leftEye', p.leftEye);
    this.rightEye = this.createPart('rightEye', p.rightEye);
    if (p.leftCheek) this.leftCheek = this.createPart('leftCheek', p.leftCheek);
    if (p.rightCheek) this.rightCheek = this.createPart('rightCheek', p.rightCheek);

    // Rigid wearable layer follows the body/root physics (jump, drag and landing)
    // without being distorted by the soft-body squash.
    this.wearableLayer = document.createElementNS(SVG_NS, 'g');
    this.body.group.appendChild(this.wearableLayer);

    // ─── Grab / Lift / Drop: Pointer Events(マウス・タッチ共通) ───
    // 縦スクロールは通す(pan-y)。掴んでいる間だけ touchmove を止めてスクロールを防ぐ
    (this.container as unknown as HTMLElement).style.touchAction = 'pan-y';
    this.onPointerDown = (e) => this.handlePointerDown(e);
    this.onPointerMove = (e) => this.handlePointerMove(e);
    this.onPointerUp = (e) => this.handlePointerUp(e);
    this.onTouchMove = (e: TouchEvent) => { if (this.grabbed) e.preventDefault(); };
    this.container.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.container.addEventListener('pointerdown', this.onPointerDown);
    this.container.addEventListener('pointermove', this.onPointerMove);
    this.container.addEventListener('pointerup', this.onPointerUp);
    this.container.addEventListener('pointercancel', this.onPointerUp);

    this.startLoop();
  }

  setWearable(config: WearableConfig | null) {
    this.wearableLayer.replaceChildren();
    if (!config?.url) return;
    const image = document.createElementNS(SVG_NS, 'image');
    image.setAttribute('href', config.url);
    image.setAttribute('x', String(config.x));
    image.setAttribute('y', String(config.y));
    image.setAttribute('width', String(config.size));
    image.setAttribute('height', String(config.size));
    image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    image.style.pointerEvents = 'none';
    this.wearableLayer.appendChild(image);
  }

  /** クライアント座標 → 512座標系(キャラ中心からのオフセット) */
  private toLocal(e: PointerEvent): { x: number; y: number } {
    const rect = this.container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 512 - 256;
    const y = ((e.clientY - rect.top) / rect.height) * 512 - 450; // 450 ≒ 接地基準
    return { x, y };
  }

  private trackPointer(x: number, y: number) {
    const now = performance.now();
    this.pointerTrail.push({ x, y, t: now });
    // 直近120msだけ保持
    while (this.pointerTrail.length > 2 && now - this.pointerTrail[0].t > 120) {
      this.pointerTrail.shift();
    }
  }

  private handlePointerDown(e: PointerEvent) {
    // preventDefaultしない: 縦スクロール開始を妨げない(掴み成立後はtouchmoveで止める)
    this.pointerDown = true;
    this.pointerTrail = [];
    const p = this.toLocal(e);
    this.trackPointer(p.x, p.y);
    this.container.setPointerCapture?.(e.pointerId);

    // 長押しでGrab。短いタップは通常リアクション(ぷにっ + まばたき)
    this.grabTimer = window.setTimeout(() => {
      this.grabTimer = null;
      if (!this.pointerDown) return;
      this.beginGrab(p.x, p.y);
    }, INTERACTION.grabThresholdMs);
  }

  private beginGrab(px: number, py: number) {
    if (this.walking || this.shaking) return;
    this.grabbed = true;
    this.jumpPhase = 'idle';
    this.bouncesLeft = 0;
    // 掴んだ点とキャラ中心のオフセットを保持(指に中心を固定しない)
    const charX = this.root.x.value + this.throwX;
    const charY = this.airY;
    this.grabDX = INTERACTION.grabOffset ? px - charX : 0;
    this.grabDY = INTERACTION.grabOffset ? py - charY : 0;
    this.holdTargetX = charX;
    this.holdTargetY = charY;
    this.holdVY = 0; // 前回のドラッグの速度を持ち越さない
    // 掴まれた反応: ぷにっと少し沈む + 小さく目が動く(既存素材のみ)
    this.squash.velocity += 0.035;
    this.gazeY.target = 3;
    this.after(() => { if (this.gazeX.target === 0) this.gazeY.target = 0; }, 600);
  }

  private handlePointerMove(e: PointerEvent) {
    if (!this.pointerDown) return;
    const p = this.toLocal(e);
    this.trackPointer(p.x, p.y);
    if (!this.grabbed) return;
    e.preventDefault();
    // 目標位置(自然な境界制限: 端に近づくほど動きが鈍る)
    const rawX = p.x - this.grabDX;
    const rawY = p.y - this.grabDY;
    const mx = INTERACTION.edgeMarginX;
    this.holdTargetX = Math.tanh(rawX / mx) * mx;
    const my = -INTERACTION.minHoldY;
    this.holdTargetY = rawY <= 0 ? -Math.tanh(-rawY / my) * my : 0;
  }

  private handlePointerUp(e: PointerEvent) {
    this.pointerDown = false;
    if (this.grabTimer !== null) {
      // 短いタップ: 通常リアクション
      clearTimeout(this.grabTimer);
      this.grabTimer = null;
      this.blink();
      this.squash.velocity += 0.02;
      return;
    }
    if (!this.grabbed) return;
    this.grabbed = false;

    // 離した瞬間の指の速度を推定して引き継ぐ(px/s)
    let vx = 0; let vy = 0;
    const trail = this.pointerTrail;
    if (trail.length >= 2) {
      const a = trail[0];
      const b = trail[trail.length - 1];
      const dt = (b.t - a.t) / 1000;
      if (dt > 0.016) {
        vx = (b.x - a.x) / dt;
        vy = (b.y - a.y) / dt;
      }
    }
    const m = INTERACTION.releaseVelocityMultiplier;
    const cap = INTERACTION.maxReleaseSpeed;
    vx = Math.max(-cap, Math.min(cap, vx * m));
    vy = Math.max(-cap, Math.min(cap, vy * m));

    // 落下開始(その場に固定せず速度を維持)
    this.throwX = this.root.x.value + this.throwX;
    this.root.x.value = 0;
    this.root.x.velocity = 0;
    this.root.x.target = 0;
    this.throwVX = vx;
    if (this.airY < 0 || vy < 0) {
      // 空中で離した / 地面近くでも上向きに投げた → 速度を引き継いで落下運動へ
      this.jumpPhase = 'air';
      this.airY = Math.min(this.airY, 0);
      this.airVelocity = vy;
    } else {
      this.airY = 0;
      this.squash.velocity += 0.02;
    }
  }

  /** 元画像から切り出したパーツPNGを、元画像と同じ座標に置く(Face骨格配下) */
  private createPart(name: string, box: PartBox): SVGImageElement {
    const img = document.createElementNS(SVG_NS, 'image');
    this.applySpriteTo(img, name, box);
    this.faceComp.appendChild(img);
    return img;
  }

  private applySpriteTo(img: SVGImageElement, name: string, box: PartBox) {
    img.setAttribute('href', `${import.meta.env.BASE_URL}characters/parts/${this.config.id}/${name}.png?v=${ASSET_VERSION}`);
    img.setAttribute('x', box.x.toString());
    img.setAttribute('y', box.y.toString());
    img.setAttribute('width', box.w.toString());
    img.setAttribute('height', box.h.toString());
    img.style.transformOrigin = `${box.x + box.w / 2}px ${box.y + box.h / 2}px`;
  }

  /** 目と口のスプライトを表情に合わせて切り替える(バリエーションが無いキャラは元パーツのまま) */
  private setFaceSprites(eyeVariant: 'normal' | 'happy', mouthVariant: 'mouth' | 'mouthSmile' | 'mouthOpen' | 'mouthO') {
    const p = this.config.parts;
    if (eyeVariant === 'happy' && p.leftEyeHappy && p.rightEyeHappy) {
      this.applySpriteTo(this.leftEye, 'leftEyeHappy', p.leftEyeHappy);
      this.applySpriteTo(this.rightEye, 'rightEyeHappy', p.rightEyeHappy);
    } else {
      this.applySpriteTo(this.leftEye, 'leftEye', p.leftEye);
      this.applySpriteTo(this.rightEye, 'rightEye', p.rightEye);
    }
    const mBox = mouthVariant !== 'mouth' ? p[mouthVariant] : p.mouth;
    if (mouthVariant !== 'mouth' && mBox) {
      this.applySpriteTo(this.mouth, mouthVariant, mBox);
    } else {
      this.applySpriteTo(this.mouth, 'mouth', p.mouth);
    }
  }

  /**
   * 【Emotion System】表情切り替え。
   * 目・口のスプライト切替と、目の傾き・視線のみ。
   * Body/Root/SoftBody には一切触らない(表情と物理の完全分離)。
   */
  public setEmotion(emotion: Emotion) {
    this.emotion = emotion;
    this.transitionTimers.forEach((t) => clearTimeout(t));
    this.transitionTimers = [];

    const ex = this.config.expressiveness;
    const lerp = (base: number, delta: number) => base + delta * ex;
    const stage = (fn: () => void, delay: number) => {
      if (delay <= 0) { fn(); return; }
      this.transitionTimers.push(window.setTimeout(() => {
        if (this.emotion === emotion) fn();
      }, delay));
    };

    // Reset(顔パーツのみ)
    this.eyeScaleY.target = 1;
    this.eyeScaleX.target = 1;
    this.eyeRotate.target = 0;
    this.mouthScaleY.target = 1;
    this.mouthScaleX.target = 1;
    this.cheekOpacity.target = 1;
    if (this.gazeX.target === 0) this.gazeY.target = 0;

    switch (emotion) {
      case 'happy':
      case 'fun':
        stage(() => this.setFaceSprites('normal', 'mouthSmile'), 0);
        break;
      case 'angry':
        stage(() => {
          this.setFaceSprites('normal', 'mouth');
          this.eyeRotate.target = 17 * ex;
          this.eyeScaleY.target = lerp(1, -0.45);
        }, 0);
        break;
      case 'sad':
        stage(() => {
          this.setFaceSprites('normal', 'mouth');
          this.eyeRotate.target = -12 * ex;
          this.eyeScaleY.target = lerp(1, -0.3);
          this.gazeY.target = 5 * ex;
        }, 0);
        break;
      case 'surprised':
        stage(() => {
          this.setFaceSprites('normal', 'mouthO');
          this.eyeScaleY.target = lerp(1, 0.4);
        }, 0);
        break;
      case 'normal':
      default:
        stage(() => this.setFaceSprites('normal', 'mouth'), 0);
        break;
    }
  }

  public blink() {
    if (Date.now() < this.winkingUntil) return;
    this.eyeScaleY.value = 0.08;
  }

  /** 片目を閉じる（side: 'left' | 'right'） */
  public wink(side: 'left' | 'right' = 'right') {
    this.winkSide = side;
    this.winkingUntil = Date.now() + 500;
  }

  public setBreathing(enabled: boolean) {
    this.breathing = enabled;
  }

  public breathe() {
    this.setBreathing(true);
  }

  /**
   * ジャンプ(物理ベース):
   * しゃがみ(小さく圧縮) → 離陸(少し縦に伸びる+初速) → 空中(重力・通常形状)
   * → 着地(速度に比例した圧縮・横に広がる) → 2〜3回の小さな反発 → 静止
   */
  public jump() {
    if (this.jumpPhase !== 'idle' || this.grabbed) return;
    this.jumpPhase = 'crouch';
    this.bouncesLeft = 0;

    // しゃがみ: SoftBodyを小さく圧縮(力を溜める)
    this.squash.velocity += 0.035;

    this.after(() => {
      // 離陸: ほんの少し縦に伸びて地面を離れる
      this.squash.velocity -= 0.05;
      this.airVelocity = -PHYSICS.jumpVelocity;
      this.jumpPhase = 'air';
    }, 130);
  }

  /** 上空から落として着地(Squash & Stretchの確認用) */
  public land() {
    if (this.jumpPhase !== 'idle' || this.grabbed) return;
    this.jumpPhase = 'air';
    this.bouncesLeft = 0;
    this.airY = -240;
    this.airVelocity = 0;
  }

  /** 小さく2回弾む */
  public bounce() {
    if (this.jumpPhase !== 'idle' || this.grabbed) return;
    this.jumpPhase = 'air';
    this.bouncesLeft = 2;
    this.airVelocity = -PHYSICS.jumpVelocity * 0.55;
  }

  /** 歩く: 右へ移動して戻る(Bodyの慣性つき) */
  public walk() {
    if (this.walking || this.shaking || this.grabbed) return;
    this.walking = true;
    this.root.x.target = 70;
    this.after(() => { this.root.x.target = -70; }, 900);
    this.after(() => { this.root.x.target = 0; }, 1800);
    this.after(() => { this.walking = false; }, 2700);
  }

  public shake() {
    if (this.walking || this.shaking || this.grabbed) return;
    this.shaking = true;
    this.after(() => {
      this.shaking = false;
      this.root.x.target = 0;
      this.root.rot.target = 0;
    }, 1000);
  }

  /** destroy時に必ず解放されるアクション用タイマー */
  private after(fn: () => void, delay: number) {
    this.actionTimers.push(window.setTimeout(fn, delay));
  }

  /** 目線を動かす。nx, ny は -1〜1(目パーツごと少し平行移動) */
  public lookAt(nx: number, ny: number) {
    const cx = Math.max(-1, Math.min(1, nx));
    const cy = Math.max(-1, Math.min(1, ny));
    const amp = Math.max(4, this.config.parts.leftEye.w * 0.14);
    this.gazeX.target = cx * amp;
    this.gazeY.target = cy * amp;
  }

  /** 喋る = 元画像の口の開閉(縦スケール)アニメーション */
  public talk() {
    if (this.talking) return;
    this.talking = true;

    this.after(() => {
      this.talking = false;
      this.setEmotion(this.emotion);
    }, 2000);
  }

  /**
   * 【Physics System】メインループ(deltaTimeベース)。
   * Root/Body の位置・回転と SoftBody の圧縮のみを更新する。
   */
  private startLoop() {
    let lastBlink = Date.now();
    let lastTs = performance.now();

    const tick = (ts: number) => {
      // deltaTime(秒)。タブ復帰などの巨大なdtはクランプ
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;
      const dtScale = dt * 60; // 60fps基準のスケール
      this.time += dt;
      const exp = this.config.expressiveness;

      // Auto blink
      if (Date.now() - lastBlink > 3000 + Math.random() * 4000) {
        this.blink();
        lastBlink = Date.now();
      }

      // --- Grab中: 指に少し遅れて追従(重さを感じるスプリング) ---
      if (this.grabbed) {
        const k = INTERACTION.dragResponsiveness / INTERACTION.mass;
        const dmp = INTERACTION.dragDamping;
        // 縦: airYを直接スプリング駆動
        this.holdVY = (this.holdVY + (this.holdTargetY - this.airY) * k * dtScale)
          * Math.pow(dmp, dtScale);
        this.airY += this.holdVY * dtScale;
        // 横: throwXをスプリング駆動
        this.throwVX = (this.throwVX + (this.holdTargetX - this.throwX) * k * dtScale * 60)
          * Math.pow(dmp, dtScale);
        this.throwX += (this.throwVX / 60) * dtScale;
        // 持ち上げ中の姿勢: 上向きに動くとSoftBodyの下側が少し遅れる(控えめな伸び)
        // holdVY < 0(上向き)のとき負のsquash(=伸び)を少しだけ注入する
        if (this.holdVY < 0) {
          const hang = Math.max(
            -PHYSICS.maxStretch * 0.6,
            this.holdVY * 60 * INTERACTION.hangStretchFactor,
          );
          this.squash.velocity += hang * 0.06 * dtScale;
        }
      }

      // --- 垂直方向の運動学(ジャンプ・落下・着地) ---
      if (!this.grabbed && this.jumpPhase === 'air') {
        this.airVelocity += PHYSICS.gravity * dt;
        this.airY += this.airVelocity * dt;

        if (this.airY >= 0) {
          // 着地: 衝撃速度に比例した圧縮(上限つき)をSoftBodyへ
          this.airY = 0;
          const impact = Math.min(
            this.airVelocity * PHYSICS.impactSensitivity,
            PHYSICS.maxSquash,
          );
          this.squash.velocity += impact;

          if (this.bouncesLeft > 0) {
            this.bouncesLeft--;
            this.airVelocity = -this.airVelocity * PHYSICS.restitution * 1.6;
          } else {
            this.airVelocity = 0;
            this.jumpPhase = 'idle';
          }
        }
      }

      // --- 投げ出しの横移動(離した後): 慣性 + 摩擦 + ゆっくり中央へ戻る ---
      if (!this.grabbed && (this.throwX !== 0 || this.throwVX !== 0)) {
        this.throwX += this.throwVX * dt;
        // 摩擦: 接地中は強く、空中は弱く
        const fr = this.jumpPhase === 'air' ? 0.995 : INTERACTION.groundFriction;
        this.throwVX *= Math.pow(fr, dtScale);
        // 接地して落ち着いたら、ゆっくり中央(定位置)へ戻る
        if (this.jumpPhase !== 'air') {
          this.throwX *= Math.pow(0.985, dtScale);
          if (Math.abs(this.throwX) < 0.5 && Math.abs(this.throwVX) < 2) {
            this.throwX = 0;
            this.throwVX = 0;
          }
        }
        // 画面端で止める(はみ出し防止)
        const mx = INTERACTION.edgeMarginX;
        if (this.throwX > mx) { this.throwX = mx; this.throwVX = Math.min(0, this.throwVX); }
        if (this.throwX < -mx) { this.throwX = -mx; this.throwVX = Math.max(0, this.throwVX); }
      }

      // --- SoftBodyの圧縮(Spring/Damperで2〜3回の反発を経て収束) ---
      this.squash.target = 0;
      this.squash.update(dtScale);
      // 上限をバネの内部状態にも適用(隠れたオーバーシュートを残さない)
      if (this.squash.value > PHYSICS.maxSquash) {
        this.squash.value = PHYSICS.maxSquash;
        if (this.squash.velocity > 0) this.squash.velocity = 0;
      } else if (this.squash.value < -PHYSICS.maxStretch) {
        this.squash.value = -PHYSICS.maxStretch;
        if (this.squash.velocity < 0) this.squash.velocity = 0;
      }
      const c = this.squash.value;
      const sy = 1 - c;
      const sx = 1 + c * PHYSICS.lateralRatio;

      // --- 待機(呼吸): Bodyがごく小さく上下 + ごく小さな回転 ---
      // 表情はBodyの動きに影響しない(表情システムと物理の完全分離)
      let bodyAddY = 0;
      let bodyAddRot = 0;
      if (this.jumpPhase === 'idle' && this.breathing) {
        bodyAddY = Math.sin(this.time * 2) * 4;
        bodyAddRot = Math.sin(this.time * 1.3) * 0.6 * exp;
      }

      if (this.shaking) {
        this.root.x.target = (Math.random() - 0.5) * 20;
        this.root.rot.target = (Math.random() - 0.5) * 3;
        bodyAddY += (Math.random() - 0.5) * 8;
      }

      // 喋り: 口パーツの開閉
      if (this.talking) {
        this.mouthScaleY.target = 1 + (Math.sin(this.time * 18) * 0.5 + 0.5) * 0.8;
      }

      // --- ボーン更新(親→子の順。慣性が伝播する) ---
      this.root.update(dtScale, this.throwX, this.airY);
      this.body.update(dtScale, 0, bodyAddY, bodyAddRot);
      if (this.sprout) {
        const sway = this.breathing ? Math.sin(this.time * 1.6 + 1) * 1.5 : 0;
        this.sprout.update(dtScale, 0, 0, sway);
      }

      // --- SoftBody変形の適用(下端=地面基準。柔らかい表面だけが潰れる) ---
      this.softBody.style.transform = `scale(${sx}, ${sy})`;
      // 骨格補正: 顔(芯)は圧縮を rigidity 乗しか受けない = 完全には潰れない
      const compX = Math.pow(sx, PHYSICS.skeletonRigidity) / sx;
      const compY = Math.pow(sy, PHYSICS.skeletonRigidity) / sy;
      this.faceComp.style.transform = `scale(${compX}, ${compY})`;

      // --- 顔パーツ内アニメ(表情システム。物理とは独立) ---
      const ey = this.eyeScaleY.update(dtScale);
      const exs = this.eyeScaleX.update(dtScale);
      const er = this.eyeRotate.update(dtScale);
      const gx = this.gazeX.update(dtScale);
      const gy = this.gazeY.update(dtScale);
      const my = this.mouthScaleY.update(dtScale);
      const mxs = this.mouthScaleX.update(dtScale);
      const co = this.cheekOpacity.update(dtScale);

      // 目: 平行移動(目線) + 縦スケール(瞬き/ウィンク) ※引き伸ばしはしない
      const winking = Date.now() < this.winkingUntil;
      const leftEy = winking && this.winkSide === 'left' ? 0.08 : ey;
      const rightEy = winking && this.winkSide === 'right' ? 0.08 : ey;
      this.leftEye.style.transform = `translate(${gx}px, ${gy}px) rotate(${er}deg) scale(${exs}, ${leftEy})`;
      this.rightEye.style.transform = `translate(${gx}px, ${gy}px) rotate(${-er}deg) scale(${exs}, ${rightEy})`;

      // 口: 開閉スケールのみ(形は元画像 or 元画像由来スプライトのまま)
      this.mouth.style.transform = `translate(${gx * 0.3}px, 0px) scale(${mxs}, ${my})`;

      // 頬: Faceに完全追従(独立した移動なし)。透明度のみ変化可。常に最前面
      if (this.leftCheek) {
        this.leftCheek.style.transform = '';
        this.leftCheek.style.opacity = co.toString();
      }
      if (this.rightCheek) {
        this.rightCheek.style.transform = '';
        this.rightCheek.style.opacity = co.toString();
      }

      this.animationFrameId = requestAnimationFrame(tick);
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }

  public destroy() {
    cancelAnimationFrame(this.animationFrameId);
    this.transitionTimers.forEach((t) => clearTimeout(t));
    this.actionTimers.forEach((t) => clearTimeout(t));
    if (this.grabTimer !== null) clearTimeout(this.grabTimer);
    this.container.removeEventListener('touchmove', this.onTouchMove);
    this.container.removeEventListener('pointerdown', this.onPointerDown);
    this.container.removeEventListener('pointermove', this.onPointerMove);
    this.container.removeEventListener('pointerup', this.onPointerUp);
    this.container.removeEventListener('pointercancel', this.onPointerUp);
    this.container.innerHTML = '';
  }
}
