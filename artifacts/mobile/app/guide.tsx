import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { backToRoom } from '@/utils/backToRoom';
import { border, colors, control, radius, screenPadding, space, typography } from '@/constants/theme';
import { SkyBackground } from '@/components/SkyBackground';
import { Icon, IconBadge, iconSize, type IconName } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';

type SectionProps = {
  icon: IconName;
  title: string;
  children: React.ReactNode;
};

export default function GuideScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isIOSGuestOnly = Platform.OS === 'ios';

  const topPad = Platform.OS === 'web' ? space.xl : insets.top + space.sm;

  const Section = ({ icon, title, children }: SectionProps) => (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <IconBadge name={icon} size="sm" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );

  const FlowArrow = () => (
    <Icon
      name="chevron-down"
      size={iconSize.xs}
      color={colors.subtleForeground}
      style={styles.flowArrow}
    />
  );
  const P = ({ children }: { children: React.ReactNode }) => (
    <Text style={styles.body}>{children}</Text>
  );
  const Hint = ({ children }: { children: React.ReactNode }) => (
    <Text style={styles.hint}>{children}</Text>
  );
  const Bullet = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletLabel}>{label}</Text>
      <Text style={styles.bulletBody}>{children}</Text>
    </View>
  );
  const FlowStep = ({ icon, text }: { icon: IconName; text: string }) => (
    <View style={styles.flowRow}>
      <Icon name={icon} size={iconSize.md} color={colors.primaryOnSoft} />
      <Text style={styles.flowText}>{text}</Text>
    </View>
  );

  return (
    <View style={styles.flex}>
      <SkyBackground />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad, paddingBottom: insets.bottom + space.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <PressScale
            onPress={() => backToRoom(router)}
            hitSlop={space.md}
            style={styles.backBtn}
            accessibilityLabel="戻る"
            accessibilityRole="button"
          >
            <Icon name="chevron-left" size={iconSize.md} color={colors.foreground} />
          </PressScale>
          <Text style={styles.title}>使い方ガイド</Text>
          <View style={styles.headerSpacer} />
        </View>
        <Text style={styles.subtitle}>
          このアプリでできること、AIとの付き合い方をまとめました。
        </Text>

        {/* コンセプト */}
        <Section icon="feather" title="このアプリのコンセプト">
          <P>
            YOKI YOKI は「あなたの元気が世界を動かす」メンタルケアアプリです。
          </P>
          <P>
            毎日の気分や行動を記録すると、あなたとともに暮らすキャラクターが元気になります。
            元気になったキャラクターは光を放ち、その光がエネルギーとなり、エネルギーチャージのクリスタルタンクを満たします。
            チャージしたエネルギーを変換して、キャラクターへのごほうびに変えることができます。
          </P>
          <View style={styles.flowBox}>
            <FlowStep icon="edit-3" text="あなたが記録・チェックをする" />
            <FlowArrow />
            <FlowStep icon="heart" text="キャラクターが元気になり、光を放つ" />
            <FlowArrow />
            <FlowStep icon="star" text="光が溢れ、庭園が明るく輝く" />
            <FlowArrow />
            <FlowStep icon="zap" text="クリスタルが輝き、エネルギーが蓄まる" />
            <FlowArrow />
            <FlowStep icon="coffee" text="エネルギーを変換してキャラクターにごはんをあげる" />
          </View>
          <Hint>自分を大切にすることが、そのままキャラクターへの愛情になる——そんなループを体験してください。</Hint>
        </Section>

        {/* ホーム */}
        <Section icon="home" title="ホーム">
          <P>あなたの相棒(キャラクター)が住んでいる場所です。毎日の記録やチェックを続けると、キャラクターが元気になり、光があふれてきます。</P>
          <Bullet label="ごはん">YOKIポイントを使ってキャラクターにごはんをあげると、満腹度が上がって元気になります。</Bullet>
          <Bullet label="ふれる">タップでごあいさつ、横に撫でるとなでなで。長押しで抱っこして、離すとふわりと着地します。メニューからも撫でられます。</Bullet>
          <Bullet label="暮らしの道具">ノートから今日の記録、お皿からごはん、本棚から思い出を開けます。ベッドでは相棒がひと休みします。お話しは画面下のボタンから。</Bullet>
          <Bullet label="暮らしを整える">部屋のメニューから、模様替え、お店、プロフィール設定を開けます。購入済みの家具や花は何度でも選び直せます。</Bullet>
          <Hint>まずは1日1回、顔を見に来るだけでOKです。</Hint>
        </Section>

        {/* きろく */}
        <Section icon="edit-3" title="部屋のノートで記録">
          <P>今日の気分と、できたことを短く記録できます。詳しく残したい日は詳細な記録も開けます。</P>
          <Bullet label="チェック">自分で選んだ日々の行動をチェック。各項目の初回達成でYOKIポイント +2、全完了で +10。同じ日のやり直しで報酬は増えません。</Bullet>
          <Bullet label="気分きろく">その日の最初の記録で +5pt。同じ日の内容は更新でき、ポイントや光エネルギーを重複して受け取ることはありません。</Bullet>
          <Hint>毎日同じ時間帯にやると、変化に気づきやすくなります。</Hint>
        </Section>

        {/* チャット */}
        <Section icon="message-circle" title="チャット">
          <P>AIにいつでも話しかけられます。愚痴でも相談でも雑談でもOK。あなたの記録とプロフィールを踏まえて返事をしてくれます。</P>
          <P>会話履歴・きづき・おうちのひとことは、この端末だけに保存され、別の端末には同期されません。</P>
          {!isIOSGuestOnly && <P>アカウントごとに別々に保存されます。ゲストの会話履歴はゲスト用に残り、ログイン先には引き継がれません。</P>}
          <Hint>AIの回答は医療上の診断・治療を目的としたものではありません。症状が続く場合や医療上の判断をする前に、医師または資格を持つ専門家へ相談してください。チャット回答の下には厚生労働省の参考資料を表示しています。</Hint>
        </Section>

        {/* 成長 */}
        <Section icon="trending-up" title="アルバム">
          <P>部屋の本棚か「思い出」から、出会った相棒や思い出を振り返れます。「記録と成長をくわしく見る」を開くと、レベルやバッジ、気分の推移、月のレポートも確認できます。</P>
          <P>ゲストの「記録のふりかえり」は、この端末に残した記録の件数を集計します。AIには送信しません。</P>
          {!isIOSGuestOnly && <P>ログイン中は、AIに記録を分析してもらう「きづき」を利用できます。</P>}
        </Section>

        {/* エネルギーチャージ */}
        <Section icon="zap" title="エネルギーチャージ">
          <P>キャラクターの元気が光となり、魔法の庭園でエネルギーとしてチャージされる幻想的な場所です。</P>
          <Bullet label="受け取る">庭園に蓄まったエネルギーをYOKIポイントとして受け取れます。</Bullet>
          <Bullet label="使い道">YOKIポイントは、ごはんやショップの着せ替え・背景・ボイスに使えます。</Bullet>
          <Hint>元気(キャラクターのコンディション)が高いほど、庭園が明るく輝きエネルギーのチャージ量も増えます。</Hint>
        </Section>

        <Section icon="sunrise" title="少しずつ変わる、小さな暮らし">
          <P>朝は木漏れ日、夜は星と小さな灯り。端末の時間に合わせて、おうちの景色が変わります。相棒は窓を眺めたり、ひと休みしたりして過ごしています。</P>
          <Hint>毎日来られなくても大丈夫。いつでも、あなたのペースで会いにきてね。</Hint>
        </Section>

        {/* プロフィール */}
        <Section icon="user" title="プロフィールとAIの関係">
          <P>プロフィールに入力した情報は、AIがあなたに合わせた言葉やアドバイスを選ぶための「参考情報」として使われます。</P>
          <Bullet label="ニックネーム">呼びかけに使われます。</Bullet>
          <Bullet label="年代・性別・職業">言葉選びや例え話があなたに合ったものになります。</Bullet>
          <Bullet label="目標">アドバイスの方向性が目標に寄ります(例:「睡眠を改善したい」なら睡眠まわりの提案が増えます)。</Bullet>
          <Bullet label="MBTI・血液型">性格の傾向のヒントとして軽く添えられます。決めつけには使いません。</Bullet>
          <Bullet label="気になっていること">AIが話題として気にかけてくれます。</Bullet>
          <Hint>
            大事なポイント:{'\n'}
            ・AIの分析のメインは、あくまであなたの実際の記録です。プロフィールは「味付け」程度。{'\n'}
            ・未入力や「回答しない」の項目は、AIに一切渡されません。{'\n'}
            ・これらの情報がAI以外の用途に使われることはありません。{'\n'}
            ・プロフィールはいつでも変更できます(部屋のメニュー →「プロフィール・話しかけ設定」)。
          </Hint>
        </Section>

        {/* データ */}
        <Section icon="cloud" title="データについて">
          {isIOSGuestOnly ? (
            <P>記録、進捗、所持アイテムはこの端末内に自動で保存されます。</P>
          ) : (
            <>
              <P>ログインなしでも記録はこの端末内に保存されます。ログインすると自動でクラウドにも同期され、機種変更しても同じアカウントでデータを戻せます。</P>
              <Bullet label="アカウント削除">
                ログイン中は、アルバム右上の人型アイコン →「アカウントを削除」から、認証情報と保存データを削除できます。削除したデータの復活を防ぐため、削除済みアカウントの識別情報のみサーバーに残ります。
              </Bullet>
            </>
          )}
          <Hint>アプリの削除、ブラウザデータの削除、端末の変更だけでは、ログインしていないデータを復元できません。</Hint>
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: screenPadding,
    gap: space.lg,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: control.icon,
    height: control.icon,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    ...border.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: { width: control.icon },
  title: { ...typography.title, color: colors.foreground, flex: 1, textAlign: 'center' },
  subtitle: { ...typography.callout, color: colors.mutedForeground },

  card: {
    backgroundColor: colors.card,
    ...border.hairline,
    borderRadius: radius.lg,
    padding: space.xl,
    gap: space.md,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  sectionTitle: { ...typography.subhead, color: colors.foreground, flex: 1 },
  body: { ...typography.body, color: colors.foreground },
  hint: { ...typography.caption, color: colors.mutedForeground, lineHeight: 20 },
  bulletRow: { gap: space.xs },
  bulletLabel: { ...typography.calloutStrong, color: colors.primaryOnSoft },
  bulletBody: { ...typography.callout, color: colors.foreground },
  flowBox: {
    backgroundColor: colors.backgroundSunken,
    ...border.hairline,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.sm,
  },
  flowRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flowText: { ...typography.callout, flex: 1, color: colors.foreground },
  flowArrow: { marginLeft: space.xs },
});
