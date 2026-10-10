import { trackEvent } from '@/lib/analytics';
import './Home.css';

const base = import.meta.env.BASE_URL;
const appHref = 'https://yoki-yoki.replit.app/';
const characters = [
  { image: 'egg.png', name: 'たまご', note: 'はじまりは、この子から。', tone: 'egg' },
  { image: 'odando.png', name: 'おだんご', note: 'まあるく、やわらかな存在。', tone: 'dango' },
  { image: 'happa.png', name: 'はっぱ', note: '小さな芽と、いっしょに。', tone: 'leaf' },
  { image: 'colorful_happa.png', name: 'カラフルはっぱ', note: 'いろんな色が、あっていい。', tone: 'rainbow' },
] as const;
const questions = [
  { title: 'YOKI YOKIは、どんなアプリ？', answer: '気分の記録やキャラクターとのふれあいを通じて、自分をいたわる時間を楽しむセルフケアアプリです。小さな「よき」を見つけながら、キャラクターとの日々を重ねていきます。' },
  { title: 'どこから使えますか？', answer: 'このページの「YOKI YOKIをはじめる」から、ブラウザ版のアプリを開けます。この紹介ページにある昼・夜の切り替えと、ごあいさつは、世界観を楽しむためのミニ体験です。アプリの記録や育成データには影響しません。' },
  { title: '医療サービスですか？', answer: 'いいえ。YOKI YOKIは日々のセルフケアを楽しむためのアプリであり、医療行為・診断・治療の代わりになるものではありません。' },
];

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h15m-6-6 6 6-6 6'} /></svg>;
}

