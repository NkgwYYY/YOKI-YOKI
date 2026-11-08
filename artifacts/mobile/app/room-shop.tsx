import React,{useEffect,useRef,useState} from 'react';
import {Image,Modal,ScrollView,StyleSheet,Text,View} from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {Icon} from '@/components/ui/Icon';
import {RoomSetPreview} from '@/components/RoomSetPreview';
import {roomStore} from '@/utils/roomStore';
import {readWardrobe} from '@/utils/wardrobe';
import {ROOM_PRODUCTS,roomProduct,roomPointQuote,readRoomCollection,ownedRoomGoods,roomProductSku,type RoomProductId} from '@/utils/roomBoutique';
import {roomGoodArt,roomThemeArt} from '@/utils/roomBoutiqueArt';
import {prepareHomeRoomArt} from '@/utils/worldArt';

export default function RoomShopScreen(){
 const app=useApp(),auth=useAuth(),router=useRouter(),safe=useSafeAreaInsets(),params=useLocalSearchParams<{product?:string}>();
 const initial=ROOM_PRODUCTS.find(p=>p.id===params.product)??ROOM_PRODUCTS[0];
 const [selected,setSelected]=useState<RoomProductId>(initial.id),[category,setCategory]=useState(initial.kind),[night,setNight]=useState(false),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const [prices,setPrices]=useState<{id:string;price:string}[]>([]),[loading,setLoading]=useState(!!roomStore),[catalogError,setCatalogError]=useState(''),[retry,setRetry]=useState(0),lock=useRef(false),request=useRef(0);
 const ready=!app.isLoading&&!app.storageError&&!auth.isLoading&&(!auth.isSignedIn||app.cloudSynced);
 const state=readRoomCollection(app.roomCustomization.boutique),wardrobe=readWardrobe(app.feedState.wardrobe),product=roomProduct(selected),quote=roomPointQuote(selected,state,wardrobe),owned=quote===0,price=prices.find(p=>p.id===roomProductSku(selected));
 const onlyCostume=product.kind==='matching'&&ownedRoomGoods(state).includes(product.good!)&&!wardrobe.owned.includes(product.costume!);
 const applied=owned&&(product.theme?state.theme===product.theme:state.goods.includes(product.good!)&&(!product.costume||wardrobe.equipped===product.costume));
 useEffect(()=>{
  if(!roomStore)return;const token=++request.current;setLoading(true);setCatalogError('');
  const timer=setTimeout(()=>{if(request.current===token){request.current++;setLoading(false);setCatalogError('価格の確認に時間がかかっています。再読み込みできます。');}},15000);
  roomStore.catalog().then(items=>{if(request.current===token){setPrices(items);if(items.length<ROOM_PRODUCTS.length)setCatalogError('一部の販売価格を確認できませんでした。ポイント交換は利用できます。');}}).catch(()=>{if(request.current===token)setCatalogError('販売価格を確認できませんでした。通信を確認して再読み込みしてください。');}).finally(()=>{clearTimeout(timer);if(request.current===token)setLoading(false);});
  return()=>{request.current++;clearTimeout(timer);};
 },[retry]);
 const perform=async(work:()=>Promise<void>)=>{if(lock.current||!ready)return;lock.current=true;setBusy(true);setError('');setNotice('');try{await work();}catch(e){setError(e instanceof Error?e.message:'保存できませんでした。もう一度お試しください。');}finally{lock.current=false;setBusy(false);}};
 const choose=(id:RoomProductId)=>{if(busy)return;setSelected(id);setError('');setNotice('');setConfirm(false);};
 const button=(id:string,label:string,onPress:()=>void,disabled=false,secondary=false)=><Pressable testID={id} accessibilityRole="button" disabled={disabled} accessibilityState={{disabled}} onPress={onPress} style={[s.button,secondary&&s.secondary,disabled&&s.disabled]}><Text style={[s.buttonText,secondary&&s.secondaryText]}>{label}</Text></Pressable>;
 return <View testID="room-shop-screen" style={[s.root,{paddingTop:safe.top}]}>
  <View style={s.header}><Pressable testID="room-shop-back" accessibilityRole="button" accessibilityLabel="戻る" onPress={()=>router.canGoBack()?router.back():router.replace('/(tabs)')} style={s.back}><Icon name="arrow-left" size={22} color="#735685"/></Pressable><Text style={s.title}>お部屋のおみせ</Text><Text testID="room-shop-balance" style={s.balance}>{app.feedState.points} pt</Text></View>
  {!ready?<Text style={s.note}>{app.storageError?'保存したお部屋を確認できません。再読み込みしてください。':'おみせを準備しています…'}</Text>:<ScrollView contentContainerStyle={[s.body,{paddingBottom:safe.bottom+28}]}>
   <View style={s.tabs} accessibilityRole="tablist">{([['matching','おそろい'],['room','お部屋セット'],['furniture','家具単品']] as const).map(([id,label])=><Pressable testID={`room-shop-tab-${id}`} key={id} accessibilityRole="tab" accessibilityState={{selected:category===id}} disabled={busy} onPress={()=>{setCategory(id);choose(ROOM_PRODUCTS.find(p=>p.kind===id)!.id);}} style={[s.tab,category===id&&s.tabOn]}><Text style={s.tabText}>{label}</Text></Pressable>)}</View>
   <Text style={s.intro}>いつもの子と、お気に入りのお部屋を。</Text>
   <ScrollView testID="room-products-rail" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>{ROOM_PRODUCTS.filter(p=>p.kind===category).map(p=><Pressable testID={`room-product-${p.id}`} key={p.id} accessibilityRole="button" accessibilityLabel={`${p.name}をプレビュー`} accessibilityState={{selected:selected===p.id}} disabled={busy} onPress={()=>choose(p.id)} style={[s.tile,selected===p.id&&s.tileOn]}><Image source={p.theme?roomThemeArt(p.theme,false,false,true):roomGoodArt(p.good!)} resizeMode={p.theme?'cover':'contain'} style={s.thumb}/><Text style={s.tileName}>{p.name}</Text><Text style={s.small}>{roomPointQuote(p.id,state,wardrobe)===0?'もっている':`${p.points.toLocaleString()} pt`}</Text></Pressable>)}</ScrollView>
   <RoomSetPreview key={selected} product={product} night={night}/>
   <View style={s.previewMeta}><Text style={s.small}>無料プレビュー · {applied?'使用中':owned?'もっている':'購入前のイメージ'}</Text><Pressable testID="room-preview-light" accessibilityRole="button" accessibilityLabel={night?'昼の見え方に切り替える':'夜の見え方に切り替える'} onPress={()=>setNight(v=>!v)} style={s.light}><Icon name={night?'moon':'sun'} size={16} color="#786486"/><Text style={s.small}>{night?'夜':'昼'}　切り替え</Text></Pressable></View>
   <View style={s.details}><Text testID="room-product-title" style={s.productName}>{product.name}</Text><Text style={s.note}>{product.detail}</Text><View style={s.contents}>{product.contents.map(c=><Text key={c} style={s.chip}>{c}</Text>)}</View>
    {product.kind==='room'&&<Text style={s.small}>背景・家具・照明をまとめて模様替え。昼夜と視点に対応。いつものお部屋にも戻せます。</Text>}
    {product.good&&<Text style={s.small}>おそろい家具は、置いたあと移動・大きさ調整・収納ができます。</Text>}
    {owned?button('room-apply',busy?'保存中…':applied?'このセットを使用中':product.kind==='room'?'このお部屋にする':product.kind==='matching'?'着替えて家具を置く':'この家具を置く',()=>void perform(async()=>{if(product.theme)await prepareHomeRoomArt(night,false,false,undefined,product.theme);await app.runRoomBoutique({kind:'apply',id:selected});setNotice('おうちに反映しました。');}),busy||applied):<>
     {quote<product.points&&<Text testID="room-owned-discount" style={s.discount}>もっている分を差し引いて {quote.toLocaleString()} pt</Text>}
     {button('room-buy-points',`${quote.toLocaleString()} pt で交換`,()=>setConfirm(true),busy||app.feedState.points<quote,true)}
     {app.feedState.points<quote&&<Text style={s.small}>あと {(quote-app.feedState.points).toLocaleString()} pt</Text>}
     {roomStore&&!onlyCostume&&button('room-buy-store',loading?'販売価格を確認中…':price?`${price.price}で購入`:'販売価格を確認できません',()=>void perform(async()=>{const status=await app.buyRoomProduct(selected);setNotice(status==='purchased'?'購入しました。好きなときにお部屋に飾れます。':status==='pending'?'購入の承認を待っています。完了後に自動で受け取ります。':'購入を取り消しました。');}),busy||loading||!price)}
     {roomStore&&onlyCostume&&button('room-costume-only','着ぐるみだけ購入する',()=>router.push('/wardrobe'),busy)}
     <Text style={s.small}>{roomStore?'ポイント交換かアプリ内購入、どちらかを選べます。買い切りです。':'ポイントで交換できます。'}{product.kind==='matching'&&wardrobe.owned.includes(product.costume!)?'着ぐるみは持っているため、追加されるのは家具です。':''}</Text>
    </>}
    {!!notice&&<Text testID="room-shop-notice" accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}{!!error&&<Text testID="room-shop-error" accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
    {owned&&button('room-show-home','おうちで見る',()=>router.replace('/(tabs)'),busy,true)}
   </View>
   {state.theme&&button('room-reset-theme','いつものお部屋に戻す',()=>void perform(async()=>{await app.runRoomBoutique({kind:'default'});setNotice('いつものお部屋に戻しました。');}),busy,true)}
   {roomStore&&<View style={s.restore}><Text style={s.note}>同じApple Accountで購入した家具・セットを復元できます。</Text>{button('room-restore',busy?'処理中…':'購入を復元',()=>void perform(async()=>{const n=await app.restoreRoomProducts();setNotice(n?`${n}種類の購入を復元しました。`:'復元できる購入はありませんでした。');}),busy,true)}{!!catalogError&&<Text style={s.note}>{catalogError}</Text>}{button('room-prices-retry','販売価格を再読み込み',()=>setRetry(v=>v+1),busy||loading,true)}</View>}
  </ScrollView>}
  <Modal transparent visible={confirm} onRequestClose={()=>{if(!busy)setConfirm(false);}}><View style={s.scrim}><View style={s.dialog}><Text style={s.productName}>{product.name}</Text><Text style={s.note}>{quote.toLocaleString()} pt を使って交換します。交換後は {(app.feedState.points-quote).toLocaleString()} pt です。</Text>{button('room-confirm-points',busy?'保存中…':'交換する',()=>void perform(async()=>{await app.runRoomBoutique({kind:'buy',id:selected});setConfirm(false);setNotice('交換しました。好きなときにお部屋に飾れます。');}),busy||app.feedState.points<quote)}{button('room-cancel-points','やめる',()=>setConfirm(false),busy,true)}{!!error&&<Text style={s.error}>{error}</Text>}</View></View></Modal>
 </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#FFF9F0'},header:{maxWidth:620,width:'100%',alignSelf:'center',flexDirection:'row',alignItems:'center',padding:12,gap:8},back:{width:44,height:44,alignItems:'center',justifyContent:'center',borderRadius:22,backgroundColor:'#F0E6F2'},title:{flex:1,textAlign:'center',fontSize:18,fontWeight:'600',color:'#5B4667'},balance:{fontSize:12,fontWeight:'600',color:'#786486'},body:{maxWidth:580,width:'100%',alignSelf:'center',padding:16,gap:14},tabs:{flexDirection:'row',gap:4,borderRadius:22,padding:4,backgroundColor:'#F2E9DF'},tab:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:19},tabOn:{backgroundColor:'#E9DEF0'},tabText:{fontSize:12,color:'#735685',fontWeight:'600'},intro:{fontSize:13,color:'#88776D',textAlign:'center',lineHeight:22},rail:{gap:10},tile:{width:156,padding:8,gap:6,borderRadius:20,borderWidth:1,borderColor:'#E7D9C9',backgroundColor:'#FFFCF6'},tileOn:{borderColor:'#AD88B7',borderWidth:2,backgroundColor:'#F4EBF6'},thumb:{width:'100%',height:85,borderRadius:14},tileName:{fontSize:12,color:'#695270',lineHeight:18,fontWeight:'600'},small:{fontSize:11,color:'#8A7A83',lineHeight:20},previewMeta:{marginTop:-10,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'},light:{flexDirection:'row',alignItems:'center',gap:5,minHeight:44,paddingHorizontal:12,borderRadius:20,backgroundColor:'#F1E7ED'},details:{padding:18,gap:12,borderRadius:26,borderWidth:1,borderColor:'#E4D5C4',backgroundColor:'#FFFCF7'},productName:{fontSize:19,color:'#5C4668',fontWeight:'600',lineHeight:28},note:{fontSize:13,color:'#87746C',lineHeight:22},contents:{flexDirection:'row',flexWrap:'wrap',gap:6},chip:{fontSize:11,lineHeight:18,color:'#7A655C',backgroundColor:'#F5EADC',borderRadius:12,paddingHorizontal:9,paddingVertical:5},discount:{fontSize:13,fontWeight:'600',lineHeight:22,color:'#6B7D59'},button:{minHeight:48,padding:12,borderRadius:24,alignItems:'center',justifyContent:'center',backgroundColor:'#8C6B9C',borderWidth:1,borderColor:'#AE91BB'},buttonText:{color:'#FFFDF7',fontSize:14,fontWeight:'600',textAlign:'center'},secondary:{backgroundColor:'#FFF4E3',borderColor:'#D8C3A8'},secondaryText:{color:'#7A624F'},disabled:{opacity:.42},notice:{fontSize:13,lineHeight:23,color:'#6D8258'},error:{fontSize:13,lineHeight:23,color:'#A64D5C'},restore:{padding:18,gap:12,borderRadius:24,backgroundColor:'#F1EAF2'},scrim:{flex:1,alignItems:'center',justifyContent:'center',padding:24,backgroundColor:'#30223D88'},dialog:{width:'100%',maxWidth:400,padding:24,gap:16,borderRadius:28,backgroundColor:'#FFFBF4'}});
