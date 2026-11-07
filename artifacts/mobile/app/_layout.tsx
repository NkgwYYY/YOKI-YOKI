import { ACCOUNT_ENABLED } from '@/utils/runtimeConfig';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { AuthProvider, GuestAuthProvider, useAuth } from '@/contexts/AuthContext';
import { RecordPromptProvider } from '@/contexts/RecordPromptContext';
import { ItemProvider } from '@/contexts/ItemContext';
import { initAnalytics } from '@/utils/analytics';
import { StartupLoadingOverlay } from '@/components/StartupLoadingOverlay';
import { AuthStartupGate } from '@/components/AuthStartupGate';

// Prevent the splash screen from auto-hiding before asset loading is complete.
// A native splash failure must not become an unhandled rejection during launch.
void SplashScreen.preventAutoHideAsync().catch((error) => {
  console.error('Failed to keep the splash screen visible:', error);
});

const queryClient = new QueryClient();

const clerkPublishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? '';
const clerkProxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

function AuthGate() {
  const { isSignedIn, isLoading } = useAuth();
  const { profile, cloudSynced, storageError, isLoading: appLoading } = useApp();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || appLoading) return;
    if (storageError) {
      if (segments[0] !== '(tabs)') router.replace('/(tabs)');
      return;
    }
    if (!ACCOUNT_ENABLED && segments[0] === 'login') {
      router.replace(profile ? '/(tabs)' : '/onboarding');
      return;
    }

    const isPublicRoute =
      segments[0] === 'login' || segments[0] === 'gallery' ||
      segments[0] === 'onboarding' || segments[0] === 'shop';

    if (!isSignedIn && !profile && !isPublicRoute) {
      router.replace('/onboarding');
    } else if (isSignedIn && segments[0] === 'login') {
      router.replace('/(tabs)');
    } else if (isSignedIn && cloudSynced && !profile && segments[0] !== 'onboarding') {
      router.replace('/onboarding');
    } else if (isSignedIn && profile && segments[0] === 'onboarding') {
      router.replace('/(tabs)');
    }
  }, [isSignedIn, isLoading, appLoading, cloudSynced, storageError, profile, router, segments]);

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
        <Stack.Screen name="shop" options={{ headerShown: false }} />
        <Stack.Screen name="monthly-report" options={{ headerShown: false, animation: 'slide_from_right' }} />
      </Stack>
    </>
  );
}

function AppContent() {
  return (
    <AppProvider>
      <RecordPromptProvider><ItemProvider>
        <GestureHandlerRootView style={styles.root}>
          <RootLayoutNav />
          <StartupLoadingOverlay />
        </GestureHandlerRootView>
      </ItemProvider></RecordPromptProvider>
    </AppProvider>
  );
}

function AppProviders({ guestOnly }: { guestOnly: boolean }) {
  return (
    <QueryClientProvider client={queryClient}>
      {guestOnly ? (
        <GuestAuthProvider>
          <AppContent />
        </GuestAuthProvider>
      ) : (
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      )}
    </QueryClientProvider>
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
    // フォントは後から自然に反映され、認証の接続待ちは AuthStartupGate で案内する。
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
    <SafeAreaProvider>
      <ErrorBoundary
        onError={(error, stackTrace) => {
          console.error('Root application error:', error, stackTrace);
        }}
      >
        {!ACCOUNT_ENABLED ? (
          <AppProviders guestOnly />
        ) : (
          <ClerkProvider
            publishableKey={clerkPublishableKey}
            tokenCache={tokenCache}
            proxyUrl={clerkProxyUrl}
          >
            <AuthStartupGate>
              <AppProviders guestOnly={false} />
            </AuthStartupGate>
          </ClerkProvider>
        )}
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
