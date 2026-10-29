import React,{useEffect} from 'react';
import {Image,Platform,StyleSheet,View} from 'react-native';
import {Gesture,GestureDetector} from 'react-native-gesture-handler';
import Animated,{runOnJS,useAnimatedStyle,useSharedValue,type SharedValue} from 'react-native-reanimated';
import type {RoomCustomization,RoomItemKind} from '@/contexts/AppContext';
import type {ResidentItem} from './RoomResident';
import {homeFurnishingFrame,dragHomeFurnishing} from '@/utils/homeFurnishings';
import {homeLogicalPoint} from '@/utils/homeGeometry';
import {roomPositionKey,type RoomItemPosition} from '@/utils/roomPlacement';
import type {HomeFrame} from '@/utils/homeView';
import {roomDecorSource,roomFurnitureSource,roomFlowerSource} from './RoomFurnitureArt';

type Bounds={left:number;right:number;bottom:number};
export type FurnishingSelection={kind:RoomItemKind;id:string};
export const FURNISHING_NAMES:Record<string,string>={sofa:'ソファ',vanity:'鏡台',bookshelf:'本棚',pink:'ローズ',violet:'バイオレット',rainbow:'レインボー'};
export type FurnishingEditor={selected:FurnishingSelection|null;enabled:boolean;camera:SharedValue<{zoom:number;panX:number;panY:number}>;frame:HomeFrame;viewport:{width:number;height:number};safeTop:number;safeBottom:number;onSelect:(kind:RoomItemKind,id:string)=>void;onDrop:(kind:RoomItemKind,id:string,position:RoomItemPosition)=>void;onClose:()=>void};

