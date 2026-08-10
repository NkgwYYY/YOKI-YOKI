import { 
  Home, 
  CheckSquare, 
  MessageCircle, 
  PenTool, 
  BarChart2, 
  Edit3, 
  Sparkles
} from "lucide-react";

export function SpaceC() {
  return (
    <div className="w-[390px] min-h-[100dvh] relative overflow-hidden bg-gradient-to-b from-[#F0F4FF] via-[#E8EEFF] to-[#F5F0FF] font-sans flex flex-col mx-auto shadow-sm">
      
      {/* Background Decorations */}
      <div className="absolute right-4 top-14 w-20 h-20 rounded-full bg-gradient-to-br from-[#C7D2FE] to-[#A5B4FC] shadow-[inset_-4px_-4px_8px_rgba(0,0,0,0.1),_0_0_20px_rgba(199,210,254,0.4)] opacity-80" />
      <Sparkles className="absolute top-10 left-12 w-4 h-4 text-indigo-300 opacity-60" />
      <Sparkles className="absolute top-24 left-6 w-3 h-3 text-indigo-200 opacity-70" />
      <Sparkles className="absolute top-36 right-28 w-5 h-5 text-indigo-300 opacity-50" />
      
      {/* Header */}
      <div className="relative z-10 px-6 pt-12 pb-4 flex justify-between items-start">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-[#6B7280] mb-1">おはよう</span>
          <h1 className="text-3xl font-black text-[#1E3A8A] tracking-tight leading-none mb-2 font-display">
            YOKI YOKI
          </h1>
          <span className="text-sm font-medium text-[#6B7280]">
            8月10日（日）
          </span>
        </div>
        
        {/* Streak Badge */}
        <div className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#E0E7FF] to-[#C7D2FE] shadow-sm border border-white/50">
          <span className="text-lg">🌙</span>
          <div className="flex items-baseline gap-0.5 mt-0.5">
            <span className="text-lg font-bold text-[#1E3A8A] leading-none">3</span>
            <span className="text-[9px] font-medium text-[#1E3A8A]">日</span>
          </div>
          <span className="text-[8px] font-medium text-[#1E3A8A] mt-0.5 opacity-80">連続記録</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-5 flex flex-col justify-center relative z-10 pb-24">
        
        {/* Mascot Card */}
        <div className="relative bg-white rounded-[32px] p-6 border border-[#DDDEFF] shadow-[0_16px_48px_rgba(79,70,229,0.10)] flex flex-col items-center">
          
          {/* Top Pills */}
          <div className="absolute top-4 left-4">
            <div className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold tracking-wide">
              たまご期
            </div>
          </div>
          <div className="absolute top-4 right-4">
            <div className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold tracking-wide">
              Lv.1
            </div>
          </div>

          {/* Speech Bubble */}
          <div className="mt-10 mb-4 relative w-full px-2">
            <div className="bg-white border border-indigo-100 rounded-2xl p-4 shadow-sm relative z-10">
              <p className="text-sm text-indigo-900 font-medium leading-relaxed text-center">
                さみしかった…<br/>
                会いに来てくれてよかった
              </p>
            </div>
            {/* Bubble Tail */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-indigo-100 rotate-45 z-0" />
          </div>

          {/* Mascot Image */}
          <div className="relative z-10 my-4">
            <img 
              src="/__mockup/images/mascot.png" 
              alt="よっきー" 
              className="w-44 h-44 object-contain animate-[bounce_4s_ease-in-out_infinite]" 
            />
          </div>

          {/* Name Badge */}
          <div className="flex flex-col items-center w-full mt-2">
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-5 py-2.5 rounded-2xl mb-2 cursor-pointer hover:bg-indigo-100 transition-colors">
              <span className="text-lg font-bold text-indigo-900">よっきー ✏️</span>
            </div>
            <span className="text-xs font-medium text-[#6B7280]">
              すこしずつ育っています
            </span>
          </div>

        </div>
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-indigo-50 pb-8 pt-3 px-6 flex justify-between items-center z-50">
        <NavItem icon={<Home />} label="ホーム" active />
        <NavItem icon={<CheckSquare />} label="チェック" />
        <NavItem icon={<MessageCircle />} label="チャット" />
        <NavItem icon={<PenTool />} label="メモ" />
        <NavItem icon={<BarChart2 />} label="グラフ" />
      </div>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center p-2 gap-1.5 cursor-pointer ${active ? 'text-[#4F46E5]' : 'text-slate-400'}`}>
      <div className={`w-6 h-6 [&>svg]:w-full [&>svg]:h-full ${active ? 'text-[#4F46E5]' : 'text-slate-400'}`}>
        {icon}
      </div>
      <span className="text-[10px] font-semibold">{label}</span>
    </div>
  );
}
