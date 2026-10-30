import React,{useId,useState} from 'react';
import {Image,StyleSheet,type ImageSourcePropType} from 'react-native';
import Svg,{Mask,Defs,Image as SvgImage,Path,Rect} from 'react-native-svg';
import {STARTER_FURNISHINGS,starterIsPlaced,type StarterFurnishings} from '@/utils/starterFurnishings';
import {STARTER_ROOM_REGIONS,STARTER_ROOM_PROTECTION,type StarterRoomPerspective} from '@/utils/starterRoomRegions';
export type StarterRoomShot={empty:ImageSourcePropType;noLounge:ImageSourcePropType;noCabinet?:ImageSourcePropType;perspective:StarterRoomPerspective;settings:StarterFurnishings|undefined};
const fill=StyleSheet.create({art:{position:'absolute',left:0,top:0,width:'100%',height:'100%'}}).art;
/** Composite restored artwork only for the starter sets the user has put away. */
export function StarterRoomArt({source,starter,onLoad,testID}:{source:ImageSourcePropType;starter?:StarterRoomShot;onLoad?:()=>void;testID?:string}){
  const clip=useId().replace(/[^a-zA-Z0-9]/g,'');
  const [loaded,setLoaded]=useState<ImageSourcePropType[]>([]);
  const hidden=starter?STARTER_FURNISHINGS.filter(item=>!starterIsPlaced(starter.settings,item.id)):[];
  const allHidden=hidden.length===STARTER_FURNISHINGS.length;
  const wide=starter?.perspective==='wide'||starter?.perspective==='eyeWide';
  const width=wide?1659:948,height=wide?948:1659;
  // Use the complete restored scene when removing the lounge: the chair and
  // table originally occlude part of the rug and the bookcase plant.
  const loungeHidden=hidden.some(item=>item.id==='lounge');
  const base=starter&&loungeHidden?starter.noLounge:source;
  const restoreBed=!!starter?.noCabinet&&hidden.some(item=>item.id==='cabinet')&&starterIsPlaced(starter.settings,'bed');
  const groups=starter?[
    ...(restoreBed?[{key:'cabinet',items:hidden.filter(item=>item.id==='cabinet'),image:starter.noCabinet!}]:[]),
    {key:'room',items:hidden.filter(item=>item.id!=='lounge'&&(!restoreBed||item.id!=='cabinet')),image:starter.empty},
  ].filter(group=>group.items.length):[];
  const needed=starter&&loungeHidden?[base,...groups.map(group=>group.image)]:groups.map(group=>group.image);
  const ready=needed.every(image=>loaded.includes(image));
  return <>
    <Image testID={testID} source={ready?base:source} style={fill} resizeMode="stretch" accessible={false} onLoad={onLoad}/>
    {!!hidden.length&&starter&&<>
      {needed.map((image,index)=><Image key={index} source={image} style={[fill,{opacity:0}]} resizeMode="stretch" accessible={false} onLoad={()=>setLoaded(previous=>previous.includes(image)?previous:[...previous,image])}/>)}
      {ready&&(allHidden
        ?<Image testID="starter-room-empty" source={starter.empty} style={fill} resizeMode="stretch" accessible={false}/>
        :<Svg testID="starter-room-hidden" width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={fill}>
          <Defs>{groups.map(group=><Mask key={group.key} id={`${clip}${group.key}`} x={0} y={0} width={width} height={height} maskUnits="userSpaceOnUse">
            <Rect x={0} y={0} width="100%" height="100%" fill="black"/>
            {group.items.map(item=><React.Fragment key={item.id}>
              {[{width:90,alpha:.12},{width:60,alpha:.25},{width:32,alpha:.5},{width:14,alpha:1}].map(edge=><Path key={edge.width} d={STARTER_ROOM_REGIONS[starter.perspective][item.id]} fill="white" stroke="white" strokeWidth={edge.width} strokeLinejoin="round" opacity={edge.alpha}/>)}
            </React.Fragment>)}
            {STARTER_FURNISHINGS.filter(item=>starterIsPlaced(starter.settings,item.id)&&(group.key!=='cabinet'||(item.id!=='bed'&&item.id!=='rug'))).map(item=><Path key={item.id} d={STARTER_ROOM_PROTECTION[starter.perspective][item.id]} fill="black"/>)}
          </Mask>)}</Defs>
          {groups.map(group=><SvgImage key={group.key} href={group.image} x={0} y={0} width={width} height={height} preserveAspectRatio="none" mask={`url(#${clip}${group.key})`}/>)}
        </Svg>)}
    </>}
  </>;
}
