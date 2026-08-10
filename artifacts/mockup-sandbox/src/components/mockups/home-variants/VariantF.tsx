import React from 'react';
import { Home, CheckCircle2, MessageCircle, FileText, TrendingUp, Flame, Pencil } from 'lucide-react';

export function VariantF() {
  return (
    <div className="w-[390px] min-h-[844px] bg-gradient-to-b from-[#F5F0E8] via-[#EEF2EC] to-[#F0EDE6] overflow-hidden flex flex-col relative font-sans text-[#2C1810]">
      {/* Header & Streak Badge */}
      <div className="px-6 pt-14 pb-4 flex justify-between items-start z-10 relative">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[#8B7355]">おはよう</span>
          <h1 className="text-3xl font-extrabold tracking-tight">YOKI YOKI</h1>
          <span className="text-sm font-medium text-[#8B7355] mt-1">8月10日（日）</span>
        </div>
        
        {/* Streak Badge */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#D4735E] to-[#E8956D] flex flex-col items-center justify-center shadow-lg shadow-[#D4735E]/30 text-white transform rotate-3">
            <div className="flex items-center gap-0.5">
              <Flame size={14} className="text-yellow-100 fill-current" />
              <span className="text-xl font-bold leading-none tracking-tighter">3</span>
            </div>
            <span className="text-[9px] font-bold mt-1 tracking-wider">連続記録</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-5 flex flex-col items-center justify-center pb-24 z-10 relative">
        {/* Mascot Card */}
        <div className="w-full bg-[#FDFAF6] border border-[#E8E0D0] rounded-[40px] p-6 flex flex-col items-center relative shadow-[0_20px_40px_rgba(139,69,19,0.08)] backdrop-blur-sm">
          
          {/* Pills */}
          <div className="w-full flex justify-between items-center mb-6 absolute top-6 left-0 px-6">
            <div className="bg-[#D4E6D4] text-[#2D5A3D] text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
              ステージ名
            </div>
            <div className="bg-[#EDE0C8] text-[#8B4513] text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
              Lv.1
            </div>
          </div>

          {/* Spacer for pills */}
          <div className="h-10"></div>

          {/* Speech Bubble */}
          <div className="relative mb-6 animate-[pulse_4s_ease-in-out_infinite]">
            <div className="bg-[#FDFAF6] border border-[#DDD5C0] rounded-2xl px-5 py-3 shadow-md relative z-10">
              <p className="text-[#3D2B1F] text-sm font-medium leading-relaxed text-center">
                さみしかった…<br />会いに来てくれてよかった
              </p>
            </div>
            <div className="w-3 h-3 bg-[#FDFAF6] border-b border-r border-[#DDD5C0] rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-0"></div>
          </div>

          {/* Mascot Character — DO NOT MODIFY THIS BLOCK */}
          <div className="relative w-44 h-44 mt-2 flex items-center justify-center animate-[bounce_4s_ease-in-out_infinite]">
            <div className="absolute inset-0 bg-white rounded-full shadow-[inset_-12px_-16px_24px_rgba(0,0,0,0.02),0_20px_40px_rgba(0,0,0,0.10)] z-10"></div>
            <div className="absolute -top-1 -left-2 w-16 h-16 bg-white rounded-full z-0"></div>
            <div className="absolute top-5 -right-3 w-20 h-20 bg-white rounded-full z-0"></div>
            <div className="absolute bottom-3 -left-4 w-18 h-18 bg-white rounded-full z-0"></div>
            <div className="absolute -bottom-3 right-5 w-16 h-16 bg-white rounded-full z-0"></div>
            <div className="relative z-20 flex flex-col items-center mt-6">
              <div className="flex gap-8 mb-1">
                <div className="w-3.5 h-[18px] bg-[#1a1a2e] rounded-full"></div>
                <div className="w-3.5 h-[18px] bg-[#1a1a2e] rounded-full"></div>
              </div>
              <div className="absolute top-3 flex gap-14 opacity-50">
                <div className="w-5 h-2.5 bg-[#F48FB1] rounded-full blur-[2px]"></div>
                <div className="w-5 h-2.5 bg-[#F48FB1] rounded-full blur-[2px]"></div>
              </div>
              <div className="w-2.5 h-1 border-b-[2.5px] border-[#1a1a2e] rounded-full opacity-40 mt-1.5"></div>
            </div>
          </div>
          {/* END Mascot */}

          {/* Name Badge */}
          <div className="mt-8 flex flex-col items-center">
            <div className="bg-[#F0E6D0] text-[#6B4C3B] font-bold text-lg px-6 py-2 rounded-2xl flex items-center gap-2 shadow-sm">
              よっきー
              <Pencil size={16} className="text-[#8B7355]" />
            </div>
            <span className="text-xs text-[#8B7355] mt-3 font-medium">すこしずつ育っています</span>
          </div>

        </div>
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 w-full h-[88px] bg-[#F5F0E8] border-t border-[#E8E0D0] flex justify-around items-center px-4 pb-4 z-20 rounded-t-[32px] shadow-[0_-10px_30px_rgba(139,69,19,0.05)]">
        <button className="flex flex-col items-center gap-1 group w-14">
          <div className="p-2.5 rounded-2xl bg-[#4A7C59] text-white shadow-md shadow-[#4A7C59]/20 transition-transform group-active:scale-95">
            <Home size={22} strokeWidth={2.5} />
          </div>
        </button>
        <button className="flex flex-col items-center gap-1 group w-14">
          <div className="p-2.5 rounded-2xl text-[#8B7355] hover:bg-[#E8E0D0]/50 transition-colors">
            <CheckCircle2 size={22} strokeWidth={2} />
          </div>
        </button>
        <button className="flex flex-col items-center gap-1 group w-14">
          <div className="p-2.5 rounded-2xl text-[#8B7355] hover:bg-[#E8E0D0]/50 transition-colors">
            <MessageCircle size={22} strokeWidth={2} />
          </div>
        </button>
        <button className="flex flex-col items-center gap-1 group w-14">
          <div className="p-2.5 rounded-2xl text-[#8B7355] hover:bg-[#E8E0D0]/50 transition-colors">
            <FileText size={22} strokeWidth={2} />
          </div>
        </button>
        <button className="flex flex-col items-center gap-1 group w-14">
          <div className="p-2.5 rounded-2xl text-[#8B7355] hover:bg-[#E8E0D0]/50 transition-colors">
            <TrendingUp size={22} strokeWidth={2} />
          </div>
        </button>
      </div>

    </div>
  );
}