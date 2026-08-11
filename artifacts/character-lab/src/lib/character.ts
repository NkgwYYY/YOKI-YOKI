import { CharacterConfig, PartBox } from './character-config';

export type Emotion = 'normal' | 'happy' | 'angry' | 'sad' | 'fun' | 'surprised';

// Smooths transitions between values
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

/**
 * キャラクターリグ(元画像パーツ方式)
 *
 * 【最重要ルール】元画像 = 正解。
 * 顔パーツ(目・口・頬)はすべて「元画像から切り出したPNG」を
 * 元画像と同じ座標に配置して表示する。SVGで顔を描き直すことはしない。
 * 表情・アクションは既存パーツの 位置/回転/スケール/透明度 の
 * アニメーションだけで表現する(眉毛などの新パーツ追加は禁止)。
 */
export class CharacterRig {
  private config: CharacterConfig;
  private container: SVGElement;
  private rootGroup: SVGGElement;

  // Springs for animation
  private bodyScaleY = new Spring(1, 0.15, 0.8);
  private bodyScaleX = new Spring(1, 0.15, 0.8);
  private bodyTranslateY = new Spring(0, 0.1, 0.8);
  private bodyTranslateX = new Spring(0, 0.1, 0.8);
  private bodyRotate = new Spring(0, 0.1, 0.8);

  private eyeScaleY = new Spring(1, 0.3, 0.6);
  private eyeScaleX = new Spring(1, 0.3, 0.6);
  private gazeX = new Spring(0, 0.1, 0.7);
  private gazeY = new Spring(0, 0.1, 0.7);
  private faceOffsetY = new Spring(0, 0.15, 0.8);
  private mouthScaleY = new Spring(1, 0.25, 0.7);
  private cheekScale = new Spring(1, 0.1, 0.85);

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

    this.rootGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.rootGroup.style.transformOrigin = '256px 450px';
    this.container.appendChild(this.rootGroup);

    // Body (顔除去済み)
    const body = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    body.setAttribute('href', `${import.meta.env.BASE_URL}characters/${config.body}`);
    body.setAttribute('width', '512');
    body.setAttribute('height', '512');
    this.rootGroup.appendChild(body);

    // 頬(元画像切り出し、常時表示 = 元画像どおり)
    const p = config.parts;
    if (p.leftCheek) this.leftCheek = this.createPart('leftCheek', p.leftCheek);
    if (p.rightCheek) this.rightCheek = this.createPart('rightCheek', p.rightCheek);
    // 口・目
    this.mouth = this.createPart('mouth', p.mouth);
    this.leftEye = this.createPart('leftEye', p.leftEye);
    this.rightEye = this.createPart('rightEye', p.rightEye);

