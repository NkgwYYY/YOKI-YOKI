import { CharacterConfig, PartBox } from './character-config';

export type Emotion = 'normal' | 'happy' | 'angry' | 'sad' | 'fun' | 'surprised';

/** 画像差し替え時にインクリメントしてブラウザキャッシュを回避する */
const ASSET_VERSION = 3;

const SVG_NS = 'http://www.w3.org/2000/svg';

// ============================================================
// Spring / Damper (自然な追従・慣性・柔らかい反動)
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

  update() {
    const force = (this.target - this.value) * this.stiffness;
    this.velocity = (this.velocity + force) * this.damping;
    this.value += this.velocity;
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
  /** バネの硬さ・減衰 */
  stiffness?: number;
  damping?: number;
  /** 回転の基準点(SVG座標) */
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

  /**
   * 骨を更新して transform を適用する。
   * addX/addY/addRot はループ由来の付加的な揺れ(呼吸など)。
   * 自分の移動量(速度)を子に伝え、子は逆向きの慣性を受けて
   * 「少し遅れて追従 → 行き過ぎ → 戻る」動きになる。
   */
  update(addX = 0, addY = 0, addRot = 0) {
    const px = this.x.value;
    const py = this.y.value;
    const x = this.x.update();
    const y = this.y.update();
    const r = this.rot.update();
    const dx = x - px;
    const dy = y - py;

    // 子へ慣性を伝播(親が動くと子は一瞬取り残される)
    if (dx !== 0 || dy !== 0) {
      for (const c of this.children) {
        c.x.velocity -= dx * c.follow;
        c.y.velocity -= dy * c.follow;
      }
    }

    this.group.style.transform =
      `translate(${x + addX}px, ${y + addY}px) rotate(${r + addRot}deg)`;
  }
}

/**
 * キャラクターリグ(元画像パーツ方式 + 2Dボーンシステム)
 *
 * 【最重要ルール】元画像 = 正解。
 * 顔パーツ(目・口・頬)はすべて「元画像から切り出したPNG」を
 * 元画像と同じ座標に配置して表示する。SVGで顔を描き直すことはしない。
 *
 * 【ボーン構造】(全キャラ共通。存在しないパーツは自動的に無視)
 * Root(位置・全体回転のみ。scale禁止)
 * └── Body(小さな上下・揺れ・傾き。輪郭は変形しない)
 *     ├── Face(Bodyに少し遅れて追従)
 *     │   ├── Eye_L / Eye_R(視線・瞬き。引き伸ばし禁止)
 *     │   ├── Mouth(スプライト切替 + 口パク)
 *     │   └── Cheek_L / Cheek_R(位置・透明度のみ。常に最前面)
 *     └── Sprout(存在するキャラのみ。遅れて揺れる)
 *
 * 【表情とボーンの分離】
 * Emotion System   → setEmotion(): 目・口のスプライト切替と顔パーツの微調整のみ
 * Bone Animation   → ループ内: Root/Body/Face/Sprout の位置・回転のみ
 * 表情変更で Body/Root が変形・移動することは絶対にない。
 */
export class CharacterRig {
  private config: CharacterConfig;
  private container: SVGElement;

  // ボーン階層
  private root: Bone;
  private body: Bone;
  private face: Bone;
  private sprout: Bone | null = null;

  // 顔パーツ内アニメ用 Spring(パーツ自体の表現。骨とは独立)
  private eyeScaleY = new Spring(1, 0.3, 0.6);
  private eyeScaleX = new Spring(1, 0.3, 0.6);
  /** 目の傾き(左目 +r / 右目 -r)。怒=正、哀=負 */
  private eyeRotate = new Spring(0, 0.2, 0.7);
  private mouthScaleX = new Spring(1, 0.25, 0.7);
  private mouthScaleY = new Spring(1, 0.25, 0.7);
  private gazeX = new Spring(0, 0.1, 0.7);
  private gazeY = new Spring(0, 0.1, 0.7);
  private faceOffsetY = new Spring(0, 0.15, 0.8);
  private cheekOpacity = new Spring(1, 0.15, 0.8);

  // State
  private emotion: Emotion = 'normal';
  private time = 0;
  private talking = false;
  private jumping = false;
  private shaking = false;
  private breathing = true;
  private winkingUntil = 0;
  private winkSide: 'left' | 'right' = 'right';
  private animationFrameId = 0;
  private transitionTimers: number[] = [];

  // DOM Elements (すべて元画像から切り出した <image>)
  private leftEye: SVGImageElement;
  private rightEye: SVGImageElement;
  private mouth: SVGImageElement;
  private leftCheek: SVGImageElement | null = null;
  private rightCheek: SVGImageElement | null = null;

