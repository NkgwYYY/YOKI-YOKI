/** Shared by the absolute tab bar and screens that keep controls above it. */
export function getTabBarHeight(platform: string, bottomInset: number): number {
  return platform === 'web' ? 84 : 49 + bottomInset;
}
