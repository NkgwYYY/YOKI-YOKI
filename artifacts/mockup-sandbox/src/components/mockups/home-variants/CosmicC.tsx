import React, { useMemo } from 'react';
import { Home, CheckCircle2, MessageCircle, FileEdit, BarChart2, Pencil } from 'lucide-react';

export function CosmicC() {
  const stars = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      top: `${Math.pow(Math.random(), 1.5) * 100}%`,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 2 + 1}px`,
      opacity: Math.random() * 0.5 + 0.1,
      animationDuration: `${Math.random() * 3 + 2}s`,
      animationDelay: `${Math.random() * 2}s`,
    }));
  }, []);

  return (
    <div className="w-[390px] h-[844px] relative overflow-hidden flex flex-col text-white font-sans bg-gradient-to-b from-[#3B2A6D] via-[#5B3A8E] to-[#8E5AA8] shadow-2xl">
      {/* Stars */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute bg-white rounded-full animate-pulse"
            style={{
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              animationDuration: star.animationDuration,
              animationDelay: star.animationDelay,
            }}
          />
        ))}
      </div>

      {/* Planets */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Crescent Moon */}
        <div className="absolute top-20 right-8 w-14 h-14 rounded-full bg-white/10 shadow-[inset_-8px_-4px_16px_rgba(255,255,255,0.7)] blur-[0.5px]"></div>
        
        {/* Left planet with ring */}
        <div className="absolute top-64 -left-10 w-32 h-32 rounded-full bg-gradient-to-br from-[#8E5AA8]/40 to-[#3B2A6D]/40 blur-[1px] flex items-center justify-center shadow-[inset_-10px_-10px_20px_rgba(0,0,0,0.2)]">
          <div className="w-[130%] h-[15%] border-t-[1.5px] border-b-[0.5px] border-[#E0C3FC]/40 rounded-[100%] rotate-[-20deg]"></div>
        </div>

        {/* Bottom right soft planet */}
        <div className="absolute bottom-48 -right-12 w-40 h-40 rounded-full bg-gradient-to-tl from-[#E0C3FC]/20 to-transparent blur-[8px]"></div>
      </div>

      {/* Top Section */}
      <div className="flex justify-between items-start pt-14 px-6 relative z-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-100 to-[#E0C3FC] drop-shadow-sm">YOKI YOKI</h1>
          <p className="text-sm font-medium text-purple-100/90 tracking-wide drop-shadow-md">8月10日（日）</p>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-[68px] h-[68px] rounded-full border-[1.5px] border-[#E0C3FC]/30 bg-[#E0C3FC]/15 backdrop-blur-md flex flex-col items-center justify-center shadow-[0_0_15px_rgba(224,195,252,0.2)]">
            <span className="text-2xl font-bold leading-none mb-0.5">3</span>
            <span className="text-[10px] tracking-widest opacity-90">DAYS</span>
          </div>
          <span className="text-[11px] mt-2 text-purple-100/90 font-medium drop-shadow-md">連続記録</span>
        </div>
      </div>

      {/* Tags Section */}
      <div className="px-6 mt-6 flex flex-col items-start gap-3 relative z-10">
        <div className="bg-white/15 backdrop-blur-md border border-white/20 px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg text-white/95">
          おだんご
        </div>
        <div className="bg-white/15 backdrop-blur-md border border-white/20 px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2 text-white/95">
          <span>🔮</span> 食物タイプになりそう…
        </div>
      </div>

      {/* Center Bubble */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 mt-6 mb-2">
        <div className="w-[280px] h-[280px] rounded-full bg-white/10 backdrop-blur-md border border-white/30 shadow-[inset_0_0_40px_rgba(255,255,255,0.25),0_15px_35px_rgba(0,0,0,0.2)] relative flex flex-col items-center justify-center text-center p-8 transition-transform hover:scale-[1.02] duration-500 cursor-pointer">
          {/* Glass Highlight */}
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.4)_0%,transparent_60%)] pointer-events-none"></div>
          <div className="absolute top-[8%] left-[12%] w-[35%] h-[12%] rounded-[100%] bg-white/40 rotate-[-20deg] blur-[1px] pointer-events-none"></div>
          <div className="absolute bottom-[10%] right-[15%] w-[20%] h-[8%] rounded-[100%] bg-white/20 rotate-[-20deg] blur-[2px] pointer-events-none"></div>

          <p className="text-[20px] leading-[1.8] font-bold drop-shadow-md z-10 text-white tracking-wide">
            さみしかった...<br />
            会いに来てくれて<br />
            よかった
          </p>
          <p className="text-[11px] mt-8 opacity-70 z-10 font-medium tracking-widest">タップで変更</p>
        </div>
      </div>

      {/* Mascot & Name */}
      <div className="flex flex-col items-center pb-[110px] relative z-10">
        {/* Mascot with warm glow */}
        <div className="relative">
          <div className="absolute inset-0 bg-white/50 blur-[30px] opacity-100 rounded-full scale-[1.5] translate-y-4 pointer-events-none"></div>
          <div className="absolute inset-0 bg-[#E0C3FC] blur-[40px] opacity-80 rounded-full scale-[2] pointer-events-none"></div>
          <img 
            src="/__mockup/images/mascot.png" 
            alt="よっきー" 
            className="w-36 h-36 object-contain animate-[bounce_4s_ease-in-out_infinite] relative z-10 drop-shadow-2xl" 
          />
        </div>

        {/* Name Pill */}
        <button className="mt-8 px-6 py-2.5 rounded-full bg-[#3B2A6D]/40 border border-white/20 backdrop-blur-md flex items-center gap-2.5 text-sm font-semibold shadow-lg hover:bg-[#3B2A6D]/60 transition-colors">
          よっきー <Pencil className="w-3.5 h-3.5 opacity-80" />
        </button>
        <p className="text-xs mt-3.5 opacity-80 font-medium tracking-wider drop-shadow-md">すこしずつ育っています</p>
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 w-full h-[90px] bg-[#2A1E4E]/85 backdrop-blur-xl border-t border-white/10 flex items-start justify-around pt-3.5 pb-6 px-4 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.2)]">
        <NavItem icon={<Home className="w-[26px] h-[26px]" />} label="ホーム" active />
        <NavItem icon={<CheckCircle2 className="w-[26px] h-[26px]" />} label="チェック" />
        <NavItem icon={<MessageCircle className="w-[26px] h-[26px]" />} label="チャット" />
        <NavItem icon={<FileEdit className="w-[26px] h-[26px]" />} label="メモ" />
        <NavItem icon={<BarChart2 className="w-[26px] h-[26px]" />} label="グラフ" />
      </div>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button className={`flex flex-col items-center gap-1.5 min-w-[56px] transition-all duration-300 ${active ? 'opacity-100 text-[#E0C3FC] scale-105' : 'opacity-50 hover:opacity-80 text-white hover:scale-105'}`}>
      {icon}
      <span className="text-[10px] font-bold tracking-wider">{label}</span>
    </button>
  );
}
