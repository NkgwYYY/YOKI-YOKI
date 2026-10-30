import { LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { PublicPageShell } from '@/components/public-page-shell';
import { siteUrl } from '@/lib/seo';

const supportEmail = 'nkgw.y.0703@gmail.com';
const effectiveDate = '2026年10月30日';

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
            <p>アカウント機能に対応したiOS版では、新規登録・ログイン・登録せずに利用する方法を選べます。Web版と同じアカウントでログインすると、日記・気分記録・プロフィール・育成状況・お部屋などの保存データをアカウントに紐づけてサーバーに保存し、端末間で同期します。ゲスト利用中は、このアカウント同期は行いません。ログイン状態を維持するため、認証トークンを端末の保護された領域に保存します。</p>
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
            <p>日記や育成などのデータは、端末またはブラウザのローカル領域に保存されます。ゲスト利用でも、AIや友だち機能、広告報酬などのオンライン機能を使う場合は、それぞれに必要な情報を送信します。Web版で「アプリをはじめる」を選ぶと、次回の入口を記憶するためのCookieを最長1年間保存します。Web版では、ページ閲覧やボタン操作などの利用状況をGoogle Analytics 4で計測する場合があります。</p>
          </div>
          <div className="article-subsection">
            <h3>友だち機能・広告報酬に関する情報</h3>
            <p>友だち機能または広告報酬を利用すると、ランダムに作成した利用者識別子に紐づけて、招待コード、公開を選んだキャラクター・家具、友だち・ブロックの関係、定型文の足跡、報酬の受取履歴をサーバーに保存します。日記、AIとの会話、プロフィールや気分記録を友だちに公開することはありません。</p>
            <p>報酬の重複受取や不正を防ぐため、広告の視聴確認情報、報酬の状態、広告収益の推定値を扱います。また、広告の読み込み・終了・エラー、友だちの訪問などの操作種別と所要時間を、この識別子に紐づけて保存します。これらの操作記録に日記や会話の本文は含めません。</p>
          </div>
        </PrivacySection>

        <PrivacySection number="03" title="利用目的">
          <ul className="privacy-list">
            <li>本サービスの提供、本人確認、ログイン状態の維持、同じアカウントを利用する端末間のデータ同期のため</li>
            <li>気分記録やキャラクターの成長、ゲームなどの機能を提供するため</li>
            <li>AIチャットの返答を、会話や入力内容に合わせて生成するため</li>
            <li>不具合の調査、セキュリティの維持、本サービスの改善のため</li>
            <li>友だちの訪問、広告配信、報酬の付与・不正防止、および機能の利用状況や広告の動作を確認するため</li>
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
            <p>AIチャット、ホームのひとこと、ログイン利用時の「きづき」の生成に必要なメッセージ、プロフィール、気分・睡眠・行動などの記録を送信します。交換日記のAI返信は、日記画面で別途同意した場合に、その日記の本文・気分・日付・キャラクター名を送信して作成します。同意後に渡す日記には自動で返信を作成し、過去の日記は返信を求めたページだけを送信します。日記のAI返信への同意は日記画面またはプロフィールから取り消せます。ログイン利用時の「きづき」では最大1年分の記録を使用します。ゲスト利用時の「きづき」は端末内で作成し、AIに送信しません。送信前にアプリ内で送信先と情報の種類を表示し、明示的な同意を求めます。</p>
            <p>プロフィールの「AIへの情報送信・同意設定」から、いつでも同意を取り消せます。取り消した後のAIへの送信は停止します。同意しなくても、記録・育成・ミニゲームは利用できます。すでに送信された情報には、各サービスのデータ取り扱い方針が適用されます。プロフィールや記録を広告リクエストの項目に含めることはありません。</p>
          </div>
          <div className="article-subsection">
            <h3>Google Analytics 4</h3>
            <p>Web版の利用状況やアクセス傾向を把握するために使用します。Googleによるデータ処理については、Googleのポリシーをご確認ください。</p>
          </div>
          <div className="article-subsection">
            <h3>Google AdMob・Google AdSense</h3>
            <p>アプリ内ではAdMob、公開の紹介・読みものページではAdSenseを広告配信に使用します。広告配信、表示回数の測定、不正利用の防止のため、Cookie、端末情報、IPアドレスなどがGoogleにより処理される場合があります。非パーソナライズ広告をリクエストし、プロフィール、日記、気分記録、AIとの会話内容を広告リクエストの項目に含めません。</p>
            <p>AdMobでは、おおよその地域の推定に使われるIPアドレス、端末やアプリに関する識別子、広告の表示・操作、クラッシュや性能に関する情報が処理される場合があります。報酬付き広告では、視聴と報酬を照合するため、ランダムな利用者識別子と報酬リクエストの識別子をGoogleに送信します。</p>
            <p>ブラウザーのアプリ画面（初期登録・記録・会話を含む）にはAdSenseコードを配置しません。対象地域で同意メッセージが表示される場合、ページ下部の広告のプライバシー設定から選択を変更できます。広告のクリックに対する報酬はありません。</p>
            <p><a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">Googleによるパートナーサイトやアプリの情報の使用</a></p>
          </div>
          <div className="article-subsection">
            <h3>Replit</h3>
            <p>本サービスのホスティング、サーバー実行、ログイン連携およびクラウド同期の基盤として利用します。</p>
          </div>
        </PrivacySection>

        <PrivacySection number="05" title="保存期間・削除">
          <p>端末内の日記や育成の情報は、端末またはブラウザのローカルデータを削除するまで保存されます。同期していないローカルデータを削除すると復元できません。アプリの削除だけでは、すでにサーバーや外部サービスに送った情報は削除されません。</p>
          <p>友だち機能や広告報酬のサーバーデータは、アプリの「友だちのおうち」にある「友だち機能のデータを削除」から削除できます。招待コード、友だち・ブロック、足跡、報酬履歴と関連する操作記録が対象で、端末内の日記やお部屋は残ります。この削除を希望する場合は、アプリや端末のデータを消去する前に操作してください。</p>
          <p>ログイン後に同期された情報は、アカウントの利用に必要な期間保存します。アプリのアカウント設定にある「アカウントを削除」から、同期したアプリデータと認証アカウントを削除できます。ログアウトだけではクラウド上のデータは削除されません。アカウント削除後も、ゲストとして保存した記録は別のデータとして端末内に残る場合があります。操作できない場合は、本人確認に必要な情報を添えてお問い合わせください。</p>
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
