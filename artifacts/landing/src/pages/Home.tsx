import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowRight, BookHeart, Heart, MessageCircleHeart, Sparkles, Sprout, Sun, WandSparkles } from 'lucide-react';
import { Starfield } from '@/components/starfield';

const base = import.meta.env.BASE_URL;
const appHref = 'https://yoki-yoki.replit.app/';
const worldSteps = [
  { number: '01', Icon: Heart, title: 'それでも大丈夫。', desc: 'いまの気持ちを、そのまま受け止める。', image: 'egg.png', tone: 'from-[#170f2b] to-[#21173a]' },
  { number: '02', Icon: BookHeart, title: '小さな「よき」を記録しよう。', desc: 'できたことを、ひとつ見つける。', image: 'odando.png', tone: 'from-[#211837] to-[#40315b]' },
  { number: '03', Icon: Sparkles, title: 'エネルギーがたまっていく。', desc: 'あなたの光が、静かに灯る。', image: 'happa.png', tone: 'from-[#293056] to-[#4a527d]' },
  { number: '04', Icon: Sun, title: 'あなたの「よき」で世界が輝く。', desc: '仲間の世界に、朝がくる。', image: 'colorful_happa.png', tone: 'from-[#4f4676] to-[#9a7a91]' },
] as const;

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduceMotion = useReducedMotion();
  return <motion.div initial={reduceMotion ? false : { opacity: 0, y: 24 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: .75, delay, ease: [.22, 1, .36, 1] }} className={className}>{children}</motion.div>;
}

function Cta({ location, children = '✨ YOKI YOKIをはじめる' }: { location: string; children?: React.ReactNode }) {
  return <a href={appHref} className="focus-ring group inline-flex items-center gap-3 rounded-full border border-[#e4ca91]/50 bg-[#dfb96b] px-6 py-3.5 text-sm font-bold text-[#241634] shadow-[0_12px_36px_rgba(221,183,102,.22)] transition-transform hover:-translate-y-1 hover:bg-[#f1d18f]" onClick={() => { if (typeof window !== 'undefined' && (window as any).gtag) (window as any).gtag('event', 'cta_click', { event_category: location, event_label: 'アプリを使ってみる' }); }}>{children}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></a>;
}

