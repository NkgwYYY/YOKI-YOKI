import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Clock3, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import type { Article } from '@/data/articles';
import { ARTICLES } from '@/data/articles';
import { updateArticleSeo } from '@/lib/seo';
import { JournalCta } from './Articles';

const base = import.meta.env.BASE_URL;

function ArticleHeader() {
  return (
    <header className="article-header">
      <a href={base} className="article-brand" aria-label="YOKI YOKI トップページへ">
        <span className="article-brand-mark"><Sparkles className="h-4 w-4" /></span>
        <span>YOKI YOKI</span>
      </a>
      <nav className="flex items-center gap-5 text-sm text-[#cfc3df]" aria-label="記事メニュー">
        <a className="article-nav-link" href={`${base}articles/`}>読みもの一覧</a>
        <a className="article-nav-link hidden sm:inline" href="https://yoki-yoki.replit.app/" rel="noopener noreferrer">アプリを開く</a>
      </nav>
    </header>
  );
}

function RelatedArticles({ current }: { current: Article }) {
  const related = ARTICLES.filter((article) => article.slug !== current.slug).slice(0, 3);
  return (
    <section className="mx-auto max-w-3xl px-5 pb-20 sm:px-8" aria-labelledby="related-heading">
      <div className="mb-7 flex items-center gap-3"><span className="h-px flex-1 bg-white/10" /><h2 id="related-heading" className="whitespace-nowrap font-[Zen_Maru_Gothic] text-lg text-[#eee5f5]">こちらも読む</h2><span className="h-px flex-1 bg-white/10" /></div>
      <div className="grid gap-3 sm:grid-cols-3">
        {related.map((article) => <a className="related-article group" key={article.slug} href={`${base}articles/${article.slug}/`}><span className="text-[11px] text-[#d6b46d]">{article.category}</span><h3 className="mt-2 font-[Zen_Maru_Gothic] text-sm leading-6 text-[#eee5f5] group-hover:text-[#edc778]">{article.title}</h3><ArrowRight className="mt-4 h-4 w-4 text-[#9d8bac] transition-transform group-hover:translate-x-1" /></a>)}
      </div>
    </section>
  );
}

export default function ArticleDetail({ article }: { article: Article }) {
  useEffect(() => { updateArticleSeo(article); window.scrollTo(0, 0); }, [article]);

  return (
    <main className="article-site min-h-screen">
      <ArticleHeader />
      <article className="article-detail">
        <header className="mx-auto max-w-3xl px-5 pb-12 pt-16 sm:px-8 sm:pb-16 sm:pt-24">
          <a href={`${base}articles/`} className="article-backlink"><ArrowLeft className="h-4 w-4" />記事一覧へ戻る</a>
          <div className="mt-10 flex flex-wrap items-center gap-3 text-xs text-[#b8a9c4]"><span className="article-category">{article.category}</span><span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /><time dateTime={article.publishedAt}>{article.publishedAt.replaceAll('-', '.')}</time></span><span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />読了目安 {article.readingTime}</span></div>
          <h1 className="mt-7 font-[Zen_Maru_Gothic] text-3xl leading-[1.65] text-[#f7f0fb] sm:text-5xl sm:leading-[1.5]">{article.title}</h1>
          <p className="mt-7 font-[Zen_Maru_Gothic] text-base leading-8 text-[#b9adbf] sm:text-lg">{article.description}</p>
        </header>

        <div className="article-reading-shell">
          <div className="article-reading-intro"><BookOpen className="h-5 w-5 shrink-0 text-[#e0bc72]" /><p>心の状態は、日によって変わります。ここでは自分を責めずに、今できることを一緒に考えます。</p></div>
          {article.sections.map((section) => <section key={section.heading} className="article-section"><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.subsections?.map((subsection) => <div className="article-subsection" key={subsection.heading}><h3>{subsection.heading}</h3>{subsection.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>)}</section>)}
          <aside className="article-note"><strong>大切なお知らせ</strong><p>この記事は一般的な情報を紹介するもので、診断や治療の代わりにはなりません。つらさが続くとき、生活に支障があるときは医療機関や相談窓口にご相談ください。</p></aside>
        </div>
      </article>
      <JournalCta />
      <RelatedArticles current={article} />
      <footer className="article-footer">© {new Date().getFullYear()} YOKI YOKI <span aria-hidden="true">·</span> <a href={base}>公式サイト</a></footer>
    </main>
  );
}