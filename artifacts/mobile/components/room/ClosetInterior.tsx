import React,{useId} from 'react';
import {StyleSheet,type ImageSourcePropType} from 'react-native';
import Svg,{Defs,ClipPath,Path,Image as SvgImage} from 'react-native-svg';
import type {StarterRoomPerspective} from '@/utils/starterRoomRegions';

// Only the contents are changed. The original cabinet frame, feet, contact
// shadow and surrounding room retain their own perspective and lighting.
const interiors={
 overview:{x:370,y:441,w:139,h:209,path:'M374 490 Q374 453 450 445 Q501 437 507 468 L507 624 L374 650 Z'},
 wide:{x:700,y:239,w:155,h:169,path:'M705 281 Q704 248 780 241 Q844 237 852 270 L852 392 L705 407 Z'},
 eye:{x:377,y:402,w:132,h:197,path:'M381 449 Q381 407 424 404 Q491 411 505 443 L505 590 L381 595 Z'},
 eyeWide:{x:622,y:263,w:166,h:210,path:'M627 313 Q627 270 683 266 Q761 269 785 309 L785 468 L627 473 Z'},
};
export function ClosetInterior({source,perspective}:{source:ImageSourcePropType;perspective:StarterRoomPerspective}){
 const id='closet'+useId().replace(/[^a-zA-Z0-9]/g,''),p=interiors[perspective];
 const wide=perspective==='wide'||perspective==='eyeWide';
 return <Svg testID="home-closet-interior" pointerEvents="none" width="100%" height="100%" viewBox={`0 0 ${wide?1659:948} ${wide?948:1659}`} preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
  <Defs><ClipPath id={id}><Path d={p.path}/></ClipPath></Defs>
  <SvgImage href={source} x={p.x} y={p.y} width={p.w} height={p.h} preserveAspectRatio="none" clipPath={`url(#${id})`}/>
 </Svg>;
}
