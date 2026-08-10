import React from 'react';
import { Home, CheckCircle2, MessageCircle, Edit3, TrendingUp, Edit2 } from 'lucide-react';

export function VariantB() {
  return (
    <div className="w-[390px] mx-auto min-h-[844px] relative overflow-hidden bg-gradient-to-br from-[#FFF0EC] via-[#FFF8F5] to-[#FFF0F5] font-sans text-[#2D1B16] flex flex-col pb-24 shadow-2xl">
      {/* Background ambient glows if necessary */}
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-[#FFEDE8]/50 to-transparent pointer-events-none" />

      {/* Header Area */}
      <div className="px-6 pt-14 pb-4 relative z-10 flex justify-between items-start">
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] font-bold text-[#A05840] tracking-wider opacity-80">おはよう</p>
          <h1 className="text-[26px] font-extrabold tracking-widest text-[#2D1B16] leading-none">YOKI YOKI</h1>
          <p className="text-[11px] font-medium text-[#A05840] mt-1 opacity-70">8月10日（日）</p>
        </div>

        {/* Streak Badge */}
        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-[#FF6B6B] to-[#FF8E53] text-white shadow-xl shadow-[#FF6B6B]/20 shrink-0">
          <span className="text-[22px] font-bold leading-none mb-0.5 tracking-tighter">🔥<span className="-ml-0.5">3</span></span>
          <span className="text-[8px] font-bold opacity-90 tracking-wide">連続記録</span>
        </div>
      </div>

      {/* Mascot Card */}
      <div className="px-5 flex-1 flex flex-col justify-center relative z-10 mb-8 mt-2">
        <div className="bg-white rounded-[40px] p-6 shadow-[0_20px_60px_-15px_rgba(255,237,232,0.8)] flex flex-col items-center relative border border-white/80 h-[500px]">
          
          {/* Top Pills */}
          <div className="w-full flex justify-between items-center mb-6 z-20">
            <span className="px-4 py-1.5 bg-[#FFEDE8] text-[#A05840] rounded-full text-[11px] font-bold tracking-wide border border-white/50 shadow-sm shadow-[#FFEDE8]/50">第1形態</span>
            <span className="px-4 py-1.5 bg-[#FFEDE8] text-[#A05840] rounded-full text-[11px] font-bold tracking-wide border border-white/50 shadow-sm shadow-[#FFEDE8]/50">Lv.1</span>
          </div>

          {/* Speech Bubble */}
          <div className="relative mb-8 z-20 max-w-[85%]">
            <div className="bg-[#FFF8F5] border border-[#FFEDE8]/60 px-5 py-3.5 rounded-[20px] shadow-sm text-[13px] text-[#A05840] text-center font-bold leading-relaxed">
              さみしかった…<br />会いに来てくれてよかった
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#FFF8F5] border-b border-r border-[#FFEDE8]/60 transform rotate-45 rounded-sm"></div>
          </div>

          {/* Mascot */}
          <div className="relative w-full flex-1 flex items-center justify-center my-auto min-h-[160px]">
            {/* Soft glow behind mascot */}
            <div className="absolute inset-0 bg-[#FFEDE8] rounded-full blur-3xl opacity-60 transform scale-75"></div>
            
            {/* Mascot Body */}
            <div className="relative w-[180px] h-[160px] bg-white rounded-[100px] shadow-[0_12px_40px_rgb(0,0,0,0.06),inset_0_-10px_20px_rgb(255,237,232,0.6)] flex justify-center items-center transition-transform hover:scale-105 cursor-pointer z-10 active:scale-95 duration-300">
              
              {/* Ears/Fluff */}
              <div className="absolute -top-3 left-10 w-12 h-12 bg-white rounded-full shadow-[inset_0_4px_10px_rgb(0,0,0,0.01)]"></div>
              <div className="absolute -top-4 right-10 w-14 h-14 bg-white rounded-full shadow-[inset_0_4px_10px_rgb(0,0,0,0.01)]"></div>
              <div className="absolute top-12 -left-4 w-12 h-12 bg-white rounded-full shadow-[inset_0_4px_10px_rgb(0,0,0,0.01)]"></div>
              <div className="absolute top-14 -right-3 w-12 h-12 bg-white rounded-full shadow-[inset_0_4px_10px_rgb(0,0,0,0.01)]"></div>

              {/* Eyes */}
              <div className="flex gap-10 relative z-20 top-2">
                <div className="w-4 h-4 bg-[#2D1B16] rounded-full relative">
                  <div className="absolute top-[2px] right-[2px] w-[5px] h-[5px] bg-white rounded-full"></div>
                </div>
                <div className="w-4 h-4 bg-[#2D1B16] rounded-full relative">
                   <div className="absolute top-[2px] right-[2px] w-[5px] h-[5px] bg-white rounded-full"></div>
                </div>
              </div>

              {/* Blush */}
              <div className="absolute top-[75px] left-[35px] w-6 h-3.5 bg-[#FF7043] opacity-[0.15] rounded-full blur-sm"></div>
              <div className="absolute top-[75px] right-[35px] w-6 h-3.5 bg-[#FF7043] opacity-[0.15] rounded-full blur-sm"></div>
            </div>
          </div>

          {/* Name Badge */}
          <div className="mt-8 flex flex-col items-center gap-2 z-20">
            <button className="flex items-center justify-center gap-2 bg-[#FFEDE8] px-6 py-2.5 rounded-full text-[13px] font-bold text-[#A05840] shadow-sm hover:shadow active:scale-95 transition-all w-32 border border-white/50">
              よっきー
              <Edit2 className="w-3.5 h-3.5 opacity-60" />
            </button>
            <span className="text-[10px] text-[#A05840]/60 font-bold tracking-wide">すこしずつ育っています</span>
          </div>

        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl rounded-t-[32px] shadow-[0_-15px_40px_-15px_rgba(255,112,67,0.15)] px-6 pt-5 pb-8 flex justify-between items-center z-50 border-t border-white">
        <button className="flex flex-col items-center gap-1 text-[#FF7043] relative group">
          <div className="p-2 rounded-2xl bg-[#FFF0EC]/50 transition-colors">
            <Home className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="absolute -bottom-1 w-1.5 h-1.5 bg-[#FF7043] rounded-full"></div>
        </button>
        <button className="flex flex-col items-center gap-1 text-[#A05840]/30 hover:text-[#FF7043]/80 transition-colors">
          <div className="p-2">
            <CheckCircle2 className="w-6 h-6 stroke-[2]" />
          </div>
        </button>
        <button className="flex flex-col items-center gap-1 text-[#A05840]/30 hover:text-[#FF7043]/80 transition-colors">
          <div className="p-2">
            <MessageCircle className="w-6 h-6 stroke-[2]" />
          </div>
        </button>
        <button className="flex flex-col items-center gap-1 text-[#A05840]/30 hover:text-[#FF7043]/80 transition-colors">
          <div className="p-2">
            <Edit3 className="w-6 h-6 stroke-[2]" />
          </div>
        </button>
        <button className="flex flex-col items-center gap-1 text-[#A05840]/30 hover:text-[#FF7043]/80 transition-colors">
          <div className="p-2">
            <TrendingUp className="w-6 h-6 stroke-[2]" />
          </div>
        </button>
      </div>

    </div>
  );
}
