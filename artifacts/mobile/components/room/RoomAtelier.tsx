import {colors} from '@/constants/theme';
import React, {useRef,useState} from 'react';
import {Image,StyleSheet,Text,View} from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import {useRouter} from 'expo-router';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {Button} from '@/components/ui/Button';
import {RoomItemPreview,roomDecorSource} from './RoomFurnitureArt';
import {CleaningToolArt} from '@/components/world/CleaningToolArt';
import {EGG_COMPANION_COST,useApp,type RoomFurniture,type RoomFlower,type RoomItemKind} from '@/contexts/AppContext';
import {useItems,resolveItemAssetUrl} from '@/contexts/ItemContext';
import {ROOM_FURNITURE,ROOM_FLOWERS,homewaresGenre} from '@/utils/homewares';
import {readHousekeeping} from '@/utils/housekeeping';
export type AtelierCategory='furniture'|'flower'|'decor'|'cleaning';
const sections=[{id:'furniture',name:'家具'},{id:'flower',name:'花'},{id:'decor',name:'置物'},{id:'cleaning',name:'おもちゃ'}] as const;
export function RoomAtelier({onClose,initialCategory='furniture'}:{onClose:()=>void;initialCategory?:AtelierCategory}){
 const router=useRouter();
 const {feedState,roomCustomization:room,selectRoomItem,companionState,buyEggCompanion,cleanRoom}=useApp();
 const {items,shopState,equipItem,updateItemPlacement}=useItems();
 const [tab,setTab]=useState<AtelierCategory>(initialCategory),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false);
 const act=async(task:()=>Promise<void>)=>{if(lock.current)return;lock.current=true;setBusy(true);setMessage('');try{await task();}catch{setMessage('保存できませんでした。もう一度お試しください。');}finally{lock.current=false;setBusy(false);}};
 const house=readHousekeeping(feedState.housekeeping,Date.now());
 const decorations=items.filter(item=>homewaresGenre(item)==='decor'&&shopState.inventory.includes(item.id));
 const selectedDecor=decorations.find(item=>item.id===shopState.equipped.decor);
 const row=(id:string,name:string,selected:boolean,art:React.ReactNode,select:()=>Promise<void>)=><Pressable key={id} testID={`atelier-${tab}-${id}`} accessibilityRole="button" accessibilityLabel={`${name}、${selected?'使用中':'選ぶ'}`} accessibilityState={{selected,disabled:busy}} disabled={busy} onPress={()=>void act(select)} style={[s.row,selected&&s.selected]}><View style={s.art}>{art??<Text style={s.empty}>×</Text>}</View><Text style={[s.name,selected&&s.selectedText]}>{name}</Text><Text style={[s.status,selected&&s.selectedText]}>{selected?'使用中':'選ぶ'}</Text></Pressable>;
 const roomOption=(kind:RoomItemKind,id:RoomFurniture|RoomFlower,name:string)=>row(id,name,room[kind]===id,id==='none'?null:<RoomItemPreview kind={kind} id={id}/>,async()=>{if(!await selectRoomItem(kind,id))throw Error('not owned');setMessage('部屋の模様替えをしました。');});
 const adjustDecor=async(dx:number,dy:number,ds=0)=>{if(!selectedDecor)return;const p=shopState.placements[selectedDecor.id]??{x:0,y:0,scale:1};await updateItemPlacement(selectedDecor.id,{x:Math.max(-160,Math.min(160,p.x+dx)),y:Math.max(-160,Math.min(160,p.y+dy)),scale:Math.max(.55,Math.min(1.45,p.scale+ds))});setMessage('置物の位置を保存しました。');};
 return <BottomSheet visible onClose={onClose} title="部屋の模様替え" subtitle="持っているものを、お気に入りの場所へ。" contentStyle={{gap:12}}>
   <View style={s.tabs} accessibilityRole="tablist">{sections.map(section=><Pressable key={section.id} testID={`atelier-tab-${section.id}`} accessibilityRole="tab" accessibilityLabel={section.name} accessibilityState={{selected:tab===section.id}} onPress={()=>{setTab(section.id);setMessage('');}} style={[s.tab,tab===section.id&&s.tabOn]}><Text style={[s.tabText,tab===section.id&&s.tabTextOn]}>{section.name}</Text></Pressable>)}</View>
   {!!message&&<Text accessibilityLiveRegion="polite" style={s.message}>{message}</Text>}
   {(tab==='furniture'||tab==='flower')&&<>
     {roomOption(tab,'none','置かない')}
     {(tab==='furniture'?ROOM_FURNITURE:ROOM_FLOWERS).filter(item=>(tab==='furniture'?room.ownedFurniture:room.ownedFlowers).some(id=>id===item.id)).map(item=>roomOption(tab,item.id,item.name))}
     {(tab==='furniture'?room.ownedFurniture:room.ownedFlowers).length===0&&<Text style={s.help}>まだ{tab==='furniture'?'家具':'花'}を持っていません。ショップで、お気に入りを探してみよう。</Text>}
   </>}
   {tab==='decor'&&<>
     {row('none','置かない',!shopState.equipped.decor,null,async()=>{await equipItem('decor',null);setMessage('置物をしまいました。');})}
     {decorations.map(item=>row(item.id,item.name,shopState.equipped.decor===item.id,<Image source={roomDecorSource(item.id,resolveItemAssetUrl(item.assetUrl))} resizeMode="contain" style={{width:60,height:60}}/>,async()=>{await equipItem('decor',item.id);setMessage('置物を飾りました。');}))}
     {!decorations.length&&<Text style={s.help}>ぬいぐるみや観葉植物も、ここからお部屋に飾れます。</Text>}
     {selectedDecor&&<View style={s.controls}><Text style={s.help}>「{selectedDecor.name}」の位置と大きさ</Text><View style={s.controlRow}>{([{label:'←',name:'置物を左へ',x:-12,y:0},{label:'↑',name:'置物を上へ',x:0,y:-12},{label:'↓',name:'置物を下へ',x:0,y:12},{label:'→',name:'置物を右へ',x:12,y:0}]).map(b=><Pressable key={b.label} accessibilityRole="button" accessibilityLabel={b.name} disabled={busy} onPress={()=>void act(()=>adjustDecor(b.x,b.y))} style={s.control}><Text style={s.controlText}>{b.label}</Text></Pressable>)}</View><View style={s.controlRow}>{[-.1,.1].map(ds=><Pressable key={ds} accessibilityRole="button" disabled={busy} onPress={()=>void act(()=>adjustDecor(0,0,ds))} style={s.control}><Text style={s.controlText}>{ds<0?'− 小さく':'＋ 大きく'}</Text></Pressable>)}</View><Text style={s.help}>閉じると、お部屋全体で確認できます。</Text></View>}
   </>}
   {tab==='cleaning'&&<>
     <Text style={s.help}>ロボットに乗って、お部屋をころころ。好きなときに、一緒に遊べるよ。</Text>
     {row('none','置かない',!house.robotPlaced,null,async()=>{if(house.owned.includes('robot'))await cleanRoom({kind:'placeRobot',placed:false});setMessage('ロボット掃除機をしまいました。');})}
     {house.owned.includes('robot')?row('robot','ロボット掃除機',house.robotPlaced,<CleaningToolArt tool="robot" size={60}/>,async()=>{await cleanRoom({kind:'placeRobot',placed:true});setMessage('ロボット掃除機を置きました。');}):<Text style={s.help}>ショップで購入できます。</Text>}
   </>}
   <Pressable testID="atelier-shop" accessibilityRole="button" disabled={busy} onPress={()=>{onClose();router.push('/shop');}} style={s.shop}><Text style={s.shopText}>ショップで探す　›</Text></Pressable>
   {tab==='furniture'&&<><Text style={s.help}>もうひとつのたまご</Text><Button label={companionState.extraEggs>0?'一緒に暮らしています':`${EGG_COMPANION_COST} pt で迎える`} disabled={busy||companionState.extraEggs>0||feedState.points<EGG_COMPANION_COST} onPress={()=>void act(async()=>{const result=await buyEggCompanion();setMessage(result.success?'新しい仲間がやってきました。':'今は迎えられませんでした。');})}/></>}
 </BottomSheet>;
}
const s=StyleSheet.create({
 tabs:{flexDirection:'row',backgroundColor:colors.muted,borderRadius:12,padding:4,gap:2},tab:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:9},tabOn:{backgroundColor:colors.primarySoft},tabText:{color:colors.mutedForeground,fontSize:14},tabTextOn:{color:colors.primaryOnSoft,fontWeight:'600'},
 row:{flexDirection:'row',alignItems:'center',minHeight:78,padding:10,gap:12,borderRadius:14,borderWidth:1,borderColor:colors.border,backgroundColor:colors.card},selected:{backgroundColor:colors.primarySoft,borderColor:colors.borderStrong},art:{width:60,height:60,alignItems:'center',justifyContent:'center'},empty:{fontSize:27,color:'#9F84AC'},name:{flex:1,color:colors.foreground,fontSize:15},selectedText:{color:colors.foreground},status:{color:colors.primary,fontSize:12},help:{color:colors.mutedForeground,fontSize:13,lineHeight:22},message:{color:colors.primary,fontSize:13,lineHeight:22},shop:{padding:14,minHeight:48,borderRadius:12,backgroundColor:colors.primarySoft},shopText:{color:colors.primaryOnSoft,textAlign:'center'},controls:{gap:10},controlRow:{flexDirection:'row',gap:8},control:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:10,backgroundColor:colors.primarySoft},controlText:{color:colors.foreground,fontSize:14},
});
