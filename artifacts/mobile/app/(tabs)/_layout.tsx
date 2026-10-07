import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { homePalette } from '@/constants/theme';
import { NewFriendModal } from '@/components/dex/NewFriendModal';
import { LightFlowHost } from '@/components/LightFlowHost';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DockProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];
function WorldDock({state, navigation}: DockProps) {
  const insets = useSafeAreaInsets();
  const places = [{name: 'index', label: 'おうち', icon: 'home'}, {name: 'plant', label: 'ひかり', icon: 'zap'}, {name: 'growth', label: '思い出', icon: 'book-open'}] as const;
  return <View pointerEvents="box-none" style={{position: 'absolute', bottom: Math.max(12, insets.bottom), left: 16, right: 16, alignItems: 'center'}}>
    <View testID="world-navigation" style={{width: '100%', maxWidth: 400, minHeight: 60, flexDirection: 'row', alignItems: 'center', padding: 5, borderRadius: 30, backgroundColor: '#243932', borderWidth: 1, borderColor: '#C9D0AC45'}}>
      {places.map(place => {
        const route = state.routes.find(r => r.name === place.name);
        if (!route) return null;
        const selected = state.routes[state.index].key === route.key;
        return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={place.label} accessibilityState={{selected}}
          onPress={() => {const event = navigation.emit({type: 'tabPress', target: route.key, canPreventDefault: true}); if (!selected && !event.defaultPrevented) navigation.navigate(route.name, route.params);}}
          onLongPress={() => navigation.emit({type: 'tabLongPress', target: route.key})}
          style={({pressed}) => ({flex: 1, minHeight: 48, borderRadius: 25, alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: selected ? '#EFF0D61A' : 'transparent', opacity: pressed ? 0.7 : 1})}>
          <Icon name={place.icon} size={20} color={selected ? '#F8E5B4' : '#B9C7B9'} />
          <Text style={{fontSize: 10, color: selected ? '#F8E5B4' : '#B9C7B9'}}>{place.label}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

function ClassicTabLayout() {
  return <Tabs tabBar={props => <WorldDock {...props} />} screenOptions={{headerShown: false}}>
    <Tabs.Screen name="index" options={{title: 'おうち'}} />
    <Tabs.Screen name="plant" options={{title: 'ひかり'}} />
    <Tabs.Screen name="growth" options={{title: '思い出'}} />
    <Tabs.Screen name="record" options={{title: '今日の記録', href: null}} />
    <Tabs.Screen name="chat" options={{title: 'おはなし', href: null}} />
  </Tabs>;
}

export default function TabLayout() {
  const { isSignedIn, isLoading: authLoading } = useAuth();
  const {
    profile,
    cloudSynced,
    isCloudSyncing,
    retryCloudSync,
    isLoading: appLoading,
    storageError,
    retryStorageRecovery,
  } = useApp();
  const [cloudWaitExpired, setCloudWaitExpired] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);

  useEffect(() => {
    if (!isSignedIn || profile || cloudSynced) {
      setCloudWaitExpired(false);
      return;
    }
    const timer = setTimeout(() => setCloudWaitExpired(true), 5000);
    return () => clearTimeout(timer);
  }, [isSignedIn, profile, cloudSynced, retryAttempt]);

  const handleRetry = () => {
    setCloudWaitExpired(false);
    setRetryAttempt((attempt) => attempt + 1);
    retryCloudSync();
  };

  // The root navigator stays mounted, but the tabs and their frame-driven home
  // animations must not mount until startup state determines they are allowed.
  if (authLoading || appLoading) return null;
  if (storageError) return <View style={styles.syncGate}>
    <Text style={styles.syncTitle}>保存データを確認しています</Text>
    <Text accessibilityRole="alert" style={styles.syncMessage}>{storageError}</Text>
    <Pressable accessibilityRole="button" onPress={retryStorageRecovery} style={styles.retryButton}>
      <Text style={styles.retryButtonText}>もう一度読み込む</Text>
    </Pressable>
  </View>;
  if (!isSignedIn && !profile) return <Redirect href="/onboarding" />;
  if (isSignedIn && !profile && !cloudSynced && !cloudWaitExpired) return null;
  if (isSignedIn && !profile && !cloudSynced) {
    return (
      <View style={styles.syncGate}>
        {isCloudSyncing ? (
          <>
            <ActivityIndicator color={homePalette.navActive} />
            <Text style={styles.syncTitle}>アカウントデータを確認しています</Text>
            <Text style={styles.syncMessage}>通信が完了するまで、そのままお待ちください。</Text>
          </>
        ) : (
          <>
            <Text style={styles.syncTitle}>データを確認できませんでした</Text>
            <Text style={styles.syncMessage}>
              通信環境を確認して、もう一度お試しください。端末やクラウドのデータは変更されません。
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={handleRetry}
              style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
            >
              <Text style={styles.retryButtonText}>もう一度試す</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }
  if (isSignedIn && !profile && cloudSynced) return <Redirect href="/onboarding" />;

  return (
    <>
      <ClassicTabLayout />
      {Platform.OS !== 'ios' ? (
        <>
          {/* 新キャラ初登場・進化時の「新しい仲間が生まれました!」演出(どのタブでも表示) */}
          <NewFriendModal />
        </>
      ) : null}
      {/* Native Animated feedback is available on iOS as well as Android/Web. */}
      <LightFlowHost />
    </>
  );
}

const styles = StyleSheet.create({
  syncGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F4F1FF',
  },
  syncTitle: {
    marginTop: 16,
    color: '#2C2440',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  syncMessage: {
    marginTop: 10,
    color: '#625A73',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    minHeight: 48,
    minWidth: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: homePalette.navActive,
    paddingHorizontal: 24,
  },
  retryButtonPressed: {
    opacity: 0.8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