    this.startLoop();
  }

  /** 元画像から切り出したパーツPNGを、元画像と同じ座標に置く */
  private createPart(name: string, box: PartBox): SVGImageElement {
    const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    img.setAttribute('href', `${import.meta.env.BASE_URL}characters/parts/${this.config.id}/${name}.png`);
    img.setAttribute('x', box.x.toString());
    img.setAttribute('y', box.y.toString());
    img.setAttribute('width', box.w.toString());
    img.setAttribute('height', box.h.toString());
    img.style.transformOrigin = `${box.x + box.w / 2}px ${box.y + box.h / 2}px`;
    this.rootGroup.appendChild(img);
    return img;
  }

  /**
   * 表情 = 既存パーツの動きだけで表現(パーツ追加・形状描き直しなし)
   */
  public setEmotion(emotion: Emotion) {
    this.emotion = emotion;

    // Reset
    this.bodyScaleX.target = 1;
    this.bodyScaleY.target = 1;
    this.eyeScaleY.target = 1;
    this.eyeScaleX.target = 1;
    this.mouthScaleY.target = 1;
    this.cheekScale.target = 1;
    this.faceOffsetY.target = 0;

    switch (emotion) {
      case 'happy':
        // 目を少し細め、頬を少し強調、体は弾む(ループ側)
        this.eyeScaleY.target = 0.75;
        this.cheekScale.target = 1.12;
        break;
      case 'angry':
        // 目をやや細めて下げる + 小さな震え(ループ側)。眉毛は使わない
        this.eyeScaleY.target = 0.8;
        this.faceOffsetY.target = 4;
        break;
      case 'sad':
        // 目線を下げ、顔全体を少し下げ、体を少し縮める
        this.gazeY.target = 4;
        this.faceOffsetY.target = 7;
        this.bodyScaleY.target = 0.96;
        this.bodyScaleX.target = 1.03;
        break;
      case 'fun':
        // 目を少し細め、体を左右に揺らす(ループ側)
        this.eyeScaleY.target = 0.85;
        this.cheekScale.target = 1.08;
        break;
      case 'surprised':
        // 目と口を「元デザインと分かる範囲で」少し大きく + 体が伸びる
        this.eyeScaleY.target = 1.18;
        this.eyeScaleX.target = 1.12;
        this.mouthScaleY.target = 1.35;
        this.bodyScaleY.target = 1.08;
        this.bodyScaleX.target = 0.94;
        setTimeout(() => {
          if (this.emotion === 'surprised') {
            this.bodyScaleY.target = 1;
            this.bodyScaleX.target = 1;
          }
        }, 300);
        break;
      case 'normal':
      default:
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

  public jump() {
    if (this.jumping) return;
    this.jumping = true;

    this.bodyScaleY.target = 0.7;
    this.bodyScaleX.target = 1.3;
    this.bodyTranslateY.target = 20;

    setTimeout(() => {
      this.bodyScaleY.target = 1.2;
      this.bodyScaleX.target = 0.8;
      this.bodyTranslateY.target = -150;

      setTimeout(() => {
        this.bodyScaleY.target = 0.9;
        this.bodyScaleX.target = 1.1;
        this.bodyTranslateY.target = 0;

        setTimeout(() => {
          this.bodyScaleY.target = 1;
          this.bodyScaleX.target = 1;
          this.jumping = false;
        }, 150);
      }, 200);
    }, 100);
  }

  public shake() {
    this.shaking = true;
    setTimeout(() => {
      this.shaking = false;
      this.bodyTranslateX.target = 0;
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
      this.mouthScaleY.target = this.emotion === 'surprised' ? 1.35 : 1;
    }, 2000);
  }

  private startLoop() {
    let lastBlink = Date.now();

    const tick = () => {
      this.time += 0.016;

      // Auto blink
      if (Date.now() - lastBlink > 3000 + Math.random() * 4000) {
        this.blink();
        lastBlink = Date.now();
      }

      // Breathing / idle animations
      let bY = 0;
      let bR = 0;

      if (!this.jumping && this.breathing) {
        bY = Math.sin(this.time * 2) * 5;

        if (this.emotion === 'happy') {
          bY = Math.abs(Math.sin(this.time * 6)) * -15;
        } else if (this.emotion === 'sad') {
          bY += 10;
        } else if (this.emotion === 'fun') {
          bR = Math.sin(this.time * 3) * 5;
        } else if (this.emotion === 'angry') {
          // 眉毛の代わりに小刻みな震えで怒りを表現
          bY += Math.sin(this.time * 40) * 1.2;
        }
      }

      if (this.shaking) {
        this.bodyTranslateX.target = (Math.random() - 0.5) * 20;
        bY += (Math.random() - 0.5) * 10;
      }

      // 喋り: 口パーツの開閉
      if (this.talking) {
        this.mouthScaleY.target = 1 + (Math.sin(this.time * 18) * 0.5 + 0.5) * 0.8;
      }

      // Update springs
      const sy = this.bodyScaleY.update();
      const sx = this.bodyScaleX.update();
      const ty = this.bodyTranslateY.update() + bY;
      const tx = this.bodyTranslateX.update();
      const rot = this.bodyRotate.update() + bR;

      const ey = this.eyeScaleY.update();
      const ex = this.eyeScaleX.update();
      const gx = this.gazeX.update();
      const gy = this.gazeY.update();
      const fo = this.faceOffsetY.update();
      const my = this.mouthScaleY.update();
      const cs = this.cheekScale.update();

      this.rootGroup.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${sx}, ${sy})`;

      // 目: 平行移動(目線) + 縦スケール(瞬き/ウィンク)
      const winking = Date.now() < this.winkingUntil;
      const leftEy = winking && this.winkSide === 'left' ? 0.08 : ey;
      const rightEy = winking && this.winkSide === 'right' ? 0.08 : ey;
      this.leftEye.style.transform = `translate(${gx}px, ${gy + fo}px) scale(${ex}, ${leftEy})`;
      this.rightEye.style.transform = `translate(${gx}px, ${gy + fo}px) scale(${ex}, ${rightEy})`;

      // 口: 開閉スケールのみ(形は元画像のまま)
      this.mouth.style.transform = `translate(${gx * 0.3}px, ${fo}px) scale(1, ${my})`;

      // 頬: 元画像どおり常時表示。感情で少しだけスケール
      if (this.leftCheek) this.leftCheek.style.transform = `translate(0px, ${fo * 0.6}px) scale(${cs})`;
      if (this.rightCheek) this.rightCheek.style.transform = `translate(0px, ${fo * 0.6}px) scale(${cs})`;

      this.animationFrameId = requestAnimationFrame(tick);
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }

  public destroy() {
    cancelAnimationFrame(this.animationFrameId);
    this.container.innerHTML = '';
  }
}
