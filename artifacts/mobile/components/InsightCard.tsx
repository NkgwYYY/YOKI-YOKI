import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius, space, typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, IconBadge, iconSize } from '@/components/ui/Icon';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { profileToContext } from '@/utils/profileContext';

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;
const STORAGE_KEY = '@mentore/insight_v1';

interface Insight {
  title: string;
  body: string;
}

interface CachedInsight {
  date: string;
  insights: Insight[];
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function InsightCard() {
  const { records, progress, checkedState, unlockedBadges, mascotName, profile } = useApp();
  const { getToken } = useAuth();

  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Restore today's cached insights
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const cached = JSON.parse(raw) as CachedInsight;
        if (cached.date === todayStr() && cached.insights?.length) {
          setInsights(cached.insights);
        }
      } catch {}
    })();
  }, []);

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    setError(false);
    try {
      const payload = {
        mascotName,
        profile: profileToContext(profile),
        records: records.slice(-365).map(r => ({
          date: r.date,
          mood: r.mood,
          sleep: r.sleep,
          behaviors: r.behaviors,
          notes: r.notes?.slice(0, 80) || undefined,
          exercise: r.exercise,
          meal: r.meal,
          social: r.social,
          win: r.win?.slice(0, 40) || undefined,
        })),
        progress: {
          level: progress.level,
          streak: progress.streak,
          totalDays: progress.totalDays,
        },
        checklist: {
          todayDone: checkedState.items.filter(i => i.checked).length,
          todayTotal: checkedState.items.length,
        },
        badgeCount: unlockedBadges.length,
      };
      const token = await getToken();
      const res = await fetch(`${API_BASE}/insight`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('bad status');
      const data = await res.json();
      if (!data.insights?.length) throw new Error('empty');
      setInsights(data.insights);
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ date: todayStr(), insights: data.insights } satisfies CachedInsight),
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const hasData = records.length > 0;

  return (
    <Card style={styles.card}>
      <View style={styles.titleWrap}>
        <IconBadge name="activity" />
        <View style={styles.titleCopy}>
          <Text style={styles.title}>{mascotName}のきづき</Text>
          <Text style={styles.subtitle}>あなたが気づいていない頑張り、見つけるよ</Text>
        </View>
      </View>

      {insights ? (
        <View style={styles.list}>
          {insights.map((ins, i) => (
            <View key={i} style={styles.item}>
              <Icon name="check" size={iconSize.sm} color={colors.primaryOnSoft} style={styles.itemMark} />
              <View style={styles.itemBody}>
                <Text style={styles.itemTitle}>{ins.title}</Text>
                <Text style={styles.itemText}>{ins.body}</Text>
              </View>
            </View>
          ))}
          <Text style={styles.note}>明日になると、また新しい発見を探せるよ</Text>
        </View>
      ) : !hasData ? (
        <Text style={styles.emptyText}>
          記録がたまると、{mascotName}があなたのすごいところを見つけられるよ。まずは今日の気分を記録してみよう！
        </Text>
      ) : (
        <>
          <Button
            label={loading ? '記録をじっくり見てる…' : 'すごいところを見つけてもらう'}
            onPress={generate}
            loading={loading}
            icon="activity"
          />
          {error && (
            <Text style={styles.errorText}>
              うまく見つけられなかった…少し待ってもう一度試してね
            </Text>
          )}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.lg },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  titleCopy: { flex: 1 },
  title: { ...typography.subhead, color: colors.foreground },
  subtitle: { ...typography.caption, color: colors.mutedForeground, marginTop: space.xs },
  list: { gap: space.sm },
  item: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    alignItems: 'flex-start',
  },
  itemMark: { marginTop: 2 },
  itemBody: { flex: 1, gap: space.xs },
  itemTitle: { ...typography.calloutStrong, color: colors.foreground },
  itemText: { ...typography.caption, color: colors.mutedForeground, lineHeight: 20 },
  note: {
    ...typography.micro,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: space.xs,
  },
  emptyText: { ...typography.callout, color: colors.mutedForeground },
  errorText: { ...typography.caption, color: colors.danger, textAlign: 'center' },
});
