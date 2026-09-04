import { ClipboardCheck, ExternalLink, HelpCircle, LifeBuoy, Mail, Send } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { PublicPageShell } from '@/components/public-page-shell';
import { trackEvent } from '@/lib/analytics';
import { siteUrl } from '@/lib/seo';

const supportEmail = 'nkgw.y.0703@gmail.com';

const faqs = [
  {
    question: 'ログインしなくても使えますか？',
    answer: 'はい。まずはゲストとして端末内で使い始められます。ログインすると、プロフィールや記録をアカウントに同期して、機種変更後も引き継げます。',
  },
  {
    question: 'ログインしていない状態のデータを復元できますか？',
    answer: 'ゲスト利用中のデータは端末内に保存されます。アプリの削除、ブラウザデータの削除、端末の変更後は復元できない場合があります。大切な記録はログインして同期してください。',
  },
  {
    question: 'AIの返答が医療相談の代わりになりますか？',
    answer: 'なりません。YOKI YOKIのAIは気持ちを整理するための相棒です。緊急性がある場合やつらさが続く場合は、身近な人や医療機関、地域の相談窓口へご相談ください。',
  },
  {
    question: '退会・データ削除をしたい場合は？',
    answer: '削除を希望するアカウントのメールアドレスや状況を添えて、下のお問い合わせフォームからご連絡ください。本人確認に必要な情報以外のパスワードは送らないでください。',
  },
];

function updateSupportSeo() {
  const title = 'サポート｜YOKI YOKI';
  const description = 'YOKI YOKIの使い方、データ、AIチャットについてのよくある質問とお問い合わせ窓口です。';
  const url = `${siteUrl}/support/`;
  document.title = title;
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', description);
  document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute('content', title);
  document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.setAttribute('content', description);
  document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute('content', url);
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', url);
}

