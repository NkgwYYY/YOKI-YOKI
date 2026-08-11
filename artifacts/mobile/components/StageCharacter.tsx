/**
 * StageCharacter — キャラクターラボの物理エンジン(掴んで投げる・ぷるん着地・
 * 慣性揺れ)をそのまま使うための埋め込みステージ。
 *
 * Web(ブラウザ/PWA)では ラボの /stage.html を透明iframeで埋め込み、
 * ネイティブでは従来の Mascot 表示にフォールバックする。
 * 本体からは char / mood / growthSize を渡すだけ。データは本体側が持つ。
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, View } from 'react-native';
// Web専用: MessageEvent はブラウザ環境でのみ使用される
import { Mascot } from '@/components/Mascot';
import type { MascotStage, MascotMood } from '@/utils/mascotUtils';
import { getCharacter } from '@/utils/mascotUtils';

interface Props {
  stage: MascotStage;
  mood: MascotMood;
  size: number;
  growthSize: number;
  /** ネイティブフォールバック用 */
  idleBehavior?: any;
  onPet?: () => void;
}

/** ラボのステージページURL(同一オリジンのパス。開発中のexpoドメインではラボ側ドメインへ向ける) */
function stageOrigin(): string {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname;
  // Expo開発ドメイン(…​.expo.<cluster>.replit.dev)からはプロキシ側ドメインに読み替える
  if (host.includes('.expo.') && host.endsWith('.replit.dev')) {
    return `https://${host.replace('.expo.', '.')}`;
  }
  return ''; // 本番・通常は同一オリジン相対
}

export function StageCharacter({ stage, mood, size, growthSize, idleBehavior, onPet }: Props) {
  const char = getCharacter(stage).key; // egg | odango | happa | colorful_happa
  const iframeRef = useRef<any>(null);

  const src = useMemo(() => {
    const base = `${stageOrigin()}/character-lab/stage.html`;
    return `${base}?char=${char}&mood=${mood}&scale=${growthSize.toFixed(3)}`;
    // 初回URLのみ。以後の変更はpostMessageで反映(iframe再読込を避ける)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 最新状態を保持し、変更時とステージ側のready通知時に送る(初回同期漏れ防止) */
  const latest = useRef({ char, mood, scale: growthSize });
  latest.current = { char, mood, scale: growthSize };

  const sendState = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: 'yokky-stage', ...latest.current }, '*');
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    sendState();
  }, [char, mood, growthSize]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'yokky-stage-ready' && e.source === iframeRef.current?.contentWindow) {
        sendState();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (Platform.OS !== 'web') {
    return (
      <Mascot stage={stage} mood={mood} size={size} idleBehavior={idleBehavior} onPet={onPet} />
    );
  }

  // Web: 透明iframe。ステージ側が物理・掴み操作を全て処理する
  return (
    <View style={{ width: size * 1.5, height: size * 1.5 }}>
      {React.createElement('iframe', {
        ref: iframeRef,
        src,
        title: 'character-stage',
        style: {
          width: '100%',
          height: '100%',
          border: 'none',
          background: 'transparent',
          display: 'block',
        },
        scrolling: 'no',
      })}
    </View>
  );
}
