import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Mascot } from '@/components/Mascot';
import { useApp } from '@/contexts/AppContext';
import { getMascotStage } from '@/utils/mascotUtils';
import { Song, Difficulty, RhythmMode, PlayResult, starRating } from '@/utils/rhythm/types';
import { SONGS } from '@/utils/rhythm/songs';
import { getChart } from '@/utils/rhythm/charts';
import { useSongClock } from '@/utils/rhythm/useSongClock';
import { gainForPlay } from '@/utils/lightEnergy';
import { TapBeatGame } from './TapBeatGame';
import { RhythmJumpGame } from './RhythmJumpGame';
import { RhythmSwipeGame } from './RhythmSwipeGame';
import { RhythmCopyGame } from './RhythmCopyGame';
import { RelaxRhythmGame } from './RelaxRhythmGame';

type Step = 'song' | 'mode' | 'difficulty' | 'playing' | 'result';

const MODES: { id: RhythmMode; title: string; emoji: string; desc: string; ready: boolean }[] = [
  { id: 'tap',   title: 'TAP BEAT',     emoji: '🎵', desc: '4レーンをリズムでタップ', ready: true },
  { id: 'jump',  title: 'RHYTHM JUMP',  emoji: '🦘', desc: 'ビートに合わせてキャラがジャンプ', ready: true },
  { id: 'swipe', title: 'RHYTHM SWIPE', emoji: '👉', desc: 'やじるしの方向にスワイプ', ready: true },
  { id: 'copy',  title: 'RHYTHM COPY',  emoji: '🪞', desc: 'キャラのリズムをまねっこ', ready: true },
  { id: 'relax', title: 'RHYTHM RELAX', emoji: '🌊', desc: 'ひろがる円をゆったりタップ', ready: true },
];

const DIFFS: { id: Difficulty; label: string; color: string; desc: string }[] = [
  { id: 'easy',   label: 'EASY',   color: '#5EE0B8', desc: 'ゆったり楽しむ' },
  { id: 'normal', label: 'NORMAL', color: '#5EB8FF', desc: 'リズムに乗る' },
  { id: 'hard',   label: 'HARD',   color: '#FF6B8A', desc: 'ノリノリ挑戦' },
];

