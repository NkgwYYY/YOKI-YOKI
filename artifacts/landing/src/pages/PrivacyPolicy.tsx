import { LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { PublicPageShell } from '@/components/public-page-shell';
import { siteUrl } from '@/lib/seo';

const supportEmail = 'nkgw.y.0703@gmail.com';
const effectiveDate = '2026年9月4日';

function updatePrivacySeo() {
  const title = 'プライバシーポリシー｜YOKI YOKI';
  const description = 'YOKI YOKIが取り扱うプロフィール、気分記録、AIチャット、認証、アクセス解析などの情報と利用目的についてご案内します。';
  const url = `${siteUrl}/privacy/`;
  document.title = title;
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', description);
  document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute('content', title);
  document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.setAttribute('content', description);
  document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute('content', url);
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', url);
}

function PrivacySection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="article-section" aria-labelledby={`privacy-${number}`}>
      <div className="flex items-start gap-4">
        <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#e2be72]/30 bg-[#e2be72]/10 text-xs font-bold text-[#e9c981]">{number}</span>
        <div className="min-w-0 flex-1">
          <h2 id={`privacy-${number}`}>{title}</h2>
          <div className="privacy-copy">{children}</div>
        </div>
      </div>
    </section>
  );
}

export default function PrivacyPolicy() {
  useEffect(() => {
    updatePrivacySeo();
    window.scrollTo(0, 0);
  }, []);

  return (
    <PublicPageShell
      eyebrow="YOKI YOKI PRIVACY"
      title="あなたの記録と、丁寧につきあうために。"
      intro={`YOKI YOKIにおける情報の取り扱いについて、できるだけわかりやすくご案内します。制定日：${effectiveDate}`}
    >
      <div className="article-reading-shell !mx-0 !mb-0 !max-w-none !border-0 !bg-transparent !p-0 sm:!rounded-none sm:!border-0 sm:!bg-transparent sm:!p-0">
        <div className="article-reading-intro">
          <ShieldCheck className="h-5 w-5 shrink-0 text-[#e0bc72]" />
          <p>YOKI YOKIは、毎日の気分や小さな記録を自分のために振り返るアプリです。必要な範囲で情報を扱い、利用目的を明確にして運営します。</p>
        </div>

        <PrivacySection number="01" title="運営者・適用範囲">
          <p>運営者：YOKI YOKI運営</p>
          <p>本ポリシーは、YOKI YOKIのアプリ、Web版および関連する公式Webページ（以下「本サービス」）に適用されます。</p>
        </PrivacySection>

        <PrivacySection number="02" title="取り扱う情報">
          <p>本サービスでは、次の情報を取り扱います。入力しない情報や、ゲスト利用中に同期していない情報は、該当する機能の範囲では収集されません。</p>
          <div className="article-subsection">
            <h3>アカウント・認証に関する情報</h3>
            <p>ログインまたは新規登録を行う場合、メールアドレス、認証プロバイダに関する識別情報、アカウント識別子、認証状態などを認証サービス（Clerk）を通じて処理します。</p>
          </div>
          <div className="article-subsection">
            <h3>プロフィール・アプリ内の記録</h3>
            <p>ニックネーム、年代、性別、職業、目標、MBTI、血液型、気になっていることなどのプロフィール情報、気分・チェック・できごとの記録、キャラクターの成長状況、ポイント、ゲーム結果などを扱います。</p>
          </div>
          <div className="article-subsection">
            <h3>AIチャットの入力内容</h3>
            <p>AIチャットで送信したメッセージ、キャラクター名・成長状況、会話に必要な範囲のプロフィールや最近の記録を扱います。自由記述には、氏名、住所、パスワード、クレジットカード番号などの重要情報を入力しないでください。</p>
          </div>
          <div className="article-subsection">
            <h3>端末・利用状況に関する情報</h3>
            <p>ゲスト利用を含むアプリのデータは、端末またはブラウザのローカル領域に保存されます。Web版では、ページ閲覧やボタン操作などの利用状況をGoogle Analytics 4で計測する場合があります。</p>
          </div>
        </PrivacySection>

        <PrivacySection number="03" title="利用目的">
          <ul className="privacy-list">
            <li>本サービスの提供、本人確認、ログイン状態の維持、アカウント間のデータ同期のため</li>
            <li>気分記録やキャラクターの成長、ゲームなどの機能を提供するため</li>
            <li>AIチャットの返答を、会話や入力内容に合わせて生成するため</li>
            <li>不具合の調査、セキュリティの維持、本サービスの改善のため</li>
            <li>お問い合わせへの回答、データ削除などの依頼に対応するため</li>
          </ul>
        </PrivacySection>

        <PrivacySection number="04" title="第三者サービスへの提供">
          <p>本サービスの提供に必要な範囲で、次のサービスを利用します。各サービスの取り扱いは、各提供者のポリシーもあわせてご確認ください。</p>
          <div className="article-subsection">
            <h3>Clerk</h3>
            <p>ログイン・アカウント認証を提供します。認証に関する情報は、Clerkのサービスを経由して処理されます。</p>
          </div>
          <div className="article-subsection">
            <h3>OpenAI（ReplitのAI連携経由）</h3>
            <p>AIチャットの返答生成に必要なメッセージやコンテキストを送信します。AIの回答生成以外の目的で、本サービスがプロフィールや記録を送信することはありません。</p>
          </div>
          <div className="article-subsection">
            <h3>Google Analytics 4</h3>
            <p>Web版の利用状況やアクセス傾向を把握するために使用します。Googleによるデータ処理については、Googleのポリシーをご確認ください。</p>
          </div>
          <div className="article-subsection">
            <h3>Replit</h3>
            <p>本サービスのホスティング、サーバー実行、ログイン連携およびクラウド同期の基盤として利用します。</p>
          </div>
        </PrivacySection>

        <PrivacySection number="05" title="保存期間・削除">
          <p>ゲスト利用中の情報は、端末またはブラウザのローカルデータを削除するまで保存されます。アプリを削除した場合やブラウザデータを消去した場合、ゲストデータは復元できません。</p>
          <p>ログイン後に同期された情報は、アカウントの利用に必要な期間保存します。アカウント情報やクラウド上のデータの削除を希望する場合は、本人確認に必要な情報を添えてお問い合わせください。</p>
          <p>アプリ内でアカウントを削除した場合、遅れて届いた同期によってデータが再作成されることを防ぐため、アカウント識別子と削除済みであることを示す情報のみサーバーに保持します。この情報に記録内容やプロフィールは含めません。</p>
          <p>法令上保存が必要な情報や、匿名化された統計情報は、削除依頼の対象外となる場合があります。</p>
        </PrivacySection>

        <PrivacySection number="06" title="安全管理">
          <p>本サービスは、アクセス制御、認証、通信の暗号化など、取り扱う情報に応じた安全対策を行います。ただし、インターネット上の送受信や端末の安全を完全に保証するものではありません。</p>
        </PrivacySection>

        <PrivacySection number="07" title="未成年の利用">
          <p>本サービスは、保護者の同意なく利用する未成年者を対象としたものではありません。保護者の方は、お子さまが本サービスへ個人情報を入力しないようご確認ください。</p>
        </PrivacySection>

        <PrivacySection number="08" title="ポリシーの変更">
          <p>サービス内容や法令の変更に応じて、本ポリシーを更新する場合があります。重要な変更がある場合は、本ページ上でお知らせします。変更後も本サービスを利用した場合、更新後のポリシーが適用されます。</p>
        </PrivacySection>

        <section className="mt-12 rounded-2xl border border-[#e2be72]/20 bg-[#e2be72]/[.06] p-5 sm:p-6" aria-labelledby="privacy-contact-heading">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-1 h-5 w-5 shrink-0 text-[#e9c981]" />
            <div>
              <h2 id="privacy-contact-heading" className="font-[Zen_Maru_Gothic] text-lg text-[#f4e9d2]">お問い合わせ窓口</h2>
              <p className="mt-3 text-sm leading-7 text-[#cfc1d4]">本ポリシー、情報の開示・訂正・削除に関するお問い合わせは、次のアドレスへご連絡ください。</p>
              <a href={`mailto:${supportEmail}`} className="focus-ring mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#f0cc83] underline decoration-[#f0cc83]/30 underline-offset-4 hover:decoration-[#f0cc83]">
                <Sparkles className="h-4 w-4" />{supportEmail}
              </a>
            </div>
          </div>
        </section>

        <p className="mt-10 text-right text-xs text-[#95869f]">制定日：{effectiveDate}</p>
      </div>
    </PublicPageShell>
  );
}