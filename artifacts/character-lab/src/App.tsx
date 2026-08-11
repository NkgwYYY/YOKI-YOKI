import { useEffect, useMemo, useRef, useState } from 'react';
import { CharacterRig, Emotion } from '@/lib/character';
import { CHARACTERS, CharacterId } from '@/lib/character-config';
import {
  ChevronLeft, ChevronRight, MessageCircle, ArrowUpCircle, Zap,
  Sparkles, Eye, Footprints, SlidersHorizontal, X,
} from 'lucide-react';

/* ── キャラごとの背景テーマ(キャラ自身の色は一切変更しない) ── */
const THEMES: Record<CharacterId, { sky: string; glow: string; accent: string }> = {
  egg:            { sky: 'linear-gradient(180deg,#fdf6e3 0%,#fceecb 40%,#f9e0c8 75%,#f6d4c4 100%)', glow: 'rgba(255,225,160,0.55)', accent: '#c99a3f' },
  odango:         { sky: 'linear-gradient(180deg,#e6dcf7 0%,#e9d5f0 40%,#f3cfe0 75%,#f8d3cf 100%)', glow: 'rgba(220,190,255,0.55)', accent: '#8b6bc9' },
  happa:          { sky: 'linear-gradient(180deg,#e2f4e4 0%,#d7f0dd 40%,#d1ead9 75%,#e8f2d9 100%)', glow: 'rgba(180,235,190,0.55)', accent: '#4d9a63' },
  colorful_happa: { sky: 'linear-gradient(180deg,#e3ecfb 0%,#ecdff5 40%,#fbe3e9 75%,#fdf0da 100%)', glow: 'rgba(255,210,230,0.55)', accent: '#b06bb3' },
};

/* ── 今日の一言(感情×時間帯で変化。毎回ランダムに選ぶ) ── */
const MESSAGES: Record<string, string[]> = {
  morning: ['おはよう!今日も会いに来てくれたんだね', 'あさだよ〜、いっしょにがんばろう!', 'おはよう!きょうは何する?'],
  day:     ['今日も一緒にがんばろうね!', 'きみが来ると、うれしいな', 'なでてくれてもいいんだよ?', 'ちょっとジャンプしてみようかな'],
  night:   ['今日もおつかれさま', 'ちょっと眠い……', '夜だね。ゆっくりしよう', '今日はどんな一日だった?'],
  happy:   ['えへへ、うれしい!', 'やったー!', 'きみのおかげで元気いっぱい!'],
  angry:   ['ぷんぷん!……なんてね', 'むむむ……'],
  sad:     ['ちょっとしょんぼり……', 'ぎゅってして……'],
  fun:     ['たのしいね〜!', 'もっとあそぼ!'],
  surprised: ['わわっ!びっくりした!', 'えっ、なになに?'],
};

function pickMessage(emotion: Emotion): string {
  let pool: string[];
  if (emotion !== 'normal' && MESSAGES[emotion]) {
    pool = MESSAGES[emotion];
  } else {
    const h = new Date().getHours();
    pool = h < 10 ? MESSAGES.morning : h < 18 ? MESSAGES.day : MESSAGES.night;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ── 星パーティクル(固定シードで生成、ゆっくり瞬く) ── */
const STARS = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37 + 13) % 100,
  top: (i * 53 + 7) % 88,
  size: 2 + (i % 3),
  delay: (i * 0.7) % 6,
  dur: 4 + (i % 5),
}));

const EMOTIONS: { id: Emotion; label: string; emoji: string }[] = [
  { id: 'normal', label: '通常', emoji: '😌' },
  { id: 'happy', label: '喜', emoji: '😊' },
  { id: 'angry', label: '怒', emoji: '😠' },
  { id: 'sad', label: '哀', emoji: '🥺' },
  { id: 'fun', label: '楽', emoji: '🥳' },
  { id: 'surprised', label: '驚', emoji: '😮' },
];