/** キャラの優しいコメント (高評価/普通/MISS多め) */
function characterComment(r: PlayResult, mode: RhythmMode): string {
  if (mode === 'relax') return 'いっしょにゆったりできて きもちよかった〜🌊';
  const missRate = r.totalNotes > 0 ? r.miss / r.totalNotes : 0;
  const stars = starRating(r);
  if (mode === 'copy' && stars >= 4) return 'まねっこ、ばっちりだったね！うれしい〜！🪞✨';
  if (stars >= 4) return 'すごい！きみのリズム、キラキラしてたよ〜！✨';
  if (missRate > 0.4) return 'いっしょに音楽きけてうれしかった〜。またゆっくりやろうね🎵';
  return 'いいかんじ！つぎはもっと息が合いそうだね〜🎶';
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface Props {
  onResult: (result: PlayResult) => void; // 結果確定時 (報酬付与用) に一度だけ呼ばれる
  onClose: () => void;
  rewardLabel?: string | null;
  onPlayingChange?: (playing: boolean) => void;
}

export function RhythmGameFlow({ onResult, onClose, rewardLabel, onPlayingChange }: Props) {
  const [step, setStep] = useState<Step>('song');
  const [song, setSong] = useState<Song | null>(null);
  const [mode, setMode] = useState<RhythmMode>('tap');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [result, setResult] = useState<PlayResult | null>(null);
  const { progress } = useApp();
  const router = useRouter();
  const mascotStage = getMascotStage(progress.level);
  const preview = useSongClock();
  const previewIdRef = useRef<string | null>(null);

  useEffect(() => { onPlayingChange?.(step === 'playing'); }, [step]);

  /* 曲選択画面以外では試聴を必ず停止 (戻る/閉じる経路も含めて音が残らないように) */
  useEffect(() => {
    if (step !== 'song') stopPreview();
  }, [step]);

  /* 曲カードタップ → 選択 + プレビュー再生 (サビ付近から小さめ音量) */
  const selectSong = useCallback(async (s: Song) => {
    setSong(s);
    if (previewIdRef.current === s.id) return;
    previewIdRef.current = s.id;
    await preview.load(s.audio, { volume: 0.45, positionMillis: Math.floor(s.duration * 0.35 * 1000) });
    if (previewIdRef.current === s.id) await preview.play();
  }, [preview]);

  const stopPreview = useCallback(() => {
    previewIdRef.current = null;
    preview.unload();
  }, [preview]);

  useEffect(() => () => { stopPreview(); }, []);

  const chart = useMemo(
    () => (song ? getChart(song.id, mode, difficulty) : null),
    [song, mode, difficulty],
  );

  const handleFinish = useCallback((r: PlayResult) => {
    setResult(r);
    setStep('result');
    onResult(r);
  }, [onResult]);

  /* ── 曲選択 ── */
  if (step === 'song') {
    return (
      <ScrollView contentContainerStyle={st.body}>
        <Text style={st.stepTitle}>きょくをえらぼう</Text>
        {SONGS.map(s => (
          <TouchableOpacity key={s.id} activeOpacity={0.85} onPress={() => selectSong(s)}>
            <LinearGradient
              colors={s.gradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[st.songCard, song?.id === s.id && st.songCardSel]}
            >
              <Text style={st.songEmoji}>{s.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={st.songTitle}>{s.title}</Text>
                <Text style={st.songMeta}>{s.mood}・{fmtTime(s.duration)}・♩={Math.round(s.bpm)}</Text>
              </View>
              {song?.id === s.id && <Text style={st.songPlaying}>♪ 試聴中</Text>}
            </LinearGradient>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[st.primaryBtn, !song && st.btnDisabled]}
          disabled={!song}
          onPress={() => { stopPreview(); setStep('mode'); }}
          activeOpacity={0.85}
        >
          <Text style={st.primaryTxt}>つぎへ</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  /* ── モード選択 ── */
  if (step === 'mode') {
    return (
      <ScrollView contentContainerStyle={st.body}>
        <Text style={st.stepTitle}>あそびかたをえらぼう</Text>
        {MODES.map(m => (
          <TouchableOpacity
            key={m.id}
            style={[st.modeCard, mode === m.id && m.ready && st.modeCardSel, !m.ready && st.modeCardLocked]}
            disabled={!m.ready}
            onPress={() => setMode(m.id)}
            activeOpacity={0.85}
          >
            <Text style={st.modeEmoji}>{m.ready ? m.emoji : '🔒'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[st.modeTitle, !m.ready && st.txtDim]}>{m.title}</Text>
              <Text style={[st.modeDesc, !m.ready && st.txtDim]}>{m.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}
        <View style={st.navRow}>
          <TouchableOpacity style={st.backBtn} onPress={() => setStep('song')}>
            <Text style={st.backTxt}>もどる</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.primaryBtn} onPress={() => setStep('difficulty')} activeOpacity={0.85}>
            <Text style={st.primaryTxt}>つぎへ</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  /* ── 難易度選択 ── */
  if (step === 'difficulty') {
    return (
      <ScrollView contentContainerStyle={st.body}>
        <Text style={st.stepTitle}>むずかしさをえらぼう</Text>
        <Text style={st.subTitle}>{song?.emoji} {song?.title} / {MODES.find(m => m.id === mode)?.title}</Text>
        {DIFFS.map(d => {
          const c = song ? getChart(song.id, mode, d.id) : null;
          return (
            <TouchableOpacity
              key={d.id}
              style={[st.diffCard, { borderColor: d.color }, difficulty === d.id && { backgroundColor: d.color + '30' }]}
              onPress={() => setDifficulty(d.id)}
              activeOpacity={0.85}
            >
              <Text style={[st.diffLabel, { color: d.color }]}>{d.label}</Text>
              <Text style={st.diffDesc}>{d.desc}{c ? `・${c.notes.length}ノーツ` : ''}</Text>
            </TouchableOpacity>
          );
        })}
        {rewardLabel ? <Text style={st.rewardHint}>{rewardLabel}</Text> : null}
        <View style={st.navRow}>
          <TouchableOpacity style={st.backBtn} onPress={() => setStep('mode')}>
            <Text style={st.backTxt}>もどる</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.primaryBtn} onPress={() => setStep('playing')} activeOpacity={0.85}>
            <Text style={st.primaryTxt}>START！</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  /* ── プレイ中 ── */
  if (step === 'playing' && song && chart) {
    const gameProps = { song, chart, onFinish: handleFinish, onQuit: () => setStep('difficulty') };
    if (mode === 'jump') return <RhythmJumpGame {...gameProps} />;
    if (mode === 'swipe') return <RhythmSwipeGame {...gameProps} />;
    if (mode === 'copy') {
      return (
        <RhythmCopyGame
          song={song}
          difficulty={difficulty}
          onFinish={handleFinish}
          onQuit={() => setStep('difficulty')}
        />
      );
    }
    if (mode === 'relax') return <RelaxRhythmGame {...gameProps} />;
    return <TapBeatGame {...gameProps} />;
  }

  /* ── 結果 ── */
  if (step === 'result' && result) {
    const stars = starRating(result);
    const isRelax = mode === 'relax';
    return (
      <ScrollView contentContainerStyle={st.body}>
        {isRelax ? (
          <>
            <Text style={st.resultScoreLabel}>おつかれさま</Text>
            <Text style={st.relaxDone}>こころが ととのった 🌊</Text>
          </>
        ) : (
          <>
            <Text style={st.resultScoreLabel}>SCORE</Text>
            <Text style={st.resultScore}>{result.score}</Text>
            <View style={st.judgeGrid}>
              <Text style={[st.judgeCell, { color: '#FFD75E' }]}>PERFECT {result.perfect}</Text>
              <Text style={[st.judgeCell, { color: '#5EE0B8' }]}>GREAT {result.great}</Text>
              <Text style={[st.judgeCell, { color: '#5EB8FF' }]}>GOOD {result.good}</Text>
              <Text style={[st.judgeCell, { color: '#8A83B8' }]}>MISS {result.miss}</Text>
            </View>
            <Text style={st.resultMeta}>MAX COMBO {result.maxCombo}・プレイ時間 {fmtTime(result.playTime)}</Text>
          </>
        )}
        <Text style={st.starsLabel}>今日のリズム</Text>
        <Text style={st.stars}>{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</Text>
        <Text style={st.refreshTag}>🍃 今日のリフレッシュ +1</Text>
        {(() => {
          const g = gainForPlay(stars);
          return (
            <View style={st.energyRow}>
              <View style={[st.energyChip, { backgroundColor: 'rgba(255,183,94,0.14)' }]}>
                <Text style={[st.energyChipTxt, { color: '#FFC97E' }]}>💪 元気 +{g.genki}</Text>
              </View>
              <View style={[st.energyChip, { backgroundColor: 'rgba(255,215,94,0.14)' }]}>
                <Text style={[st.energyChipTxt, { color: '#FFE29E' }]}>✨ 光の力 +{g.light}</Text>
              </View>
              <View style={[st.energyChip, { backgroundColor: 'rgba(94,224,184,0.14)' }]}>
                <Text style={[st.energyChipTxt, { color: '#8EEFD0' }]}>⚡ 発電エネルギー +{g.energy}</Text>
              </View>
            </View>
          );
        })()}
        <View style={st.resultMascotRow}>
          <Mascot stage={mascotStage} mood={stars >= 4 ? 'excited' : 'happy'} size={64} />
          <View style={[st.commentBubble, { flex: 1, marginTop: 0 }]}>
            <Text style={st.commentTxt}>{characterComment(result, mode)}</Text>
          </View>
        </View>
        {/* 循環の導線: 生まれた光 → 発電所へ */}
        <TouchableOpacity
          style={st.plantBtn}
          onPress={() => { onClose(); router.push('/(tabs)/plant'); }}
          activeOpacity={0.85}
        >
          <Text style={st.plantBtnTxt}>⚡ 生まれた光を発電所で見る</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.primaryBtn} onPress={onClose} activeOpacity={0.85}>
          <Text style={st.primaryTxt}>とじる</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return null;
}

const st = StyleSheet.create({
  body: { padding: 20, gap: 10, alignItems: 'stretch' },
  stepTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.95)', textAlign: 'center', marginBottom: 4 },
  subTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginBottom: 2 },

  songCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 18, padding: 16,
  },
  songCardSel: { borderWidth: 2.5, borderColor: '#FFFFFF' },
  songEmoji: { fontSize: 30 },
  songTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#FFF' },
  songMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  songPlaying: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#FFF' },

  modeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 2, borderColor: 'transparent',
  },
  modeCardSel: { borderColor: '#FFD75E', backgroundColor: 'rgba(255,215,94,0.12)' },
  modeCardLocked: { opacity: 0.55 },
  modeEmoji: { fontSize: 24 },
  modeTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.95)' },
  modeDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  txtDim: { color: 'rgba(255,255,255,0.45)' },

  diffCard: {
    borderRadius: 16, padding: 14, borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  diffLabel: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  diffDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  rewardHint: { fontSize: 12, color: 'rgba(255,255,255,0.55)', textAlign: 'center', fontFamily: 'Inter_400Regular' },

  navRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  backBtn: {
    paddingHorizontal: 22, paddingVertical: 15, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  backTxt: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.75)' },
  primaryBtn: {
    flex: 1, paddingVertical: 15, borderRadius: 18, marginTop: 6,
    backgroundColor: '#7C5CFF', alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  primaryTxt: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#FFF' },

  resultScoreLabel: { fontSize: 13, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  resultScore: { fontSize: 44, fontFamily: 'Inter_700Bold', color: '#FFF', textAlign: 'center' },
  judgeGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10,
    marginTop: 4,
  },
  judgeCell: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  resultMeta: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 2 },
  starsLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 8 },
  stars: { fontSize: 30, color: '#FFD75E', textAlign: 'center', letterSpacing: 4 },
  relaxDone: { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#B8F5E4', textAlign: 'center', marginTop: 4 },
  refreshTag: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#9BE8B8', textAlign: 'center', marginTop: 6 },
  energyRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 },
  energyChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 },
  energyChipTxt: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  plantBtn: {
    paddingVertical: 13, borderRadius: 18, marginTop: 8,
    backgroundColor: 'rgba(255,201,77,0.16)', borderWidth: 1, borderColor: 'rgba(255,201,77,0.5)',
    alignItems: 'center',
  },
  plantBtnTxt: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#FFD86B' },
  resultMascotRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  commentBubble: {
    backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 18, padding: 14, marginTop: 6,
  },
  commentTxt: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.92)', textAlign: 'center', lineHeight: 21 },
});
