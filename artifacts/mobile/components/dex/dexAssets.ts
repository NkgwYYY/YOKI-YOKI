import { ImageSourcePropType } from 'react-native';
import { CharacterKey } from '@/utils/mascotUtils';

/** 図鑑用キャラ画像(既存アセットの利用のみ) */
export const DEX_IMAGES: Record<CharacterKey, ImageSourcePropType> = {
  egg: require('../../assets/images/egg/normal.png'),
  odango: require('../../assets/images/characters/odango.png'),
  happa: require('../../assets/images/characters/happa.png'),
  colorful_happa: require('../../assets/images/characters/colorful_happa.png'),
};
