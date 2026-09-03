import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon as NativeTabIcon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { border, colors, typography } from '@/constants/theme';
import { NewFriendModal } from '@/components/dex/NewFriendModal';
import { LightFlowHost } from '@/components/LightFlowHost';
import { Icon, iconSize } from '@/components/ui/Icon';

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabIcon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>ホーム</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="record">
        <NativeTabIcon sf={{ default: 'pencil.and.scribble', selected: 'pencil.and.scribble' }} />
        <Label>記録</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <NativeTabIcon sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' }} />
        <Label>チャット</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="growth">
        <NativeTabIcon sf={{ default: 'chart.line.uptrend.xyaxis', selected: 'chart.line.uptrend.xyaxis.circle.fill' }} />
        <Label>成長</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plant">
        <NativeTabIcon sf={{ default: 'bolt', selected: 'bolt.fill' }} />
        <Label>発電所</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtleForeground,
        headerShown: false,
        tabBarLabelStyle: typography.micro,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          // 面の区切りは上端の 1px だけ。影は敷かない。
          backgroundColor: isIOS ? 'transparent' : colors.card,
          borderTopWidth: border.width,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 64 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
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
          title: '記録',
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
          title: 'チャット',
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
          title: '成長',
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
          title: '発電所',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="bolt" tintColor={color} size={24} />
            ) : (
              <Icon name="zap" size={iconSize.lg} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <>
      {isLiquidGlassAvailable() ? <NativeTabLayout /> : <ClassicTabLayout />}
      {/* 新キャラ初登場・進化時の「新しい仲間が生まれました!」演出(どのタブでも表示) */}
      <NewFriendModal />
      {/* 記録・チェック・ゲームで光を獲得した瞬間の循環演出(どのタブでも表示) */}
      <LightFlowHost />
    </>
  );
}
