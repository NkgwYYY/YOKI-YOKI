import React,{useId} from 'react';
import Svg,{ClipPath,Defs,Image as SvgImage,Pattern,Rect} from 'react-native-svg';
import {Image,View} from 'react-native';

const OFFER=require('@/assets/images/world/care-hand-offer.webp');
const WASH=require('@/assets/images/world/care-hand-wash.webp');

/** The contact point is (0, 0), shared with the food or actual scrub position.
 * Only the far sleeve is extended in layout, so fingers keep their proportions
 * while the caretaker's arm always continues outside the viewport. */
export function CareHandArt({unit,reach,washing=false}:{unit:number;reach:number;washing?:boolean}) {
 const source=washing?WASH:OFFER;
 const width=unit*3.6,height=width*2/3,cut=width*.90;
 const total=Math.max(width,reach),pattern='careKnit'+useId().replace(/[^a-zA-Z0-9]/g,'');
 const anchor=washing?{x:155/1536,y:438/1024}:{x:135/1536,y:419/1024};
 return <View testID="care-hand-art" pointerEvents="none" accessible={false} style={{position:'absolute',left:-width*anchor.x,top:-height*anchor.y,width:total,height}}>
  <View style={{position:'absolute',left:0,top:0,width:cut,height,overflow:'hidden'}}>
   <Image source={source} resizeMode="stretch" fadeDuration={0} style={{position:'absolute',left:0,top:0,width,height}}/>
  </View>
  <Svg width={total-cut} height={height} style={{position:'absolute',left:cut,top:0}}>
   <Defs><Pattern id={pattern} width={width*.045} height={height} patternUnits="userSpaceOnUse">
    <SvgImage href={source} x={-cut} y={0} width={width} height={height} preserveAspectRatio="none"/>
   </Pattern><ClipPath id={`${pattern}edge`}>
    <Rect x={0} y={height*(washing?421:416)/1024} width={total-cut} height={height*(washing?392:385)/1024}/>
   </ClipPath></Defs>
   <Rect width="100%" height="100%" fill={`url(#${pattern})`} clipPath={`url(#${pattern}edge)`}/>
  </Svg>
 </View>;
}
