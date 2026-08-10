import React from "react";
import { Home, CheckCircle, MessageSquare, Pencil, BarChart3 } from "lucide-react";
import "./CosmicABubbleAnimFast.css";

const STARS = Array.from({ length: 40 }).map((_, i) => ({
  id: i,
  top: `${Math.abs(Math.sin(i * 1234)) * 100}%`,
  left: `${Math.abs(Math.cos(i * 5678)) * 100}%`,
  size: (i % 3) + 1,
  delay: `${(i % 5) * 0.7}s`,
  duration: `${2 + (i % 4)}s`,
  opacity: 0.3 + (i % 10) * 0.05,
}));

export function CosmicABubbleAnimFast() {
  return (
    <div className="w-[390px] h-[844px] relative overflow-hidden bg-[#0A051A] text-white font-sans shadow-2xl mx-auto ring-1 ring-white/10">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-[#0A051A] to-[#0A051A] z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-purple-900/30 via-transparent to-transparent z-0" />

      {/* Stars */}
      {STARS.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white animate-pulse z-0"
          style={{
            top: star.top,
            left: star.left,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDelay: star.delay,
            animationDuration: star.duration,
          }}
        />
      ))}

      {/* Planets */}
      {/* Top Left Planet with Ring */}
      <div className="absolute top-[32%] -left-[12%] w-[120px] h-[120px] rotate-[15deg] z-0 opacity-90">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#E2BBE9] via-[#9B72CB] to-[#3B256D] shadow-[inset_-10px_-10px_20px_rgba(0,0,0,0.5)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[30%] border-[2px] border-white/20 rounded-[100%] rotate-[-15deg] shadow-[0_0_15px_rgba(255,255,255,0.1)] backdrop-blur-sm" />
      </div>

      {/* Top Right Small Planet */}
      <div className="absolute top-[22%] -right-[4%] w-[60px] h-[60px] z-0 opacity-80">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#80D0C7] via-[#359088] to-[#0A3D44] shadow-[inset_-5px_-5px_10px_rgba(0,0,0,0.6)]" />
        <div className="absolute inset-0 rounded-full bg-white/10 blur-[2px]" />
      </div>

      {/* Bottom Right Planet */}
      <div className="absolute bottom-[35%] -right-[8%] w-[90px] h-[90px] z-0 opacity-80 rotate-[-20deg]">
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#6B32A1] via-[#9E65D9] to-[#D1A3F5] shadow-[inset_10px_-10px_15px_rgba(0,0,0,0.5)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[20%] border-[1px] border-white/30 rounded-[100%] rotate-[25deg]" />
      </div>

      {/* Bottom Left Small Planet */}
      <div className="absolute bottom-[20%] left-[8%] w-[30px] h-[30px] z-0 opacity-60">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#4A85D1] to-[#142A5C] shadow-[inset_-2px_-2px_5px_rgba(0,0,0,0.7)]" />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start pt-14 px-6">
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-[#B2A4FF] drop-shadow-[0_0_10px_rgba(178,164,255,0.6)]">
              YOKI YOKI
            </h1>
            <p className="text-[11px] text-white/80 font-medium mt-1.5 tracking-wider">
              8月10日（日）
            </p>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border border-white/30 flex flex-col items-center justify-center bg-[#1A1035]/40 backdrop-blur-md relative overflow-hidden">
              <div className="absolute inset-0 rounded-full border border-dashed border-white/30 m-[2px]" />
              <div className="absolute inset-0 shadow-[inset_0_0_15px_rgba(255,255,255,0.1)] rounded-full" />
              <span className="text-2xl font-bold leading-none mt-1 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                3
              </span>
              <span className="text-[9px] tracking-widest text-white/80 font-medium">
                DAYS
              </span>
            </div>
            <p className="text-[10px] text-white/80 mt-2 font-medium tracking-widest">
              連続記録
            </p>
          </div>
        </div>

        {/* Tags */}
        <div className="px-6 mt-2 flex flex-col gap-3">
          <div className="w-fit px-4 py-2 rounded-full bg-[#1C123D]/60 border border-white/10 backdrop-blur-md shadow-[0_4px_15px_rgba(0,0,0,0.2)]">
            <span className="text-xs font-medium text-white/90 tracking-wide">
              おだんご
            </span>
          </div>
          <div className="w-fit px-4 py-2 rounded-full bg-[#1C123D]/60 border border-white/10 backdrop-blur-md shadow-[0_4px_15px_rgba(0,0,0,0.2)]">
            <span className="text-xs font-medium text-white/90 tracking-wide">
              🔮 食物タイプになりそう…
            </span>
          </div>
        </div>

        {/* Center Glass Bubble */}
        <div className="absolute top-[260px] left-1/2 -translate-x-1/2 w-[270px] h-[270px]">
          <div className="w-full h-full animate-float-bubble-fast">
            <div className="w-full h-full rounded-full border border-white/20 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.3),inset_0_0_30px_rgba(255,255,255,0.1)] flex flex-col items-center justify-center relative overflow-hidden">
              {/* Bubble Highlights */}
              <div className="absolute top-4 left-6 w-[160px] h-[80px] border-t-[3px] border-white/40 rounded-[100%] rotate-[-25deg] blur-[2px]" />
              <div className="absolute bottom-6 right-6 w-[120px] h-[50px] bg-[#B2A4FF]/20 rounded-[100%] rotate-[20deg] blur-[15px]" />
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,_rgba(255,255,255,0.1)_0%,_transparent_60%)]" />

              <p className="text-center text-[17px] font-medium leading-[1.8] z-10 text-white/95 tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                さみしかった...<br />
                会いに来てくれて<br />
                よかった
              </p>
              <p className="text-[10px] text-white/60 mt-6 z-10 tracking-widest">
                タップで変更
              </p>
            </div>
          </div>
        </div>

        {/* Mascot & Info */}
        <div className="absolute bottom-[130px] w-full flex flex-col items-center">
          <div className="relative">
            {/* Soft Glow behind character */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-[#9B72CB]/30 rounded-full blur-[40px] z-0" />
            
            <img
              src="/__mockup/images/mascot.png"
              alt="よっきー"
              className="w-40 h-40 object-contain animate-[bounce_4s_ease-in-out_infinite] relative z-10 drop-shadow-[0_10px_15px_rgba(0,0,0,0.3)]"
            />
          </div>

          <div className="mt-3 flex flex-col items-center gap-2">
            <button className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-white/20 bg-[#1A1035]/60 backdrop-blur-md hover:bg-white/10 transition-colors shadow-[0_4px_10px_rgba(0,0,0,0.2)]">
              <span className="text-sm font-bold tracking-wider text-white">よっきー</span>
              <Pencil className="w-3.5 h-3.5 text-white/70" />
            </button>
            <p className="text-[11px] text-white/60 tracking-widest">
              すこしずつ育っています
            </p>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 w-full h-[88px] bg-[#0A051A]/90 backdrop-blur-xl border-t border-white/10 flex justify-between items-start pt-4 px-6 pb-6 z-50">
          <NavItem icon={<Home className="w-6 h-6" />} label="ホーム" active />
          <NavItem icon={<CheckCircle className="w-6 h-6" />} label="チェック" />
          <NavItem icon={<MessageSquare className="w-6 h-6" />} label="チャット" />
          <NavItem icon={<Pencil className="w-6 h-6" />} label="メモ" />
          <NavItem icon={<BarChart3 className="w-6 h-6" />} label="グラフ" />
        </div>
      </div>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 cursor-pointer">
      <div
        className={`${
          active ? "text-white" : "text-white/40"
        } transition-colors`}
      >
        {icon}
      </div>
      <span
        className={`text-[9px] font-medium tracking-wider ${
          active ? "text-white" : "text-white/40"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