/** Shared artwork/positions for HOME and the shop preview; only HOME enables gestures. */
export function HomeFurnishings({width,height,customization,decor,night=false,safe,editor}:{width:number;height:number;customization:RoomCustomization;decor?:ResidentItem;night?:boolean;safe?:Bounds;editor?:FurnishingEditor}){
 const bounds=safe??{left:8,right:width-8,bottom:height*(width>height?.83:.89)};
 const object=(kind:'furniture'|'flower'|'decor',id:string,source:ReturnType<typeof roomDecorSource>,placement?:ResidentItem)=>{
  const position=kind==='decor'?undefined:customization.positions?.[roomPositionKey(kind,id)];
  const frame=homeFurnishingFrame(kind,id,width,height,placement,bounds,position);
  return <Furnishing key={`${kind}:${id}`} kind={kind} id={id} source={source} frame={frame} width={width} height={height} night={night} safe={bounds} editor={kind==='decor'?undefined:editor}/>;
 };
 return <>{customization.furniture!=='none'&&object('furniture',customization.furniture,roomFurnitureSource(customization.furniture))}
 {customization.flower!=='none'&&object('flower',customization.flower,roomFlowerSource(customization.flower))}
 {decor&&object('decor',decor.id,roomDecorSource(decor.id,decor.uri),decor)}</>;
}
function Furnishing({kind,id,source,frame,width,height,night,safe,editor}:{kind:'furniture'|'flower'|'decor';id:string;source:ReturnType<typeof roomDecorSource>;frame:ReturnType<typeof homeFurnishingFrame>;width:number;height:number;night:boolean;safe:Bounds;editor?:FurnishingEditor}){
 const selected=editor?.selected?.kind===kind&&editor?.selected?.id===id,enabled=!!editor?.enabled;
 const left=useSharedValue(frame.left),top=useSharedValue(frame.top),startX=useSharedValue(frame.left),startY=useSharedValue(frame.top),dragging=useSharedValue(false);
 useEffect(()=>{if(!dragging.value){left.value=frame.left;top.value=frame.top;}},[frame.left,frame.top,frame.width,frame.height,selected]);
 const camera=editor?.camera,room=editor?.frame??{width,height,left:0,top:0},viewport=editor?.viewport??{width,height};
 const safeTop=editor?.safeTop??0,safeBottom=editor?.safeBottom??height;
 const choose=()=>{if(enabled&&kind!=='decor')editor?.onSelect(kind,id);};
 const save=(position:RoomItemPosition)=>{if(kind!=='decor')editor?.onDrop(kind,id,homeLogicalPoint(position,width>height));};
 const move=(dx:number,dy:number)=>{
  if(!enabled)return;choose();
  const at=dragHomeFurnishing({...frame,left:left.value,top:top.value},{x:dx,y:dy},room,camera?.value??{zoom:1,panX:0,panY:0},viewport,safe,safeTop,safeBottom);
  left.value=at.left;top.value=at.top;save({x:(at.left+frame.width/2)/width,y:(at.top+frame.height)/height});
 };
 const pan=Gesture.Pan().enabled(enabled&&!!selected).maxPointers(1).minDistance(4)
 .onBegin(()=>{startX.value=left.value;startY.value=top.value;})
 .onStart(()=>{dragging.value=true;})
 .onUpdate(e=>{
  const at=dragHomeFurnishing({...frame,left:startX.value,top:startY.value},{x:e.translationX,y:e.translationY},room,camera?.value??{zoom:1,panX:0,panY:0},viewport,safe,safeTop,safeBottom);
  left.value=at.left;top.value=at.top;
 })
 .onEnd((_e,success)=>{if(success)runOnJS(save)({x:(left.value+frame.width/2)/width,y:(top.value+frame.height)/height});})
 .onFinalize((_e,success)=>{if(!success){left.value=startX.value;top.value=startY.value;}dragging.value=false;});
 const tap=Gesture.Tap().enabled(enabled).maxDistance(10).onEnd((_e,success)=>{if(success)runOnJS(choose)();});
 const position=useAnimatedStyle(()=>({transform:[{translateX:left.value},{translateY:top.value}]}));
 const art=<View pointerEvents="none" style={StyleSheet.absoluteFill}><View pointerEvents="none" style={s.shadow}/><Image testID={kind==='flower'?`room-flower-${id}`:undefined} source={source} resizeMode="contain" style={s.art}/>{night&&<Image source={source} resizeMode="contain" tintColor="#6B78A6" style={[s.art,{opacity:.15}]}/>} {selected&&<View testID="furnishing-selection-ring" pointerEvents="none" style={s.outline}/>}</View>;
 return <GestureDetector gesture={Gesture.Race(pan,tap)} touchAction="none"><Animated.View testID={`home-${kind}-${id}`} pointerEvents={editor?'auto':'none'}
  accessible={!!editor} accessibilityRole={editor?'button':undefined} accessibilityLabel={editor?`${FURNISHING_NAMES[id]}。${selected?'ドラッグで位置を変えられます':'タップして配置を変える'}`:undefined} accessibilityState={{selected:!!selected,disabled:!enabled}}
  accessibilityHint="選んでからドラッグ。指を離すと位置を保存します" onAccessibilityTap={choose}
  accessibilityActions={[{name:'increment',label:'右へ移動'},{name:'decrement',label:'左へ移動'},{name:'up',label:'奥へ移動'},{name:'down',label:'手前へ移動'}]}
  onAccessibilityAction={e=>{const action=e.nativeEvent.actionName;if(action==='increment')move(14,0);else if(action==='decrement')move(-14,0);else if(action==='up')move(0,-14);else if(action==='down')move(0,14);}}
  tabIndex={editor&&enabled?0:-1}
  {...(Platform.OS==='web'?{onKeyDown:(e:React.KeyboardEvent)=>{if(!enabled)return;if(['Enter',' ','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();e.stopPropagation();}if(e.key==='Enter'||e.key===' ')choose();else if(e.key==='Escape')editor?.onClose();else if(e.key==='ArrowLeft')move(-14,0);else if(e.key==='ArrowRight')move(14,0);else if(e.key==='ArrowUp')move(0,-14);else if(e.key==='ArrowDown')move(0,14);}}:{})}
  style={[s.object,{width:frame.width,height:frame.height,zIndex:selected?1200:frame.zIndex},position]}>{art}</Animated.View></GestureDetector>;
}
const s=StyleSheet.create({object:{position:'absolute',left:0,top:0},art:{position:'absolute',width:'100%',height:'100%'},shadow:{position:'absolute',left:'15%',right:'10%',height:'7%',bottom:0,borderRadius:100,backgroundColor:'#6B563629'},outline:{...StyleSheet.absoluteFillObject,borderWidth:2,borderStyle:'dashed',borderColor:'#81946A',borderRadius:18,backgroundColor:'#FFF9ED12'}});
