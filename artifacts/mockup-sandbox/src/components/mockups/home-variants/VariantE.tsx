import React from "react";
import { Home, CheckCircle2, MessageCircle, PenTool, TrendingUp, Flame } from "lucide-react";

export function VariantE() {
  return (
    <div className="w-[390px] min-h-[844px] bg-gradient-to-br from-[#FFD6E7] via-[#F0E6FF] to-[#D6EEFF] flex flex-col relative overflow-hidden font-sans">
      {/* Decorative gradient blur blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[40%] bg-[#FFD6E7] opacity-80 blur-[80px] rounded-full mix-blend-multiply pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[40%] bg-[#D6EEFF] opacity-80 blur-[80px] rounded-full mix-blend-multiply pointer-events-none"></div>
      
      {/* Header */}
      <div className="flex justify-between items-start px-6 pt-14 pb-4 relative z-10">
        <div>
          <p className="text-[13px] font-bold text-[#9B6E8A] mb-1 tracking-wide">おはよう</p>
          <h1 className="text-3xl font-extrabold text-[#5B1F6A] tracking-tight">YOKI YOKI</h1>
          <p className="text-[13px] font-bold text-[#9B6E8A] mt-1 tracking-wide">8月10日（日）</p>
        </div>
        
        {/* Streak Badge */}
        <div className="bg-gradient-to-r from-[#FF85C2] to-[#A78BFA] p-[2px] rounded-full shadow-[0_8px_16px_rgba(167,139,250,0.25)] mt-1">
          <div className="bg-white rounded-full px-3.5 py-1.5 flex items-center gap-1.5">
            <Flame size={16} className="text-[#FF85C2] fill-[#FF85C2]" />
            <div className="flex items-baseline gap-0.5">
              <span className="text-[16px] font-bold text-[#5B1F6A]">3</span>
              <span className="text-[10px] font-bold text-[#9B6E8A]">連続記録</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-5 flex flex-col pt-2 pb-28 relative z-10">
        
        {/* Mascot Card */}
        <div className="bg-white rounded-[40px] shadow-[0_20px_50px_rgba(255,182,215,0.3),_0_20px_50px_rgba(214,238,255,0.3)] p-6 relative flex flex-col items-center flex-1 justify-center border border-white/60">
          
          {/* Pills row */}
          <div className="absolute top-5 left-5 right-5 flex justify-between items-center">
            <div className="bg-[#FFE4F0] text-[#C0507A] px-3 py-1.5 rounded-2xl text-[11px] font-bold tracking-wide shadow-sm">
              たまご期
            </div>
            <div className="bg-[#EDE9FE] text-[#7C3AED] px-3 py-1.5 rounded-2xl text-[11px] font-bold tracking-wide shadow-sm">
              Lv.1
            </div>
          </div>

          {/* Speech Bubble */}
          <div className="relative mt-8 mb-4 z-20 w-[90%]">
            <div className="bg-gradient-to-r from-[#FF85C2] to-[#A78BFA] p-[2px] rounded-[24px] rounded-bl-sm shadow-[0_8px_24px_rgba(167,139,250,0.15)] relative">
              <div className="bg-white px-5 py-4 rounded-[22px] rounded-bl-none">
                <p className="text-[15px] font-bold text-[#5B1F6A] leading-relaxed text-center">
                  さみしかった…<br />会いに来てくれてよかった
                </p>
              </div>
            </div>
            {/* Small tail pointing to mascot */}
            <div className="absolute -bottom-[6px] left-8 w-3 h-3 bg-white border-b-[2px] border-l-[2px] border-[#FF85C2] transform -rotate-45 z-10"></div>
          </div>

          <div className="relative flex justify-center items-center w-full mt-4">
            {/* Dreamy shadow applied to a background div to wrap the mascot */}
            <div className="absolute w-36 h-36 rounded-full shadow-[0_20px_50px_rgba(167,139,250,0.20),0_0_0_1px_rgba(255,182,215,0.15)] pointer-events-none"></div>

            <img
              src="/__mockup/images/mascot.png"
              alt="よっきー"
              className="w-44 h-44 object-contain drop-shadow-[0_20px_50px_rgba(167,139,250,0.25)] animate-[bounce_4s_ease-in-out_infinite]"
            />
          </div>

          {/* Name Badge */}
          <div className="mt-8 mb-4 flex flex-col items-center">
            <div className="bg-gradient-to-r from-[#FFD6E7] to-[#EDE9FE] px-6 py-2.5 rounded-full shadow-[0_4px_12px_rgba(255,214,231,0.5)] mb-2.5">
              <span className="text-[#5B1F6A] font-bold text-base tracking-wide">よっきー ✏️</span>
            </div>
            <p className="text-[11px] font-bold text-[#9B6E8A] tracking-wide">すこしずつ育っています</p>
          </div>
          
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-[#F0E6FF] pb-8 pt-4 px-6 z-20 shadow-[0_-10px_30px_rgba(167,139,250,0.05)]">
        <div className="flex justify-between items-center relative">
          {/* Active Tab indicator - rainbow dot */}
          <div className="absolute -top-[20px] left-[calc(10%-2px)] w-[5px] h-[5px] rounded-full bg-gradient-to-r from-[#FF85C2] via-[#A78BFA] to-[#3B82F6] animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_10px_rgba(167,139,250,0.8)]"></div>
          
          <button className="flex flex-col items-center gap-1.5 flex-1 group">
            <Home size={24} className="text-[#5B1F6A] drop-shadow-[0_2px_4px_rgba(91,31,106,0.2)]" strokeWidth={2.5} />
          </button>
          
          <button className="flex flex-col items-center gap-1.5 flex-1 opacity-40 hover:opacity-100 transition-all duration-300">
            <CheckCircle2 size={24} className="text-[#9B6E8A]" strokeWidth={2} />
          </button>
          
          <button className="flex flex-col items-center gap-1.5 flex-1 opacity-40 hover:opacity-100 transition-all duration-300">
            <MessageCircle size={24} className="text-[#9B6E8A]" strokeWidth={2} />
          </button>
          
          <button className="flex flex-col items-center gap-1.5 flex-1 opacity-40 hover:opacity-100 transition-all duration-300">
            <PenTool size={24} className="text-[#9B6E8A]" strokeWidth={2} />
          </button>
          
          <button className="flex flex-col items-center gap-1.5 flex-1 opacity-40 hover:opacity-100 transition-all duration-300">
            <TrendingUp size={24} className="text-[#9B6E8A]" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
