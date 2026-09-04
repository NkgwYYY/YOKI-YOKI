import { ArrowLeft, Sparkles } from 'lucide-react';

const base = import.meta.env.BASE_URL;

export function PublicPageShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main className="article-site min-h-screen">
      <header className="article-header">
        <a href={base} className="article-brand" aria-label="YOKI YOKI トップページへ">
          <span className="article-brand-mark"><Sparkles className="h-4 w-4" /></span>
          <span>YOKI YOKI</span>
        </a>
        <nav className="flex items-center gap-4 text-sm text-[#cfc3df]" aria-label="サイトメニュー">
          <a className="article-nav-link hidden sm:inline" href={`${base}articles/`}>読みもの</a>
          <a className="article-nav-link" href="https://yoki-yoki.replit.app/" rel="noopener noreferrer">アプリを開く</a>
        </nav>
      </header>

      <div className="article-hero">
        <div className="article-hero-glow" />
        <div className="relative mx-auto max-w-4xl px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-20">
          <a href={base} className="article-backlink">
            <ArrowLeft className="h-4 w-4" />公式サイトへ戻る
          </a>
          <p className="mt-10 text-xs font-bold tracking-[.3em] text-[#dfbd78]">{eyebrow}</p>
          <h1 className="mt-5 max-w-3xl font-[Zen_Maru_Gothic] text-3xl leading-[1.65] text-[#f5effa] sm:text-5xl sm:leading-[1.5]">{title}</h1>
          <p className="mt-6 max-w-2xl font-[Zen_Maru_Gothic] text-sm leading-8 text-[#b7a9c3] sm:text-base">{intro}</p>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
        {children}
      </div>

      <footer className="article-footer">
        © {new Date().getFullYear()} YOKI YOKI <span aria-hidden="true">·</span>{' '}
        <a href={`${base}support/`}>サポート</a> <span aria-hidden="true">·</span>{' '}
        <a href={`${base}privacy/`}>プライバシーポリシー</a>
      </footer>
    </main>
  );
}