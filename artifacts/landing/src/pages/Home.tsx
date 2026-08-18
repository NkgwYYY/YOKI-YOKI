import { motion, useScroll, useTransform } from 'framer-motion';
import { Heart, Sparkles, Sun, Coffee, BookHeart, MessageCircleHeart, Sprout, ArrowRight } from 'lucide-react';
import { Starfield } from '@/components/starfield';

// Reusable animated container for scroll reveals
function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FloatingElement({ children, duration = 4, yOffset = 15, delay = 0, className = "" }: { children: React.ReactNode, duration?: number, yOffset?: number, delay?: number, className?: string }) {
  return (
    <motion.div
      animate={{ y: [-yOffset, yOffset, -yOffset] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  const { scrollYProgress } = useScroll();
  const yHeroBg = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const opacityHero = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0A051A] text-white">
      <Starfield />
      
      {/* --- HERO SECTION --- */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center pt-20 pb-10 px-4 md:px-8">
        <motion.div 
          className="absolute inset-0 z-0 pointer-events-none"
          style={{ y: yHeroBg, opacity: opacityHero }}
        >
          {/* Glowing orb behind hero */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] bg-primary/20 rounded-full blur-[120px]" />
        </motion.div>

        <div className="z-10 flex flex-col items-center text-center max-w-4xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <h2 className="text-secondary tracking-widest text-sm md:text-base font-bold mb-4">癒やしのメンタルケアアプリ</h2>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tight drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-br from-white via-[#B79CE4] to-[#9B72CB]">
              YOKI YOKI
            </h1>
          </motion.div>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-xl md:text-3xl font-medium leading-relaxed text-[#B79CE4] max-w-2xl"
          >
            「毎日の自分が、<br className="md:hidden" />世界をひとつ明るくする。」
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="pt-8"
          >
            <a 
              href="https://yoki-yoki.replit.app/" 
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-[#9B72CB] to-[#B79CE4] rounded-full text-white font-bold text-lg transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(155,114,203,0.6)]"
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).gtag) {
                  (window as any).gtag('event', 'cta_click', { event_category: 'hero', event_label: 'アプリを使ってみる' });
                }
              }}
            >
              <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              アプリを使ってみる
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
          </motion.div>
        </div>

        {/* Floating Hero Characters/Elements */}
        <FloatingElement className="absolute bottom-[10%] left-[10%] md:left-[20%] w-24 md:w-32 z-10" delay={0}>
          <img src={`${import.meta.env.BASE_URL}characters/egg.png`} alt="タマゴ" className="w-full h-auto drop-shadow-2xl" />
        </FloatingElement>
        <FloatingElement className="absolute top-[20%] right-[10%] md:right-[20%] w-16 md:w-24 z-10" duration={5} yOffset={20} delay={1}>
          <div className="w-full aspect-square rounded-full bg-[#FFB347] shadow-[0_0_50px_#FFB347] opacity-80 flex items-center justify-center">
            <Sun className="w-1/2 h-1/2 text-white" />
          </div>
        </FloatingElement>
      </section>

      {/* --- STORY / CYCLE SECTION --- */}
      <section className="py-24 px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-[#80D0C7]">
              あなたの「よき」が、力になる。
            </h2>
            <p className="text-lg md:text-xl text-[#B79CE4] leading-relaxed max-w-3xl mx-auto">
              自分を大切にする小さな行動が、この星のエネルギー源。<br />
              あなたが元気になるほど、キャラクターは喜び、世界は明るく照らされます。
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4 mt-12">
            {[
              { icon: Heart, title: "1. ケアする", desc: "気分を記録し、自分をいたわる", color: "text-pink-400" },
              { icon: Sparkles, title: "2. 喜ぶ", desc: "キャラクターが嬉しそうに光る", color: "text-[#B79CE4]" },
              { icon: Sun, title: "3. 照らす", desc: "光が空へ昇り、ソーラーパネルを充電", color: "text-[#FFB347]" },
              { icon: Coffee, title: "4. ごほうび", desc: "エネルギーで、キャラにおやつをあげる", color: "text-[#80D0C7]" }
            ].map((step, i) => (
              <FadeIn key={i} delay={i * 0.2} className="glass-card rounded-2xl p-6 text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className={`mx-auto w-16 h-16 rounded-full bg-[#0A051A]/50 flex items-center justify-center mb-4 border border-[#B79CE4]/30 ${step.color}`}>
                  <step.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-gray-300">{step.desc}</p>
                {i < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 text-[#B79CE4]/50">
                    <ArrowRight />
                  </div>
                )}
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* --- CHARACTERS SECTION --- */}
      <section className="py-24 px-4 relative z-10 overflow-hidden">
        <div className="absolute top-1/2 left-0 w-full h-[300px] bg-[#9B72CB]/10 blur-[100px] -skew-y-6 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
              一緒に成長する、不思議な仲間たち
            </h2>
            <p className="text-lg md:text-xl text-[#B79CE4]">
              あなたが自己ケアを続けると、彼らも少しずつ姿を変えていきます。
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { id: 'egg', name: 'タマゴ', quote: '「ここから…はじまるよ…」', stage: 'Stage 1', img: `${import.meta.env.BASE_URL}characters/egg.png` },
              { id: 'odando', name: 'モフモフ', quote: '「きみが元気だと、ぼくもうれしい!」', stage: 'Stage 2', img: `${import.meta.env.BASE_URL}characters/odando.png` },
              { id: 'happa', name: 'ハッパ', quote: '「きょうの光、きもちいいね〜」', stage: 'Stage 3', img: `${import.meta.env.BASE_URL}characters/happa.png` },
              { id: 'colorful', name: 'カラフルハッパ', quote: '「きみの光で、世界をカラフルにしよう!」', stage: 'Stage 4', img: `${import.meta.env.BASE_URL}characters/colorful_happa.png` },
            ].map((char, i) => (
              <FadeIn key={char.id} delay={i * 0.15} className="flex flex-col items-center">
                <div className="relative w-48 h-48 md:w-56 md:h-56 mb-6">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#9B72CB]/20 to-transparent rounded-full blur-xl mix-blend-screen" />
                  <FloatingElement duration={3 + i * 0.5} yOffset={10} delay={i * 0.2}>
                    <img src={char.img} alt={char.name} className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(155,114,203,0.4)]" />
                  </FloatingElement>
                </div>
                <div className="text-center glass-panel rounded-xl p-4 w-full relative">
                  <div className="text-[#80D0C7] text-xs font-bold uppercase tracking-wider mb-1">{char.stage}</div>
                  <h3 className="text-2xl font-bold mb-2">{char.name}</h3>
                  <p className="text-sm text-[#B79CE4] italic">{char.quote}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* --- FEATURES SECTION --- */}
      <section className="py-24 px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-[#FFB347]">
              心に寄り添う、優しい機能
            </h2>
          </FadeIn>

          <div className="space-y-24">
            {/* Feature 1 */}
            <div className="flex flex-col md:flex-row items-center gap-12">
              <FadeIn className="flex-1 w-full" delay={0.2}>
                <div className="glass-card rounded-3xl p-8 aspect-video flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#9B72CB]/30 rounded-full blur-3xl" />
                  <BookHeart className="w-24 h-24 text-[#B79CE4] mb-6" />
                  <div className="space-y-3 w-full max-w-xs">
                    <div className="h-4 bg-white/10 rounded-full w-3/4" />
                    <div className="h-4 bg-white/10 rounded-full w-full" />
                    <div className="h-4 bg-white/10 rounded-full w-5/6" />
                  </div>
                </div>
              </FadeIn>
              <FadeIn className="flex-1 space-y-6" delay={0.4}>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#9B72CB]/20 text-[#9B72CB] mb-2">
                  <BookHeart className="w-6 h-6" />
                </div>
                <h3 className="text-3xl font-bold">日々の気分をやさしく記録</h3>
                <p className="text-lg text-gray-300 leading-relaxed">
                  メンタルヘルスのチェックリストと日記機能で、自分の心の状態を客観的に見つめ直すことができます。無理のない範囲で、少しずつ自分を知っていきましょう。
                </p>
              </FadeIn>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-12">
              <FadeIn className="flex-1 w-full" delay={0.2}>
                <div className="glass-card rounded-3xl p-8 aspect-video flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#80D0C7]/30 rounded-full blur-3xl" />
                  <MessageCircleHeart className="w-24 h-24 text-[#80D0C7] mb-6" />
                  <div className="space-y-4 w-full max-w-xs flex flex-col">
                    <div className="self-start bg-[#0A051A]/50 border border-[#80D0C7]/30 rounded-2xl rounded-tl-sm px-4 py-2 text-sm text-[#80D0C7]">今日もお疲れさま！</div>
                    <div className="self-end bg-[#9B72CB]/30 border border-[#9B72CB]/50 rounded-2xl rounded-tr-sm px-4 py-2 text-sm">少し疲れたかも…</div>
                  </div>
                </div>
              </FadeIn>
              <FadeIn className="flex-1 space-y-6" delay={0.4}>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#80D0C7]/20 text-[#80D0C7] mb-2">
                  <MessageCircleHeart className="w-6 h-6" />
                </div>
                <h3 className="text-3xl font-bold">あなたの全てを知るAIパートナー</h3>
                <p className="text-lg text-gray-300 leading-relaxed">
                  記録した気分やプロフィールを記憶し、いつでもあなたに寄り添うAIチャット。誰にも言えない悩みも、嬉しい出来事も、優しく受け止めます。
                </p>
              </FadeIn>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col md:flex-row items-center gap-12">
              <FadeIn className="flex-1 w-full" delay={0.2}>
                <div className="glass-card rounded-3xl p-8 aspect-video flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#FFB347]/20 rounded-full blur-3xl" />
                  <Sun className="w-24 h-24 text-[#FFB347] mb-6" />
                  <div className="flex gap-4">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-12 h-16 bg-[#0A051A]/60 border border-[#FFB347]/30 rounded-md flex flex-col gap-1 p-1">
                        <div className="w-full flex-1 bg-[#FFB347]/20 rounded-sm" />
                        <div className="w-full flex-1 bg-[#FFB347]/20 rounded-sm" />
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
              <FadeIn className="flex-1 space-y-6" delay={0.4}>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#FFB347]/20 text-[#FFB347] mb-2">
                  <Sprout className="w-6 h-6" />
                </div>
                <h3 className="text-3xl font-bold">エネルギーが世界を照らす</h3>
                <p className="text-lg text-gray-300 leading-relaxed">
                  あなたが元気になると発生する光（元気エネルギー）が、空に浮かぶソーラーパネルを充電。貯まったエネルギーでキャラクターにご飯をあげられます。
                </p>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* --- EMOTIONAL / TESTIMONIAL SECTION --- */}
      <section className="py-32 px-4 relative z-10 flex justify-center">
        <FadeIn className="max-w-4xl text-center glass-panel p-10 md:p-16 rounded-[3rem] relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay" />
          <h2 className="text-2xl md:text-4xl font-bold leading-loose text-white relative z-10">
            「スマホの中に住む、<br className="md:hidden" />
            小さくて温かい生き物を<br className="md:hidden" />
            見つけたような感覚。」
          </h2>
          <p className="mt-8 text-[#B79CE4] text-lg relative z-10">
            完璧である必要はありません。<br />
            ただ、毎日少しだけ自分に優しくなること。<br />
            それだけで、この世界は十分に明るくなります。
          </p>
        </FadeIn>
      </section>

      {/* --- FOOTER CTA --- */}
      <section className="py-24 px-4 relative z-10 border-t border-[#9B72CB]/20">
        <div className="max-w-3xl mx-auto text-center space-y-10">
          <FadeIn>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6">
              さあ、光を灯そう。
            </h2>
            <p className="text-xl text-[#B79CE4] mb-12">
              アプリはブラウザですぐに使い始められます。
            </p>
            <a 
              href="https://yoki-yoki.replit.app/" 
              className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 bg-gradient-to-r from-[#80D0C7] to-[#9B72CB] rounded-full text-white font-bold text-xl md:text-2xl transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(128,208,199,0.5)]"
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).gtag) {
                  (window as any).gtag('event', 'cta_click', { event_category: 'footer', event_label: 'アプリを使ってみる' });
                }
              }}
            >
              アプリを使ってみる
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </a>
          </FadeIn>
        </div>
      </section>
      
      {/* Simple Footer */}
      <footer className="py-8 text-center text-sm text-gray-500 relative z-10">
        <p>© {new Date().getFullYear()} YOKI YOKI. All rights reserved.</p>
      </footer>
    </div>
  );
}