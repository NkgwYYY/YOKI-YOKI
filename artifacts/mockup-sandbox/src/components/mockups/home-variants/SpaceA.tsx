import React, { useMemo } from 'react';

export function SpaceA() {
  const stars = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.5,
      delay: Math.random() * 3
    }));
  }, []);

  return (
    <div className="w-[390px] h-[844px] relative overflow-hidden bg-gradient-to-b from-[#030712] via-[#0A0F2E] to-[#0D1B4B] font-sans flex flex-col text-white mx-auto">
      {/* Background Stars */}
      <div className="absolute inset-0 pointer-events-none">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute bg-white rounded-full animate-pulse"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animationDelay: `${star.delay}s`,
              animationDuration: '3s'
            }}
          />
        ))}
        {/* Deep space glow */}
        <div className="absolute top-1/4 left-0 w-64 h-64 bg-purple-600/15 rounded-full blur-[90px] pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-1/3 right-0 w-72 h-72 bg-blue-600/10 rounded-full blur-[90px] pointer-events-none mix-blend-screen" />
      </div>

      {/* Header */}
      <div className="relative z-10 px-6 pt-14 pb-4 flex justify-between items-start">
        <div>
          <p className="text-[#8B9DC3] text-[13px] font-medium tracking-wide mb-1">おはよう</p>
          <h1 className="text-white text-[28px] font-black tracking-widest drop-shadow-md leading-none mb-1">YOKI YOKI</h1>
          <p className="text-[#8B9DC3] text-[11px] font-medium tracking-wide">8月10日（日）</p>
        </div>
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-[#F59E0B] to-[#EF4444] rounded-full w-[64px] h-[64px] shadow-[0_0_20px_rgba(245,158,11,0.5)] border-[1.5px] border-white/30 flex-shrink-0">
          <div className="flex items-center justify-center gap-0.5 text-sm -mb-0.5">
            <span>🔥</span>
            <span className="text-[10px]">⭐</span>
          </div>
          <div className="text-white font-black text-xl leading-none">3</div>
          <div className="text-white/90 text-[8px] font-bold tracking-wider mt-0.5">連続記録</div>
        </div>
      </div>

      {/* Mascot Card */}
      <div className="relative z-10 mx-5 mt-2 flex-1 flex flex-col justify-center">
        <div className="w-full relative bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-[32px] p-6 shadow-2xl overflow-hidden flex flex-col items-center">
          
          {/* Inner glow effect */}
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.15)_0%,transparent_50%)] pointer-events-none mix-blend-screen"></div>

          <div className="flex justify-between items-center w-full mb-6 relative z-10">
            <div className="px-3 py-1 rounded-full border border-purple-400/30 text-purple-300 text-[11px] font-bold bg-purple-900/30 backdrop-blur-md shadow-[0_0_10px_rgba(124,58,237,0.2)] tracking-wide">
              たまご期
            </div>
            <div className="px-3 py-1 rounded-full border border-purple-400/30 text-purple-300 text-[11px] font-bold bg-purple-900/30 backdrop-blur-md shadow-[0_0_10px_rgba(124,58,237,0.2)] tracking-wide">
              Lv.1
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-center w-full flex-1 justify-center">
            {/* Speech bubble */}
            <div className="bg-[#0F1729] border border-indigo-500/30 text-indigo-100 px-5 py-3 rounded-2xl rounded-br-sm text-[13px] font-medium shadow-lg mb-6 max-w-[90%] text-center leading-relaxed">
              さみしかった…<br />会いに来てくれてよかった
            </div>

            {/* Mascot */}
            <div className="relative mb-8 mt-2">
              {/* Glow behind mascot */}
              <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-125"></div>
              <img src="/__mockup/images/mascot.png" alt="よっきー" className="w-44 h-44 object-contain animate-[bounce_4s_ease-in-out_infinite] relative z-10" />
            </div>

            {/* Name badge */}
            <div className="bg-[#030712]/70 border border-indigo-500/40 backdrop-blur-md px-6 py-3.5 rounded-[20px] flex flex-col items-center shadow-[0_0_20px_rgba(99,102,241,0.2)] w-full">
              <h2 className="text-white text-lg font-bold flex items-center gap-2 mb-1 tracking-wide">
                よっきー <span className="text-sm">✏️</span>
              </h2>
              <p className="text-[#8B9DC3] text-[11px] tracking-wide font-medium">すこしずつ育っています</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="relative z-10 bg-[#030712]/95 backdrop-blur-xl border-t border-white/10 px-6 pt-4 pb-8 mt-6 flex justify-between items-center">
        {/* Tab: Home (Active) */}
        <div className="flex flex-col items-center gap-1 text-[#7C3AED] relative">
          <div className="absolute -top-4 w-1 h-1 bg-[#7C3AED] rounded-full shadow-[0_0_8px_#7C3AED]" />
          <svg className="w-[22px] h-[22px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L4 9v12h5v-7h6v7h5V9l-8-6z"/></svg>
          <span className="text-[9px] font-bold tracking-wider">ホーム</span>
        </div>
        {/* Tab: Check */}
        <div className="flex flex-col items-center gap-1 text-[#8B9DC3] hover:text-[#3B82F6] transition-colors">
          <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
          <span className="text-[9px] font-bold tracking-wider">チェック</span>
        </div>
        {/* Tab: Chat */}
        <div className="flex flex-col items-center gap-1 text-[#8B9DC3] hover:text-[#3B82F6] transition-colors">
          <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
          <span className="text-[9px] font-bold tracking-wider">チャット</span>
        </div>
        {/* Tab: Memo */}
        <div className="flex flex-col items-center gap-1 text-[#8B9DC3] hover:text-[#3B82F6] transition-colors">
          <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          <span className="text-[9px] font-bold tracking-wider">メモ</span>
        </div>
        {/* Tab: Graph */}
        <div className="flex flex-col items-center gap-1 text-[#8B9DC3] hover:text-[#3B82F6] transition-colors">
          <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          <span className="text-[9px] font-bold tracking-wider">グラフ</span>
        </div>
      </div>
    </div>
  );
}
