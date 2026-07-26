import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, useColorScheme,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;
const STORAGE_KEY = '@mentore/insight_v1';

interface Insight {
  emoji: string;
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
  const colors = useColors();
  const isDark = useColorScheme() === 'dark';
  const { records, progress, checkedState, unlockedBadges, mascotName } = useApp();
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
    <View style={[styles.card, { borderColor: colors.border, overflow: 'hidden' }]}>
      <LinearGradient
        colors={isDark ? ['#241430', '#12103A'] : ['#FFF7FB', '#F0F0FF']}
        style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
      />
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.sparkle}>🔮</Text>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {mascotName}のきづき
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              あなたが気づいていない頑張り、見つけるよ
            </Text>
          </View>
        </View>
      </View>

      {insights ? (
        <View style={styles.list}>
          {insights.map((ins, i) => (
            <View
              key={i}
              style={[styles.item, { backgroundColor: isDark ? '#FFFFFF10' : '#FFFFFFB0' }]}
            >
              <Text style={styles.itemEmoji}>{ins.emoji}</Text>
              <View style={styles.itemBody}>
                <Text style={[styles.itemTitle, { color: colors.foreground }]}>{ins.title}</Text>
                <Text style={[styles.itemText, { color: colors.mutedForeground }]}>{ins.body}</Text>
              </View>
            </View>
          ))}
          <Text style={[styles.note, { color: colors.mutedForeground }]}>
            明日になると、また新しい発見を探せるよ
          </Text>
        </View>
      ) : (
        <>
          {!hasData ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              記録がたまると、{mascotName}があなたのすごいところを見つけられるよ。まずは今日の気分を記録してみよう！
            </Text>
          ) : (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={generate}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={styles.buttonText}>記録をじっくり見てる…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={17} color="#FFF" />
                  <Text style={styles.buttonText}>すごいところを見つけてもらう</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {error && (
            <Text style={styles.errorText}>
              うまく見つけられなかった…少し待ってもう一度試してね
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, padding: 20, borderWidth: 1, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  sparkle: { fontSize: 26 },
  title: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  subtitle: { fontSize: 11.5, fontFamily: 'Inter_400Regular', marginTop: 2 },
  list: { gap: 10 },
  item: {
    flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, alignItems: 'flex-start',
  },
  itemEmoji: { fontSize: 20, marginTop: 1 },
  itemBody: { flex: 1, gap: 3 },
  itemTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  itemText: { fontSize: 12.5, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  note: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 2 },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 14,
  },
  buttonText: { color: '#FFF', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  errorText: {
    fontSize: 12, fontFamily: 'Inter_400Regular', color: '#EF4444', textAlign: 'center',
  },
});
