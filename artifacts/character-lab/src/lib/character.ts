import { CharacterConfig } from './character-config';

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

export class CharacterRig {
  private config: CharacterConfig;
  private container: SVGElement;
  private rootGroup: SVGGElement;
  private imageGroup: SVGGElement;
  private faceGroup: SVGGElement;
  
  // Springs for animation
  private bodyScaleY = new Spring(1, 0.15, 0.8);
  private bodyScaleX = new Spring(1, 0.15, 0.8);
  private bodyTranslateY = new Spring(0, 0.1, 0.8);
  private bodyTranslateX = new Spring(0, 0.1, 0.8);
  private bodyRotate = new Spring(0, 0.1, 0.8);
  
  private eyeScaleY = new Spring(1, 0.3, 0.6);
  private pupilTranslateX = new Spring(0, 0.1, 0.7);
  private pupilTranslateY = new Spring(0, 0.1, 0.7);
  
  private mouthScaleY = new Spring(1, 0.2, 0.7);
  private mouthTranslateY = new Spring(0, 0.2, 0.7);
  private eyebrowRotate = new Spring(0, 0.2, 0.7);
  private eyebrowTranslateY = new Spring(0, 0.2, 0.7);
  private cheekOpacity = new Spring(0, 0.1, 0.9);

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

  // DOM Elements
  private leftEye: SVGGElement;
  private rightEye: SVGGElement;
  private mouth: SVGPathElement;
  private leftEyebrow: SVGPathElement;
  private rightEyebrow: SVGPathElement;
  private leftCheek: SVGEllipseElement;
  private rightCheek: SVGEllipseElement;

  constructor(svgElement: SVGElement, config: CharacterConfig) {
    this.container = svgElement;
    this.config = config;
    
    this.container.innerHTML = '';
    this.container.setAttribute('viewBox', '0 0 512 512');
    
    // Main wrapper
    this.rootGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.rootGroup.style.transformOrigin = '256px 450px';
    this.container.appendChild(this.rootGroup);

    // Image layer
    this.imageGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    img.setAttribute('href', `${import.meta.env.BASE_URL}characters/${config.image}`);
    img.setAttribute('width', '512');
    img.setAttribute('height', '512');
    img.setAttribute('x', '0');
    img.setAttribute('y', '0');
    this.imageGroup.appendChild(img);
    this.rootGroup.appendChild(this.imageGroup);

    // Face layer
    this.faceGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.rootGroup.appendChild(this.faceGroup);

    const { x: cx, y: cy } = config.faceCenter;
    const es = config.eyeSpacing / 2;
    const mo = config.mouthOffset;
    const s = config.partScale;

    // Cheeks
    const cheekY = cy + config.parts.cheek.offsetY;
    this.leftCheek = this.createCheek(cx - es * 1.55, cheekY, s);
    this.rightCheek = this.createCheek(cx + es * 1.55, cheekY, s);
    this.faceGroup.appendChild(this.leftCheek);
    this.faceGroup.appendChild(this.rightCheek);

    // Mouth
    this.mouth = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.mouth.setAttribute('fill', 'none');
    this.mouth.setAttribute('stroke', config.parts.mouth.color);
    this.mouth.setAttribute('stroke-width', config.parts.mouth.stroke.toString());
    this.mouth.setAttribute('stroke-linecap', 'round');
    this.mouth.setAttribute('stroke-linejoin', 'round');
    this.faceGroup.appendChild(this.mouth);

    // Eyes
    this.leftEye = this.createEye(cx - es, cy, s);
    this.rightEye = this.createEye(cx + es, cy, s);
    this.faceGroup.appendChild(this.leftEye);
    this.faceGroup.appendChild(this.rightEye);

    // Eyebrows
    this.leftEyebrow = this.createEyebrow(cx - es, cy - 35 * s, s);
    this.rightEyebrow = this.createEyebrow(cx + es, cy - 35 * s, s);
    this.faceGroup.appendChild(this.leftEyebrow);
    this.faceGroup.appendChild(this.rightEyebrow);

    this.startLoop();
  }

  private createEye(x: number, y: number, scale: number) {
    const st = this.config.parts.eye;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.style.transformOrigin = `${x}px ${y}px`;
    
    const eye = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    eye.setAttribute('cx', x.toString());
    eye.setAttribute('cy', y.toString());
    eye.setAttribute('rx', st.rx.toString());
    eye.setAttribute('ry', st.ry.toString());
    eye.setAttribute('fill', st.color);
    g.appendChild(eye);

    if (st.highlight) {
      const highlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      highlight.setAttribute('cx', (x + st.rx * 0.28).toString());
      highlight.setAttribute('cy', (y - st.ry * 0.3).toString());
      highlight.setAttribute('r', Math.max(2.5, st.rx * 0.3).toString());
      highlight.setAttribute('fill', 'white');
      highlight.classList.add('pupil-highlight'); // For easy targeting
      g.appendChild(highlight);
    }
    void scale;
    
    return g;
  }

