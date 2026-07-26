import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';

type SectionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: React.ReactNode;
};

export default function GuideScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const bgColors = isDark
    ? (['#0E0A1C', '#130D28'] as const)
    : (['#FAF7FF', '#F0F5FF'] as const);
  const cardGradient = isDark ? (['#1A1430', '#0F1030'] as const) : (['#FFF', '#F7F0FF'] as const);

  const topPad = Platform.OS === 'web' ? 24 : insets.top + 8;

  const Section = ({ icon, title, children }: SectionProps) => (
    <View style={[styles.card, { borderColor: colors.border, overflow: 'hidden' }]}>
      <LinearGradient colors={cardGradient} style={[StyleSheet.absoluteFill, { borderRadius: 22 }]} />
      <View style={styles.sectionHeader}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '22' }]}>
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      {children}
    </View>
  );

  const P = ({ children }: { children: React.ReactNode }) => (
    <Text style={[styles.body, { color: colors.foreground }]}>{children}</Text>
  );
  const Hint = ({ children }: { children: React.ReactNode }) => (
    <Text style={[styles.hint, { color: colors.mutedForeground }]}>{children}</Text>
  );
  const Bullet = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={styles.bulletRow}>
      <Text style={[styles.bulletLabel, { color: colors.primary }]}>{label}</Text>
      <Text style={[styles.bulletBody, { color: colors.foreground }]}>{children}</Text>
    </View>
  );

  return (
    <View style={styles.flex}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingTop: topPad, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={12}
            style={[styles.backBtn, { backgroundColor: colors.muted }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>使い方ガイド</Text>
          <View style={{ width: 38 }} />
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          このアプリでできること、AIとの付き合い方をまとめました。
        </Text>

        <Section icon="home-outline" title="ホーム">
          <P>あなたの相棒(マスコット)が住んでいる場所です。毎日の記録やチェックを続けると、相棒が元気になり、部屋もにぎやかになっていきます。</P>
          <Hint>まずは1日1回、顔を見に来るだけでOKです。</Hint>
        </Section>

        <Section icon="checkmark-circle-outline" title="チェック">
          <P>今日の心の状態をかんたんな質問でチェックします。深く考えず、直感で答えて大丈夫です。</P>
          <Hint>毎日同じ時間帯にやると、変化に気づきやすくなります。</Hint>
        </Section>

        <Section icon="pencil-outline" title="きろく">
          <P>気分やできごとを記録する場所です。短い一言でも十分。積み重ねるほど、AIの分析が的確になっていきます。</P>
        </Section>

        <Section icon="chatbubble-ellipses-outline" title="チャット">
          <P>AIにいつでも話しかけられます。愚痴でも相談でも雑談でもOK。あなたの記録とプロフィールを踏まえて返事をしてくれます。</P>
          <Hint>AIの提案は参考情報です。つらい状態が続くときは、専門家や身近な人にも相談してください。</Hint>
        </Section>

        <Section icon="trending-up-outline" title="メンタルの成長">
          <P>続けた分だけレベルやバッジが増え、気分の推移もグラフやカレンダーで振り返れます。</P>
        </Section>

        <Section icon="person-outline" title="プロフィールとAIの関係">
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

        <Section icon="cloud-outline" title="データについて">
          <P>記録はスマホ内に保存され、ログイン中は自動でクラウドにも同期されます。機種変更しても、同じアカウントでログインすればデータは戻ってきます。</P>
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  card: { borderRadius: 22, padding: 20, borderWidth: 1, gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', letterSpacing: -0.3 },
  body: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  hint: { fontSize: 12.5, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  bulletRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bulletLabel: { fontSize: 13.5, fontFamily: 'Inter_600SemiBold', lineHeight: 21, minWidth: 92 },
  bulletBody: { flex: 1, fontSize: 13.5, fontFamily: 'Inter_400Regular', lineHeight: 21 },
});
