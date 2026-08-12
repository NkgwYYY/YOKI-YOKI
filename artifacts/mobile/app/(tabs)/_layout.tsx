import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>ホーム</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="record">
        <Icon sf={{ default: 'pencil.and.scribble', selected: 'pencil.and.scribble' }} />
        <Label>記録</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <Icon sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' }} />
        <Label>チャット</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="growth">
        <Icon sf={{ default: 'chart.line.uptrend.xyaxis', selected: 'chart.line.uptrend.xyaxis.circle.fill' }} />
        <Label>成長</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plant">
        <Icon sf={{ default: 'bolt', selected: 'bolt.fill' }} />
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
        tabBarActiveTintColor: '#EFE7FF',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.45)',
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : '#0F0925',
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: 'rgba(255,255,255,0.12)',
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: '#0F0925' },
              ]}
            />
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
              <Ionicons name="home-outline" size={22} color={color} />
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
              <Feather name="edit-2" size={20} color={color} />
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
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={color} />
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
              <Feather name="trending-up" size={22} color={color} />
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
              <Ionicons name="flash-outline" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
