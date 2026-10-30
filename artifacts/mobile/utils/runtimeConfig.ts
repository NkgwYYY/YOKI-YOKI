/** Account builds share the same Clerk instance on web and native. */
export const ACCOUNT_ENABLED = !!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
