import React,{useId,useState} from 'react';
import {Image,StyleSheet,type ImageSourcePropType} from 'react-native';
import Svg,{Mask,Defs,Image as SvgImage,Path,Rect} from 'react-native-svg';
import {STARTER_FURNISHINGS,starterIsPlaced,type StarterFurnishings} from '@/utils/starterFurnishings';
import {STARTER_ROOM_REGIONS,STARTER_ROOM_PROTECTION,type StarterRoomPerspective} from '@/utils/starterRoomRegions';
export type StarterRoomShot={empty:ImageSourcePropType;perspective:StarterRoomPerspective;settings:StarterFurnishings|undefined};
const fill=StyleSheet.create({art:{position:'absolute',left:0,top:0,width:'100%',height:'100%'}}).art;
/** Keep original pixels everywhere except where the user has put a set away. */
export function StarterRoomArt({source,starter,onLoad,testID}:{source:ImageSourcePropType;starter?:StarterRoomShot;onLoad?:()=>void;testID?:string}){
  const clip=useId().replace(/[^a-zA-Z0-9]/g,'');
  const [emptyReady,setEmptyReady]=useState<ImageSourcePropType|null>(null);
  const hidden=starter?STARTER_FURNISHINGS.filter(item=>!starterIsPlaced(starter.settings,item.id)):[];
  const empty=starter?.empty;
  const allHidden=hidden.length===STARTER_FURNISHINGS.length;
  const wide=starter?.perspective==='wide'||starter?.perspective==='eyeWide';
  const viewBox=wide?'0 0 1659 948':'0 0 948 1659';
  return <>
    <Image testID={testID} source={source} style={fill} resizeMode="stretch" accessible={false} onLoad={onLoad}/>
    {!!hidden.length&&empty&&<>
      {/* Decode before exposing a cut-out; never flash a bare/blank patch. */}
      <Image source={empty} style={[fill,{opacity:0}]} resizeMode="stretch" accessible={false} onLoad={()=>setEmptyReady(empty)}/>
      {emptyReady===empty&&(allHidden
        ?<Image testID="starter-room-empty" source={empty} style={fill} resizeMode="stretch" accessible={false}/>
        :<Svg testID="starter-room-hidden" width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="none" style={fill}>
          <Defs><Mask id={clip} x={0} y={0} width={wide?1659:948} height={wide?948:1659} maskUnits="userSpaceOnUse">
            <Rect x={0} y={0} width="100%" height="100%" fill="black"/>
            {hidden.map(item=><React.Fragment key={item.id}>
              {[{width:90,alpha:.12},{width:60,alpha:.25},{width:32,alpha:.5},{width:14,alpha:1}].map(edge=><Path key={edge.width} d={STARTER_ROOM_REGIONS[starter!.perspective][item.id]} fill="white" stroke="white" strokeWidth={edge.width} strokeLinejoin="round" opacity={edge.alpha}/>)}
            </React.Fragment>)}
            {/* Nearby furnishings remain intact where their silhouettes overlap. */}
            {STARTER_FURNISHINGS.filter(item=>starterIsPlaced(starter!.settings,item.id)&&item.id!=='rug').map(item=><Path key={item.id} d={STARTER_ROOM_PROTECTION[starter!.perspective][item.id]} fill="black"/>)}
          </Mask></Defs>
          <SvgImage href={empty} x={0} y={0} width={wide?1659:948} height={wide?948:1659} preserveAspectRatio="none" mask={`url(#${clip})`}/>
        </Svg>)}
    </>}
  </>;
}
