import React, {useEffect, useRef, useState} from 'react';
import {Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {useRouter, useLocalSearchParams} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {Icon} from '@/components/ui/Icon';
import {OtherShop} from '@/components/OtherShop';
import {ShopFittingPreview} from '@/components/ShopFittingPreview';
import {costumeThumbnail} from '@/utils/costumeThumbnails';
import {getMascotStage} from '@/utils/mascotUtils';
import {COSTUMES, readWardrobe} from '@/utils/wardrobe';
import {costumeStore} from '@/utils/costumeStore';
import {COSTUME_PRODUCTS} from '@/utils/costumePurchases';
import {roomStore} from '@/utils/roomStore';
import {roomPointQuote, roomProductSku, readRoomCollection} from '@/utils/roomBoutique';
import {roomGoodArt, roomThemeArt} from '@/utils/roomBoutiqueArt';
import {roomFurnitureSource, roomFlowerSource} from '@/components/room/RoomFurnitureArt';
import {SHOP_PRODUCTS, inShopCategory, findShopProduct, cashShopProduct, shopEntryCategory, type ShopProduct, type ShopCategory} from '@/utils/unifiedShop';
import {prepareHomeRoomArt} from '@/utils/worldArt';

const TABS = [['costumes', 'きぐるみ'], ['furniture', '家具・花'], ['sets', 'セット']] as const;
const HEADINGS = {costumes:'この子に似合う、きぐるみ。', furniture:'お部屋に、お気に入りを。', sets:'おそろいで、もっとかわいく。', owned:'もっているアイテム', other:'暮らしを楽しむアイテム'};
const tint = (p:ShopProduct) => p.costume==='frog' ? '#E7F0DE' : p.costume==='rabbit'||p.room?.costume==='rabbit' ? '#F9E8E5' : p.costume==='cat' ? '#EEE8F6' : p.costume==='dog' ? '#F6EBDD' : p.flower ? '#F3E8ED' : '#E8EDE6';
const shortName = (p:ShopProduct) => p.costume ? p.name.replace('のきぐるみ','') : p.name;

export default function ShopScreen() {
 const app=useApp(), auth=useAuth(), router=useRouter(), safe=useSafeAreaInsets(), {width:windowWidth,fontScale}=useWindowDimensions();
 const params=useLocalSearchParams<{product?:string;tab?:string}>();
 const [category,setCategory]=useState<ShopCategory>(()=>shopEntryCategory(params.tab,params.product));
 const [selected,setSelected]=useState<string|null>(()=>params.product?findShopProduct(params.product).key:null);
 const [detailOpen,setDetailOpen]=useState(!!params.product);
 const [night,setNight]=useState(false), [busy,setBusy]=useState(false), [confirm,setConfirm]=useState(false);
 const [notice,setNotice]=useState(''), [error,setError]=useState(''), [catalogError,setCatalogError]=useState(''), [retry,setRetry]=useState(0);
 const [prices,setPrices]=useState<{id:string;price:string}[]>([]), [loading,setLoading]=useState(!!(costumeStore||roomStore));
 const lock=useRef(false), generation=useRef(0), catalogScroll=useRef<ScrollView>(null);
 const ready=!app.isLoading&&!app.storageError&&!auth.isLoading&&(!auth.isSignedIn||app.cloudSynced);
 const wardrobe=readWardrobe(app.feedState.wardrobe), room=readRoomCollection(app.roomCustomization.boutique), stage=getMascotStage(app.progress);
 const product=selected?findShopProduct(selected):null;
 const quote=(p:ShopProduct)=>p.costume?(wardrobe.owned.includes(p.costume)?0:p.points):p.room?roomPointQuote(p.room.id,room,wardrobe):p.furniture?(app.roomCustomization.ownedFurniture.includes(p.furniture)?0:p.points):(app.roomCustomization.ownedFlowers.includes(p.flower!)?0:p.points);
 const cost=product?quote(product):0, owned=cost===0;
 const applied=product?.costume?wardrobe.equipped===product.costume:product?.room?owned&&(product.room.theme?room.theme===product.room.theme:room.goods.includes(product.room.good!)&&(!product.room.costume||wardrobe.equipped===product.room.costume)):product?.furniture?app.roomCustomization.furniture===product.furniture:product?.flower?app.roomCustomization.flower===product.flower:wardrobe.equipped===null;
 // A partially owned cash bundle buys only the missing entitlement.
 const cashProduct=cashShopProduct(product,room,wardrobe);
 const skuFor=(p:ShopProduct|null)=>p?.costume?COSTUME_PRODUCTS[p.costume]:p?.room?roomProductSku(p.room.id):null;
 const sku=skuFor(cashProduct), price=prices.find(p=>p.id===sku), hasNative=!!(costumeStore||roomStore);
 const visible=SHOP_PRODUCTS.filter(p=>inShopCategory(p,category)&&(category!=='owned'||quote(p)===0));
 useEffect(()=>{
  let alive=true; const token=++generation.current; setLoading(hasNative); setCatalogError('');
  const timer=setTimeout(()=>{if(alive&&generation.current===token){generation.current++;setLoading(false);setCatalogError('価格を確認できませんでした。再読み込みできます。');}},15000);
  const calls=[...(costumeStore?[costumeStore.catalog()]:[]),...(roomStore?[roomStore.catalog()]:[])];
  Promise.allSettled(calls).then(results=>{if(!alive||generation.current!==token)return;const found=results.flatMap(r=>r.status==='fulfilled'?r.value:[]);setPrices(found);if(found.length<(costumeStore?COSTUMES.length:0)+(roomStore?7:0))setCatalogError('一部の販売価格を確認できません。ポイント交換は利用できます。');setLoading(false);clearTimeout(timer);});
  return()=>{alive=false;clearTimeout(timer);generation.current++;};
 },[retry,hasNative]);
 const perform=async(work:()=>Promise<void>)=>{if(lock.current||!ready)return;lock.current=true;setBusy(true);setError('');setNotice('');try{await work();}catch(e){setError(e instanceof Error?e.message:'保存できませんでした。もう一度お試しください。');}finally{lock.current=false;setBusy(false);}};
 const choose=(key:string|null)=>{if(busy)return;setSelected(key);setNotice('');setError('');setConfirm(false);setDetailOpen(true);};
 const close=()=>{if(busy)return;setDetailOpen(false);setConfirm(false);setNotice('');setError('');};
 const changeCategory=(next:ShopCategory)=>{setCategory(next);setNotice('');setError('');catalogScroll.current?.scrollTo({y:0,animated:false});};
 const home=()=>{setDetailOpen(false);router.replace('/(tabs)');};
 const points=()=>perform(async()=>{if(!product)return;if(product.costume)await app.runCostume({kind:'buy',id:product.costume});else if(product.room)await app.runRoomBoutique({kind:'buy',id:product.room.id});else{const r=await app.buyRoomItem(product.furniture?'furniture':'flower',product.furniture??product.flower!,product.points);if(!r.success)throw Error('ポイントを確認してください。');}setConfirm(false);setNotice('交換しました。好きなときに使えます。');});
 const cash=()=>perform(async()=>{if(!price||!cashProduct)return;const result=cashProduct.costume?await app.buyCostume(cashProduct.costume):await app.buyRoomProduct(cashProduct.room!.id);setNotice(result==='purchased'?'購入しました。好きなときに使えます。':result==='pending'?'購入の承認を待っています。完了後に自動で受け取ります。':'購入を取り消しました。');});
 const apply=()=>perform(async()=>{if(product?.room){if(product.room.theme)await prepareHomeRoomArt(night,false,false,undefined,product.room.theme);await app.runRoomBoutique({kind:'apply',id:product.room.id});}else if(product?.furniture||product?.flower){const ok=await app.selectRoomItem(product.furniture?'furniture':'flower',product.furniture??product.flower!);if(!ok)throw Error('配置を保存できませんでした。');}else await app.runCostume({kind:'equip',id:product?.costume??null});setNotice('おうちに反映しました。');});
 const button=(id:string,label:string,action:()=>void,disabled=false,secondary=false)=><Pressable testID={id} accessibilityRole="button" disabled={disabled} onPress={action} style={[s.button,secondary&&s.secondary,disabled&&s.disabled]}><Text style={[s.buttonText,secondary&&s.secondaryText]}>{label}</Text></Pressable>;
 const messages=<>{!!error&&<Text testID="shop-error" accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}{!!notice&&<Text testID="shop-notice" accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}</>;
 const thumbnail=(p:ShopProduct)=>p.costume?<Image source={costumeThumbnail(stage,p.costume)} resizeMode="contain" style={s.costumeImage}/>:p.room?.costume?<><Image source={costumeThumbnail(stage,p.room.costume)} resizeMode="contain" style={s.matchingCostume}/><Image source={roomGoodArt(p.room.good!)} resizeMode="contain" style={s.matchingGood}/></>:<Image source={p.room?(p.room.theme?roomThemeArt(p.room.theme,false,true,true):roomGoodArt(p.room.good!)):p.furniture?roomFurnitureSource(p.furniture):roomFlowerSource(p.flower!)} resizeMode={p.room?.theme?'cover':'contain'} style={[s.productImage,p.room?.theme&&s.roomImage]}/>;
 const card=(p:ShopProduct)=>{
  const itemOwned=quote(p)===0, cashItem=cashShopProduct(p,room,wardrobe), itemPrice=prices.find(v=>v.id===skuFor(cashItem));
  return <Pressable testID={`shop-product-${p.key}`} key={p.key} accessibilityRole="button" accessibilityLabel={`${p.name}、${itemOwned?'もっている':quote(p).toLocaleString()+'ポイント'}。詳しく見る`} onPress={()=>choose(p.key)} style={({pressed})=>[s.tile,{width:(Math.min(windowWidth,580)-48)/2},(p.room?.theme||fontScale>=1.4)&&s.wideTile,pressed&&s.pressed]}>
   <View style={[s.art,{backgroundColor:tint(p)},p.room?.theme&&s.roomArt]}>{thumbnail(p)}{itemOwned&&<View style={s.ownedBadge}><Icon name="check" size={14} color="#476753"/><Text style={s.ownedText}>もっている</Text></View>}</View>
   <View style={s.tileInfo}><Text style={s.tileName}>{shortName(p)}</Text>{p.room?.kind==='matching'&&<Text style={s.cardHint}>きぐるみ ＋ 家具</Text>}
    <View style={s.tileBottom}><View style={s.priceColumn}><Text style={[s.tilePrice,itemOwned&&s.ownedPrice]}>{itemOwned?'使ってみる':`${quote(p).toLocaleString()} pt`}</Text>{!itemOwned&&itemPrice&&<Text style={s.cashPrice}>または {itemPrice.price}</Text>}</View><View style={s.cardArrow}><Icon name="arrow-up-right" size={18} color="#6F507F"/></View></View>
   </View>
  </Pressable>;
 };
 return <View testID="unified-shop" style={[s.root,{paddingTop:safe.top}]}>
  <View style={s.header}><Pressable testID="shop-back" accessibilityRole="button" accessibilityLabel="おうちに戻る" onPress={home} style={s.iconButton}><Icon name="arrow-left" size={22} color="#55425E"/></Pressable><Text style={s.title}>おみせ</Text><View style={s.wallet}><Icon name="circle" size={14} color="#8D6940"/><Text testID={detailOpen?undefined:'shop-balance'} style={s.balance}>{app.feedState.points.toLocaleString()} pt</Text></View></View>
  {!ready?<Text style={s.note}>{app.storageError?'保存データを確認できません。おうちで再読み込みしてください。':'おみせを準備しています…'}</Text>:<>
   <View testID="shop-tabs" style={s.tabs} accessibilityRole="tablist">{TABS.map(([id,label])=><Pressable key={id} testID={`shop-tab-${id}`} accessibilityRole="tab" accessibilityState={{selected:category===id}} onPress={()=>changeCategory(id)} style={[s.tab,id===category&&s.tabOn]}><Text style={[s.tabText,id===category&&s.tabTextOn]}>{label}</Text></Pressable>)}</View>
   <ScrollView ref={catalogScroll} contentContainerStyle={[s.body,{paddingBottom:safe.bottom+24}]}>
    <View style={s.utilities}><Text style={s.count}>{category==='other'?'':`${visible.length} アイテム`}</Text><View style={s.utilityLinks}>{([['owned','もっている'],['other','その他']] as const).map(([id,label])=><Pressable key={id} testID={`shop-tab-${id}`} accessibilityRole="tab" accessibilityState={{selected:category===id}} onPress={()=>changeCategory(id)} style={[s.utility,category===id&&s.utilityOn]}><Icon name={id==='owned'?'check-circle':'grid'} size={14} color="#685174"/><Text style={s.utilityText}>{label}</Text></Pressable>)}</View></View>
    <Text accessibilityRole="header" style={s.sectionTitle}>{HEADINGS[category]}</Text>
    {category==='other'?<OtherShop/>:<>
     {category==='sets'?<><Text style={s.sectionHint}>きぐるみと家具を、いっしょに。</Text><View style={s.grid}>{visible.filter(p=>p.room?.kind==='matching').map(card)}</View><Text style={[s.sectionTitle,s.nextSection]}>お部屋まるごと、気分を変えて。</Text><View style={s.grid}>{visible.filter(p=>p.room?.kind==='room').map(card)}</View></>:<View style={s.grid}>{visible.map(card)}</View>}
     {visible.length===0&&<View style={s.empty}><Icon name="gift" size={28} color="#866394"/><Text style={s.note}>気になるアイテムを見つけよう。{category==='owned'?'\n購入したアイテムがここに並びます。':''}</Text></View>}
     {(category==='costumes'||category==='owned')&&button('shop-usual','いつもの姿を見る',()=>choose(null),false,true)}
     {room.theme&&button('shop-reset-theme','いつものお部屋に戻す',()=>void perform(async()=>{await app.runRoomBoutique({kind:'default'});setNotice('いつものお部屋に戻しました。');}),busy,true)}
    </>}
    {!detailOpen&&messages}
    {hasNative&&<View style={s.restore}><Text style={s.small}>購入済みのアイテムが見つからないとき</Text>{button('shop-restore',busy?'確認中…':'購入を復元',()=>void perform(async()=>{const c=costumeStore?await app.restoreCostumes():0;const r=roomStore?await app.restoreRoomProducts():0;setNotice(c+r?`${c+r}種類の購入を復元しました。`:'復元できる購入はありませんでした。');}),busy,true)}{!!catalogError&&<><Text style={s.small}>{catalogError}</Text>{button('shop-prices-retry','価格を再読み込み',()=>setRetry(x=>x+1),busy||loading,true)}</>}</View>}
   </ScrollView>
  </>}
  <Modal visible={detailOpen&&ready} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
   <View style={[s.scrim,{paddingTop:Math.max(safe.top,12)}]}><View testID="shop-selection" accessibilityViewIsModal style={s.sheet}>
    <View style={s.sheetHeader}><View><Text style={s.sheetEyebrow}>{product?.costume||!product?'きぐるみの試着':product?.room?.theme?'お部屋をプレビュー':'アイテムをプレビュー'}</Text><Text testID="shop-balance" style={s.sheetBalance}>もっているポイント {app.feedState.points.toLocaleString()} pt</Text></View><Pressable testID="shop-detail-close" accessibilityRole="button" accessibilityLabel="商品一覧に戻る" disabled={busy} onPress={close} style={s.iconButton}><Icon name="x" size={22} color="#55425E"/></Pressable></View>
    <ScrollView style={s.detailScroll} contentContainerStyle={s.detailContent}>
     <ShopFittingPreview product={product} night={night}/>
     <View style={s.detailHeading}><Text testID="shop-selection-name" accessibilityRole="header" style={s.productName}>{product?.name??'いつもの姿'}</Text><Text style={s.note}>{product?.room?product.room.contents.join(' ＋ '):product?.costume?'いつもの子に、ぴったりの一着。':product?'お気に入りを、お部屋に飾ろう。':'着ぐるみを脱いだ、いつもの子。'}</Text></View>
     {product?.room?.theme&&<Pressable testID="shop-preview-light" accessibilityRole="button" onPress={()=>setNight(v=>!v)} style={s.light}><Icon name={night?'sun':'moon'} size={16} color="#685174"/><Text style={s.utilityText}>{night?'昼のお部屋を見る':'夜のお部屋を見る'}</Text></Pressable>}
    </ScrollView>
    <View style={[s.checkout,{paddingBottom:Math.max(safe.bottom,16)}]}>
     {messages}
     {confirm?<><Text style={s.confirmTitle}>{cost.toLocaleString()} pt で交換しますか？</Text><Text style={s.small}>交換後のポイント：{(app.feedState.points-cost).toLocaleString()} pt</Text><View style={s.purchaseRow}>{button('shop-cancel-points','やめる',()=>setConfirm(false),busy,true)}{button('shop-confirm-points',busy?'保存中…':'交換する',()=>void points(),busy||app.feedState.points<cost)}</View></>:owned?<><View style={s.purchaseRow}>{button('shop-apply',busy?'保存中…':applied?'使用中':product?.costume?'このきぐるみを着る':product?'おうちに飾る':'いつもの姿に戻る',()=>void apply(),busy||applied)}</View>{applied&&button('shop-show-home','おうちで見る',home,busy,true)}</>:<>
      <View style={s.priceLine}><Text style={s.detailPrice}>{cost.toLocaleString()}<Text style={s.priceUnit}> pt</Text></Text><Text style={s.small}>{app.feedState.points<cost?`あと ${(cost-app.feedState.points).toLocaleString()} pt`:'ポイントで交換できます'}</Text></View>
      {product&&cost<product.points&&<Text testID="shop-owned-discount" style={s.small}>もっている分を差し引いたポイントです</Text>}
      <View style={[s.purchaseRow,fontScale>=1.4&&s.stackButtons]}>{button('shop-buy-points','ポイントで交換',()=>setConfirm(true),busy||app.feedState.points<cost)}{hasNative&&sku&&button('shop-buy-store',loading?'価格を確認中…':price?`${price.price}で購入`:'価格を確認できません',()=>void cash(),busy||loading||!price,true)}</View>
      {cashProduct!==product&&<Text style={s.small}>アプリ内購入は「{cashProduct?.name}」のみ</Text>}
      {hasNative&&sku&&!loading&&!price&&button('shop-detail-prices-retry','価格を再読み込み',()=>setRetry(x=>x+1),busy,true)}
     </>}
    </View>
   </View></View>
  </Modal>
 </View>;
}
const s=StyleSheet.create({
 root:{flex:1,backgroundColor:'#FAF7F2'},header:{width:'100%',maxWidth:620,alignSelf:'center',flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:10,gap:10},iconButton:{width:44,height:44,alignItems:'center',justifyContent:'center',borderRadius:22,backgroundColor:'#EFE9E5'},title:{flex:1,fontSize:24,fontWeight:'700',color:'#47374F'},wallet:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,paddingVertical:10,borderRadius:20,backgroundColor:'#F0E7D8'},balance:{fontSize:14,fontWeight:'700',color:'#684C2E'},
 tabs:{width:'100%',maxWidth:580,alignSelf:'center',flexDirection:'row',paddingHorizontal:18,paddingBottom:10,gap:8},tab:{flex:1,minHeight:46,borderRadius:16,backgroundColor:'#EDE7E1',justifyContent:'center',alignItems:'center'},tabOn:{backgroundColor:'#755586'},tabText:{fontSize:14,color:'#67576B',fontWeight:'600'},tabTextOn:{color:'#FFF'},body:{width:'100%',maxWidth:580,alignSelf:'center',paddingHorizontal:18,gap:14},utilities:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},count:{fontSize:12,color:'#7B706E'},utilityLinks:{flexDirection:'row',gap:4},utility:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:9,minHeight:44,borderRadius:14},utilityOn:{backgroundColor:'#E9DFEF'},utilityText:{fontSize:12,fontWeight:'600',color:'#685174'},sectionTitle:{fontSize:18,lineHeight:28,fontWeight:'700',color:'#47374F'},sectionHint:{fontSize:13,lineHeight:21,color:'#776A68',marginTop:-10},nextSection:{marginTop:12},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:12},tile:{borderRadius:23,backgroundColor:'#FFFFFF',overflow:'hidden',borderWidth:1,borderColor:'#E6DED7'},wideTile:{width:'100%'},pressed:{opacity:.8,transform:[{scale:.985}]},art:{width:'100%',aspectRatio:1,overflow:'hidden'},roomArt:{aspectRatio:1.65},costumeImage:{position:'absolute',width:'112%',height:'112%',top:'-6%',left:'-6%'},matchingCostume:{position:'absolute',width:'87%',height:'92%',left:'-4%',top:'-2%'},matchingGood:{position:'absolute',width:'54%',height:'52%',right:'-1%',bottom:'3%'},productImage:{width:'90%',height:'90%',alignSelf:'center',marginTop:'5%'},roomImage:{width:'100%',height:'100%',marginTop:0},ownedBadge:{position:'absolute',left:9,top:9,flexDirection:'row',gap:3,alignItems:'center',paddingHorizontal:8,paddingVertical:5,borderRadius:10,backgroundColor:'#FFFFFFEE'},ownedText:{fontSize:10,fontWeight:'600',color:'#476753'},tileInfo:{padding:13,gap:8},tileName:{fontSize:16,lineHeight:23,color:'#47374F',fontWeight:'700'},cardHint:{fontSize:11,lineHeight:18,color:'#776A68',marginTop:-4},tileBottom:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},priceColumn:{gap:2,flexShrink:1},tilePrice:{fontSize:15,lineHeight:22,fontWeight:'700',color:'#755586'},ownedPrice:{fontSize:13,color:'#506E59'},cashPrice:{fontSize:11,lineHeight:17,color:'#78667E'},cardArrow:{width:30,height:30,borderRadius:15,backgroundColor:'#F2ECF5',alignItems:'center',justifyContent:'center'},empty:{alignItems:'center',gap:16,paddingVertical:32},
 button:{flexGrow:1,minHeight:50,paddingVertical:12,paddingHorizontal:12,borderRadius:17,backgroundColor:'#755586',alignItems:'center',justifyContent:'center'},buttonText:{fontSize:14,lineHeight:23,fontWeight:'700',color:'#FFF',textAlign:'center'},secondary:{backgroundColor:'#F1EAF5',borderWidth:1,borderColor:'#DFD1E6'},secondaryText:{color:'#6F507F'},disabled:{opacity:.44},small:{fontSize:12,lineHeight:19,color:'#736471'},note:{fontSize:13,lineHeight:22,color:'#76696C'},notice:{fontSize:12,lineHeight:20,color:'#3D6B4C'},error:{fontSize:12,lineHeight:20,color:'#A14053'},restore:{gap:10,paddingTop:22,marginTop:6,borderTopWidth:1,borderColor:'#E4DCD4'},
 scrim:{flex:1,justifyContent:'flex-end',alignItems:'center',backgroundColor:'#2C203D80'},sheet:{width:'100%',maxWidth:580,height:'94%',borderTopLeftRadius:28,borderTopRightRadius:28,backgroundColor:'#FAF7F2',overflow:'hidden'},sheetHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,gap:8},sheetEyebrow:{fontSize:15,fontWeight:'700',color:'#47374F'},sheetBalance:{fontSize:11,lineHeight:20,color:'#776A68'},detailScroll:{flex:1},detailContent:{paddingHorizontal:18,paddingBottom:20,gap:16},detailHeading:{gap:5},productName:{fontSize:21,lineHeight:30,fontWeight:'700',color:'#47374F'},light:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:8,minHeight:44,paddingHorizontal:14,borderRadius:15,backgroundColor:'#EEE5F2'},checkout:{padding:18,gap:9,borderTopWidth:1,borderColor:'#E5DDD7',backgroundColor:'#FFFDFA'},purchaseRow:{flexDirection:'row',gap:10},stackButtons:{flexDirection:'column'},priceLine:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},detailPrice:{fontSize:26,fontWeight:'700',lineHeight:36,color:'#47374F'},priceUnit:{fontSize:14,fontWeight:'600'},confirmTitle:{fontSize:17,lineHeight:26,fontWeight:'700',color:'#47374F'},
});
