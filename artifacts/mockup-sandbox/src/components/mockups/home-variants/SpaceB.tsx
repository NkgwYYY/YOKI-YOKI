import React from 'react';
import { Home, CheckSquare, MessageCircle, FileText, BarChart2 } from 'lucide-react';

export function SpaceB() {
  return (
    <div className="w-[390px] min-h-screen bg-gradient-to-br from-[#E8D5FF] via-[#C7E2FF] to-[#FFD6F5] relative overflow-hidden font-sans text-[#4C1D95]">
      {/* Nebula Blurs */}
      <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-purple-400 rounded-full blur-[120px] opacity-40 pointer-events-none" />
      <div className="absolute bottom-1/4 right-[-100px] w-96 h-96 bg-pink-400 rounded-full blur-[120px] opacity-40 pointer-events-none" />
      
      {/* Sparkles */}
      <div className="absolute top-20 right-16 text-yellow-300 text-xl animate-pulse">✦</div>
      <div className="absolute top-40 left-10 text-white text-lg animate-pulse delay-75">★</div>
      <div className="absolute bottom-60 right-20 text-blue-200 text-2xl animate-pulse delay-150">✦</div>
      <div className="absolute top-1/2 left-4 text-purple-200 text-sm animate-pulse delay-300">★</div>

      <div className="relative z-10 px-6 pt-14 pb-32">
        {/* Header & Streak Badge */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="text-sm font-medium text-[#7C6B9B] mb-1">おはよう</div>
            <h1 className="text-3xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#4C1D95] to-[#7C3AED]">YOKI YOKI</h1>
            <div className="text-xs font-medium text-[#7C6B9B] mt-1">8月10日（日）</div>
          </div>
          <div className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] text-white shadow-lg shadow-purple-500/30">
            <span className="text-lg leading-none">🔥5</span>
            <span className="text-[10px] font-bold mt-1 scale-90">連続記録</span>
          </div>
        </div>

        {/* Mascot Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-[32px] p-6 shadow-[0_20px_60px_rgba(124,58,237,0.12)] border border-white/50 relative">
          
          {/* Pills */}
          <div className="flex justify-between items-center mb-6">
            <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold tracking-wider">
              たまご期
            </div>
            <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold tracking-wider shadow-inner shadow-white/50">
              Lv.1
            </div>
          </div>

          {/* Speech Bubble */}
          <div className="relative bg-white border-2 border-purple-100 text-purple-900 text-sm font-medium p-4 rounded-2xl mb-8 shadow-sm text-center">
            <p>さみしかった…</p>
            <p>会いに来てくれてよかった</p>
            {/* Bubble Tail */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-r-2 border-b-2 border-purple-100 rotate-45" />
          </div>

          {/* Mascot Image */}
          <div className="flex justify-center items-center py-4 relative">
            <div className="absolute w-32 h-8 bg-purple-200/50 blur-xl rounded-[100%] bottom-2" />
            <img src="/__mockup/images/mascot.png" alt="よっきー" className="w-44 h-44 object-contain animate-[bounce_4s_ease-in-out_infinite] relative z-10" />
          </div>

          {/* Name & Sub */}
          <div className="flex flex-col items-center mt-6">
            <div className="bg-purple-50 border border-purple-200 px-6 py-2 rounded-full font-bold text-[#4C1D95] shadow-sm flex items-center gap-2">
              よっきー <span className="text-lg">✏️</span>
            </div>
            <div className="text-xs text-[#7C6B9B] mt-3 font-medium">
              すこしずつ育っています
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 w-full bg-white/80 backdrop-blur-md border-t border-purple-100 pb-8 pt-3 px-6 flex justify-between items-center z-50 rounded-t-[32px] shadow-[0_-10px_40px_rgba(124,58,237,0.08)]">
        <div className="flex flex-col items-center p-2 text-[#7C3AED]">
          <div className="bg-purple-100 p-2 rounded-2xl mb-1">
            <Home className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-bold">ホーム</span>
        </div>
        <div className="flex flex-col items-center p-2 text-[#7C6B9B] hover:text-[#7C3AED] transition-colors">
          <CheckSquare className="w-6 h-6 mb-1" strokeWidth={2} />
          <span className="text-[10px] font-medium">チェック</span>
        </div>
        <div className="flex flex-col items-center p-2 text-[#7C6B9B] hover:text-[#7C3AED] transition-colors relative">
          <div className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full border border-white" />
          <MessageCircle className="w-6 h-6 mb-1" strokeWidth={2} />
          <span className="text-[10px] font-medium">チャット</span>
        </div>
        <div className="flex flex-col items-center p-2 text-[#7C6B9B] hover:text-[#7C3AED] transition-colors">
          <FileText className="w-6 h-6 mb-1" strokeWidth={2} />
          <span className="text-[10px] font-medium">メモ</span>
        </div>
        <div className="flex flex-col items-center p-2 text-[#7C6B9B] hover:text-[#7C3AED] transition-colors">
          <BarChart2 className="w-6 h-6 mb-1" strokeWidth={2} />
          <span className="text-[10px] font-medium">グラフ</span>
        </div>
      </div>
    </div>
  );
}
