import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Redirect, Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { homePalette, typography } from '@/constants/theme';
import { NewFriendModal } from '@/components/dex/NewFriendModal';
import { LightFlowHost } from '@/components/LightFlowHost';
import { Icon, iconSize } from '@/components/ui/Icon';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTabBarHeight } from '@/utils/tabLayout';

function ClassicTabLayout() {
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#F0D6B6',
        tabBarInactiveTintColor: homePalette.navInactive,
        headerShown: false,
        tabBarLabelStyle: typography.micro,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          // 面の区切りは上端の 1px だけ。影は敷かない。
          backgroundColor: isIOS ? 'transparent' : homePalette.navBackground,
          borderTopWidth: 1,
          borderTopColor: homePalette.navBorder,
          elevation: 0,
          height: getTabBarHeight(Platform.OS, insets.bottom),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: homePalette.navBackground }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '部屋',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <Icon name="home" size={iconSize.lg} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: '記録', href: null,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="pencil" tintColor={color} size={24} />
            ) : (
              <Icon name="edit-3" size={iconSize.lg} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'チャット', href: null,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="bubble.left.and.bubble.right" tintColor={color} size={24} />
            ) : (
              <Icon name="message-circle" size={iconSize.lg} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="growth"
        options={{
          title: 'アルバム',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="chart.line.uptrend.xyaxis" tintColor={color} size={24} />
            ) : (
              <Icon name="trending-up" size={iconSize.lg} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="plant"
        options={{
          title: 'ひかりの庭',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="sparkles" tintColor={color} size={24} />
            ) : (
              <Icon name="star" size={iconSize.lg} color={color} />
            ),
        }}
      />
    </Tabs>
  );
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
