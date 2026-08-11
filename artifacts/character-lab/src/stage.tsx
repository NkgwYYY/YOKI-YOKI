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
import { CharacterRig, Emotion } from '@/lib/character';
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

function readParams() {
  const q = new URLSearchParams(window.location.search);
  const char = q.get('char') ?? 'egg';
  const scale = Number(q.get('scale'));
  return {
    char: (VALID_CHARS.has(char as CharacterId) ? char : 'egg') as CharacterId,
    emotion: MOOD_TO_EMOTION[q.get('mood') ?? 'normal'] ?? 'normal',
    scale: Number.isFinite(scale) && scale > 0.5 && scale < 2 ? scale : 1,
  };
}

function Stage() {
  const [{ char, emotion, scale }, setParams] = useState(readParams);
  const svgRef = useRef<SVGSVGElement>(null);
  const rigRef = useRef<CharacterRig | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    rigRef.current?.destroy();
    const config = CHARACTERS.find(c => c.id === char)!;
    rigRef.current = new CharacterRig(svgRef.current, config);
    rigRef.current.setEmotion(emotion);
    rigRef.current.setBreathing(true);
    return () => {
      rigRef.current?.destroy();
      rigRef.current = null;
    };
  }, [char]);

  useEffect(() => { rigRef.current?.setEmotion(emotion); }, [emotion]);

  /* 親からの更新(postMessage)。リスナー登録後にreadyを通知して初期状態を受け取る */
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.type !== 'yokky-stage') return;
      setParams(prev => ({
        char: VALID_CHARS.has(d.char) ? d.char : prev.char,
        emotion: MOOD_TO_EMOTION[d.mood] ?? prev.emotion,
        scale: Number.isFinite(d.scale) && d.scale > 0.5 && d.scale < 2 ? d.scale : prev.scale,
      }));
    };
    window.addEventListener('message', onMessage);
    // ハンドシェイク: 親はこれを受けて最新状態を送り直す
    window.parent?.postMessage({ type: 'yokky-stage-ready' }, '*');
    // React Native WebView埋め込み(ネイティブアプリ)向けのready通知
    (window as any).ReactNativeWebView?.postMessage(JSON.stringify({ type: 'yokky-stage-ready' }));
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    /* キャラは下部に接地させ、上側に「持ち上げ」用のヘッドルームを確保する。
       svg自体は下55%だが overflow:visible なので持ち上げ中も枠内に描画される */
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: 'transparent', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          width: '100%',
          height: '55%',
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