function Flower({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 80 80" aria-hidden="true"><path fill="currentColor" d="M40 7c12-13 26 2 18 15 19-3 25 17 9 24 16 13 2 30-13 22-3 18-25 18-28 0-16 8-29-9-13-22C-3 39 3 19 22 22 14 9 28-6 40 7Z" /><circle cx="40" cy="40" r="10" fill="var(--yk-paper, #f8f6f0)" /></svg>;
}

function Cta({ location, compact = false, light = false }: { location: string; compact?: boolean; light?: boolean }) {
  return <a href={appHref} className={`yk-cta${compact ? ' yk-cta--small' : ''}${light ? ' yk-cta--light' : ''}`} onClick={() => trackEvent('app_cta_clicked', { location })}><span>{compact ? 'はじめる' : 'YOKI YOKIをはじめる'}</span><Arrow diagonal /></a>;
}

function Brand() {
  return <a className="yk-brand" href={base} aria-label="YOKI YOKI ホーム"><span>YOKI</span><span>YOKI<span className="yk-brand-dot">.</span></span></a>;
}

export default function Home() {
  return (
    <div className="yk-home">
      <a className="yk-skip" href="#yk-main">本文へスキップ</a>
      <header className="yk-header yk-wrap">
        <Brand />
        <nav className="yk-nav" aria-label="メインナビゲーション"><a href="#about">YOKI YOKIとは</a><a href="#friends">なかまたち</a><a href="#questions">よくある質問</a></nav>
        <Cta location="header" compact />
      </header>

      <main id="yk-main" tabIndex={-1}>
        <section className="yk-hero yk-wrap" aria-labelledby="yk-title">
          <div className="yk-hero-copy">
            <p className="yk-eyebrow"><span className="yk-status-dot" />こころに、ちいさな居場所を。</p>
            <h1 id="yk-title">きょうも、<br /><em>あなたの<br className="yk-mid-break" />ペースで。</em></h1>
            <p className="yk-intro">なんでもない一日に、ちいさな「よき」を。<br />ふしぎななかまと暮らしながら、<br />自分をいたわる時間を、少しずつ。</p>
            <div className="yk-hero-action"><Cta location="hero" /><p>キャラクターと楽しむ、セルフケアアプリ</p></div>
          </div>
          <div className="yk-world">
            <input className="yk-night yk-visually-hidden" type="checkbox" id="yk-night" />
            <label className="yk-world-switch" htmlFor="yk-night"><span>夜の景色</span><span className="yk-switch-track" aria-hidden="true"><span /></span></label>
            <div className="yk-scene">
              <div className="yk-sun" aria-hidden="true" />
              <span className="yk-scene-spark yk-scene-spark--one" aria-hidden="true">✦</span><span className="yk-scene-spark yk-scene-spark--two" aria-hidden="true">✧</span>
              <div className="yk-hill yk-hill--back" aria-hidden="true" /><div className="yk-hill yk-hill--front" aria-hidden="true" />
              <p className="yk-world-note"><span className="yk-day-note">ひと息つこう。</span><span className="yk-night-note">のんびり、夜じかん。</span></p>
              <img className="yk-world-friend" src={`${base}characters/happa.png`} width="512" height="512" alt="木陰にいる、もふもふのはっぱ" decoding="async" />
              <details className="yk-pet">
                <summary aria-label="たまごにあいさつする"><span className="yk-greeting yk-greeting--hello" aria-hidden="true">あ、きてくれた。</span><img className="yk-hero-egg" src={`${base}characters/egg.png`} width="512" height="512" alt="紫のしるしがある、たまごのキャラクター" fetchPriority="high" /><span className="yk-pet-hint">タップして、ごあいさつ <span aria-hidden="true">↗</span></span></summary>
                <p className="yk-greeting yk-greeting--reply">会いにきてくれて、<br />うれしいな。</p>
              </details>
              <Flower className="yk-scene-flower" />
            </div>
            <div className="yk-world-caption"><span>ちいさな世界を、のぞいてみよう。</span><span>MINI EXPERIENCE</span></div>
          </div>
          <a className="yk-scroll" href="#about"><span>この世界について</span><span aria-hidden="true">↓</span></a>
        </section>

        <section id="about" className="yk-about yk-wrap" aria-labelledby="yk-about-title">
          <div className="yk-section-marker"><span>01 / ABOUT</span><Flower /></div>
          <div className="yk-about-body"><h2 id="yk-about-title">がんばる場所じゃなく、<br />ほっとできる場所を。</h2><div className="yk-about-text"><p>いい日も、そうじゃない日も。<br />小さななかまと過ごす時間が、<br />自分の気持ちに目を向けるきっかけに。</p><p>YOKI YOKIは、キャラクターとの日々を楽しみながら、<br className="yk-desktop-break" />あなた自身もいたわるセルフケアアプリです。</p></div></div>
        </section>

        <section className="yk-rituals yk-wrap" aria-label="YOKI YOKIで過ごす時間">
          <article className="yk-ritual yk-ritual--rest"><div className="yk-ritual-art"><span className="yk-art-label">TAKE A LITTLE BREAK</span><img src={`${base}characters/odando.png`} width="512" height="512" loading="lazy" decoding="async" alt="まあるくて、もふもふのおだんご" /><span className="yk-rest-line" aria-hidden="true" /></div><div className="yk-ritual-copy"><span className="yk-ritual-number">01</span><h3>まずは、ひと息。</h3><p>なかまの顔を見にきたり、いっしょに過ごしたり。<br />忙しい毎日に、何気ないひとときを。</p></div></article>
          <article className="yk-ritual yk-ritual--record"><div className="yk-ritual-art"><span className="yk-art-label">A MOMENT FOR YOURSELF</span><div className="yk-note"><span className="yk-note-tag">ちいさな「よき」の例</span><p>あたたかいお茶を<br />ゆっくり飲めた。</p><div className="yk-note-rule" /><span className="yk-note-foot">なんでもないことが、今日のよき。</span><Flower /></div></div><div className="yk-ritual-copy"><span className="yk-ritual-number">02</span><h3>いまの気持ちを、残す。</h3><p>今日の気分や、心に残ったことを少しだけ。<br />うまい言葉じゃなくて、あなたの言葉で。</p></div></article>
          <article className="yk-ritual yk-ritual--grow"><div className="yk-ritual-art"><span className="yk-art-label">LITTLE BY LITTLE</span><div className="yk-growth-ring" aria-hidden="true" /><img src={`${base}characters/colorful_happa.png`} width="512" height="512" loading="lazy" decoding="async" alt="虹色の毛並みのカラフルはっぱ" /><span className="yk-grow-spark" aria-hidden="true">✦</span></div><div className="yk-ritual-copy"><span className="yk-ritual-number">03</span><h3>小さな変化を、楽しむ。</h3><p>あなたの日々が、なかまのエネルギーに。<br />一緒に過ごす時間を、少しずつ重ねて。</p></div></article>
        </section>

        <section id="friends" className="yk-friends" aria-labelledby="yk-friends-title"><div className="yk-wrap"><div className="yk-section-heading"><div><p className="yk-kicker">02 / LITTLE FRIENDS</p><h2 id="yk-friends-title">なんだか、<br className="yk-mobile-break" />ほっとけない。</h2></div><p>ふしぎで、やわらかくて、ちょっと不器用。<br />あなたの毎日に寄り添う、小さななかまたち。</p></div><div className="yk-friend-grid">{characters.map((character, index) => <article key={character.image} className={`yk-friend yk-friend--${character.tone}`}><div className="yk-friend-picture"><span className="yk-friend-index">0{index + 1}</span><img src={`${base}characters/${character.image}`} width="512" height="512" loading="lazy" decoding="async" alt={character.name} /></div><h3>{character.name}</h3><p>{character.note}</p></article>)}</div></div></section>

        <section id="questions" className="yk-questions yk-wrap" aria-labelledby="yk-questions-title"><div><p className="yk-kicker">03 / QUESTIONS</p><h2 id="yk-questions-title">気になること。</h2><p className="yk-question-help">ほかに知りたいことは、<br /><a href={`${base}support/`}>サポートページへ <Arrow diagonal /></a></p></div><div className="yk-faq-list">{questions.map((question) => <details className="yk-faq" key={question.title}><summary><span>{question.title}</span><span className="yk-plus" aria-hidden="true" /></summary><p>{question.answer}</p></details>)}</div></section>

        <section className="yk-invitation" aria-labelledby="yk-invitation-title"><div className="yk-wrap yk-invitation-inner"><div><p className="yk-kicker">YOUR OWN LITTLE PLACE</p><h2 id="yk-invitation-title">今日の「よき」を、<br />ひとつ。</h2><p className="yk-invitation-text">まずは、この子に会うところから。</p><Cta location="footer" light /><p className="yk-browser-note">ブラウザで開きます</p></div><div className="yk-invitation-art" aria-hidden="true"><span className="yk-big-circle" /><img src={`${base}characters/colorful_happa.png`} alt="" width="512" height="512" loading="lazy" decoding="async" /><Flower /></div></div></section>
      </main>

      <footer className="yk-footer yk-wrap"><div className="yk-footer-top"><Brand /><nav aria-label="フッターナビゲーション"><a href={`${base}articles/`}>読みもの</a><a href={`${base}support/`}>サポート</a><a href={`${base}privacy/`}>プライバシーポリシー</a></nav></div><div className="yk-footer-bottom"><p>YOKI YOKIは、医療行為・診断・治療の代わりになるものではありません。</p><span>© {new Date().getFullYear()} YOKI YOKI</span></div></footer>
      <aside className="yk-mobile-cta" aria-label="アプリをはじめる"><span>あなたの、ちいさな居場所。</span><Cta location="mobile_sticky" compact /></aside>
    </div>
  );
}
