import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { initAnalytics } from '@/utils/analytics';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const clerkProxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

function AuthGate() {
  const { isSignedIn, isLoading } = useAuth();
  const { profile, cloudSynced, isLoading: appLoading } = useApp();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || appLoading) return;
    // Public routes that don't require authentication
    const isPublicRoute =
      segments[0] === 'login' || segments[0] === 'gallery' || segments[0] === 'onboarding';

    if (!isSignedIn && !profile && !isPublicRoute) {
      // A new visitor starts locally. Login is an optional backup, not a gate.
      router.replace('/onboarding');
    } else if (isSignedIn && segments[0] === 'login') {
      router.replace('/(tabs)');
    } else if (isSignedIn && cloudSynced && !profile && segments[0] !== 'onboarding') {
      // First time after sign-up: collect profile (only after cloud pull, so
      // existing users with a saved profile don't get flashed the onboarding)
      router.replace('/onboarding');
    } else if (isSignedIn && profile && segments[0] === 'onboarding') {
      router.replace('/(tabs)');
    }
  }, [isSignedIn, isLoading, appLoading, cloudSynced, profile, segments]);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <AuthGate />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="guide" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  // Web にはネイティブのスプラッシュ画面がないため、空白画面を出さず即座に描画する。
  const [splashReady, setSplashReady] = useState(Platform.OS === 'web');

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    // フォントや認証サービスが遅い環境でも、起動画面を長く出し続けない。
    // フォントは後から自然に反映され、Clerk は AuthProvider が非同期で解決する。
    const reveal = () => {
      setSplashReady(true);
      SplashScreen.hideAsync().catch(() => {});
    };
    if (fontsLoaded || fontError) {
      reveal();
      return;
    }
    const timeout = setTimeout(reveal, 650);
    return () => clearTimeout(timeout);
  }, [fontsLoaded, fontError]);

  if (!splashReady) return null;

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      tokenCache={tokenCache}
      proxyUrl={clerkProxyUrl}
    >
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AppProvider>
                <GestureHandlerRootView>
                  <KeyboardProvider>
                    <RootLayoutNav />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </AppProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
