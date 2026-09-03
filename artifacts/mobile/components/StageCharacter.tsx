/**
 * StageCharacter — キャラクターラボの物理エンジン(掴んで投げる・ぷるん着地・
 * 慣性揺れ)をそのまま使うための埋め込みステージ。
 *
 * Web(ブラウザ/PWA)では ラボの /stage.html を透明iframeで埋め込み、
 * ネイティブでは react-native-webview で本番URLのステージを表示する。
 * 読み込み失敗時は従来の Mascot 表示にフォールバック。
 * 本体からは char / mood / growthSize を渡すだけ。データは本体側が持つ。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { Mascot } from '@/components/Mascot';
import type { MascotStage, MascotMood } from '@/utils/mascotUtils';
import { getCharacter } from '@/utils/mascotUtils';

const STAGE_LAYOUT_HEIGHT_RATIO = 2.4;
const STAGE_LAYOUT_WIDTH_RATIO = 1.7;
const STAGE_VIEWPORT_HEIGHT_RATIO = 3.2;
const STAGE_VIEWPORT_WIDTH_RATIO = 2.8;
const STAGE_NO_CLIP = {
  overflow: 'visible',
  ...(Platform.OS === 'web'
    ? {
        clipPath: 'none',
        WebkitClipPath: 'none',
        mask: 'none',
        WebkitMaskImage: 'none',
      }
    : {}),
} as any;

interface Props {
  stage: MascotStage;
  mood: MascotMood;
  size: number;
  growthSize: number;
  /** フォールバック表示用 */
  idleBehavior?: any;
  onPet?: () => void;
}

/** ネイティブから参照する本番のラボURL */
const PROD_LAB_ORIGIN = 'https://yoki-yoki.replit.app';

/** ラボのステージページURL(Web: 同一オリジン相対。開発中のexpoドメインではプロキシ側へ読み替え) */
function stageOrigin(): string {
  if (Platform.OS !== 'web') return PROD_LAB_ORIGIN;
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname;
  if (host.includes('.expo.') && host.endsWith('.replit.dev')) {
    return `https://${host.replace('.expo.', '.')}`;
  }
  return ''; // 本番・通常は同一オリジン相対
}