export default function Support() {
  const [category, setCategory] = useState('アプリの使い方');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    updateSupportSeo();
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    trackEvent('support_contact_opened', { category });
    const subject = `[YOKI YOKI] ${category}`;
    const body = [
      'お問い合わせありがとうございます。',
      '',
      `カテゴリ：${category}`,
      `返信先：${email || '未入力'}`,
      '',
      'お問い合わせ内容：',
      message.trim(),
      '',
      '※このフォームは入力内容を保存せず、お使いのメールアプリを開きます。',
    ].join('\n');
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setOpened(true);
  };

  return (
    <PublicPageShell
      eyebrow="YOKI YOKI SUPPORT"
      title="困ったときの、静かな案内所。"
      intro="使い方やデータについてのよくある質問をまとめました。解決しない場合は、フォームからお気軽にご連絡ください。"
    >
      <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <section className="glass-panel rounded-[1.6rem] p-6 sm:p-8" aria-labelledby="faq-heading">
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-[#9dcce5]/25 bg-[#9dcce5]/10 p-3 text-[#a9d8ed]"><HelpCircle className="h-5 w-5" /></div>
            <div>
              <p className="text-xs tracking-[.24em] text-[#8fc4df]">QUESTIONS</p>
              <h2 id="faq-heading" className="mt-1 font-[Zen_Maru_Gothic] text-xl text-[#f5effa]">よくある質問</h2>
            </div>
          </div>
          <div className="mt-7 space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="group rounded-2xl border border-white/10 bg-white/[.035] open:border-[#e2be72]/30 open:bg-[#e2be72]/[.045]">
                <summary onClick={(event) => { if (!(event.currentTarget.parentElement as HTMLDetailsElement).open) trackEvent('support_faq_opened'); }} className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 font-[Zen_Maru_Gothic] text-sm leading-7 text-[#eee5f5] [&::-webkit-details-marker]:hidden">
                  <span>{faq.question}</span>
                  <span className="text-xl font-light text-[#d9b96f] transition-transform group-open:rotate-45" aria-hidden="true">＋</span>
                </summary>
                <p className="border-t border-white/10 px-4 pb-4 pt-3 text-sm leading-7 text-[#c4b7d0]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="article-cta-section h-fit overflow-hidden rounded-[1.6rem]" aria-labelledby="contact-heading">
          <div className="relative p-6 sm:p-8">
            <div className="article-cta-orb" aria-hidden="true" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="rounded-full border border-[#e4c47d]/30 bg-[#e4c47d]/10 p-3 text-[#eccb88]"><LifeBuoy className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs tracking-[.24em] text-[#e8c67d]">CONTACT</p>
                  <h2 id="contact-heading" className="mt-1 font-[Zen_Maru_Gothic] text-xl text-[#fbf4ff]">お問い合わせ</h2>
                </div>
              </div>
              <p className="mt-6 text-sm leading-7 text-[#cfc1d4]">入力内容は保存せず、メールアプリに引き継ぎます。返信が必要な場合はメールアドレスをご入力ください。</p>
              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <label className="block text-sm text-[#e9dfef]">
                  <span className="mb-2 block text-xs text-[#bcaec9]">お問い合わせの種類</span>
                  <select value={category} onChange={(event) => setCategory(event.target.value)} className="focus-ring w-full rounded-xl border border-white/15 bg-[#17102b]/80 px-3.5 py-3 text-sm text-[#f5effa]">
                    <option>アプリの使い方</option>
                    <option>ログイン・データについて</option>
                    <option>不具合の報告</option>
                    <option>データ削除の依頼</option>
                    <option>その他</option>
                  </select>
                </label>
                <label className="block text-sm text-[#e9dfef]">
                  <span className="mb-2 block text-xs text-[#bcaec9]">返信先メールアドレス <span className="text-[#95879f]">（任意）</span></span>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@example.com" className="focus-ring w-full rounded-xl border border-white/15 bg-[#17102b]/80 px-3.5 py-3 text-sm text-[#f5effa] placeholder:text-[#82748e]" />
                </label>
                <label className="block text-sm text-[#e9dfef]">
                  <span className="mb-2 block text-xs text-[#bcaec9]">お問い合わせ内容</span>
                  <textarea required minLength={5} value={message} onChange={(event) => setMessage(event.target.value)} rows={5} placeholder="状況やご質問をお書きください" className="focus-ring w-full resize-y rounded-xl border border-white/15 bg-[#17102b]/80 px-3.5 py-3 text-sm leading-6 text-[#f5effa] placeholder:text-[#82748e]" />
                </label>
                <button type="submit" className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#ead091]/60 bg-[#e2bd70] px-5 py-3.5 text-sm font-bold text-[#271a36] shadow-[0_12px_32px_rgba(226,189,112,.2)] transition-transform hover:-translate-y-1">
                  <Send className="h-4 w-4" />メールアプリを開いて送信する
                </button>
              </form>
              {opened && <p className="mt-4 flex items-start gap-2 text-xs leading-6 text-[#d9c6e4]" role="status"><ClipboardCheck className="mt-1 h-4 w-4 shrink-0 text-[#9fd1e5]" />メールアプリが開かない場合は、下のメールアドレスへ直接ご連絡ください。</p>}
              <a href={`mailto:${supportEmail}`} className="focus-ring mt-5 inline-flex items-center gap-2 text-sm text-[#f0cc83] underline decoration-[#f0cc83]/30 underline-offset-4 hover:decoration-[#f0cc83]">
                <Mail className="h-4 w-4" />{supportEmail}
              </a>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-[1.6rem] border border-[#9dcce5]/20 bg-[#79a9cb]/[.07] p-6 sm:p-8" aria-labelledby="safety-heading">
        <div className="flex items-start gap-3">
          <ExternalLink className="mt-1 h-5 w-5 shrink-0 text-[#9fd1e5]" />
          <div>
            <h2 id="safety-heading" className="font-[Zen_Maru_Gothic] text-lg text-[#eaf5fb]">こころの緊急相談について</h2>
            <p className="mt-3 text-sm leading-7 text-[#c4d8e4]">YOKI YOKIは医療機関や緊急窓口ではありません。自分や誰かを傷つけてしまいそうなときは、地域の緊急窓口や医療機関、身近な人へすぐに連絡してください。</p>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}