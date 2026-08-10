import React from 'react';

export function VariantD() {
  return (
    <div className="w-[390px] min-h-screen mx-auto bg-gradient-to-b from-[#0D1B2A] via-[#1B2838] to-[#162032] text-white overflow-hidden flex flex-col font-sans relative">
      
      {/* Decorative ambient background elements */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#00BFA5] rounded-full blur-[120px] opacity-10 translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#00E5CC] rounded-full blur-[100px] opacity-[0.08] -translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col px-6 pt-14 pb-24 relative z-10">
        
        {/* Header Row */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-[#7B9BB2] text-sm font-medium mb-1">おはよう</p>
            <h1 className="text-3xl font-bold tracking-tight mb-2 bg-gradient-to-r from-white to-[#E0F7F4] bg-clip-text text-transparent">YOKI YOKI</h1>
            <p className="text-[#00E5CC] text-sm font-semibold tracking-wide">8月10日（日）</p>
          </div>
          
          {/* Streak Badge */}
          <div className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#00BFA5] to-[#00E5CC] shadow-[0_4px_16px_rgba(0,191,165,0.4)] border-2 border-[#162032] relative z-20">
            <span className="text-xl leading-none mb-0.5">🔥</span>
            <span className="text-white font-bold text-xl leading-none">3</span>
            <span className="text-[9px] text-white/90 font-medium mt-0.5 tracking-tighter">連続記録</span>
          </div>
        </div>

        {/* Mascot Card */}
        <div className="flex-1 flex flex-col items-center justify-center w-full relative">
          
          <div className="w-full h-full max-h-[500px] rounded-[40px] bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative flex flex-col items-center justify-center p-6 mt-4">
            
            {/* Top Pills */}
            <div className="absolute top-5 left-5 right-5 flex justify-between items-center">
              <div className="px-3.5 py-1.5 rounded-full bg-[#162032]/80 border border-[#00BFA5]/50 backdrop-blur-md">
                <span className="text-[#00E5CC] text-xs font-semibold tracking-wide">ステージ名</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-[#162032]/80 border border-white/10 backdrop-blur-md">
                <span className="text-[#00E5CC] text-xs font-bold">Lv.1</span>
              </div>
            </div>

            {/* Speech Bubble */}
            <div className="relative mb-6 mt-10">
              <div className="bg-[#1E2D3D] border border-[#00BFA5]/40 px-5 py-4 rounded-2xl rounded-br-sm shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
                <p className="text-[#E0F7F4] text-sm font-medium leading-relaxed text-center">
                  さみしかった…<br />会いに来てくれてよかった
                </p>
              </div>
            </div>

            {/* Mascot Container with Custom Glow */}
            <div className="relative flex-1 flex items-center justify-center w-full my-4">
              <div className="absolute inset-0 bg-[#00BFA5] rounded-full blur-[60px] opacity-20 scale-75"></div>
              
              <div className="rounded-full shadow-[0_20px_60px_rgba(0,191,165,0.20)]">
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
              </div>
            </div>

            {/* Name Badge */}
            <div className="mt-4 flex flex-col items-center">
              <div className="px-6 py-2.5 bg-[#162032] border border-white/5 shadow-inner rounded-full mb-3 flex items-center gap-2">
                <span className="text-[#00E5CC] font-bold text-lg">よっきー</span>
                <span className="text-xl">✏️</span>
              </div>
              <p className="text-[#7B9BB2] text-xs font-medium bg-[#162032]/40 px-3 py-1 rounded-full">
                すこしずつ育っています
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 w-full h-[88px] bg-[#0D1B2A]/95 backdrop-blur-xl border-t border-white/5 pb-6 pt-2 px-6 flex justify-between items-center z-50">
        {/* Nav Item: Home (Active) */}
        <div className="flex flex-col items-center justify-center w-12 h-12 relative group cursor-pointer">
          <div className="absolute -top-3 w-10 h-1 bg-[#00E5CC] rounded-b-full shadow-[0_2px_8px_rgba(0,229,204,0.6)]"></div>
          <svg className="w-6 h-6 text-[#00E5CC] drop-shadow-[0_0_8px_rgba(0,229,204,0.4)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        
        {/* Nav Item: Check/Log */}
        <div className="flex flex-col items-center justify-center w-12 h-12 cursor-pointer transition-colors hover:text-[#E0F7F4]">
          <svg className="w-6 h-6 text-[#7B9BB2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Nav Item: Chat/Messages */}
        <div className="flex flex-col items-center justify-center w-12 h-12 cursor-pointer transition-colors hover:text-[#E0F7F4]">
          <svg className="w-6 h-6 text-[#7B9BB2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>

        {/* Nav Item: Notes/Memo */}
        <div className="flex flex-col items-center justify-center w-12 h-12 cursor-pointer transition-colors hover:text-[#E0F7F4]">
          <svg className="w-6 h-6 text-[#7B9BB2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>

        {/* Nav Item: Stats/Chart */}
        <div className="flex flex-col items-center justify-center w-12 h-12 cursor-pointer transition-colors hover:text-[#E0F7F4]">
          <svg className="w-6 h-6 text-[#7B9BB2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        </div>
      </div>
      
    </div>
  );
}
