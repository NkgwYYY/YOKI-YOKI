import React from "react";
import { Home, CheckCircle2, MessageCircle, PenLine, LineChart, Flame, Edit2 } from "lucide-react";

export function VariantA() {
  return (
    <div className="w-[390px] min-h-[844px] h-screen mx-auto bg-gradient-to-br from-[#EDE7F6] via-[#E8EAF6] to-[#F3E5F5] relative overflow-hidden font-sans text-[#4A148C] flex flex-col shadow-2xl">
      
      {/* Header */}
      <div className="px-6 pt-14 pb-2 flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-[#7B6EA0] tracking-wider">おはよう</span>
          <h1 className="text-[32px] font-extrabold tracking-tight leading-none mt-1">YOKI YOKI</h1>
          <span className="text-[13px] font-semibold text-[#7B6EA0] mt-1.5">8月10日（日）</span>
        </div>
        
        {/* Streak Badge */}
        <div className="flex flex-col items-center justify-center bg-gradient-to-b from-[#9C27B0] to-[#7C4DFF] w-[68px] h-[68px] rounded-full shadow-[0_8px_20px_rgba(156,39,176,0.25)] text-white mt-1 border border-white/20">
          <div className="flex items-center gap-0.5 mt-1">
            <Flame size={16} className="text-[#FFE082] fill-[#FFE082]" />
            <span className="text-[22px] font-black leading-none tracking-tighter">3</span>
          </div>
          <span className="text-[9px] font-bold leading-tight mt-0.5 tracking-wider opacity-90">連続記録</span>
        </div>
      </div>

      {/* Main Mascot Card */}
      <div className="px-5 mt-6 flex-1 flex flex-col max-h-[600px]">
        <div className="bg-white/85 backdrop-blur-md rounded-[36px] p-6 shadow-[0_12px_40px_rgba(156,39,176,0.06)] border border-white/60 relative flex flex-col items-center flex-1 min-h-[460px]">
          
          {/* Top Pills */}
          <div className="w-full flex justify-between items-center mb-6">
            <div className="bg-[#F3E5F5] text-[#7B6EA0] px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wider">
              ステージ名
            </div>
            <div className="bg-[#EDE7F6] text-[#4A148C] px-3.5 py-1.5 rounded-full text-[13px] font-black tracking-widest">
              Lv.1
            </div>
          </div>

          {/* Speech Bubble */}
          <div className="relative mb-10 w-[88%]">
            <div className="bg-white px-6 py-4 rounded-3xl shadow-[0_8px_24px_rgba(156,39,176,0.06)] border border-purple-50/50 text-[15px] font-bold text-[#4A148C] text-center leading-relaxed relative z-10">
              さみしかった…
              <br />
              会いに来てくれてよかった
            </div>
            {/* Bubble Triangle */}
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-6 h-6 bg-white rotate-45 rounded-sm shadow-[4px_4px_12px_rgba(156,39,176,0.04)] z-0"></div>
          </div>

          {/* Mascot Character */}
          <div className="relative w-44 h-44 mt-2 flex items-center justify-center animate-[bounce_4s_ease-in-out_infinite]">
            {/* Body base */}
            <div className="absolute inset-0 bg-white rounded-full shadow-[inset_-12px_-16px_24px_rgba(0,0,0,0.02),0_20px_40px_rgba(156,39,176,0.12)] z-10"></div>
            
            {/* Fluffy bits */}
            <div className="absolute -top-1 -left-2 w-16 h-16 bg-white rounded-full z-0"></div>
            <div className="absolute top-5 -right-3 w-20 h-20 bg-white rounded-full z-0"></div>
            <div className="absolute bottom-3 -left-4 w-18 h-18 bg-white rounded-full z-0"></div>
            <div className="absolute -bottom-3 right-5 w-16 h-16 bg-white rounded-full z-0"></div>
            
            {/* Face Container */}
            <div className="relative z-20 flex flex-col items-center mt-6">
              {/* Eyes */}
              <div className="flex gap-8 mb-1">
                <div className="w-3.5 h-4.5 bg-[#4A148C] rounded-full"></div>
                <div className="w-3.5 h-4.5 bg-[#4A148C] rounded-full"></div>
              </div>
              {/* Blush */}
              <div className="absolute top-3 flex gap-14 opacity-50">
                <div className="w-5 h-2.5 bg-[#F48FB1] rounded-full blur-[2px]"></div>
                <div className="w-5 h-2.5 bg-[#F48FB1] rounded-full blur-[2px]"></div>
              </div>
              {/* Tiny mouth */}
              <div className="w-2.5 h-1 border-b-[2.5px] border-[#4A148C] rounded-full opacity-50 mt-1.5"></div>
            </div>
          </div>

          {/* Name Badge & Spacer */}
          <div className="flex-1"></div>
          <div className="mt-8 mb-4 flex flex-col items-center">
            <div className="flex items-center gap-2 bg-gradient-to-r from-[#F3E5F5] to-[#EDE7F6] px-5 py-2 rounded-full mb-2.5 shadow-sm">
              <span className="font-extrabold text-[#4A148C] text-sm tracking-wide">よっきー</span>
              <Edit2 size={13} className="text-[#9C27B0]" />
            </div>
            <span className="text-[#7B6EA0] text-[11px] font-bold tracking-wider">すこしずつ育っています</span>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="mt-auto w-full bg-white/95 backdrop-blur-xl rounded-t-[32px] shadow-[0_-12px_40px_rgba(156,39,176,0.06)] px-7 pt-5 pb-8 flex justify-between items-center text-[#B39DDB] border-t border-purple-50">
        <div className="flex flex-col items-center gap-1.5 text-[#9C27B0]">
          <Home size={26} strokeWidth={2.5} className="fill-[#9C27B0]/10" />
          <div className="w-1.5 h-1.5 bg-[#9C27B0] rounded-full"></div>
        </div>
        <div className="flex flex-col items-center gap-1.5 hover:text-[#7C4DFF] transition-colors">
          <CheckCircle2 size={26} strokeWidth={2} />
          <div className="w-1.5 h-1.5 bg-transparent rounded-full"></div>
        </div>
        <div className="flex flex-col items-center gap-1.5 hover:text-[#7C4DFF] transition-colors">
          <MessageCircle size={26} strokeWidth={2} />
          <div className="w-1.5 h-1.5 bg-transparent rounded-full"></div>
        </div>
        <div className="flex flex-col items-center gap-1.5 hover:text-[#7C4DFF] transition-colors">
          <PenLine size={26} strokeWidth={2} />
          <div className="w-1.5 h-1.5 bg-transparent rounded-full"></div>
        </div>
        <div className="flex flex-col items-center gap-1.5 hover:text-[#7C4DFF] transition-colors">
          <LineChart size={26} strokeWidth={2} />
          <div className="w-1.5 h-1.5 bg-transparent rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
