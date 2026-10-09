export const VOICE_KEY='@yoki/character_voice_enabled_v1';
export const CHARACTER_VOICES={
 greet:require('@/assets/sounds/character/greet.mp3'),
 happy:require('@/assets/sounds/character/happy.mp3'),
 surprise:require('@/assets/sounds/character/surprise.mp3'),
 soft:require('@/assets/sounds/character/soft.mp3'),
 chat:require('@/assets/sounds/character/chat.mp3'),
 land:require('@/assets/sounds/character/land.mp3'),
};
export type CharacterVoice=keyof typeof CHARACTER_VOICES;