export default function App() {
  const [characterId, setCharacterId] = useState<CharacterId>('egg');
  const [emotion, setEmotion] = useState<Emotion>('normal');
  const [breathing, setBreathing] = useState(true);
  const [followPointer, setFollowPointer] = useState(true);
  const [labOpen, setLabOpen] = useState(false);
  const [message, setMessage] = useState(() => pickMessage('normal'));
  const followRef = useRef(true);
  followRef.current = followPointer;
  const gazeRef = useRef<{ nx: number; ny: number }>({ nx: 0, ny: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const rigRef = useRef<CharacterRig | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const characterConfig = CHARACTERS.find(c => c.id === characterId)!;
  const currentIndex = CHARACTERS.findIndex(c => c.id === characterId);
  const theme = THEMES[characterId];

  const dateLabel = useMemo(() => {
    const d = new Date();
    const w = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
    return `${d.getMonth() + 1}月${d.getDate()}日(${w})`;
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    if (rigRef.current) rigRef.current.destroy();
    rigRef.current = new CharacterRig(svgRef.current, characterConfig);
    rigRef.current.setEmotion(emotion);
    rigRef.current.setBreathing(breathing);
    if (!followRef.current) rigRef.current.lookAt(gazeRef.current.nx, gazeRef.current.ny);
    return () => {
      rigRef.current?.destroy();
      rigRef.current = null;
    };
  }, [characterId]);

  useEffect(() => { rigRef.current?.setEmotion(emotion); }, [emotion]);
  useEffect(() => { rigRef.current?.setBreathing(breathing); }, [breathing]);

  /* 一言メッセージ: 感情変更時に即更新、あとは12秒ごとにローテーション */
  useEffect(() => {
    setMessage(pickMessage(emotion));
    const t = setInterval(() => setMessage(pickMessage(emotion)), 12000);
    return () => clearInterval(t);
  }, [emotion, characterId]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!followRef.current || !rigRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      rigRef.current.lookAt(nx, ny);
    };
    const handlePointerLeave = () => {
      if (followRef.current && rigRef.current) rigRef.current.lookAt(0, 0);
    };
    window.addEventListener('pointermove', handlePointerMove);
    document.body.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.body.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  const switchCharacter = (dir: 1 | -1) => {
    const idx = (currentIndex + dir + CHARACTERS.length) % CHARACTERS.length;
    setCharacterId(CHARACTERS[idx].id);
    setEmotion('normal');
  };

  const act = (action: 'blink' | 'jump' | 'shake' | 'talk' | 'wink' | 'walk' | 'land' | 'bounce') => {
    rigRef.current?.[action]();
  };

  const handleGaze = (nx: number, ny: number) => {
    setFollowPointer(false);
    gazeRef.current = { nx, ny };
    rigRef.current?.lookAt(nx, ny);
  };

  /* 円形メニュー(キャラを中心に楕円軌道で配置) */
  const orbitButtons = [
    { key: 'talk',   label: '話しかける', sub: 'おしゃべり', icon: <MessageCircle className="w-6 h-6" />, pos: 'left-[2%] top-[6%]',    on: () => { act('talk'); setMessage(pickMessage(emotion)); } },
    { key: 'jump',   label: 'ジャンプ',   sub: '元気にぴょん', icon: <ArrowUpCircle className="w-6 h-6" />, pos: 'right-[2%] top-[6%]',   on: () => act('jump') },
    { key: 'pet',    label: 'なでる',     sub: '元気をあげる', icon: <Sparkles className="w-6 h-6" />,      pos: 'left-0 top-[46%]',  on: () => { act('wink'); act('bounce'); } },
    { key: 'shake',  label: 'ブルブル',   sub: '気分転換',     icon: <Zap className="w-6 h-6" />,           pos: 'right-0 top-[46%]', on: () => act('shake') },
    { key: 'walk',   label: '歩く',       sub: 'おさんぽ',     icon: <Footprints className="w-6 h-6" />,    pos: 'left-[6%] bottom-[-4%]', on: () => act('walk') },
    { key: 'bounce', label: 'バウンド',   sub: 'ぷるんぷるん', icon: <ArrowUpCircle className="w-6 h-6 rotate-180" />, pos: 'right-[6%] bottom-[-4%]', on: () => act('bounce') },
  ];

  return (
    <div
      ref={containerRef}
      className="min-h-[100dvh] w-full relative overflow-hidden transition-[background] duration-1000"
      style={{ background: theme.sky }}
    >
      {/* ── ゆっくり動く背景(光のブロブ+星) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="orbit-blob" style={{ background: theme.glow, width: '55vmin', height: '55vmin', left: '-10%', top: '5%' }} />
        <div className="orbit-blob orbit-blob-2" style={{ background: 'rgba(255,255,255,0.5)', width: '45vmin', height: '45vmin', right: '-8%', top: '30%' }} />
        {STARS.map((s, i) => (
          <div
            key={i}
            className="star-dot"
            style={{
              left: `${s.left}%`, top: `${s.top}%`,
              width: s.size, height: s.size,
              animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto min-h-[100dvh] flex flex-col px-4 pt-5 pb-6">

        {/* ── 上部UI ── */}
        <header className="flex items-start justify-between">
          <div>
            <h1 className="font-display font-bold text-3xl tracking-wide drop-shadow-sm" style={{ color: theme.accent }}>
              CHARACTER LAB
            </h1>
            <p className="text-sm font-bold text-foreground/60 mt-1">{dateLabel}</p>
          </div>
          <button
            onClick={() => setLabOpen(true)}
            className="glass-chip flex items-center gap-1.5 px-4 py-2 rounded-full lab-button text-sm font-bold text-foreground/70"
          >
            <SlidersHorizontal className="w-4 h-4" />
            ラボ
          </button>
        </header>

        {/* キャラクター名+切り替え */}
        <div className="flex items-center justify-center gap-3 mt-3">
          <button onClick={() => switchCharacter(-1)} className="glass-chip w-9 h-9 rounded-full flex items-center justify-center lab-button" aria-label="前のキャラクター">
            <ChevronLeft className="w-5 h-5 text-foreground/60" />
          </button>
          <div className="glass-chip px-6 py-1.5 rounded-full">
            <span className="font-display font-bold text-lg" style={{ color: theme.accent }}>{characterConfig.name}</span>
          </div>
          <button onClick={() => switchCharacter(1)} className="glass-chip w-9 h-9 rounded-full flex items-center justify-center lab-button" aria-label="次のキャラクター">
            <ChevronRight className="w-5 h-5 text-foreground/60" />
          </button>
        </div>

        {/* ── 一言吹き出し ── */}
        <div className="flex justify-center mt-4 z-20">
          <div key={message} className="speech-pop glass-card px-5 py-2.5 rounded-3xl relative">
            <p className="text-sm font-bold text-foreground/80">{message}</p>
            <div className="speech-tail" />
          </div>
        </div>

        {/* ── 中央ステージ+円形メニュー ── */}
        <main className="relative flex-1 min-h-[380px] flex items-center justify-center">
          {/* 足元の光 */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[6%] w-[60%] h-16 rounded-full blur-xl opacity-70 pointer-events-none" style={{ background: theme.glow }} />

          <svg
            ref={svgRef}
            className="w-[56vw] max-w-[280px] h-full max-h-[380px] drop-shadow-xl select-none touch-none z-10"
            style={{ overflow: 'visible' }}
          />

          {orbitButtons.map(b => (
            <button
              key={b.key}
              onClick={b.on}
              className={`orbit-btn absolute ${b.pos} lab-button z-20`}
            >
              <span style={{ color: theme.accent }}>{b.icon}</span>
              <span className="font-display font-bold text-[11px] text-foreground/80 leading-tight">{b.label}</span>
              <span className="text-[9px] text-foreground/50 leading-tight">{b.sub}</span>
            </button>
          ))}
        </main>

        {/* ── きぶんセレクター ── */}
        <div className="glass-card rounded-3xl px-4 py-3 mt-2">
          <p className="text-[10px] font-bold text-foreground/50 tracking-widest mb-2 ml-1">きぶん</p>
          <div className="flex justify-between gap-1">
            {EMOTIONS.map(e => (
              <button
                key={e.id}
                onClick={() => setEmotion(e.id)}
                className={`flex flex-col items-center gap-0.5 flex-1 py-2 rounded-2xl lab-button transition-colors ${emotion === e.id ? 'bg-white/70 shadow-sm' : 'hover:bg-white/40'}`}
              >
                <span className="text-xl leading-none">{e.emoji}</span>
                <span className="text-[10px] font-bold text-foreground/60">{e.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── ラボパネル(詳細コントロール) ── */}
      {labOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setLabOpen(false)}>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
          <div
            className="relative w-full max-w-md bg-white/90 backdrop-blur-md rounded-t-3xl p-6 pb-8 lab-shadow panel-pop"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg text-foreground/80">ラボ設定</h2>
              <button onClick={() => setLabOpen(false)} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center lab-button" aria-label="閉じる">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-5">
              {[
                { label: '瞬き', icon: <Sparkles className="w-5 h-5" />, on: () => act('blink') },
                { label: 'ウィンク', icon: <Eye className="w-5 h-5" />, on: () => act('wink') },
                { label: '着地', icon: <ArrowUpCircle className="w-5 h-5 rotate-180" />, on: () => act('land') },
                { label: '喋る', icon: <MessageCircle className="w-5 h-5" />, on: () => act('talk') },
              ].map(a => (
                <button key={a.label} onClick={a.on} className="flex flex-col items-center gap-1 py-3 bg-white border-2 border-slate-100 rounded-2xl hover:border-primary/30 text-slate-600 lab-button">
                  {a.icon}
                  <span className="font-display font-bold text-[10px]">{a.label}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-6 items-start">
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground ml-1">目線 (GAZE)</p>
                <div className="grid grid-cols-3 gap-1.5 w-fit">
                  {[
                    { nx: -1, ny: -1, label: '↖' }, { nx: 0, ny: -1, label: '↑' }, { nx: 1, ny: -1, label: '↗' },
                    { nx: -1, ny: 0, label: '←' }, { nx: 0, ny: 0, label: '●' }, { nx: 1, ny: 0, label: '→' },
                    { nx: -1, ny: 1, label: '↙' }, { nx: 0, ny: 1, label: '↓' }, { nx: 1, ny: 1, label: '↘' },
                  ].map(g => (
                    <button
                      key={g.label}
                      onClick={() => handleGaze(g.nx, g.ny)}
                      className="w-10 h-10 flex items-center justify-center bg-white border-2 border-slate-100 rounded-xl hover:border-primary/30 text-slate-600 font-bold lab-button"
                      aria-label={`目線 ${g.label}`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 flex-1">
                <p className="text-xs font-bold text-muted-foreground ml-1">リアルタイム</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setBreathing(b => !b)}
                    className={`py-3 px-4 rounded-xl font-display font-bold text-sm lab-button border-2 ${breathing ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-slate-100 text-slate-400'}`}
                  >
                    呼吸 {breathing ? 'ON' : 'OFF'}
                  </button>
                  <button
                    onClick={() => setFollowPointer(f => { if (!f) rigRef.current?.lookAt(0, 0); return !f; })}
                    className={`py-3 px-4 rounded-xl font-display font-bold text-sm lab-button border-2 ${followPointer ? 'bg-sky-100 border-sky-200 text-sky-700' : 'bg-white border-slate-100 text-slate-400'}`}
                  >
                    マウス追従 {followPointer ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
