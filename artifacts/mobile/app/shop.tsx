import React,{useEffect,useRef,useState} from 'react';
import {Image,Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useRouter,useLocalSearchParams} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {Icon} from '@/components/ui/Icon';
import {OtherShop} from '@/components/OtherShop';
import {ShopFittingPreview} from '@/components/ShopFittingPreview';
import {costumeThumbnail} from '@/utils/costumeThumbnails';
import {getMascotStage} from '@/utils/mascotUtils';
import {COSTUMES,readWardrobe} from '@/utils/wardrobe';
import {costumeStore} from '@/utils/costumeStore';
import {COSTUME_PRODUCTS} from '@/utils/costumePurchases';
import {roomStore} from '@/utils/roomStore';
import {roomPointQuote,roomProductSku,readRoomCollection} from '@/utils/roomBoutique';
import {roomGoodArt,roomThemeArt} from '@/utils/roomBoutiqueArt';
import {roomFurnitureSource,roomFlowerSource} from '@/components/room/RoomFurnitureArt';
import {SHOP_PRODUCTS,inShopCategory,findShopProduct,cashShopProduct,type ShopProduct,type ShopCategory} from '@/utils/unifiedShop';
import {prepareHomeRoomArt} from '@/utils/worldArt';
const TABS=[['all','すべて'],['costumes','きぐるみ'],['furniture','家具・花'],['sets','セット'],['owned','もっている'],['other','その他']] as const;
export default function ShopScreen(){
 const app=useApp(),auth=useAuth(),router=useRouter(),safe=useSafeAreaInsets(),params=useLocalSearchParams<{product?:string;tab?:string}>();
 const initialCategory:ShopCategory=['costumes','furniture','sets','owned'].includes(params.tab??'')?params.tab as ShopCategory:params.tab&&params.tab!=='all'?'other':'all';
 const [expanded,setExpanded]=useState(false),[category,setCategory]=useState<ShopCategory>(initialCategory),[selected,setSelected]=useState<string|null>(()=>params.product?findShopProduct(params.product).key:SHOP_PRODUCTS.find(p=>inShopCategory(p,initialCategory))?.key??SHOP_PRODUCTS[0].key);
 const [night,setNight]=useState(false),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState(''),[catalogError,setCatalogError]=useState(''),[retry,setRetry]=useState(0);
 const [prices,setPrices]=useState<{id:string;price:string}[]>([]),[loading,setLoading]=useState(!!(costumeStore||roomStore));
 const lock=useRef(false),generation=useRef(0),scroll=useRef<ScrollView>(null),detailsY=useRef(0),previewY=useRef(0);
 const ready=!app.isLoading&&!app.storageError&&!auth.isLoading&&(!auth.isSignedIn||app.cloudSynced);
 const wardrobe=readWardrobe(app.feedState.wardrobe),room=readRoomCollection(app.roomCustomization.boutique),stage=getMascotStage(app.progress);
 const product=selected?findShopProduct(selected):null;
 const quote=(p:ShopProduct)=>p.costume?(wardrobe.owned.includes(p.costume)?0:p.points):p.room?roomPointQuote(p.room.id,room,wardrobe):p.furniture?(app.roomCustomization.ownedFurniture.includes(p.furniture)?0:p.points):(app.roomCustomization.ownedFlowers.includes(p.flower!)?0:p.points);
 const cost=product?quote(product):0,owned=cost===0;
 const applied=product?.costume?wardrobe.equipped===product.costume:product?.room?owned&&(product.room.theme?room.theme===product.room.theme:room.goods.includes(product.room.good!)&&(!product.room.costume||wardrobe.equipped===product.room.costume)):product?.furniture?app.roomCustomization.furniture===product.furniture:product?.flower?app.roomCustomization.flower===product.flower:wardrobe.equipped===null;
 // For a partial cash bundle, buy only the missing entitlement.
 const cashProduct=cashShopProduct(product,room,wardrobe);
 const sku=cashProduct?.costume?COSTUME_PRODUCTS[cashProduct.costume]:cashProduct?.room?roomProductSku(cashProduct.room.id):null;
 const price=prices.find(p=>p.id===sku),hasNative=!!(costumeStore||roomStore);
 const available=SHOP_PRODUCTS.filter(p=>inShopCategory(p,category)&&(category!=='owned'||quote(p)===0));
 const featured=['costume-panda','panda-furniture','panda-set','rain-cafe'];
 const ordered=category==='all'?[...available].sort((a,b)=>(featured.includes(a.key)?featured.indexOf(a.key):99)-(featured.includes(b.key)?featured.indexOf(b.key):99)):available;
 const visible=category==='all'&&!expanded?ordered.slice(0,4):ordered;
 useEffect(()=>{
  let alive=true;const token=++generation.current;setLoading(hasNative);setCatalogError('');
  const timer=setTimeout(()=>{if(alive&&generation.current===token){generation.current++;setLoading(false);setCatalogError('価格を確認できませんでした。再読み込みできます。');}},15000);
  const calls=[...(costumeStore?[costumeStore.catalog()]:[]),...(roomStore?[roomStore.catalog()]:[])];
  Promise.allSettled(calls).then(results=>{if(!alive||generation.current!==token)return;const found=results.flatMap(r=>r.status==='fulfilled'?r.value:[]);setPrices(found);if(found.length<(costumeStore?COSTUMES.length:0)+(roomStore?7:0))setCatalogError('一部の販売価格を確認できません。ポイント交換は利用できます。');setLoading(false);clearTimeout(timer);});
  return()=>{alive=false;clearTimeout(timer);generation.current++;};
 },[retry,hasNative]);
 const perform=async(work:()=>Promise<void>)=>{if(lock.current||!ready)return;lock.current=true;setBusy(true);setError('');setNotice('');try{await work();}catch(e){setError(e instanceof Error?e.message:'保存できませんでした。もう一度お試しください。');}finally{lock.current=false;setBusy(false);}};
 const choose=(key:string|null)=>{if(busy)return;setSelected(key);setNotice('');setError('');setConfirm(false);};
 const points=()=>perform(async()=>{if(!product)return;if(product.costume)await app.runCostume({kind:'buy',id:product.costume});else if(product.room)await app.runRoomBoutique({kind:'buy',id:product.room.id});else{const r=await app.buyRoomItem(product.furniture?'furniture':'flower',product.furniture??product.flower!,product.points);if(!r.success)throw Error('ポイントを確認してください。');}setConfirm(false);setNotice('交換しました。好きなときに使えます。');});
 const cash=()=>perform(async()=>{if(!price||!cashProduct)return;const result=cashProduct.costume?await app.buyCostume(cashProduct.costume):await app.buyRoomProduct(cashProduct.room!.id);setNotice(result==='purchased'?'購入しました。好きなときに使えます。':result==='pending'?'購入の承認を待っています。完了後に自動で受け取ります。':'購入を取り消しました。');});
 const apply=()=>perform(async()=>{if(product?.room){if(product.room.theme)await prepareHomeRoomArt(night,false,false,undefined,product.room.theme);await app.runRoomBoutique({kind:'apply',id:product.room.id});}else if(product?.furniture||product?.flower){const ok=await app.selectRoomItem(product.furniture?'furniture':'flower',product.furniture??product.flower!);if(!ok)throw Error('配置を保存できませんでした。');}else await app.runCostume({kind:'equip',id:product?.costume??null});setNotice('おうちに反映しました。');});
 const button=(id:string,label:string,action:()=>void,disabled=false,secondary=false)=><Pressable testID={id} accessibilityRole="button" disabled={disabled} onPress={action} style={[s.button,secondary&&s.secondary,disabled&&s.disabled]}><Text style={[s.buttonText,secondary&&s.secondaryText]}>{label}</Text></Pressable>;
 const thumbnail=(p:ShopProduct)=>p.costume?<Image source={costumeThumbnail(stage,p.costume)} resizeMode="contain" style={s.thumb}/>:p.room?.costume?<View style={s.thumb}><Image source={costumeThumbnail(stage,p.room.costume)} resizeMode="contain" style={{width:'72%',height:'100%'}}/><Image source={roomGoodArt(p.room.good!)} resizeMode="contain" style={{position:'absolute',right:0,bottom:0,width:'40%',height:'50%'}}/></View>:<Image source={p.room?(p.room.theme?roomThemeArt(p.room.theme,false,true,true):roomGoodArt(p.room.good!)):p.furniture?roomFurnitureSource(p.furniture):roomFlowerSource(p.flower!)} resizeMode={p.room?.theme?'cover':'contain'} style={s.thumb}/>;
 return <View testID="unified-shop" style={[s.root,{paddingTop:safe.top}]}>
  <View style={s.header}><Pressable testID="shop-back" accessibilityRole="button" accessibilityLabel="おうちに戻る" onPress={()=>router.replace('/(tabs)')} style={s.back}><Icon name="arrow-left" size={22} color="#785A88"/></Pressable><Text style={s.title}>おみせ</Text><Text testID="shop-balance" style={s.balance}>{app.feedState.points.toLocaleString()} pt</Text></View>
  {!ready?<Text style={s.note}>{app.storageError?'保存データを確認できません。おうちで再読み込みしてください。':'おみせを準備しています…'}</Text>:<ScrollView ref={scroll} contentContainerStyle={[s.body,{paddingBottom:safe.bottom+24}]}>
   <ScrollView testID="shop-tabs" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs} accessibilityRole="tablist">{TABS.map(([id,label])=><Pressable key={id} testID={`shop-tab-${id}`} accessibilityRole="tab" accessibilityState={{selected:category===id}} disabled={busy} onPress={()=>{setCategory(id);setExpanded(false);if(id!=='other'){const next=SHOP_PRODUCTS.find(p=>inShopCategory(p,id)&&(id!=='owned'||quote(p)===0));choose(next?.key??null);}}} style={[s.tab,id===category&&s.tabOn]}><Text style={[s.tabText,id===category&&{color:'#FFF'}]}>{label}</Text></Pressable>)}</ScrollView>
   {category==='other'?<OtherShop/>:<>
    <View onLayout={e=>previewY.current=e.nativeEvent.layout.y}><ShopFittingPreview product={product} night={night}/><View style={s.previewCaption}><Text style={s.small}>いつもの子で試着 · {applied?'使用中':owned?'もっている':'無料プレビュー'}</Text><Pressable testID="shop-preview-light" accessibilityRole="button" onPress={()=>setNight(v=>!v)} style={s.light}><Text style={s.small}>{night?'夜':'昼'}を切り替え</Text></Pressable></View></View>
    <View style={s.previewCaption}><Text style={s.tileName}>{product?.name??'いつもの姿'}</Text><Pressable testID="shop-see-actions" accessibilityRole="button" onPress={()=>scroll.current?.scrollTo({y:detailsY.current,animated:true})} style={s.light}><Text style={s.small}>購入・使用へ ↓</Text></Pressable></View>
    <View style={s.grid}>{visible.map(p=><Pressable testID={`shop-product-${p.key}`} key={p.key} accessibilityRole="button" accessibilityLabel={`${p.name}を試す`} accessibilityState={{selected:p.key===selected}} disabled={busy} onPress={()=>choose(p.key)} style={[s.tile,p.key===selected&&s.tileOn]}>{thumbnail(p)}<Text style={s.tileName}>{p.name}</Text><Text style={s.small}>{quote(p)===0?'もっている':`${quote(p).toLocaleString()} pt`}</Text></Pressable>)}</View>
    {category==='all'&&available.length>4&&button('shop-expand',expanded?'一覧をたたむ':`すべて表示（${available.length}点）`,()=>setExpanded(v=>!v),busy,true)}
    {visible.length===0&&<Text style={s.note}>まだ持っているアイテムはありません。無料で試着できます。</Text>}
    {category==='costumes'||category==='owned'?button('shop-usual','いつもの姿を見る',()=>choose(null),busy,true):null}
    <View testID="shop-selection" onLayout={e=>detailsY.current=e.nativeEvent.layout.y} style={s.details}>
     <Text testID="shop-selection-name" style={s.productName}>{product?.name??'いつもの姿'}</Text>
     {product?.room&&<Text style={s.note}>{product.room.contents.join(' ＋ ')}</Text>}
     {button('shop-see-preview','試着をもう一度見る',()=>scroll.current?.scrollTo({y:previewY.current,animated:true}),busy,true)}
     {owned?button('shop-apply',busy?'保存中…':applied?'使用中':product?.costume?'このきぐるみを着る':product?'おうちに飾る':'いつもの姿に戻る',()=>void apply(),busy||applied):<>
      {product&&cost<product.points&&<Text testID="shop-owned-discount" style={s.note}>もっている分を差し引いて {cost.toLocaleString()} pt</Text>}
      <View style={s.purchaseRow}>{button('shop-buy-points',`${cost.toLocaleString()} ptで交換`,()=>setConfirm(true),busy||app.feedState.points<cost)}{hasNative&&sku&&button('shop-buy-store',loading?'価格を確認中…':price?`${price.price}で購入`:'価格を確認できません',()=>void cash(),busy||loading||!price,true)}</View>
      {app.feedState.points<cost&&<Text style={s.small}>あと {(cost-app.feedState.points).toLocaleString()} pt</Text>}
      {cashProduct!==product&&<Text style={s.small}>アプリ内購入では、持っていない「{cashProduct?.name}」だけを購入します。</Text>}
     </>}
     {!!error&&<Text testID="shop-error" accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}{!!notice&&<Text testID="shop-notice" accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}
     {owned&&button('shop-show-home','おうちで見る',()=>router.replace('/(tabs)'),busy,true)}
    </View>
    {room.theme&&button('shop-reset-theme','いつものお部屋に戻す',()=>void perform(async()=>{await app.runRoomBoutique({kind:'default'});setNotice('いつものお部屋に戻しました。');}),busy,true)}
    {hasNative&&<View style={s.restore}><Text style={s.small}>同じApple Accountで購入したアイテムを復元できます。</Text>{button('shop-restore',busy?'確認中…':'購入を復元',()=>void perform(async()=>{const c=costumeStore?await app.restoreCostumes():0;const r=roomStore?await app.restoreRoomProducts():0;setNotice(c+r?`${c+r}種類の購入を復元しました。`:'復元できる購入はありませんでした。');}),busy,true)}{!!catalogError&&<Text style={s.small}>{catalogError}</Text>}{button('shop-prices-retry','価格を再読み込み',()=>setRetry(x=>x+1),busy||loading,true)}</View>}
   </>}
  </ScrollView>}
  <Modal visible={confirm} transparent onRequestClose={()=>{if(!busy)setConfirm(false);}}><View style={s.scrim}><View style={s.dialog}><Text style={s.productName}>{product?.name}</Text><Text style={s.note}>{cost.toLocaleString()} pt を使って交換します。交換後は {(app.feedState.points-cost).toLocaleString()} pt です。</Text>{button('shop-confirm-points',busy?'保存中…':'交換する',()=>void points(),busy||app.feedState.points<cost)}{button('shop-cancel-points','やめる',()=>setConfirm(false),busy,true)}{!!error&&<Text style={s.error}>{error}</Text>}</View></View></Modal>
 </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#FFF9F0'},header:{width:'100%',maxWidth:620,alignSelf:'center',flexDirection:'row',alignItems:'center',padding:12,gap:8},back:{width:44,height:44,alignItems:'center',justifyContent:'center'},title:{flex:1,fontSize:21,fontWeight:'600',color:'#614A70',textAlign:'center'},balance:{fontSize:13,fontWeight:'600',color:'#7A6585'},body:{width:'100%',maxWidth:580,alignSelf:'center',padding:14,gap:14},tabs:{gap:6},tab:{minHeight:44,paddingHorizontal:15,borderRadius:22,backgroundColor:'#F4EDE4',justifyContent:'center'},tabOn:{backgroundColor:'#A087B0'},tabText:{fontSize:12,color:'#7B6585',fontWeight:'600'},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},tile:{width:'48%',flexGrow:1,padding:10,gap:5,borderRadius:20,borderWidth:1.5,borderColor:'#E9DCCE',backgroundColor:'#FFFCF7'},tileOn:{borderColor:'#B38ABE',backgroundColor:'#F4ECF8'},thumb:{width:'100%',height:96,borderRadius:12},tileName:{fontSize:12,lineHeight:20,color:'#624E6F',fontWeight:'600'},small:{fontSize:11,lineHeight:19,color:'#8B778B'},note:{fontSize:13,lineHeight:23,color:'#86736A'},previewCaption:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:6},light:{minHeight:40,justifyContent:'center'},details:{padding:16,gap:12,borderRadius:24,backgroundColor:'#FFFCF6',borderWidth:1,borderColor:'#E7D8C9'},productName:{fontSize:17,lineHeight:26,color:'#624E6F',fontWeight:'600'},purchaseRow:{flexDirection:'row',flexWrap:'wrap',gap:8},button:{minHeight:48,padding:12,borderRadius:24,backgroundColor:'#9D7CAD',alignItems:'center',justifyContent:'center',flexGrow:1},buttonText:{fontSize:13,lineHeight:22,fontWeight:'600',color:'#FFF',textAlign:'center'},secondary:{backgroundColor:'#F5ECF5',borderWidth:1,borderColor:'#D8BEDF'},secondaryText:{color:'#81638E'},disabled:{opacity:.45},notice:{fontSize:13,lineHeight:22,color:'#668155'},error:{fontSize:13,lineHeight:22,color:'#A64D5C'},restore:{gap:12,padding:14,borderRadius:22,backgroundColor:'#F3ECF4'},scrim:{flex:1,justifyContent:'center',alignItems:'center',padding:24,backgroundColor:'#30223D88'},dialog:{width:'100%',maxWidth:420,padding:22,gap:16,borderRadius:24,backgroundColor:'#FFFCF7'}});
