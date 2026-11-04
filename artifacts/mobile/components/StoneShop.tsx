import React,{useEffect,useRef,useState} from 'react';
import {View,Text,Pressable} from 'react-native';
import {useApp} from '@/contexts/AppContext';
import {stoneStore,type StoneProduct} from '@/utils/stoneStore';
import {STONE_PRODUCTS,evolutionFor,type StoneKind} from '@/utils/evolutionChoice';
export function StoneShop(){
 const {buyStone,progress}=useApp(),wallet=evolutionFor(progress).wallet;
 const [products,setProducts]=useState<StoneProduct[]>([]),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[notice,setNotice]=useState(''),[retry,setRetry]=useState(0);
 const request=useRef(0),lock=useRef(false);
 useEffect(()=>{if(!stoneStore)return;const current=++request.current;setLoading(true);setNotice('');const timer=setTimeout(()=>{if(request.current===current){request.current++;setLoading(false);setNotice('商品情報の取得に時間がかかっています。再試行してください。');}},15000);
  stoneStore.catalog().then(items=>{if(current===request.current){setProducts(items);if(!items.length)setNotice('商品情報を取得できませんでした。');}}).catch(()=>{if(current===request.current)setNotice('商品情報を取得できませんでした。');}).finally(()=>{clearTimeout(timer);if(current===request.current)setLoading(false);});
  return()=>{request.current++;clearTimeout(timer);};
 },[retry]);
 const purchase=async(kind:StoneKind)=>{if(lock.current)return;lock.current=true;setBusy(true);setNotice('');try{const result=await buyStone(kind);setNotice(result==='purchased'?'石を1個受け取りました。':result==='pending'?'承認を待っています。完了後に自動で受け取ります。':'購入を取り消しました。');}catch(e){setNotice(e instanceof Error?e.message:'受け取りを完了できませんでした。再起動するともう一度確認します。');}finally{lock.current=false;setBusy(false);}};
 return <View style={{gap:16}}>{(['evolution','regression'] as const).map(kind=>{const item=products.find(p=>p.id===STONE_PRODUCTS[kind]);return <View key={kind} style={{padding:20,borderRadius:22,backgroundColor:'#FFFCF7',gap:12}}><Text style={{fontSize:19,color:'#5D476C'}}>{kind==='evolution'?'進化の石':'退化の石'}</Text><Text style={{color:'#796B80'}}>所持数：{wallet[kind]}個</Text><Text style={{color:'#796B80',lineHeight:22}}>1個で1段階、姿を変えられます。</Text><Pressable testID={`stone-buy-${kind}`} accessibilityRole="button" disabled={!item||busy||loading} onPress={()=>void purchase(kind)} style={{minHeight:48,padding:14,borderRadius:16,backgroundColor:'#856395',opacity:(!item||busy||loading)? .45:1}}><Text style={{color:'#FFF',textAlign:'center'}}>{!stoneStore?'iPhoneアプリで購入できます':loading?'商品情報を確認中…':item?`${item.price}で1個購入`:'商品情報を取得できません'}</Text></Pressable></View>;})}{!!notice&&<Text accessibilityLiveRegion="polite" style={{color:'#795781',lineHeight:22}}>{notice}</Text>}{stoneStore&&!loading&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>setRetry(n=>n+1)} style={{padding:16}}><Text style={{color:'#765C83'}}>商品情報を再読み込み</Text></Pressable>}</View>;
}
