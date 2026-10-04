import { Platform } from 'react-native';
/** Unconfigured local installs support local-only care. Configured account builds are unchanged. */
export const ACCOUNT_ENABLED = Platform.OS !== 'ios' && !!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
