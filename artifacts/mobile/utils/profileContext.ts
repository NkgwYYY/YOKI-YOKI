import { UserProfile } from '@/contexts/AppContext';

/**
 * Compact one-line summary of the user's profile for AI context.
 * The server wraps this with rules: treat as reference only, never
 * stereotype, and always prioritize the user's actual records.
 */
export function profileToContext(profile: UserProfile | null): string | undefined {
  if (!profile) return undefined;
  const parts: string[] = [];
  if (profile.nickname) parts.push(`ニックネーム「${profile.nickname}」`);
  if (profile.ageRange && profile.ageRange !== '回答しない') parts.push(profile.ageRange);
  if (profile.gender && profile.gender !== '回答しない') parts.push(profile.gender);
  if (profile.occupation) parts.push(profile.occupation);
  if (profile.goal) parts.push(`目標: ${profile.goal}`);
  if (profile.mbti) parts.push(`MBTI: ${profile.mbti}`);
  if (profile.bloodType) parts.push(`血液型: ${profile.bloodType}型`);
  if (profile.concerns?.length) parts.push(`気になっていること: ${profile.concerns.join('・')}`);
  return parts.length ? parts.join(', ').slice(0, 300) : undefined;
}
