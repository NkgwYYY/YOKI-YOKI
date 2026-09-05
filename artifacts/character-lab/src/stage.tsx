/**
 * ステージ埋め込みページ(/stage.html)
 * YOKKY本体のホームに iframe / WebView として埋め込む「キャラだけ」の透明ページ。
 * ラボの物理エンジン(呼吸・瞬き・掴んで投げる・ぷるん着地)をそのまま使う。
 *
 * パラメータ(クエリ or postMessage {type:'yokky-stage', char, mood, scale}):
 *   char  : egg | odango | happa | colorful_happa
 *   mood  : normal | happy | excited | grumpy | tired | sleepy(YOKKYのmood語彙)
 *   scale : Growth Size(例 1.023)。表示スケールに反映
 */
import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CharacterRig, Emotion, WearableConfig } from '@/lib/character';
import { CHARACTERS, CharacterId } from '@/lib/character-config';

/** YOKKYのmood → ラボのEmotion */
const MOOD_TO_EMOTION: Record<string, Emotion> = {
  normal: 'normal',
  happy: 'happy',
  excited: 'fun',
  grumpy: 'angry',
  tired: 'sad',
  sleepy: 'sad',
};

const VALID_CHARS = new Set(CHARACTERS.map(c => c.id));
type WearableMessage = { id: string; url: string; offsetX?: number; offsetY?: number; scale?: number };
const WEARABLE_Y: Record<string, Record<CharacterId, number>> = {
  'starter-moon-ribbon': { egg: -112, odango: -171, happa: -156, colorful_happa: -156 },
  'catalog-wear-crown': { egg: -243, odango: -283, happa: -253, colorful_happa: -253 },
  'catalog-wear-cat-ears': { egg: -226, odango: -285, happa: -260, colorful_happa: -260 },
  'catalog-wear-round-glasses': { egg: 38, odango: -13, happa: 22, colorful_happa: 22 },
  'catalog-wear-headphones': { egg: -80, odango: -130, happa: -100, colorful_happa: -100 },
};
function getWearableConfig(char: CharacterId, wearable: WearableMessage | null): WearableConfig | null {
  if (!wearable || WEARABLE_Y[wearable.id]?.[char] === undefined) return null;
  const baseSize = char === 'egg' ? 430 : char === 'happa' || char === 'colorful_happa' ? 470 : 512;
  const designFit = wearable.id === 'catalog-wear-headphones' ? 0.72
    : wearable.id === 'catalog-wear-crown' ? 0.88
    : wearable.id === 'catalog-wear-round-glasses' ? 0.9
    : 1;
  const size = baseSize * designFit * Math.max(0.55, Math.min(1.45, wearable.scale ?? 1));
  return {
    url: wearable.url,
    x: (wearable.id === 'starter-moon-ribbon' ? 80 : 0) + (512 - size) / 2 + (wearable.offsetX ?? 0),
    y: WEARABLE_Y[wearable.id][char] + (512 - size) / 2 + (wearable.offsetY ?? 0),
    size,
  };
}

function waitForStageImages(svg: SVGSVGElement): Promise<void> {
  const sources = Array.from(svg.querySelectorAll('image'))
    .map((image) => image.getAttribute('href') || image.getAttribute('xlink:href'))
    .filter((source): source is string => Boolean(source));

  return Promise.all(
    [...new Set(sources)].map((source) => new Promise<void>((resolve, reject) => {
      const image = new Image();
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        if (error) reject(error);
        else resolve();
      };
      const timeout = window.setTimeout(
        () => finish(new Error(`Timed out loading character image: ${source}`)),
        8000,
      );
      image.onload = () => finish();
      image.onerror = () => finish(new Error(`Failed to load character image: ${source}`));
      image.src = source;
      if (image.complete && image.naturalWidth > 0) finish();
    })),
  ).then(() => undefined);
}

function notifyParent(type: 'yokky-stage-ready' | 'yokky-stage-error') {
  window.parent?.postMessage({ type }, '*');
  (window as any).ReactNativeWebView?.postMessage(JSON.stringify({ type }));
}

function readParams() {
  const q = new URLSearchParams(window.location.search);
  const char = q.get('char') ?? 'egg';
  const scale = Number(q.get('scale'));
  const wearableId = q.get('wearableId');
  const wearableUrl = q.get('wearableUrl');
  return {
    char: (VALID_CHARS.has(char as CharacterId) ? char : 'egg') as CharacterId,
    emotion: MOOD_TO_EMOTION[q.get('mood') ?? 'normal'] ?? 'normal',
    scale: Number.isFinite(scale) && scale > 0.5 && scale < 2 ? scale : 1,
    wearable: wearableId && wearableUrl ? { id: wearableId, url: wearableUrl } : null as WearableMessage | null,
  };
}

function Stage() {
  const [{ char, emotion, scale, wearable }, setParams] = useState(readParams);
  const svgRef = useRef<SVGSVGElement>(null);
  const rigRef = useRef<CharacterRig | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    let cancelled = false;
    rigRef.current?.destroy();
    const config = CHARACTERS.find(c => c.id === char)!;
    rigRef.current = new CharacterRig(svgRef.current, config);
    rigRef.current.setEmotion(emotion);
    rigRef.current.setBreathing(true);
    rigRef.current.setWearable(getWearableConfig(char, wearable));
    waitForStageImages(svgRef.current)
      .then(() => {
        if (!cancelled) notifyParent('yokky-stage-ready');
      })
      .catch(() => {
        if (!cancelled) notifyParent('yokky-stage-error');
      });
    return () => {
      cancelled = true;
      rigRef.current?.destroy();
      rigRef.current = null;
    };
  }, [char]);

  useEffect(() => { rigRef.current?.setEmotion(emotion); }, [emotion]);
  useEffect(() => { rigRef.current?.setWearable(getWearableConfig(char, wearable)); }, [char, wearable]);

  /* 親からの更新(postMessage)。リスナー登録後にreadyを通知して初期状態を受け取る */
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.type !== 'yokky-stage') return;
      setParams(prev => ({
        char: VALID_CHARS.has(d.char) ? d.char : prev.char,
        emotion: MOOD_TO_EMOTION[d.mood] ?? prev.emotion,
        scale: Number.isFinite(d.scale) && d.scale > 0.5 && d.scale < 2 ? d.scale : prev.scale,
        wearable: d.wearable?.url ? d.wearable : null,
      }));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    /* 見た目のサイズを保ったまま、拡張されたiframe上部をジャンプ用ヘッドルームに使う。 */
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: 'transparent', overflow: 'visible', clipPath: 'none', mask: 'none' }}>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          width: '60.7142857%',
          height: '41.25%',
          overflow: 'visible',
          clipPath: 'none',
          mask: 'none',
          transform: `translateX(-50%) scale(${scale})`,
          transformOrigin: 'center bottom',
          transition: 'transform 4s ease',
        }}
      >
        <svg
          ref={svgRef}
          style={{ width: '100%', height: '100%', overflow: 'visible', userSelect: 'none' }}
        />
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Stage />
  </StrictMode>,
);
