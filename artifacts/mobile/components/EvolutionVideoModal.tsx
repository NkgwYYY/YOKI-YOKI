/**
 * EvolutionVideoModal
 *
 * 進化（ステージアップ）時に再生するフルスクリーン映像モーダル。
 * 映像が終わったら（または途中でも）「×」ボタンで閉じられる。
 */
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';


// Object Storage の公開ファイル（App Storage ペインからアップロード済み）
const VIDEO_PATH = '進化映像.mp4';
const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;
const EVOLUTION_VIDEO_URL = `${API_BASE}/storage/public-objects/${encodeURIComponent(VIDEO_PATH)}`;

interface EvolutionVideoModalProps {
  visible: boolean;
  onClose: () => void;
}

export function EvolutionVideoModal({ visible, onClose }: EvolutionVideoModalProps) {
  const videoRef = useRef<Video>(null);
  const [showClose, setShowClose] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // モーダルが開くたびにリセット
  useEffect(() => {
    if (visible) {
      setShowClose(false);
      setIsLoading(true);
      setHasError(false);
    }
  }, [visible]);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        setHasError(true);
        setShowClose(true);
      }
      return;
    }
    if (status.isLoaded && !status.isPlaying && isLoading) {
      setIsLoading(false);
    }
    // 再生が始まったらローディング終了
    if (status.isPlaying) {
      setIsLoading(false);
    }
    // 映像が終了したら × を表示
    if (status.didJustFinish) {
      setShowClose(true);
    }
  }, [isLoading]);

  const handleReadyForDisplay = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    setShowClose(true);
    setIsLoading(false);
  }, []);

  const handleClose = useCallback(async () => {
    try {
      if (videoRef.current) {
        await videoRef.current.stopAsync();
      }
    } catch (_) {}
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {hasError ? (
          /* エラー時のフォールバック表示 */
          <View style={styles.errorWrap}>
            <Text style={styles.errorEmoji}>🥚✨</Text>
            <Text style={styles.errorText}>進化おめでとう！</Text>
          </View>
        ) : (
          <Video
            ref={videoRef}
            source={{ uri: EVOLUTION_VIDEO_URL }}
            style={styles.video}
            videoStyle={Platform.OS === 'web' ? ({ width: '100%', height: '100%', objectFit: 'contain' } as any) : undefined}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={visible}
            isMuted={false}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onReadyForDisplay={handleReadyForDisplay}
            onLoad={handleLoad}
            onError={handleError}
            useNativeControls={false}
          />
        )}

        {/* ローディングインジケーター */}
        {isLoading && !hasError && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>読み込み中…</Text>
          </View>
        )}

        {/* × ボタン：映像終了後 or エラー時に表示 */}
        {showClose && (
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <View style={styles.closeBtnInner}>
              <Text style={styles.closeBtnIcon}>✕</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* スキップボタン：再生中は右上に小さく表示 */}
        {!showClose && !isLoading && !hasError && (
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleClose}
            activeOpacity={0.6}
          >
            <Text style={styles.skipText}>スキップ</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    // 端末の向き・回転後も常に全画面に収める（固定値だと画面からはみ出すことがある）
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  errorWrap: {
    alignItems: 'center',
    gap: 16,
  },
  errorEmoji: {
    fontSize: 72,
  },
  errorText: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  closeBtn: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
  },
  closeBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  closeBtnIcon: {
    fontSize: 22,
    color: '#222',
    fontFamily: 'Inter_700Bold',
  },
  skipBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 24,
    right: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  skipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
});
