import React from 'react';
import { Home, CheckCircle2, MessageCircle, PenLine, TrendingUp, Flame } from 'lucide-react';

export function VariantC() {
  return (
    <div className="w-[390px] min-h-[844px] relative bg-gradient-to-br from-[#FAFAFE] to-[#F4F4FF] overflow-hidden shadow-2xl mx-auto flex flex-col font-sans">
      {/* Header section */}
      <div className="px-6 pt-12 pb-4 flex justify-between items-start z-10">
        <div className="flex flex-col gap-1">
          <div className="text-[13px] font-medium text-[#6B7280] tracking-wider">
            おはよう
          </div>
          <div className="text-[28px] font-black text-[#1E1E3F] tracking-tight leading-none mt-1">
            YOKI YOKI
          </div>
          <div className="text-[14px] font-medium text-[#6B7280] mt-1">
            8月10日（日）
          </div>
        </div>

        {/* Streak badge */}
        <div className="flex flex-col items-center justify-center w-[64px] h-[64px] rounded-full border border-[#7C3AED] bg-white/50 backdrop-blur-sm shadow-sm mt-1">
          <div className="flex items-center gap-0.5 text-[#7C3AED]">
            <Flame className="w-3.5 h-3.5" fill="currentColor" />
            <span className="text-xl font-bold leading-none tracking-tighter">12</span>
          </div>
          <span className="text-[9px] font-bold text-[#7C3AED] mt-1 scale-90">連続記録</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 px-5 pb-[104px] pt-4 flex flex-col z-10">
        {/* Mascot Card */}
        <div className="flex-1 rounded-[2rem] border border-[#E8E8FF] bg-white/70 backdrop-blur-md shadow-[0_8px_32px_rgba(124,58,237,0.05),_0_2px_12px_rgba(124,58,237,0.02)] relative flex flex-col items-center p-6 overflow-hidden">
          
          {/* Top pills */}
          <div className="w-full flex justify-between items-center z-10">
            <div className="px-3 py-1.5 rounded-full bg-white border border-[#E8E8FF] text-[11px] font-bold text-[#1E1E3F] shadow-sm">
              ふんわり期
            </div>
            <div className="px-3 py-1.5 rounded-full bg-white border border-[#E8E8FF] text-[11px] font-bold text-[#7C3AED] shadow-sm">
              Lv.1
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center w-full z-10 gap-6 mt-4">
            
            {/* Speech bubble */}
            <div className="relative bg-white border border-[#E8E8FF] px-5 py-4 rounded-[1.25rem] shadow-[0_4px_20px_rgba(124,58,237,0.04)] w-[90%]">
              <p className="text-[14px] leading-relaxed text-[#1E1E3F] font-medium text-center">
                さみしかった…<br />会いに来てくれてよかった
              </p>
              {/* Triangle pointer */}
              <div className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-b border-r border-[#E8E8FF] rotate-45" />
            </div>

            {/* Mascot Character */}
            <div className="relative mt-8 mb-6">
              <div className="w-48 h-44 bg-white rounded-[45%_55%_50%_50%/50%_50%_55%_45%] shadow-[inset_-8px_-12px_24px_rgba(124,58,237,0.05),0_16px_32px_rgba(124,58,237,0.06)] flex items-center justify-center relative animate-[bounce_4s_ease-in-out_infinite]">
                {/* Fluffy bits/edges (simulated with pseudo elements using CSS or overlapping shapes) */}
                <div className="absolute inset-0 bg-white rounded-[55%_45%_50%_50%/50%_55%_45%_50%] rotate-[15deg] opacity-70"></div>
                <div className="absolute inset-0 bg-white rounded-[50%_50%_45%_55%/55%_45%_50%_50%] -rotate-[15deg] opacity-70"></div>
                
                {/* Eyes */}
                <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-8 z-10">
                  <div className="w-3.5 h-3.5 bg-[#1E1E3F] rounded-full"></div>
                  <div className="w-3.5 h-3.5 bg-[#1E1E3F] rounded-full"></div>
                </div>
                {/* Blushes */}
                <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-[4.5rem] z-10 opacity-30">
                  <div className="w-4 h-2 bg-[#7C3AED] rounded-full blur-[2px]"></div>
                  <div className="w-4 h-2 bg-[#7C3AED] rounded-full blur-[2px]"></div>
                </div>
              </div>
            </div>

            {/* Name badge */}
            <div className="flex flex-col items-center mt-auto">
              <div className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#7C3AED] bg-white shadow-sm mb-2">
                <span className="text-[14px] font-bold text-[#1E1E3F]">よっきー</span>
                <span className="text-[12px]">✏️</span>
              </div>
              <span className="text-[12px] text-[#6B7280] font-medium tracking-wide">
                すこしずつ育っています
              </span>
            </div>
          </div>

          {/* Decorative background blurs inside card */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#7C3AED]/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white rounded-full blur-2xl pointer-events-none"></div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 w-full h-[88px] flex items-center justify-around px-4 pb-6 pt-4 bg-transparent border-t border-[#E8E8FF]/30 backdrop-blur-lg z-20">
        <button className="flex flex-col items-center justify-center w-12 h-12 text-[#7C3AED]">
          <Home className="w-6 h-6 stroke-[2.5]" />
        </button>
        <button className="flex flex-col items-center justify-center w-12 h-12 text-[#6B7280] hover:text-[#7C3AED] transition-colors">
          <CheckCircle2 className="w-6 h-6 stroke-2" />
        </button>
        <button className="flex flex-col items-center justify-center w-12 h-12 text-[#6B7280] hover:text-[#7C3AED] transition-colors">
          <MessageCircle className="w-6 h-6 stroke-2" />
        </button>
        <button className="flex flex-col items-center justify-center w-12 h-12 text-[#6B7280] hover:text-[#7C3AED] transition-colors">
          <PenLine className="w-6 h-6 stroke-2" />
        </button>
        <button className="flex flex-col items-center justify-center w-12 h-12 text-[#6B7280] hover:text-[#7C3AED] transition-colors">
          <TrendingUp className="w-6 h-6 stroke-2" />
        </button>
      </div>

      {/* Decorative ambient background */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-[#7C3AED]/[0.04] rounded-full blur-3xl pointer-events-none mix-blend-multiply"></div>
      <div className="absolute bottom-[10%] left-[-20%] w-80 h-80 bg-white/60 rounded-full blur-3xl pointer-events-none"></div>
    </div>
  );
}