  private createEyebrow(x: number, y: number, scale: number) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${x - 12 * scale} ${y} Q ${x} ${y - 8 * scale} ${x + 12 * scale} ${y}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', this.config.parts.eye.color);
    path.setAttribute('stroke-width', (7 * scale).toString());
    path.setAttribute('stroke-linecap', 'round');
    path.style.transformOrigin = `${x}px ${y}px`;
    path.style.opacity = '0'; // Hidden by default
    return path;
  }

  private createCheek(x: number, y: number, scale: number) {
    const st = this.config.parts.cheek;
    const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    ellipse.setAttribute('cx', x.toString());
    ellipse.setAttribute('cy', y.toString());
    ellipse.setAttribute('rx', st.rx.toString());
    ellipse.setAttribute('ry', st.ry.toString());
    ellipse.setAttribute('fill', st.color);
    ellipse.style.opacity = '0';
    void scale;
    return ellipse;
  }

  public setEmotion(emotion: Emotion) {
    this.emotion = emotion;
    
    // Reset defaults (body画像から頬も除去済みなので、頬パーツは常時うっすら表示する)
    this.bodyScaleX.target = 1;
    this.bodyScaleY.target = 1;
    this.eyebrowRotate.target = 0;
    this.eyebrowTranslateY.target = 0;
    this.cheekOpacity.target = 0.45;
    
    switch (emotion) {
      case 'happy':
        this.cheekOpacity.target = 0.75;
        this.eyeScaleY.target = 0.8;
        this.leftEyebrow.style.opacity = '0';
        this.rightEyebrow.style.opacity = '0';
        break;
      case 'angry':
        this.cheekOpacity.target = 0.25;
        this.eyeScaleY.target = 0.9;
        this.eyebrowRotate.target = 25;
        this.eyebrowTranslateY.target = 10;
        this.leftEyebrow.style.opacity = '1';
        this.rightEyebrow.style.opacity = '1';
        break;
      case 'sad':
        this.cheekOpacity.target = 0.3;
        this.eyeScaleY.target = 0.9;
        this.bodyScaleY.target = 0.95;
        this.bodyScaleX.target = 1.05;
        this.eyebrowRotate.target = -15;
        this.eyebrowTranslateY.target = 5;
        this.leftEyebrow.style.opacity = '1';
        this.rightEyebrow.style.opacity = '1';
        break;
      case 'fun':
        this.cheekOpacity.target = 0.6;
        this.eyeScaleY.target = 0.85;
        this.leftEyebrow.style.opacity = '0';
        this.rightEyebrow.style.opacity = '0';
        break;
      case 'surprised':
        this.eyeScaleY.target = 1.2;
        this.bodyScaleY.target = 1.1;
        this.bodyScaleX.target = 0.9;
        this.eyebrowTranslateY.target = -15;
        this.leftEyebrow.style.opacity = '1';
        this.rightEyebrow.style.opacity = '1';
        setTimeout(() => {
          if (this.emotion === 'surprised') {
            this.bodyScaleY.target = 1;
            this.bodyScaleX.target = 1;
          }
        }, 300);
        break;
      case 'normal':
      default:
        this.eyeScaleY.target = 1;
        this.leftEyebrow.style.opacity = '0';
        this.rightEyebrow.style.opacity = '0';
        break;
    }
    
    this.updateMouthShape();
  }

  private updateMouthShape() {
    const { x: cx, y: cy } = this.config.faceCenter;
    const mo = this.config.mouthOffset;
    const mx = cx + mo.x;
    const my = cy + mo.y;
    const s = this.config.partScale;
    const mp = this.config.parts.mouth;
    
    let d = '';
    const w = mp.halfWidth * 0.8;
    
    // Base mouth shapes
    if (this.talking) {
      const openAmount = (Math.sin(this.time * 20) * 0.5 + 0.5) * 20 * s + 5 * s;
      d = `M ${mx - w} ${my} Q ${mx} ${my + openAmount} ${mx + w} ${my}`;
      this.mouth.setAttribute('fill', mp.color);
      this.mouth.setAttribute('stroke-width', (mp.stroke * 0.5).toString());
    } else {
      this.mouth.setAttribute('fill', 'none');
      this.mouth.setAttribute('stroke-width', mp.stroke.toString());
      
      switch (this.emotion) {
        case 'happy':
        case 'fun':
          d = `M ${mx - w} ${my - 2*s} Q ${mx} ${my + 10*s} ${mx + w} ${my - 2*s}`;
          break;
        case 'angry':
          d = `M ${mx - w} ${my + 5*s} Q ${mx} ${my - 5*s} ${mx + w} ${my + 5*s}`;
          break;
        case 'sad':
          d = `M ${mx - w} ${my + 3*s} Q ${mx} ${my - 8*s} ${mx + w} ${my + 3*s}`;
          break;
        case 'surprised': {
          const r = Math.max(6, mp.halfWidth * 0.45);
          d = `M ${mx - r} ${my + 5*s} A ${r} ${r * 1.25} 0 1 0 ${mx + r} ${my + 5*s} A ${r} ${r * 1.25} 0 1 0 ${mx - r} ${my + 5*s}`;
          this.mouth.setAttribute('fill', mp.color);
          break;
        }
        case 'normal':
        default:
          d = `M ${mx - w} ${my} Q ${mx} ${my - 2*s} ${mx + w} ${my}`;
          break;
      }
    }
    
    this.mouth.setAttribute('d', d);
  }

  public blink() {
    // ウィンク中は両目閉じにならないよう抑止
    if (Date.now() < this.winkingUntil) return;
    this.eyeScaleY.value = 0.1;
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
    
    // Squash down
    this.bodyScaleY.target = 0.7;
    this.bodyScaleX.target = 1.3;
    this.bodyTranslateY.target = 20;
    
    setTimeout(() => {
      // Leap up
      this.bodyScaleY.target = 1.2;
      this.bodyScaleX.target = 0.8;
      this.bodyTranslateY.target = -150;
      
      setTimeout(() => {
        // Fall down
        this.bodyScaleY.target = 0.9;
        this.bodyScaleX.target = 1.1;
        this.bodyTranslateY.target = 0;
        
        setTimeout(() => {
          // Recover
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

  /** 目線を動かす。nx, ny は -1〜1 */
  public lookAt(nx: number, ny: number) {
    const cx = Math.max(-1, Math.min(1, nx));
    const cy = Math.max(-1, Math.min(1, ny));
    const amp = this.config.parts.eye.rx * 0.55;
    this.pupilTranslateX.target = cx * amp;
    this.pupilTranslateY.target = cy * amp;
  }

  public talk() {
    if (this.talking) return;
    this.talking = true;
    
    setTimeout(() => {
      this.talking = false;
      this.updateMouthShape();
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
        // Default breathing
        bY = Math.sin(this.time * 2) * 5;
        
        if (this.emotion === 'happy') {
          bY = Math.abs(Math.sin(this.time * 6)) * -15; // Bobbing up
        } else if (this.emotion === 'sad') {
          bY += 10; // Droop down
        } else if (this.emotion === 'fun') {
          bR = Math.sin(this.time * 3) * 5; // Swaying
        }
      }
      
      if (this.shaking) {
        this.bodyTranslateX.target = (Math.random() - 0.5) * 20;
        bY += (Math.random() - 0.5) * 10;
      }

      // Update springs
      const sy = this.bodyScaleY.update();
      const sx = this.bodyScaleX.update();
      const ty = this.bodyTranslateY.update() + bY;
      const tx = this.bodyTranslateX.update();
      const rot = this.bodyRotate.update() + bR;
      
      const ey = this.eyeScaleY.update();
      const px = this.pupilTranslateX.update();
      const py = this.pupilTranslateY.update();
      
      const er = this.eyebrowRotate.update();
      const ety = this.eyebrowTranslateY.update();
      
      const co = this.cheekOpacity.update();

      // Apply transforms
      this.rootGroup.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${sx}, ${sy})`;
      
      // Face elements transforms (ウィンク中は片目だけ閉じる)
      const winking = Date.now() < this.winkingUntil;
      const leftEy = winking && this.winkSide === 'left' ? 0.08 : ey;
      const rightEy = winking && this.winkSide === 'right' ? 0.08 : ey;
      this.leftEye.style.transform = `scale(1, ${leftEy})`;
      this.rightEye.style.transform = `scale(1, ${rightEy})`;
      
      // Move pupils (we select the highlight to move it)
      const highlights = this.faceGroup.querySelectorAll('.pupil-highlight');
      highlights.forEach(el => {
        (el as SVGCircleElement).style.transform = `translate(${px}px, ${py}px)`;
      });

      this.leftEyebrow.style.transform = `translateY(${ety}px) rotate(${-er}deg)`;
      this.rightEyebrow.style.transform = `translateY(${ety}px) rotate(${er}deg)`;
      
      this.leftCheek.style.opacity = co.toString();
      this.rightCheek.style.opacity = co.toString();

      if (this.talking) {
        this.updateMouthShape();
      }

      this.animationFrameId = requestAnimationFrame(tick);
    };
    
    this.animationFrameId = requestAnimationFrame(tick);
  }

  public destroy() {
    cancelAnimationFrame(this.animationFrameId);
    this.container.innerHTML = '';
  }
}
