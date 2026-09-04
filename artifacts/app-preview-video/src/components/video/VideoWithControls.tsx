import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Pause, Play, Repeat, Volume2, VolumeX } from 'lucide-react';
import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';
import { useSceneControls } from './useSceneControls';

const SCENE_DETAILS: Record<string, { title: string; filePath: string }> = {
  scene1: { title: 'はじまり', filePath: 'src/components/video/video_scenes/Scene1.tsx' },
  scene2: { title: '気分記録', filePath: 'src/components/video/video_scenes/Scene2.tsx' },
  scene3: { title: 'AIチャット', filePath: 'src/components/video/video_scenes/Scene3.tsx' },
  scene4: { title: '成長とゲーム', filePath: 'src/components/video/video_scenes/Scene4.tsx' },
  scene5: { title: 'エンディング', filePath: 'src/components/video/video_scenes/Scene5.tsx' },
};

function formatTime(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function PlaybackStatus({
  sceneKeys, activeIndex, activeDuration, activeStartTime, totalDuration,
  tick, paused, onJumpTo,
}: {
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  activeStartTime: number;
  totalDuration: number;
  tick: number;
  paused: boolean;
  onJumpTo: (index: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const elapsedBaseRef = useRef(0);

  useEffect(() => {
    setElapsed(0);
    elapsedBaseRef.current = 0;
  }, [tick]);

  useEffect(() => {
    if (paused) return;
    const start = performance.now();
    const id = window.setInterval(() => {
      setElapsed(elapsedBaseRef.current + performance.now() - start);
    }, 60);
    return () => {
      window.clearInterval(id);
      elapsedBaseRef.current += performance.now() - start;
    };
  }, [tick, paused]);

  const progress = activeDuration > 0 ? Math.min(1, elapsed / activeDuration) : 0;
  const totalElapsed = Math.min(totalDuration, activeStartTime + Math.min(elapsed, activeDuration));

  return (
    <>
      <div className="flex-1 flex items-center gap-1.5">
        {sceneKeys.map((key, index) => (
          <button
            key={key}
            onClick={() => onJumpTo(index)}
            className="flex-1 h-3 bg-white/20 rounded-full overflow-hidden relative"
            aria-label={`シーン${index + 1}へ移動`}
          >
            <span
              className="absolute inset-y-0 left-0 bg-white/90 rounded-full"
              style={{ width: index === activeIndex ? `${progress * 100}%` : '0%' }}
            />
          </button>
        ))}
      </div>
      <span className="text-sm text-white/70 tabular-nums">{activeIndex + 1}/{sceneKeys.length}</span>
      <span className="text-sm text-white/80 tabular-nums min-w-[7rem] text-right">
        {formatTime(totalElapsed)} / {formatTime(totalDuration)}
      </span>
    </>
  );
}

export default function VideoWithControls() {
  const isIframed = typeof window !== 'undefined' && window.self !== window.top;
  const controls = useSceneControls(SCENE_DURATIONS);
  const [muted, setMuted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const sensorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!controls.paused) return;
    const frozen = document.getAnimations().filter((animation) => animation.playState === 'running');
    frozen.forEach((animation) => animation.pause());
    return () => frozen.forEach((animation) => animation.play());
  }, [controls.paused]);

  const handleJump = useCallback((index: number) => {
    controls.jumpTo(index);
    const key = controls.sceneKeys[index];
    const detail = SCENE_DETAILS[key];
    if (detail) {
      window.parent.postMessage({
        type: 'REPLIT_VIDEO_SCENE_SELECTED',
        payload: {
          sceneIndex: index,
          sceneCount: controls.sceneKeys.length,
          sceneTitle: detail.title,
          filePath: detail.filePath,
          lineNumber: 1,
        },
      }, '*');
    }
  }, [controls]);

  if (!isIframed) return <VideoTemplate />;

  const visible = !collapsed || hovering;
  return (
    <div className="relative w-full h-screen">
      <VideoTemplate
        key={controls.mountKey}
        durations={controls.durations}
        loop
        paused={controls.paused}
        muted={muted}
        onSceneChange={controls.onSceneChange}
      />
      <div
        ref={sensorRef}
        className="absolute bottom-0 left-0 right-0 z-50 flex flex-col justify-end"
        style={{ height: '25%' }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div className="flex-1" />
        <div className={`flex items-center gap-3 bg-black/55 backdrop-blur-md px-4 py-3 transition-all ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}>
          <button className="text-white/80 p-2" onClick={controls.togglePause} aria-label={controls.paused ? '再生' : '一時停止'}>
            {controls.paused ? <Play size={24} /> : <Pause size={24} />}
          </button>
          <button className={`p-2 ${controls.locked ? 'text-white' : 'text-white/60'}`} onClick={controls.toggleLock} aria-label="シーンを繰り返す">
            <Repeat size={24} />
          </button>
          <button className="text-white/70 p-2" onClick={() => setMuted((value) => !value)} aria-label={muted ? '音を出す' : 'ミュート'}>
            {muted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
          <div className="w-px self-stretch bg-white/20" />
          <PlaybackStatus
            sceneKeys={controls.sceneKeys}
            activeIndex={controls.activeIndex}
            activeDuration={controls.activeDuration}
            activeStartTime={controls.activeStartTime}
            totalDuration={controls.totalDuration}
            tick={controls.tick}
            paused={controls.paused}
            onJumpTo={handleJump}
          />
          <button className="text-white/70 p-2" onClick={() => setCollapsed((value) => !value)} aria-label="操作バーを開閉">
            {collapsed ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
          </button>
        </div>
      </div>
    </div>
  );
}