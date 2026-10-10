import { ImageSourcePropType, Platform } from 'react-native';
import { CharacterKey } from '@/utils/mascotUtils';

/** 図鑑用キャラ画像(既存アセットの利用のみ) */
export const DEX_IMAGES: Record<CharacterKey, ImageSourcePropType> = {
  egg: (Platform.OS === 'web' ? require('../../assets/images/egg/normal.webp') : require('../../assets/images/egg/normal.png')),
  odango: (Platform.OS === 'web' ? require('../../assets/images/characters/odango.webp') : require('../../assets/images/characters/odango.png')),
  happa: (Platform.OS === 'web' ? require('../../assets/images/characters/happa.webp') : require('../../assets/images/characters/happa.png')),
  colorful_happa: (Platform.OS === 'web' ? require('../../assets/images/characters/colorful_happa.webp') : require('../../assets/images/characters/colorful_happa.png')),
};
