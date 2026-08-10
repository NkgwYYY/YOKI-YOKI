import React, { useMemo } from "react";
import { Home, CheckCircle2, MessageCircle, PenLine, BarChart2, Pencil } from "lucide-react";

export function CosmicB() {
  // Generate random stars
  const stars = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.8 + 0.2,
      isSparkle: Math.random() > 0.8,
      color: Math.random() > 0.5 ? "bg-white" : "bg-yellow-200",
    }));
  }, []);

  return (
    <div className="w-[390px] min-h-[844px] h-[100dvh] relative overflow-hidden flex flex-col font-sans text-white" style={{ background: "linear-gradient(135deg, #2D1B69 0%, #4A1B6D 50%, #1B2A6D 100%)" }}>
      
      {/* Background Nebulas */}
      <div className="absolute top-[-10%] left-[-20%] w-[300px] h-[300px] bg-pink-500 rounded-full mix-blend-screen blur-[100px] opacity-30 pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-20%] w-[400px] h-[400px] bg-cyan-400 rounded-full mix-blend-screen blur-[100px] opacity-30 pointer-events-none" />
      <div className="absolute top-[40%] left-[30%] w-[250px] h-[250px] bg-purple-500 rounded-full mix-blend-screen blur-[100px] opacity-20 pointer-events-none" />

      {/* Stars */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute pointer-events-none flex items-center justify-center"
          style={{
            top: `${star.y}%`,
            left: `${star.x}%`,
            opacity: star.opacity,
          }}
        >
          {star.isSparkle ? (
            <span className="text-yellow-100 text-[10px] leading-none" style={{ transform: `scale(${star.size / 2})` }}>✦</span>
          ) : (
            <div
              className={`rounded-full ${star.color}`}
              style={{
                width: `${star.size}px`,
                height: `${star.size}px`,
                boxShadow: `0 0 ${star.size * 2}px ${star.color === 'bg-white' ? 'rgba(255,255,255,0.8)' : 'rgba(254,240,138,0.8)'}`,
              }}
            />
          )}
        </div>
      ))}

      {/* Planets */}
      {/* Planet 1: Large with ring */}
      <div className="absolute top-[20%] right-[-10%] w-[120px] h-[120px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle at 30% 30%, #f472b6, #831843)", boxShadow: "0 0 20px rgba(244,114,182,0.4)" }}>
        {/* Ring */}
        <div className="absolute top-1/2 left-1/2 w-[180px] h-[40px] border-4 border-t-pink-300 border-b-pink-500/50 rounded-[50%] -translate-x-1/2 -translate-y-1/2 -rotate-12 blur-[1px]" />
      </div>
      
      {/* Planet 2: Cyan medium */}
      <div className="absolute top-[12%] left-[10%] w-[40px] h-[40px] rounded-full pointer-events-none blur-[1px]" style={{ background: "radial-gradient(circle at 20% 20%, #22d3ee, #164e63)", boxShadow: "0 0 15px rgba(34,211,238,0.5)" }} />

      {/* Planet 3: Gold small */}
      <div className="absolute top-[45%] right-[15%] w-[25px] h-[25px] rounded-full pointer-events-none blur-[2px]" style={{ background: "radial-gradient(circle at 30% 30%, #fef08a, #ca8a04)", boxShadow: "0 0 10px rgba(254,240,138,0.6)" }} />

      {/* Planet 4: Deep pink/purple left */}
      <div className="absolute bottom-[35%] left-[-5%] w-[80px] h-[80px] rounded-full pointer-events-none blur-[2px]" style={{ background: "radial-gradient(circle at 40% 20%, #d946ef, #4a044e)", boxShadow: "0 0 20px rgba(217,70,239,0.3)" }} />

      {/* Planet 5: Cyan small bottom */}
      <div className="absolute bottom-[20%] right-[25%] w-[15px] h-[15px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle at 30% 30%, #67e8f9, #0891b2)", boxShadow: "0 0 8px rgba(103,232,249,0.8)" }} />

      {/* Content wrapper */}
      <div className="relative z-10 flex-1 flex flex-col pt-12 pb-24 px-6">
        
        {/* Header */}
        <div className="flex justify-between items-start w-full">
          <div>
            <h1 className="text-2xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-pink-300 via-purple-300 to-cyan-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">YOKI YOKI</h1>
            <p className="text-sm font-medium text-purple-100 mt-1 drop-shadow-md">8月10日（日）</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full flex flex-col items-center justify-center relative bg-black/20 backdrop-blur-md">
              <div className="absolute inset-0 rounded-full border-2 border-transparent" style={{ background: "linear-gradient(135deg, #fcd34d, #f472b6) border-box", WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }} />
              {/* Inner dashed ring decoration */}
              <div className="absolute inset-1 rounded-full border border-dashed border-white/30" />
              <span className="text-xl font-bold leading-none text-transparent bg-clip-text bg-gradient-to-br from-yellow-200 to-pink-300">3</span>
              <span className="text-[10px] font-semibold text-pink-100 tracking-wider">DAYS</span>
            </div>
            <span className="text-[10px] font-medium text-pink-100 mt-2 tracking-widest drop-shadow-md">連続記録</span>
          </div>
        </div>

        {/* Tag Pills */}
        <div className="flex flex-col items-start gap-3 mt-4">
          <div className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-white/10 backdrop-blur-md relative">
            <div className="absolute inset-0 rounded-full border border-transparent" style={{ background: "linear-gradient(90deg, #f472b6, #22d3ee) border-box", WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }} />
            おだんご
          </div>
          <div className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-white/10 backdrop-blur-md relative">
            <div className="absolute inset-0 rounded-full border border-transparent" style={{ background: "linear-gradient(90deg, #f472b6, #22d3ee) border-box", WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }} />
            <span className="mr-1">🔮</span> 食物タイプになりそう…
          </div>
        </div>

        {/* Main Bubble */}
        <div className="flex-1 flex flex-col items-center justify-center w-full mt-4">
          <div className="w-[280px] h-[280px] rounded-full relative flex flex-col items-center justify-center p-8 text-center bg-white/5 backdrop-blur-xl shadow-[0_0_40px_rgba(244,114,182,0.15)] group cursor-pointer transition-transform active:scale-95">
            {/* Rainbow border */}
            <div className="absolute inset-0 rounded-full border border-transparent opacity-80" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(244,114,182,0.5) 25%, rgba(34,211,238,0.5) 75%, rgba(255,255,255,0.2) 100%) border-box", WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }} />
            {/* Inner top highlight */}
            <div className="absolute top-[5%] left-[15%] right-[15%] h-[20%] rounded-[100%] bg-gradient-to-b from-white/40 to-transparent blur-[2px]" />
            {/* Inner bottom glow */}
            <div className="absolute bottom-[5%] left-[20%] right-[20%] h-[15%] rounded-[100%] bg-gradient-to-t from-cyan-300/20 to-transparent blur-[4px]" />
            
            <p className="text-lg font-bold leading-relaxed text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-10">
              さみしかった…<br />
              会いに来てくれて<br />
              よかった
            </p>
            <p className="text-[10px] text-white/70 mt-6 z-10 bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">タップで変更</p>
          </div>
        </div>

        {/* Mascot Area */}
        <div className="flex flex-col items-center mt-auto">
          {/* Mascot with dual-color glow */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-pink-500/40 blur-[40px] rounded-full translate-x-[-20%] translate-y-[10%]" />
            <div className="absolute inset-0 bg-cyan-400/40 blur-[40px] rounded-full translate-x-[20%] translate-y-[-10%]" />
            <div className="relative">
              <img src="/__mockup/images/mascot.png" alt="よっきー" className="w-40 h-40 object-contain animate-[bounce_4s_ease-in-out_infinite]" />
            </div>
          </div>

          {/* Name Pill */}
          <button className="flex items-center gap-2 px-6 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.3)] active:bg-white/20 transition-colors">
            <span className="font-bold text-white tracking-wide text-sm drop-shadow-md">よっきー</span>
            <Pencil className="w-3.5 h-3.5 text-white/80" />
          </button>
          
          <p className="text-xs text-white/70 mt-3 font-medium tracking-wide drop-shadow-md">すこしずつ育っています</p>
        </div>

      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 w-full h-[88px] bg-[#0A061E]/80 backdrop-blur-2xl border-t border-white/10 flex items-start justify-around pt-3 pb-8 px-2 z-50">
        <button className="flex flex-col items-center gap-1.5 w-16 group">
          <div className="relative">
            <div className="absolute inset-0 bg-pink-500/50 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <Home className="w-6 h-6 text-white relative z-10" />
          </div>
          <span className="text-[10px] font-medium text-white/90">ホーム</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 w-16 group">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-400/50 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <CheckCircle2 className="w-6 h-6 text-white/60 relative z-10 group-hover:text-white transition-colors" />
          </div>
          <span className="text-[10px] font-medium text-white/60 group-hover:text-white transition-colors">チェック</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 w-16 group">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500/50 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <MessageCircle className="w-6 h-6 text-white/60 relative z-10 group-hover:text-white transition-colors" />
          </div>
          <span className="text-[10px] font-medium text-white/60 group-hover:text-white transition-colors">チャット</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 w-16 group">
          <div className="relative">
            <div className="absolute inset-0 bg-pink-400/50 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <PenLine className="w-6 h-6 text-white/60 relative z-10 group-hover:text-white transition-colors" />
          </div>
          <span className="text-[10px] font-medium text-white/60 group-hover:text-white transition-colors">きろく</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 w-16 group">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500/50 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <BarChart2 className="w-6 h-6 text-white/60 relative z-10 group-hover:text-white transition-colors" />
          </div>
          <span className="text-[10px] font-medium text-white/60 group-hover:text-white transition-colors">グラフ</span>
        </button>
      </div>

    </div>
  );
}
