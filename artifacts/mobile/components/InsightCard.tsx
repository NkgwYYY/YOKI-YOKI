import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PRIVATE_CACHE_KEYS, type PrivateCache } from '@/utils/privateCache';
import { colors, radius, space, typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, IconBadge, iconSize } from '@/components/ui/Icon';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { profileToContext } from '@/utils/profileContext';
import { getTodayDate } from '@/utils/dateUtils';
import { readInsights, buildLocalInsights, requestInsights, InsightRequestError, type Insight } from '@/utils/insightData';

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;
const STORAGE_KEY = PRIVATE_CACHE_KEYS.INSIGHT;

interface CachedInsight {
  date: string;
  source?: 'local' | 'ai';
  revision?: string;
  insights: Insight[];
}

export function InsightCard() {
  const { privateCache, records } = useApp();
  const { isSignedIn } = useAuth();
  const revision = isSignedIn ? '' : JSON.stringify(buildLocalInsights(records, getTodayDate()));
  return privateCache ? <ScopedInsightCard key={`${privateCache.id}:${isSignedIn}:${revision}`} cache={privateCache} local={!isSignedIn} revision={revision} /> : null;
}

function ScopedInsightCard({ cache, local, revision }: { cache: PrivateCache; local: boolean; revision: string }) {
  const { records, progress, checkedState, unlockedBadges, mascotName, profile } = useApp();
  const { getToken } = useAuth();
  const displayName = mascotName.trim() || '相棒';

  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheFailed, setCacheFailed] = useState(false);
  const busy = useRef(false);
  const requested = useRef(false);
  const mounted = useRef(true);
  const pendingCache = useRef<CachedInsight | null>(null);
  const request = useRef<AbortController | null>(null);
  const isCurrent = () => mounted.current && cache.isCurrent();

  const saveCache = async () => {
    if (!pendingCache.current || !isCurrent()) return;
    try {
      await cache.setItem(STORAGE_KEY, JSON.stringify(pendingCache.current));
      if (isCurrent()) setCacheFailed(false);
    } catch { if (isCurrent()) setCacheFailed(true); }
  };

  const retryCache = async () => {
    if (busy.current || !isCurrent()) return;
    busy.current = true;
    setLoading(true);
    try { await saveCache(); }
    finally {
      busy.current = false;
      if (isCurrent()) setLoading(false);
    }
  };

  // Restore today's cached insights
  useEffect(() => {
    mounted.current = true;
    (async () => {
      try {
        const raw = await cache.getItem(STORAGE_KEY);
        if (!raw) return;
        const cached = JSON.parse(raw) as CachedInsight;
        const valid = readInsights(cached?.insights);
        if (isCurrent() && !requested.current && cached?.date === getTodayDate() && valid
          && (local ? cached.source === 'local' && cached.revision === revision : cached.source !== 'local')) {
          setInsights(valid);
        }
      } catch {}
    })();
    return () => { mounted.current = false; request.current?.abort(); };
  }, []);

  const generate = async () => {
    if (busy.current || !isCurrent()) return;
    busy.current = true;
    requested.current = true;
    setLoading(true);
    setError(null);
    setCacheFailed(false);
    try {
      if (local) {
        const valid = buildLocalInsights(records, getTodayDate());
        if (!valid.length) throw new Error('No dated records');
        setInsights(valid);
        pendingCache.current = { date: getTodayDate(), source: 'local', revision, insights: valid };
        await saveCache();
        return;
      }
      const payload = {
        mascotName: displayName,
        profile: profileToContext(profile),
        records: records.slice(-365).map(r => ({
          date: r.date,
          mood: r.mood,
          sleep: r.sleep,
          sleepRecorded: r.sleepRecorded,
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
      const controller = new AbortController();
      request.current = controller;
      const valid = await requestInsights({ url: `${API_BASE}/insight`, payload, getToken, isCurrent, signal: controller.signal });
      if (!isCurrent()) return;
      setInsights(valid);
      // A cache write failure must not discard a valid response or request AI again.
      pendingCache.current = { date: getTodayDate(), source: 'ai', insights: valid };
      await saveCache();
    } catch (failure) {
      if (isCurrent()) {
        const kind = failure instanceof InsightRequestError ? failure.kind : 'network';
        setError(kind === 'auth' ? 'ログイン状態を確認できませんでした。通信環境を確認して、もう一度お試しください。'
          : kind === 'limit' ? 'AIのきづきの利用回数が上限に達しました。時間をおいて、またお試しください。'
          : kind === 'timeout' ? '返事を待つ時間が長くなったため中断しました。もう一度お試しください。'
          : 'うまく見つけられなかった…少し待ってもう一度試してね');
      }
    } finally {
      busy.current = false;
      if (isCurrent()) setLoading(false);
    }
  };

  const hasData = records.length > 0;

  return (
    <Card style={styles.card}>
      <View style={styles.titleWrap}>
        <IconBadge name="activity" />
        <View style={styles.titleCopy}>
          <Text style={styles.title}>{local ? '記録のふりかえり' : `${displayName}のきづき`}</Text>
          <Text style={styles.subtitle}>{local ? 'この端末に残した、最近30日分の記録から' : 'あなたが気づいていない頑張り、見つけるよ'}</Text>
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
          <Text style={styles.note}>{local ? '記録の件数を端末で集計しています。AIには送信していません。' : '明日になると、また新しい発見を探せるよ'}</Text>
          {cacheFailed && <Text accessibilityRole="alert" style={styles.errorText}>この結果を端末に保存できませんでした。画面を閉じる前に確認してください。</Text>}
          {cacheFailed && <Button label="保存をもう一度試す" onPress={retryCache} loading={loading} variant="outline" />}
        </View>
      ) : !hasData ? (
        <Text style={styles.emptyText}>
          記録がたまると、{displayName}があなたのすごいところを見つけられるよ。まずは今日の気分を記録してみよう！
        </Text>
      ) : (
        <>
          <Button
            label={local ? (loading ? '記録をふりかえっています…' : '記録をふりかえる') : (loading ? '記録をじっくり見てる…' : 'すごいところを見つけてもらう')}
            onPress={generate}
            loading={loading}
            icon="activity"
          />
          {error && (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {error}
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
