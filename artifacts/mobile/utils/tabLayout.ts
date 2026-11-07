/** Shared by the absolute tab bar and screens that keep controls above it. */
export function getTabBarHeight(platform: string, bottomInset: number): number {
  return 60 + Math.max(12, bottomInset) + 12;
}