  constructor(svgElement: SVGElement, config: CharacterConfig) {
    this.container = svgElement;
    this.config = config;

    this.container.innerHTML = '';
    this.container.setAttribute('viewBox', '0 0 512 512');

    // --- ボーン階層の構築 ---
    // Root: キャラクター全体の位置と回転のみ
    this.root = new Bone(this.container, {
      stiffness: 0.12, damping: 0.8, originX: 256, originY: 450,
    });
    // Body: Rootに少し遅れて追従(慣性)
    this.body = new Bone(this.root.group, {
      follow: 0.35, stiffness: 0.14, damping: 0.78, originX: 256, originY: 450,
    });
    this.root.addChild(this.body);

    // Body画像(顔除去済み)。骨自体は変形しないので輪郭は常に元画像のまま
    const bodyImg = document.createElementNS(SVG_NS, 'image');
    bodyImg.setAttribute('href', `${import.meta.env.BASE_URL}characters/${config.body}?v=${ASSET_VERSION}`);
    bodyImg.setAttribute('width', '512');
    bodyImg.setAttribute('height', '512');
    this.body.group.appendChild(bodyImg);

    // Sprout(頭の葉など): 存在するキャラのみ。Bodyにさらに遅れて揺れる
    if (config.parts.sprout) {
      this.sprout = new Bone(this.body.group, {
        follow: 0.6, stiffness: 0.08, damping: 0.82,
        originX: config.parts.sprout.x + config.parts.sprout.w / 2,
        originY: config.parts.sprout.y + config.parts.sprout.h,
      });
      this.body.addChild(this.sprout);
      const sproutImg = document.createElementNS(SVG_NS, 'image');
      this.applySpriteTo(sproutImg, 'sprout', config.parts.sprout);
      this.sprout.group.appendChild(sproutImg);
    }

    // Face: Bodyにさらに微細に遅れて追従
    this.face = new Bone(this.body.group, {
      follow: 0.25, stiffness: 0.18, damping: 0.72,
    });
    this.body.addChild(this.face);

    // 描画順: Body → Mouth → Eye → Cheek(頬は常に最前面)
    const p = config.parts;
    this.mouth = this.createPart('mouth', p.mouth);
    this.leftEye = this.createPart('leftEye', p.leftEye);
    this.rightEye = this.createPart('rightEye', p.rightEye);
    if (p.leftCheek) this.leftCheek = this.createPart('leftCheek', p.leftCheek);
    if (p.rightCheek) this.rightCheek = this.createPart('rightCheek', p.rightCheek);

    this.startLoop();
  }

