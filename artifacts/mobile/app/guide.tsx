import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
            onPress={() => router.back()}
            hitSlop={space.md}
            style={styles.backBtn}
            accessibilityLabel="戻る"
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
            YOKKY は「あなたの元気が世界を動かす」メンタルケアアプリです。
          </P>
          <P>
            毎日の気分や行動を記録すると、あなたとともに暮らすキャラクターが元気になります。
            元気になったキャラクターは光を放ち、その光が太陽を明るくし、ひかり発電所のソーラーパネルを輝かせます。
            発電したエネルギーを売って、キャラクターへのごほうびに変えることができます。
          </P>
          <View style={styles.flowBox}>
            <FlowStep icon="edit-3" text="あなたが記録・チェックをする" />
            <FlowArrow />
            <FlowStep icon="heart" text="キャラクターが元気になり、光を放つ" />
            <FlowArrow />
            <FlowStep icon="sun" text="太陽が明るくなり、日差しが強くなる" />
            <FlowArrow />
            <FlowStep icon="zap" text="ソーラーパネルが輝き、エネルギーが蓄まる" />
            <FlowArrow />
            <FlowStep icon="coffee" text="売電してキャラクターにごはんをあげる" />
          </View>
          <Hint>自分を大切にすることが、そのままキャラクターへの愛情になる——そんなループを体験してください。</Hint>
        </Section>

        {/* ホーム */}
        <Section icon="home" title="ホーム">
          <P>あなたの相棒(キャラクター)が住んでいる場所です。毎日の記録やチェックを続けると、キャラクターが元気になり、光があふれてきます。</P>
          <Bullet label="ごはん">ごはんポイントを使ってキャラクターにごはんをあげると、満腹度が上がって元気になります。</Bullet>
          <Bullet label="なでる">キャラクターをタップしてなでてあげましょう。</Bullet>
          <Hint>まずは1日1回、顔を見に来るだけでOKです。</Hint>
        </Section>

        {/* きろく */}
        <Section icon="edit-3" title="きろく(記録タブ)">
          <P>気分・チェック・できごとを記録する場所です。短い一言でも十分。記録するたびに光エネルギーが増えます。</P>
          <Bullet label="チェック">今日の心の状態をかんたんな質問で確認。達成ごとにごはんポイント +2、全完了で +10。</Bullet>
          <Bullet label="気分きろく">今日あったことや気持ちを書き留めましょう。記録すると +5pt。</Bullet>
          <Hint>毎日同じ時間帯にやると、変化に気づきやすくなります。</Hint>
        </Section>

        {/* チャット */}
        <Section icon="message-circle" title="チャット">
          <P>AIにいつでも話しかけられます。愚痴でも相談でも雑談でもOK。あなたの記録とプロフィールを踏まえて返事をしてくれます。</P>
          <Hint>AIの提案は参考情報です。つらい状態が続くときは、専門家や身近な人にも相談してください。</Hint>
        </Section>

        {/* 成長 */}
        <Section icon="trending-up" title="成長">
          <P>続けた分だけレベルやバッジが増え、気分の推移もグラフやカレンダーで振り返れます。</P>
        </Section>

        {/* 発電所 */}
        <Section icon="zap" title="ひかり発電所">
          <P>キャラクターの元気が太陽を照らし、ソーラーパネルが発電する幻想的な場所です。</P>
          <Bullet label="売電">蓄まったエネルギーを売って、ごほうびポイントを獲得。</Bullet>
          <Bullet label="交換">ごほうびポイントをごはんポイントに変換。ホームでキャラクターにごはんをあげよう。</Bullet>
          <Hint>元気(キャラクターのコンディション)が高いほど、太陽が明るく輝きパネルの発電量も増えます。</Hint>
        </Section>

        {/* ミニゲーム */}
        <Section icon="music" title="ミニゲーム">
          <P>ホームから遊べるリズムゲームです。結果に応じてごはんポイントが貯まります(星4つ以上で +3pt)。光エネルギーは増えませんが、キャラクターとの絆が深まります。</P>
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
            ・プロフィールはいつでも変更できます(成長タブ右上の人型アイコン →「プロフィールを編集」)。
          </Hint>
        </Section>

        {/* データ */}
        <Section icon="cloud" title="データについて">
          <P>ログインなしでも記録はこの端末内に保存されます。ログインすると自動でクラウドにも同期され、機種変更しても同じアカウントでデータを戻せます。</P>
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
  title: { ...typography.title, color: colors.foreground },
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
  bulletRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  bulletLabel: { ...typography.calloutStrong, color: colors.primaryOnSoft, minWidth: 104 },
  bulletBody: { ...typography.callout, flex: 1, color: colors.foreground },
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
