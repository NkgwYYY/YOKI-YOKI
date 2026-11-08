import type {RoomGoodId,RoomThemeId} from './roomBoutique';
const GOOD_ART={ 'bamboo-cushion':require('@/assets/images/room-sets/bamboo-cushion.webp'), 'carrot-bed':require('@/assets/images/room-sets/carrot-bed.webp') };
export const roomGoodArt=(id:RoomGoodId)=>GOOD_ART[id];
const THEMES={
 'rain-cafe':{
  overview:{day:require('@/assets/images/room-sets/rain-cafe-overview-day.webp'),night:require('@/assets/images/room-sets/rain-cafe-overview-night.webp')},
  wide:{day:require('@/assets/images/room-sets/rain-cafe-wide-day.webp'),night:require('@/assets/images/room-sets/rain-cafe-wide-night.webp')},
  eye:{day:require('@/assets/images/room-sets/rain-cafe-eye-day.webp'),night:require('@/assets/images/room-sets/rain-cafe-eye-night.webp')},
  eyeWide:{day:require('@/assets/images/room-sets/rain-cafe-eyeWide-day.webp'),night:require('@/assets/images/room-sets/rain-cafe-eyeWide-night.webp')},
 },
 'star-room':{
  overview:{day:require('@/assets/images/room-sets/star-room-overview-day.webp'),night:require('@/assets/images/room-sets/star-room-overview-night.webp')},
  wide:{day:require('@/assets/images/room-sets/star-room-wide-day.webp'),night:require('@/assets/images/room-sets/star-room-wide-night.webp')},
  eye:{day:require('@/assets/images/room-sets/star-room-eye-day.webp'),night:require('@/assets/images/room-sets/star-room-eye-night.webp')},
  eyeWide:{day:require('@/assets/images/room-sets/star-room-eyeWide-day.webp'),night:require('@/assets/images/room-sets/star-room-eyeWide-night.webp')},
 },
 'washitsu':{
  overview:{day:require('@/assets/images/room-sets/washitsu-overview-day.webp'),night:require('@/assets/images/room-sets/washitsu-overview-night.webp')},
  wide:{day:require('@/assets/images/room-sets/washitsu-wide-day.webp'),night:require('@/assets/images/room-sets/washitsu-wide-night.webp')},
  eye:{day:require('@/assets/images/room-sets/washitsu-eye-day.webp'),night:require('@/assets/images/room-sets/washitsu-eye-night.webp')},
  eyeWide:{day:require('@/assets/images/room-sets/washitsu-eyeWide-day.webp'),night:require('@/assets/images/room-sets/washitsu-eyeWide-night.webp')},
 },
};
export function roomThemeArt(id:RoomThemeId,night=false,wide=false,eye=false){return THEMES[id][eye?(wide?'eyeWide':'eye'):(wide?'wide':'overview')][night?'night':'day'];}