  /** 元画像から切り出したパーツPNGを、元画像と同じ座標に置く(Faceボーン配下) */
  private createPart(name: string, box: PartBox): SVGImageElement {
    const img = document.createElementNS(SVG_NS, 'image');
    this.applySpriteTo(img, name, box);
    this.face.group.appendChild(img);
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
   * 目・口のスプライト切替と、目の傾き・視線・顔の微小な位置変化のみ。
   * Body/Root には一切触らない(表情とボーンの完全分離)。
   */
  public setEmotion(emotion: Emotion) {
    this.emotion = emotion;
    // 進行中の段階遷移をキャンセル
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
    this.faceOffsetY.target = 0;
    this.cheekOpacity.target = 1;
    if (this.gazeX.target === 0) this.gazeY.target = 0;

    switch (emotion) {
      case 'happy':
      case 'fun':
        // 目: 弧の笑い目 / 口: 笑いカーブ(スプライト切替のみ。体は変形しない)
        stage(() => this.setFaceSprites('happy', 'mouthSmile'), 0);
        break;
      case 'angry':
        // 目: 内側に鋭く傾け細める / 口: 「へ」を強調 / 体: 小刻みな震え(ループ側)
        stage(() => {
          this.setFaceSprites('normal', 'mouth');
          this.eyeRotate.target = 17 * ex;
          this.eyeScaleY.target = lerp(1, -0.45);
        }, 0);
        stage(() => {
          this.mouthScaleY.target = lerp(1, 0.5);
          this.mouthScaleX.target = lerp(1, -0.15);
        }, 110);
        this.faceOffsetY.target = 5 * ex;
        break;
      case 'sad':
        // 目: 外側に垂らして悲しげに / 目線: 下 / 口: 弱い「へ」を下げる
        stage(() => {
          this.setFaceSprites('normal', 'mouth');
          this.eyeRotate.target = -12 * ex;
          this.eyeScaleY.target = lerp(1, -0.3);
          this.gazeY.target = 5 * ex;
        }, 0);
        stage(() => {
          this.mouthScaleY.target = lerp(1, 0.25);
          this.mouthScaleX.target = lerp(1, -0.25);
        }, 110);
        stage(() => {
          this.faceOffsetY.target = 9 * ex;
        }, 220);
        break;
      case 'surprised':
        // 目: 大きく見開く / 口: 「o」
        stage(() => {
          this.setFaceSprites('normal', 'mouthO');
          this.eyeScaleY.target = lerp(1, 0.4);
          this.eyeScaleX.target = lerp(1, 0.25);
        }, 0);
        break;
      case 'normal':
      default:
        stage(() => this.setFaceSprites('normal', 'mouth'), 0);
        break;
    }
  }

  public blink() {
    // ウィンク中は両目閉じにならないよう抑止
    if (Date.now() < this.winkingUntil) return;
    this.eyeScaleY.value = 0.08;
  }

  /** 片目を閉じる（side: 'left' | 'right'） */
  public wink(side: 'left' | 'right' = 'right') {
    this.winkSide = side;
    this.winkingUntil = Date.now() + 500;
  }

  /** 呼吸(アイドル)アニメーションの ON/OFF */
  public setBreathing(enabled: boolean) {
    this.breathing = enabled;
  }

  public breathe() {
    this.setBreathing(true);
  }

  /**
   * ジャンプ: Rootの上下移動のみ。scaleによる潰し・伸ばしは使わない。
   * BodyとFaceがfollow慣性で少し遅れて追従し、着地時に自然に沈んで戻る。
   */
  public jump() {
    if (this.jumping) return;
    this.jumping = true;

    // しゃがみ(位置のみ少し沈む)
    this.root.y.target = 12;

    setTimeout(() => {
      // 跳躍
      this.root.y.target = -150;

      setTimeout(() => {
        // 着地: 少し沈み込む(慣性で Body/Face が柔らかく揺れる)
        this.root.y.target = 8;

        setTimeout(() => {
          this.root.y.target = 0;
          this.jumping = false;
        }, 160);
      }, 220);
    }, 110);
  }

  public shake() {
    this.shaking = true;
    setTimeout(() => {
      this.shaking = false;
      this.root.x.target = 0;
      this.root.rot.target = 0;
    }, 1000);
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

    setTimeout(() => {
      this.talking = false;
      // 現在の表情の口の状態に戻す
      this.setEmotion(this.emotion);
    }, 2000);
  }

  /**
   * 【Bone Animation System】メインループ。
   * Root/Body/Face/Sprout の位置・回転のみを更新する。scaleは一切使わない。
   */
  private startLoop() {
    let lastBlink = Date.now();

    const tick = () => {
      this.time += 0.016;
      const exp = this.config.expressiveness;

      // Auto blink
      if (Date.now() - lastBlink > 3000 + Math.random() * 4000) {
        this.blink();
        lastBlink = Date.now();
      }

      // --- 待機(呼吸)アニメーション: Bodyがごく小さく上下、揺れは回転のみ ---
      let bodyAddY = 0;
      let bodyAddRot = 0;

      if (!this.jumping && this.breathing) {
        bodyAddY = Math.sin(this.time * 2) * 4;

        if (this.emotion === 'happy' || this.emotion === 'fun') {
          // 左右スウェイは回転のみ(輪郭は変わらない)
          bodyAddRot = Math.sin(this.time * 3) * 5 * exp;
        } else if (this.emotion === 'sad') {
          bodyAddY += 10 * exp;
        } else if (this.emotion === 'angry') {
          // 小刻みな震えで怒りを表現(位置のみ)
          bodyAddY += Math.sin(this.time * 40) * 1.2 * exp;
        }
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
      this.root.update();
      this.body.update(0, bodyAddY, bodyAddRot);
      this.face.update();
      if (this.sprout) {
        // 葉はさらに遅れて小さく揺れる
        const sway = this.breathing ? Math.sin(this.time * 1.6 + 1) * 1.5 : 0;
        this.sprout.update(0, 0, sway);
      }

      // --- 顔パーツ内アニメ(骨とは独立した表現) ---
      const ey = this.eyeScaleY.update();
      const exs = this.eyeScaleX.update();
      const er = this.eyeRotate.update();
      const gx = this.gazeX.update();
      const gy = this.gazeY.update();
      const fo = this.faceOffsetY.update();
      const my = this.mouthScaleY.update();
      const mxs = this.mouthScaleX.update();
      const co = this.cheekOpacity.update();

      // 目: 平行移動(目線) + 縦スケール(瞬き/ウィンク) ※引き伸ばしはしない
      const winking = Date.now() < this.winkingUntil;
      const leftEy = winking && this.winkSide === 'left' ? 0.08 : ey;
      const rightEy = winking && this.winkSide === 'right' ? 0.08 : ey;
      this.leftEye.style.transform = `translate(${gx}px, ${gy + fo}px) rotate(${er}deg) scale(${exs}, ${leftEy})`;
      this.rightEye.style.transform = `translate(${gx}px, ${gy + fo}px) rotate(${-er}deg) scale(${exs}, ${rightEy})`;

      // 口: 開閉スケールのみ(形は元画像 or 元画像由来スプライトのまま)
      this.mouth.style.transform = `translate(${gx * 0.3}px, ${fo}px) scale(${mxs}, ${my})`;

      // 頬: 位置・透明度のみ。形状・縦横比は固定。常に最前面
      if (this.leftCheek) {
        this.leftCheek.style.transform = `translate(0px, ${fo * 0.6}px)`;
        this.leftCheek.style.opacity = co.toString();
      }
      if (this.rightCheek) {
        this.rightCheek.style.transform = `translate(0px, ${fo * 0.6}px)`;
        this.rightCheek.style.opacity = co.toString();
      }

      this.animationFrameId = requestAnimationFrame(tick);
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }

  public destroy() {
    cancelAnimationFrame(this.animationFrameId);
    this.transitionTimers.forEach((t) => clearTimeout(t));
    this.container.innerHTML = '';
  }
}
