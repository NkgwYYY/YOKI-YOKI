import {useRouter} from 'expo-router';
import React,{useEffect,useRef,useState} from 'react';
import {View,Text,Pressable,StyleSheet,Image,Modal,ScrollView} from 'react-native';
import {useApp} from '@/contexts/AppContext';
import {COSTUMES,readWardrobe} from '@/utils/wardrobe';
import {COSTUME_PRODUCTS} from '@/utils/costumePurchases';
import {costumeStore,type CostumeProduct} from '@/utils/costumeStore';
import type {CostumeId} from '@/utils/costumeGeometry';
import {WardrobePreview} from './WardrobePreview';
import {Icon} from '@/components/ui/Icon';
const ART={dog:require('@/assets/images/costumes/dog.png'),cat:require('@/assets/images/costumes/cat.png'),rabbit:require('@/assets/images/costumes/rabbit.png'),frog:require('@/assets/images/costumes/frog.png'),panda:require('@/assets/images/costumes/panda.png')};
export function CostumeShop({onWear,closet=false}:{onWear?:()=>void;closet?:boolean}){
 const router=useRouter();
 const {feedState,runCostume,buyCostume,restoreCostumes}=useApp(),wardrobe=readWardrobe(feedState.wardrobe);
 const [buy,setBuy]=useState<CostumeId|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [products,setProducts]=useState<CostumeProduct[]>([]),[loading,setLoading]=useState(!!costumeStore),[retry,setRetry]=useState(0),[catalogError,setCatalogError]=useState('');
 const lock=useRef(false),request=useRef(0);
 const [selected,setSelected]=useState<CostumeId|null>(()=>wardrobe.equipped??'panda');
 const [filter,setFilter]=useState<'all'|'owned'|'shop'>('all');
 const chosen=COSTUMES.find(c=>c.id===selected),chosenOwned=!!selected&&wardrobe.owned.includes(selected);
 const previewProduct=products.find(p=>selected&&p.id===COSTUME_PRODUCTS[selected]);
 const filtered=COSTUMES.filter(c=>filter==='all'||(filter==='owned'?wardrobe.owned.includes(c.id):!wardrobe.owned.includes(c.id)));
 useEffect(()=>{
  if(!costumeStore)return;
  const current=++request.current;setLoading(true);setCatalogError('');
  const timer=setTimeout(()=>{if(request.current===current){request.current++;setLoading(false);setCatalogError('価格の取得に時間がかかっています。再読み込みをお試しください。');}},15000);
  costumeStore.catalog().then(items=>{if(current===request.current){setProducts(items);if(items.length<COSTUMES.length)setCatalogError('一部の価格を取得できませんでした。再読み込みできます。');}}).catch(()=>{if(current===request.current)setCatalogError('価格を取得できませんでした。通信を確認して再読み込みしてください。');}).finally(()=>{clearTimeout(timer);if(current===request.current)setLoading(false);});
  return()=>{request.current++;clearTimeout(timer);};
 },[retry]);
 const perform=async(work:()=>Promise<void>)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');try{await work();}catch(e){setError(e instanceof Error?e.message:'保存できませんでした。もう一度お試しください。');}finally{lock.current=false;setBusy(false);}};
 const act=(id:CostumeId|null)=>perform(async()=>{await runCostume({kind:'equip',id});onWear?.();});
 const purchase=(method:'points'|'store',id:CostumeId|null=buy)=>perform(async()=>{
  if(!id)return;
  if(method==='points'){await runCostume({kind:'buy',id});setBuy(null);setNotice('購入しました。「着る」で着用できます。');return;}
  const result=await buyCostume(id);
  if(result==='purchased'){setBuy(null);setNotice('購入しました。「着る」で着用できます。');}
  else if(result==='pending'){setBuy(null);setNotice('購入の承認を待っています。完了後に自動で受け取ります。');}
  else setNotice('購入を取り消しました。');
 });
 const selectedProduct=products.find(p=>buy&&p.id===COSTUME_PRODUCTS[buy]);
 return <View style={s.root}>
  {closet?<>
   <WardrobePreview selected={selected}/>
   {(selected==='panda'||selected==='rabbit')&&<Pressable testID="wardrobe-matching-preview" accessibilityRole="button" disabled={busy} onPress={()=>router.push({pathname:'/room-shop',params:{product:selected==='panda'?'panda-set':'rabbit-set'}})} style={[s.button,s.pointsButton,{borderRadius:24}]}><Text style={s.pointsText}>おそろい家具とあわせて見る　›</Text></Pressable>}
   <View accessibilityRole="tablist" style={s.tabs}>{([['all','すべて'],['owned','もっている'],['shop','おみせ']] as const).map(([id,label])=><Pressable key={id} testID={`wardrobe-tab-${id}`} accessibilityRole="tab" accessibilityState={{selected:filter===id}} disabled={busy} onPress={()=>{setFilter(id);if(id==='owned'&&(!selected||!wardrobe.owned.includes(selected)))setSelected(wardrobe.owned[0]??null);if(id==='shop'&&(!selected||wardrobe.owned.includes(selected)))setSelected(COSTUMES.find(c=>!wardrobe.owned.includes(c.id))?.id??null);setError('');setNotice('');}} style={[s.tab,filter===id&&s.tabSelected]}><Text style={[s.tabText,filter===id&&{color:'#FFFDF8'}]}>{label}</Text></Pressable>)}</View>
   <ScrollView testID="wardrobe-catalog" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
    {[...filtered].sort((a,b)=>Number(b.id==='panda')-Number(a.id==='panda')).map(c=>{const owned=wardrobe.owned.includes(c.id),product=products.find(p=>p.id===COSTUME_PRODUCTS[c.id]);return <Pressable key={c.id} testID={`wardrobe-preview-${c.id}`} accessibilityRole="button" accessibilityLabel={`${c.name}の着ぐるみを確認`} accessibilityState={{selected:selected===c.id}} disabled={busy} onPress={()=>{setSelected(c.id);setError('');setNotice('');}} style={[s.tile,selected===c.id&&s.tileSelected]}><Image source={ART[c.id]} style={s.art} resizeMode="contain"/><Text style={s.name}>{c.name}</Text><Text style={s.tileNote}>{wardrobe.equipped===c.id?'着用中':owned?'もっている':`${c.cost} pt${product?` / ${product.price}`:''}`}</Text>{selected===c.id&&<View style={s.check}><Icon name="check" size={14} color="#FFF"/></View>}</Pressable>;})}
    {filter!=='shop'&&<Pressable testID="wardrobe-preview-none" accessibilityRole="button" accessibilityLabel="いつもの姿を確認" accessibilityState={{selected:selected===null}} disabled={busy} onPress={()=>setSelected(null)} style={[s.tile,selected===null&&s.tileSelected]}><View style={[s.art,{justifyContent:'center',alignItems:'center'}]}><Icon name="sun" size={28} color="#AE91BA"/></View><Text style={s.name}>いつもの姿</Text><Text style={s.tileNote}>{wardrobe.equipped===null?'着用中':'着ぐるみなし'}</Text></Pressable>}
   </ScrollView>
   {filtered.length===0&&<Text testID="wardrobe-empty" style={s.empty}>{filter==='owned'?'まだ着ぐるみを持っていません。「おみせ」でお気に入りを探してみよう。':'すべての着ぐるみを持っています。'}</Text>}
   <View testID="wardrobe-selection-actions" style={{gap:10}}>
    {selected===null||chosenOwned?<Pressable testID="wardrobe-wear-selected" accessibilityRole="button" disabled={busy||selected===wardrobe.equipped} onPress={()=>void act(selected)} style={[s.button,(busy||selected===wardrobe.equipped)&&s.disabled]}><Text style={s.buttonText}>{busy?'保存しています…':selected===wardrobe.equipped?'着用中':selected===null?'いつもの姿に戻る':'この着ぐるみを着る'}</Text></Pressable>:<>
     <View style={s.purchaseRow}>
      {costumeStore&&<Pressable testID="wardrobe-selected-store" accessibilityRole="button" disabled={busy||loading||!previewProduct} onPress={()=>void purchase('store',selected)} style={[s.button,s.purchaseHalf,(busy||loading||!previewProduct)&&s.disabled]}><Text style={s.buttonText}>{busy?'処理中…':loading?'価格を確認中…':previewProduct?`${previewProduct.price}で購入`:'価格を取得できません'}</Text></Pressable>}
      <Pressable testID="wardrobe-selected-points" accessibilityRole="button" disabled={busy||feedState.points<(chosen?.cost??500)} onPress={()=>{setError('');setNotice('');setBuy(selected);}} style={[s.pointsButton,s.purchaseHalf,(busy||feedState.points<(chosen?.cost??500))&&s.disabled]}><Text style={s.pointsText}>{chosen?.cost??500}ptで交換</Text>{feedState.points<(chosen?.cost??500)&&<Text style={s.tileNote}>あと{(chosen?.cost??500)-feedState.points}pt</Text>}</Pressable>
     </View>
     <Text style={s.centerNote}>{costumeStore?'ポイントかアプリ内購入、どちらかで購入できます。':'ポイントで交換できます。'}試着は無料です。</Text>
    </>}
   </View>
   <Text style={s.centerNote}>どの成長段階でも、同じ着ぐるみを着られます。</Text>
  </>:<>
  <Text testID="wardrobe-points" style={s.balance}>{feedState.points} YOKIポイント</Text>
  <Text style={s.note}>どの姿でも同じ着ぐるみを着られます。{costumeStore?'\nポイントかアプリ内購入、どちらかで購入できます。':''}</Text>
  <View style={s.grid}>{COSTUMES.map(c=>{const owned=wardrobe.owned.includes(c.id),selected=wardrobe.equipped===c.id,product=products.find(p=>p.id===COSTUME_PRODUCTS[c.id]);return <View key={c.id} style={s.card}><Image source={ART[c.id]} style={s.art} resizeMode="contain"/><Text style={s.name}>{c.name}</Text><Text style={[s.note,{textAlign:'center'}]}>{selected?'着用中':owned?'購入済み':`${c.cost} ポイント${product?` または ${product.price}`:''}`}</Text><Pressable testID={`wardrobe-action-${c.id}`} accessibilityRole="button" disabled={busy||selected} onPress={()=>{if(owned)void act(c.id);else{setError('');setNotice('');setBuy(c.id);}}} style={[s.button,(busy||selected)&&s.disabled]}><Text style={s.buttonText}>{owned?'着る':'購入方法を選ぶ'}</Text></Pressable></View>;})}</View>
  {wardrobe.equipped&&<Pressable testID="wardrobe-select-none" accessibilityRole="button" disabled={busy} onPress={()=>void act(null)} style={s.remove}><Text style={s.name}>着ぐるみをぬぐ</Text></Pressable>}
  </>}
  {costumeStore&&<View style={s.restoreBox}><Text style={s.note}>アプリ内購入は買い切りです。同じApple Accountで購入した着ぐるみを復元できます。</Text><Pressable testID="wardrobe-restore" accessibilityRole="button" disabled={busy} onPress={()=>void perform(async()=>{const count=await restoreCostumes();setNotice(count?`${count}種類の購入を復元しました。`:'復元できる購入はありませんでした。');})} style={s.restore}><Text style={s.restoreText}>{busy?'処理中…':'購入を復元'}</Text></Pressable>{!!catalogError&&<Text style={s.note}>{catalogError}</Text>}<Pressable testID="wardrobe-prices-retry" accessibilityRole="button" disabled={busy||loading} onPress={()=>setRetry(n=>n+1)} style={s.remove}><Text style={s.note}>{loading?'価格を確認しています…':'価格を再読み込み'}</Text></Pressable></View>}
  {!!error&&<Text testID="wardrobe-error" accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
  {!!notice&&<Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}
  <Modal visible={!!buy} transparent onRequestClose={()=>{if(!busy)setBuy(null);}}><View style={s.scrim}><ScrollView style={s.dialog} contentContainerStyle={s.dialogContent}>
   <Text style={s.name}>{COSTUMES.find(c=>c.id===buy)?.name}の着ぐるみ</Text><Text style={s.note}>購入方法を選んでください。</Text>
   <Pressable testID="wardrobe-buy-confirm" accessibilityRole="button" disabled={busy||feedState.points<500} onPress={()=>void purchase('points')} style={[s.button,(busy||feedState.points<500)&&s.disabled]}><Text style={s.buttonText}>{busy?'処理中…':'500ポイントで購入'}</Text></Pressable>
   {feedState.points<500&&<Text style={s.note}>あと{500-feedState.points}ポイントで購入できます。</Text>}
   {costumeStore&&<><Text style={s.or}>または</Text><Pressable testID="wardrobe-buy-store" accessibilityRole="button" disabled={busy||loading||!selectedProduct} onPress={()=>void purchase('store')} style={[s.moneyButton,(busy||loading||!selectedProduct)&&s.disabled]}><Text style={s.moneyText}>{loading?'価格を確認中…':selectedProduct?`${selectedProduct.price}で購入`:'価格を取得できませんでした'}</Text></Pressable><Text style={s.note}>買い切り・追加の月額料金はありません。</Text>{!loading&&!selectedProduct&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>setRetry(n=>n+1)} style={s.remove}><Text style={s.restoreText}>価格を再読み込み</Text></Pressable>}</>}
   <Pressable testID="wardrobe-buy-cancel" accessibilityRole="button" disabled={busy} onPress={()=>setBuy(null)} style={s.remove}><Text style={s.name}>やめる</Text></Pressable>
   {!!error&&<Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}{!!notice&&<Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}
  </ScrollView></View></Modal>
 </View>;
}
const s=StyleSheet.create({
 tabs:{flexDirection:'row',backgroundColor:'#F5EBE2',borderRadius:24,padding:3,gap:3},tab:{flex:1,minHeight:44,justifyContent:'center',alignItems:'center',borderRadius:22},tabSelected:{backgroundColor:'#9A78AC'},tabText:{fontSize:12,fontWeight:'600',color:'#755D7D'},rail:{gap:10,paddingVertical:3,paddingRight:2},tile:{width:128,borderRadius:22,borderWidth:1.5,borderColor:'#E9D9C9',backgroundColor:'#FFFCF6',padding:12,alignItems:'center',gap:7},tileSelected:{borderColor:'#A77ABA',backgroundColor:'#F5ECF8',borderWidth:2},tileNote:{fontSize:12,lineHeight:19,color:'#8A6E96',textAlign:'center'},check:{position:'absolute',right:7,top:7,width:23,height:23,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:'#9A78AC'},purchaseRow:{flexDirection:'row',gap:10},purchaseHalf:{flex:1,minHeight:60,borderRadius:24,paddingHorizontal:8},pointsButton:{borderWidth:1.5,borderColor:'#DBC6AA',backgroundColor:'#FFF5E5',justifyContent:'center',alignItems:'center',gap:2,paddingVertical:10},pointsText:{fontSize:14,fontWeight:'600',color:'#7C634D'},centerNote:{fontSize:11,lineHeight:20,color:'#8B7A83',textAlign:'center'},empty:{fontSize:13,lineHeight:22,color:'#8B7A83',textAlign:'center',padding:12},root:{gap:16},balance:{fontSize:17,color:'#625074',fontWeight:'600'},note:{fontSize:12,lineHeight:21,color:'#75667D'},grid:{flexDirection:'row',flexWrap:'wrap',gap:12},card:{width:'47%',flexGrow:1,padding:15,gap:10,alignItems:'center',borderRadius:22,backgroundColor:'#FFFDFA',borderWidth:1,borderColor:'#E6DDEB'},art:{width:100,height:100},name:{fontSize:16,lineHeight:24,color:'#574562',fontWeight:'600'},button:{minHeight:46,justifyContent:'center',alignItems:'center',backgroundColor:'#856395',borderRadius:15,paddingHorizontal:14,paddingVertical:12},buttonText:{color:'#FFF',fontSize:14,fontWeight:'600',textAlign:'center'},disabled:{opacity:.45},remove:{minHeight:44,justifyContent:'center',alignItems:'center'},error:{fontSize:13,color:'#A14D61',lineHeight:22},notice:{fontSize:13,color:'#625074',lineHeight:22},scrim:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#21152B88',padding:24},dialog:{width:'100%',maxWidth:420,maxHeight:'100%',flexGrow:0,borderRadius:24,backgroundColor:'#FFFDF9'},dialogContent:{padding:24,gap:10},moneyButton:{minHeight:48,justifyContent:'center',alignItems:'center',backgroundColor:'#E8F2EE',borderWidth:1,borderColor:'#A8C6B7',borderRadius:15,padding:12},moneyText:{fontSize:15,fontWeight:'600',color:'#335F50'},or:{fontSize:12,textAlign:'center',color:'#807285'},restoreBox:{padding:18,gap:10,borderRadius:18,backgroundColor:'#F0EAF5'},restore:{minHeight:44,justifyContent:'center',alignItems:'center',backgroundColor:'#FFFFFF',borderRadius:12},restoreText:{fontSize:14,fontWeight:'600',color:'#725184'}});