export default function Home() {
  const { scrollYProgress } = useScroll();
  const reduceMotion = useReducedMotion();
  const y = useTransform(scrollYProgress, [0, .35], ['0%', '18%']);
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#110b22] text-[#f7f2ec]">
      <Starfield />
      <div className="pointer-events-none fixed inset-0 z-0 star-dust opacity-30" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[920px] aurora opacity-90" />

      <section className="relative z-10 flex min-h-[100dvh] flex-col justify-center px-6 pb-16 pt-28 sm:px-10 lg:px-20">
        <motion.div style={reduceMotion ? undefined : { y }} className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1fr_1fr]">
          <div className="max-w-xl">
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="mb-6 text-xs font-bold tracking-[.28em] text-[#b8a6d6]">癒やしのメンタルケアアプリ</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .9 }} className="font-sans text-[clamp(4rem,11vw,8.6rem)] font-bold leading-[.84] tracking-[-.08em] text-[#eee4f9]">YOKI<br /><span className="text-[#c6b2e9]">YOKI</span></motion.h1>
            <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, delay: .25 }} className="mt-9 max-w-md font-[Zen_Maru_Gothic] text-xl leading-[1.9] text-[#d8cde8] md:text-2xl">今日の「よき」を、ひとつ。<br /><span className="text-sm text-[#a99abb] md:text-base">自分を大切にするほど、あなたの世界が少しずつ明るくなる。</span></motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .55 }} className="mt-10"><Cta location="hero" /></motion.div>
          </div>
          <div className="relative flex min-h-[390px] items-center justify-center lg:min-h-[600px]">
            <div className="absolute h-64 w-64 rounded-full bg-[#b39be5]/20 blur-[90px] md:h-96 md:w-96" />
            <div className="absolute right-0 top-0 z-0 h-24 w-24 md:-right-4 md:-top-10 md:h-40 md:w-40" aria-hidden="true">
              <div className="absolute inset-0 rounded-full bg-[#e5bd69]/20 blur-3xl" />
              <div className="absolute inset-3 grid place-items-center rounded-full border border-[#ffe1a0]/50 bg-[radial-gradient(circle_at_35%_35%,#fff8d2_0%,#f3c765_28%,#b87446_72%)] shadow-[0_0_55px_rgba(234,190,99,.58)]">
                <Sun className="h-8 w-8 text-[#fff7cf] md:h-12 md:w-12" strokeWidth={1.4} />
              </div>
              <span className="absolute -inset-2 rounded-full border border-[#f4d986]/20" />
              <span className="absolute -inset-5 rounded-full border border-[#f4d986]/10" />
            </div>
            <motion.div animate={reduceMotion ? undefined : { y: [-12, 10, -12], rotate: [-2, 2, -2] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} className="relative w-[min(76vw,440px)]">
              <div className="absolute inset-10 rounded-full bg-[#e6bd78]/10 blur-3xl" />
              <img src={`${base}characters/colorful_happa.png`} alt="カラフルなハッパのキャラクター" className="relative w-full drop-shadow-[0_25px_35px_rgba(7,3,20,.55)]" />
            </motion.div>
            <div className="absolute right-0 top-10 hidden rounded-full border border-[#b9a8dc]/25 bg-[#201536]/70 px-4 py-2 text-xs text-[#cfc2e5] backdrop-blur-md md:block">your tiny light</div>
            <motion.div animate={reduceMotion ? undefined : { y: [-8, 8, -8], rotate: [-8, 8, -8] }} transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }} className="absolute bottom-14 left-4 rounded-full border border-[#e5bfd3]/30 bg-[#3d244f]/45 p-3 text-[#efb6ce] backdrop-blur-sm" aria-hidden="true"><Heart className="h-4 w-4 fill-current" /></motion.div>
            <motion.div animate={reduceMotion ? undefined : { y: [7, -8, 7] }} transition={{ duration: 4.1, repeat: Infinity, ease: 'easeInOut', delay: .4 }} className="absolute bottom-6 right-12 rounded-full border border-[#b6d9cd]/25 bg-[#193438]/40 p-3 text-[#b4dfcf] backdrop-blur-sm" aria-hidden="true"><Sprout className="h-4 w-4" /></motion.div>
          </div>
        </motion.div>
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[10px] tracking-[.25em] text-[#9283ae]"><span>SCROLL TO DISCOVER</span><ArrowDown className="h-4 w-4 animate-bounce motion-reduce:animate-none" /></div>
      </section>

      <section className="relative z-10 px-6 py-32 sm:px-10 lg:px-20">
        <div className="mx-auto max-w-6xl">
          <FadeIn className="mb-16 max-w-xl"><p className="mb-5 text-xs font-bold tracking-[.3em] text-[#dbb96f]">THE WORLD OF YOKI YOKI</p><h2 className="font-[Zen_Maru_Gothic] text-4xl leading-tight md:text-6xl">YOKI YOKIの世界</h2><p className="mt-6 font-[Zen_Maru_Gothic] leading-8 text-[#aaa0bc]">どんな日も、記録できる小さな光がある。<br />その光が、あなたと仲間の世界を育てていく。</p></FadeIn>
          <div className="relative grid gap-4 md:grid-cols-4">
            <div className="absolute left-[12%] right-[12%] top-10 hidden h-px bg-gradient-to-r from-transparent via-[#c7b1ec]/40 to-transparent md:block" />
            {worldSteps.map(({ number, Icon, title, desc, image, tone }, i) => (
              <FadeIn key={number} delay={i * .1} className={`glass-card relative overflow-hidden rounded-3xl bg-gradient-to-br ${tone} p-6 md:p-7`}>
                <div className="absolute right-3 top-12 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-xs tracking-[.25em] text-[#dfbd78]">{number}</span>
                  <div className="rounded-full border border-[#c5b2e7]/25 bg-[#17102a]/25 p-3 text-[#e1d4f6]"><Icon className="h-5 w-5" /></div>
                </div>
                <div className="relative mb-4 flex h-20 items-center justify-center">
                  <img src={`${base}characters/${image}`} alt="" className="h-full w-24 object-contain drop-shadow-[0_10px_14px_rgba(8,4,20,.42)]" />
                </div>
                <h3 className="font-[Zen_Maru_Gothic] text-lg leading-8">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#ddd4ea]">{desc}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 py-28 sm:px-10 lg:px-20">
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[.8fr_1.2fr]">
          <FadeIn className="relative flex min-h-[470px] items-center justify-center overflow-hidden rounded-[2.5rem] border border-[#c6b2e7]/15 bg-[#17102b] p-7">
            <div className="absolute inset-0 aurora opacity-70" /><div className="absolute bottom-10 h-32 w-64 rounded-full bg-[#d8b66d]/10 blur-3xl" />
            <div className="relative h-[392px] w-[210px] overflow-hidden rounded-[2rem] border-[6px] border-[#0a0715] bg-[linear-gradient(180deg,#30234f_0%,#1a1430_60%,#121022_100%)] shadow-[0_24px_50px_rgba(0,0,0,.48)]">
              <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-[#090610]" />
              <div className="px-4 pt-5"><p className="text-[9px] tracking-[.2em] text-[#cbb8eb]">TODAY&apos;S LIGHT</p><p className="mt-1 font-[Zen_Maru_Gothic] text-sm">きょうの「よき」</p></div>
              <div className="absolute right-4 top-11 grid h-10 w-10 place-items-center rounded-full bg-[#e2b862]/20 text-[#f5d784]"><Sun className="h-5 w-5" /></div>
              <motion.img animate={reduceMotion ? undefined : { y: [-5, 5, -5] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }} src={`${base}characters/happa.png`} alt="アプリ内に表示されるハッパのキャラクター" className="mx-auto mt-9 h-40 w-40 object-contain drop-shadow-[0_18px_20px_rgba(0,0,0,.42)]" />
              <div className="mx-4 mt-1 rounded-2xl border border-[#d7c4f0]/15 bg-white/[.07] p-3"><p className="text-[10px] text-[#cbbce0]">今日も来てくれてうれしいな。</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#bfb0ec] to-[#e2bc6e]" /></div></div>
              <div className="absolute bottom-0 flex w-full justify-around border-t border-white/10 bg-[#0e0a1d]/75 px-4 py-3 text-[#a996c5]"><Heart className="h-4 w-4" /><BookHeart className="h-4 w-4" /><Sparkles className="h-4 w-4 text-[#e1bd70]" /></div>
            </div>
            <span className="absolute bottom-6 left-7 text-xs tracking-[.2em] text-[#9284a7]">IN YOUR POCKET</span>
          </FadeIn>
          <FadeIn><p className="mb-5 text-xs font-bold tracking-[.3em] text-[#8fc4df]">A GENTLE DAILY RITUAL</p><h2 className="font-[Zen_Maru_Gothic] text-4xl leading-tight md:text-5xl">あなたの「よき」が、<br /><span className="text-[#cbb8ec]">キャラクターのエネルギーになる。</span></h2><p className="mt-7 max-w-lg font-[Zen_Maru_Gothic] leading-8 text-[#aaa0bc]">気分の記録、短い会話、自分へのいたわり。大きな変化ではなく、続けられる優しさをゲームのように楽しめます。</p><div className="mt-10 flex flex-wrap gap-3 text-sm text-[#d8cee7]"><span className="rounded-full border border-[#c4b1e3]/20 px-4 py-2">気分ログ</span><span className="rounded-full border border-[#c4b1e3]/20 px-4 py-2">AIパートナー</span><span className="rounded-full border border-[#c4b1e3]/20 px-4 py-2">世界の成長</span></div></FadeIn>
        </div>
      </section>

      <section className="relative z-10 px-6 py-32 sm:px-10 lg:px-20">
        <div className="mx-auto max-w-6xl"><FadeIn className="mb-14 text-center"><p className="mb-5 text-xs font-bold tracking-[.3em] text-[#dbb96f]">A WORLD THAT GROWS WITH YOU</p><h2 className="font-[Zen_Maru_Gothic] text-4xl md:text-5xl">小さな記録が、景色を変える。</h2></FadeIn>
          <div className="grid gap-4 md:grid-cols-3"><FadeIn className="glass-panel rounded-3xl p-8 md:col-span-2"><MessageCircleHeart className="mb-12 h-8 w-8 text-[#9dcce5]" /><h3 className="font-[Zen_Maru_Gothic] text-2xl">話せない日も、話していい日も。</h3><p className="mt-4 max-w-md leading-8 text-[#aaa0bc]">あなたのペースで話せる、静かなAIチャット。気持ちを整理する場所として、そっと寄り添います。</p></FadeIn><FadeIn delay={.1} className="glass-panel rounded-3xl p-8"><WandSparkles className="mb-12 h-8 w-8 text-[#e2c17b]" /><h3 className="font-[Zen_Maru_Gothic] text-2xl">今日の光を集める</h3><p className="mt-4 leading-8 text-[#aaa0bc]">積み重ねた「よき」が、仲間との新しい景色を開きます。</p></FadeIn></div>
        </div>
      </section>

      <section className="relative z-10 overflow-hidden px-6 py-36 text-center sm:px-10"><div className="absolute inset-0 aurora opacity-50" /><FadeIn className="relative mx-auto max-w-2xl"><img src={`${base}characters/egg.png`} alt="タマゴのキャラクター" className="mx-auto mb-10 w-28 drop-shadow-[0_15px_25px_rgba(0,0,0,.45)]" /><h2 className="font-[Zen_Maru_Gothic] text-4xl leading-tight md:text-6xl">今日の「よき」を、<br />ひとつ。</h2><p className="mx-auto mt-7 max-w-md font-[Zen_Maru_Gothic] leading-8 text-[#aaa0bc]">あなたの世界が少し明るくなるところから、はじめよう。</p><div className="mt-10"><Cta location="footer" /></div></FadeIn></section>
      <footer className="relative z-10 border-t border-[#c6b2e7]/10 px-6 py-8 text-center text-xs tracking-[.12em] text-[#766b8a]">© {new Date().getFullYear()} YOKI YOKI</footer>
    </main>
  );
}