import { useEffect, useRef, useState } from 'react';
import { CharacterRig, Emotion } from '@/lib/character';
import { CHARACTERS, CharacterId, CharacterConfig } from '@/lib/character-config';
import { ChevronLeft, ChevronRight, Sparkles, Zap, MessageCircle, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function App() {
  const [characterId, setCharacterId] = useState<CharacterId>('egg');
  const [emotion, setEmotion] = useState<Emotion>('normal');
  const svgRef = useRef<SVGSVGElement>(null);
  const rigRef = useRef<CharacterRig | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const characterConfig = CHARACTERS.find(c => c.id === characterId)!;
  const currentIndex = CHARACTERS.findIndex(c => c.id === characterId);

  useEffect(() => {
    if (!svgRef.current) return;
    
    // Clean up old rig
    if (rigRef.current) {
      rigRef.current.destroy();
    }
    
    // Create new rig
    rigRef.current = new CharacterRig(svgRef.current, characterConfig);
    rigRef.current.setEmotion(emotion);
    
    return () => {
      if (rigRef.current) {
        rigRef.current.destroy();
        rigRef.current = null;
      }
    };
  }, [characterId]); // Recreate rig only when character changes

  useEffect(() => {
    if (rigRef.current) {
      rigRef.current.setEmotion(emotion);
    }
  }, [emotion]); // Update emotion without recreating rig

  useEffect(() => {
    // Pointer tracking for eyes
    const handlePointerMove = (e: PointerEvent) => {
      if (!rigRef.current || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Normalize to -1..1 relative to center
      const nx = (x / rect.width) * 2 - 1;
      const ny = (y / rect.height) * 2 - 1;
      
      rigRef.current.lookAt(nx, ny);
    };

    const handlePointerLeave = () => {
      if (rigRef.current) {
        rigRef.current.lookAt(0, 0);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    document.body.addEventListener('pointerleave', handlePointerLeave);
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.body.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  const nextCharacter = () => {
    const nextIdx = (currentIndex + 1) % CHARACTERS.length;
    setCharacterId(CHARACTERS[nextIdx].id);
    setEmotion('normal'); // Reset emotion
  };

  const prevCharacter = () => {
    const prevIdx = (currentIndex - 1 + CHARACTERS.length) % CHARACTERS.length;
    setCharacterId(CHARACTERS[prevIdx].id);
    setEmotion('normal'); // Reset emotion
  };

  const handleAction = (action: 'blink' | 'jump' | 'shake' | 'talk') => {
    if (rigRef.current) {
      rigRef.current[action]();
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center bg-background" ref={containerRef}>
      
      {/* Header / Selector */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between p-4 z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={prevCharacter}
          className="rounded-full hover:bg-white/50 lab-button"
        >
          <ChevronLeft className="w-6 h-6 text-primary" />
        </Button>
        
        <div className="flex flex-col items-center">
          <div className="bg-white/80 backdrop-blur-sm px-6 py-2 rounded-full lab-shadow border border-white/50 text-center">
            <h1 className="font-display font-bold text-xl text-primary drop-shadow-sm tracking-wide">
              {characterConfig.name}
            </h1>
          </div>
          <p className="text-xs font-bold text-muted-foreground mt-2 opacity-70 tracking-widest uppercase">
            CHARACTER LAB
          </p>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={nextCharacter}
          className="rounded-full hover:bg-white/50 lab-button"
        >
          <ChevronRight className="w-6 h-6 text-primary" />
        </Button>
      </header>

      {/* Stage Area */}
      <main className="flex-1 w-full max-w-md mx-auto relative flex items-center justify-center overflow-hidden">
        {/* Stage background decorations */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute w-full h-1/2 bottom-0 bg-gradient-to-t from-background via-background to-transparent" />
        </div>
        
        {/* The SVG Container */}
        <svg 
          ref={svgRef} 
          className="w-full h-full max-w-[400px] max-h-[400px] drop-shadow-xl select-none touch-none z-10"
          style={{ overflow: 'visible' }}
        />
      </main>

      {/* Control Panel */}
      <footer className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-md rounded-t-3xl lab-shadow-inset border-t border-white p-6 pb-8 z-20 flex flex-col gap-6">
        
        {/* Emotion Controls */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground ml-2">感情 (EMOTIONS)</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'normal', label: '通常', color: 'bg-slate-100 hover:bg-slate-200 text-slate-700' },
              { id: 'happy', label: '喜', color: 'bg-pink-100 hover:bg-pink-200 text-pink-700' },
              { id: 'angry', label: '怒', color: 'bg-red-100 hover:bg-red-200 text-red-700' },
              { id: 'sad', label: '哀', color: 'bg-blue-100 hover:bg-blue-200 text-blue-700' },
              { id: 'fun', label: '楽', color: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700' },
              { id: 'surprised', label: '驚', color: 'bg-purple-100 hover:bg-purple-200 text-purple-700' },
            ].map((emo) => (
              <button
                key={emo.id}
                onClick={() => setEmotion(emo.id as Emotion)}
                className={`
                  py-3 px-4 rounded-xl font-display font-bold text-sm lab-button transition-colors
                  ${emotion === emo.id ? 'ring-2 ring-primary ring-offset-2 scale-95' : ''}
                  ${emo.color}
                `}
              >
                {emo.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground ml-2">アクション (ACTIONS)</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => handleAction('blink')}
              className="flex flex-col items-center gap-1 py-3 px-2 bg-white border-2 border-slate-100 rounded-2xl hover:border-primary/30 hover:bg-primary/5 text-slate-600 lab-button"
            >
              <Sparkles className="w-5 h-5 mb-1" />
              <span className="font-display font-bold text-[10px]">瞬き</span>
            </button>
            
            <button
              onClick={() => handleAction('jump')}
              className="flex flex-col items-center gap-1 py-3 px-2 bg-white border-2 border-slate-100 rounded-2xl hover:border-primary/30 hover:bg-primary/5 text-slate-600 lab-button"
            >
              <ArrowUpCircle className="w-5 h-5 mb-1" />
              <span className="font-display font-bold text-[10px]">ジャンプ</span>
            </button>
            
            <button
              onClick={() => handleAction('shake')}
              className="flex flex-col items-center gap-1 py-3 px-2 bg-white border-2 border-slate-100 rounded-2xl hover:border-primary/30 hover:bg-primary/5 text-slate-600 lab-button"
            >
              <Zap className="w-5 h-5 mb-1" />
              <span className="font-display font-bold text-[10px]">ブルブル</span>
            </button>
            
            <button
              onClick={() => handleAction('talk')}
              className="flex flex-col items-center gap-1 py-3 px-2 bg-white border-2 border-slate-100 rounded-2xl hover:border-primary/30 hover:bg-primary/5 text-slate-600 lab-button"
            >
              <MessageCircle className="w-5 h-5 mb-1" />
              <span className="font-display font-bold text-[10px]">喋る</span>
            </button>
          </div>
        </div>

      </footer>
    </div>
  );
}