export function StageCharacter({ stage, mood, size, growthSize, idleBehavior, onPet }: Props) {
  const char = getCharacter(stage).key; // egg | odango | happa | colorful_happa
  const iframeRef = useRef<any>(null);
  const webviewRef = useRef<any>(null);
  const [nativeFailed, setNativeFailed] = useState(false);
  const [shouldLoadStage, setShouldLoadStage] = useState(false);
  const [stageReady, setStageReady] = useState(false);
  // ステージからready通知が来たか(来なければ誤ったページ=旧ビルド等 → フォールバック)
  const nativeReadyRef = useRef(false);

  const src = useMemo(() => {
    const base = `${stageOrigin()}/character-lab/stage.html`;
    return `${base}?char=${char}&mood=${mood}&scale=${growthSize.toFixed(3)}`;
    // 初回URLのみ。以後の変更はpostMessageで反映(再読込を避ける)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 最新状態を保持し、変更時とステージ側のready通知時に送る(初回同期漏れ防止) */
  const latest = useRef({ char, mood, scale: growthSize });
  latest.current = { char, mood, scale: growthSize };

  const sendState = () => {
    const msg = { type: 'yokky-stage', ...latest.current };
    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(msg, '*');
    } else {
      webviewRef.current?.injectJavaScript(
        `window.postMessage(${JSON.stringify(msg)}, '*'); true;`,
      );
    }
  };

  useEffect(() => {
    sendState();
  }, [char, mood, growthSize]);

  useEffect(() => {
    // フォールバックを表示したまま、埋め込みステージはすぐ裏側で準備する。
    const timer = setTimeout(() => setShouldLoadStage(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'yokky-stage-ready' && e.source === iframeRef.current?.contentWindow) {
        setStageReady(true);
        sendState();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  /* ── フォールバック(ネイティブ読み込み失敗時)。成長スケールも反映 ── */
  const fallback = (
    <View style={{ width: size * STAGE_LAYOUT_WIDTH_RATIO, height: size * STAGE_LAYOUT_HEIGHT_RATIO, alignItems: 'center', justifyContent: 'center', ...STAGE_NO_CLIP }}>
      <View style={{ transform: [{ scale: growthSize }] }}>
        <Mascot
          stage={stage}
          mood={mood}
          size={size}
          idleBehavior={idleBehavior}
          onPet={onPet}
          preferStatic
        />
      </View>
    </View>
  );

  if (!shouldLoadStage) return fallback;

  if (Platform.OS !== 'web') {
    if (nativeFailed) return fallback;
    // 遅延require: Web(expo export)バンドルにネイティブ専用モジュールを含めない
    let WebView: any;
    try {
      WebView = require('react-native-webview').WebView;
    } catch {
      return fallback;
    }
    return (
      <View style={{ width: size * STAGE_LAYOUT_WIDTH_RATIO, height: size * STAGE_LAYOUT_HEIGHT_RATIO, position: 'relative', ...STAGE_NO_CLIP }}>
        {!stageReady ? <View pointerEvents="none" style={{ position: 'absolute', inset: 0 } as any}>{fallback}</View> : null}
        <View
          pointerEvents={stageReady ? 'auto' : 'none'}
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 0,
            width: size * STAGE_VIEWPORT_WIDTH_RATIO,
            height: size * STAGE_VIEWPORT_HEIGHT_RATIO,
            marginLeft: -(size * STAGE_VIEWPORT_WIDTH_RATIO) / 2,
            opacity: stageReady ? 1 : 0,
            ...STAGE_NO_CLIP,
          }}
        >
          <WebView
            ref={webviewRef}
            source={{ uri: src }}
            style={{ flex: 1, backgroundColor: 'transparent' }}
            containerStyle={{ backgroundColor: 'transparent', ...STAGE_NO_CLIP }}
            javaScriptEnabled
            domStorageEnabled={false}
            scrollEnabled={false}
            overScrollMode="never"
            bounces={false}
            onError={() => setNativeFailed(true)}
            onHttpError={() => setNativeFailed(true)}
            onLoadEnd={() => {
              // ready欠落時の初期同期補強 + ステージ以外のページ(旧ビルド等)を検出してフォールバック
              sendState();
              setTimeout(() => {
                if (!nativeReadyRef.current) setNativeFailed(true);
              }, 6000);
            }}
            onMessage={(e: any) => {
              try {
                const d = JSON.parse(e.nativeEvent.data);
                if (d?.type === 'yokky-stage-ready') {
                  nativeReadyRef.current = true;
                  setStageReady(true);
                  sendState();
                }
              } catch {}
            }}
          />
        </View>
      </View>
    );
  }

  // Web: 透明iframe。ステージ側が物理・掴み操作を全て処理する
  return (
    <View style={{ width: size * STAGE_LAYOUT_WIDTH_RATIO, height: size * STAGE_LAYOUT_HEIGHT_RATIO, position: 'relative', ...STAGE_NO_CLIP }}>
      {!stageReady ? <View pointerEvents="none" style={{ position: 'absolute', inset: 0 } as any}>{fallback}</View> : null}
      <View
        pointerEvents={stageReady ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 0,
          width: size * STAGE_VIEWPORT_WIDTH_RATIO,
          height: size * STAGE_VIEWPORT_HEIGHT_RATIO,
          marginLeft: -(size * STAGE_VIEWPORT_WIDTH_RATIO) / 2,
          opacity: stageReady ? 1 : 0,
          ...STAGE_NO_CLIP,
        }}
      >
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
            overflow: 'visible',
            clipPath: 'none',
            mask: 'none',
          },
          scrolling: 'no',
        })}
      </View>
    </View>
  );
}
