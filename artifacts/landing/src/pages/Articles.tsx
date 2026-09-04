import { ArrowRight, BookOpen, ChevronRight, Clock3, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ARTICLES, ARTICLE_CATEGORIES } from '@/data/articles';
import { updateArticleSeo } from '@/lib/seo';

const base = import.meta.env.BASE_URL;

function ArticleHeader() {
  return (
    <header className="article-header">
      <a href={base} className="article-brand" aria-label="YOKI YOKI トップページへ">
        <span className="article-brand-mark"><Sparkles className="h-4 w-4" /></span>
        <span>YOKI YOKI</span>
      </a>
      <nav className="flex items-center gap-5 text-sm text-[#cfc3df]" aria-label="記事メニュー">
        <a className="article-nav-link" href={`${base}articles/`}>読みもの</a>
        <a className="article-nav-link hidden sm:inline" href="https://yoki-yoki.replit.app/" rel="noopener noreferrer">アプリを開く</a>
      </nav>
    </header>
  );
}

function ArticleCard({ slug, title, description, publishedAt, category, readingTime }: typeof ARTICLES[number]) {
  return (
    <a href={`${base}articles/${slug}/`} className="article-card group">
      <div className="flex items-center justify-between gap-3 text-xs text-[#a99cbb]">
        <span className="article-category">{category}</span>
        <time dateTime={publishedAt}>{publishedAt.replaceAll('-', '.')}</time>
      </div>
      <h2 className="mt-5 font-[Zen_Maru_Gothic] text-xl leading-8 text-[#f5effa] transition-colors group-hover:text-[#f0cb82]">{title}</h2>
      <p className="mt-4 line-clamp-3 text-sm leading-7 text-[#afa4bc]">{description}</p>
      <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5 text-xs text-[#9c8eae]">
        <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />読了目安 {readingTime}</span>
        <span className="flex items-center gap-1 text-[#d7b56f]">読む <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
      </div>
    </a>
  );
}

export default function Articles() {
  const [category, setCategory] = useState('すべて');
  const visibleArticles = useMemo(() => category === 'すべて' ? ARTICLES : ARTICLES.filter((article) => article.category === category), [category]);

  useEffect(() => {
    document.title = '読みもの｜心を整えるヒント｜YOKI YOKI';
    const description = '心の調子に気づき、自分を大切にするための読みもの。メンタルケアやセルフケアを、YOKI YOKIがやさしく紹介します。';
    const meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (meta) meta.content = description;
  }, []);

  return (
    <main className="article-site min-h-screen">
      <ArticleHeader />
      <div className="article-hero">
        <div className="article-hero-glow" />
        <div className="relative mx-auto max-w-5xl px-5 py-20 text-center sm:px-8 sm:py-28">
          <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl border border-[#e4c47d]/30 bg-[#e4c47d]/10 text-[#eccb88]"><BookOpen className="h-6 w-6" /></div>
          <p className="text-xs font-bold tracking-[.3em] text-[#dfbd78]">YOKI YOKI JOURNAL</p>
          <h1 className="mt-5 font-[Zen_Maru_Gothic] text-4xl leading-tight text-[#f5effa] sm:text-6xl">心を整える、<br className="sm:hidden" />小さな読みもの。</h1>
          <p className="mx-auto mt-6 max-w-xl font-[Zen_Maru_Gothic] text-sm leading-8 text-[#b7a9c3] sm:text-base">自分を責めるためではなく、少しだけ自分に気づくために。<br />毎日の心に寄り添うヒントをお届けします。</p>
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16" aria-labelledby="articles-heading">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs tracking-[.25em] text-[#8fc4df]">JOURNAL</p><h2 id="articles-heading" className="mt-2 font-[Zen_Maru_Gothic] text-2xl text-[#f5effa]">記事一覧</h2></div>
          <div className="flex flex-wrap gap-2" aria-label="カテゴリで絞り込み">
            {ARTICLE_CATEGORIES.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`focus-ring rounded-full border px-3.5 py-2 text-xs transition-colors ${category === item ? 'border-[#e2be72]/60 bg-[#e2be72] text-[#251732]' : 'border-white/15 bg-white/[.04] text-[#c3b6d2] hover:border-[#e2be72]/40 hover:text-[#f0cb82]'}`}>{item}</button>)}
          </div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {visibleArticles.map((article) => <ArticleCard key={article.slug} {...article} />)}
        </div>
      </section>

      <JournalCta />
       <footer className="article-footer">
         © {new Date().getFullYear()} YOKI YOKI <span aria-hidden="true">·</span> <a href={base}>公式サイト</a>
         <span aria-hidden="true">·</span> <a href={`${base}support/`}>サポート</a>
         <span aria-hidden="true">·</span> <a href={`${base}privacy/`}>プライバシーポリシー</a>
       </footer>
    </main>
  );
}

export function JournalCta() {
  return (
    <section className="article-cta-section mx-5 mb-12 overflow-hidden rounded-[2rem] sm:mx-auto sm:max-w-5xl" aria-labelledby="journal-cta-title">
      <div className="relative px-6 py-12 sm:px-12 sm:py-14">
        <div className="article-cta-orb" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <p className="text-xs font-bold tracking-[.24em] text-[#e8c67d]">A LITTLE LIGHT, EVERY DAY</p>
          <h2 id="journal-cta-title" className="mt-4 font-[Zen_Maru_Gothic] text-2xl leading-9 text-[#fbf4ff] sm:text-3xl">毎日の小さな変化を、<br />記録してみませんか？</h2>
          <p className="mt-5 text-sm leading-7 text-[#c4b7d0]">YOKI YOKIは、毎日の小さな頑張りや気持ちを記録し、自分の変化を見える化するメンタルケアアプリです。</p>
          <a href="https://yoki-yoki.replit.app/" rel="noopener noreferrer" className="focus-ring mt-7 inline-flex items-center gap-3 rounded-full border border-[#ead091]/60 bg-[#e2bd70] px-5 py-3.5 text-sm font-bold text-[#271a36] shadow-[0_12px_32px_rgba(226,189,112,.2)] transition-transform hover:-translate-y-1">YOKI YOKIを使ってみる <ChevronRight className="h-4 w-4" /></a>
        </div>
      </div>
    </section>
  );
}