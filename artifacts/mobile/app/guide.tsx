import React,{useState} from 'react';
import {Platform,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {backToRoom} from '@/utils/backToRoom';
import {SkyBackground} from '@/components/SkyBackground';
import {Icon,type IconName} from '@/components/ui/Icon';
import {PressScale} from '@/components/ui/PressScale';
import {Button} from '@/components/ui/Button';
import {colors} from '@/constants/theme';

const HELP:{title:string;icon:IconName;copy:string}[]=[
 {title:'気分を残す',icon:'smile',copy:'おうちの「気分」から、今の気分に近い表情をひとつタップ。文章は不要です。同じ日の気分は後から変更でき、日記の文章は消えません。未記録の日は、ボタンの上に案内が出ます。'},
 {title:'交換日記を書く',icon:'book-open',copy:'「日記」を押して表紙を開きます。自分のページには、その日の出来事や睡眠・生活習慣を記録できます。矢印やページのスワイプで読み返せます。'},
 {title:'グラフで振り返る',icon:'trending-up',copy:'画面下の「歩み」で、気分の推移と生活のバランスを確認できます。五角形は、気分・睡眠・食事・運動・人との交流の記録です。未記録は0点として扱いません。「今日の便り」も、おうちから何度でも開けます。'},
 {title:'キャラクターと過ごす',icon:'heart',copy:'タップして挨拶、指でなでてスキンシップ。ごはんをあげたり、おふろでタオルを使ったりできます。視点は目のボタンで切り替えます。海や夜景を見に出かけているときは「おうちに帰る」で戻れます。'},
 {title:'カレンダーと進化',icon:'calendar',copy:'部屋のカレンダーに、アプリを開いた日を記録します。進化は累計ログイン日数で決まり、3日でモフモフ、10日ではっぱ、30日でカラフルはっぱに。ログインしない日があっても、累計日数と進化した姿は変わりません。'},
 {title:'ショップ・占い・あそぶ',icon:'grid',copy:'おうちの「メニュー」から直接開けます。星座占いは、星座を選んでニフティの公式結果を読みます。ゆでたまごのバイトは成功するほど速くなり、1回失敗したらその日は終了。翌日また挑戦できます。'},
 {title:'ポイントを使う',icon:'star',copy:'記録やミニゲームなどで集めたYOKIポイントは、ごはんやショップで使えます。同じ日の記録を直しても、記録のポイントは重複して受け取れません。'},
 {title:'AIとのおはなし',icon:'message-circle',copy:'「おはなし」でキャラクターに話しかけられます。AIの応答は診断や治療ではありません。医療上の判断が必要なときは、医師などの専門家に相談してください。プロフィールや話しかけ方は、部屋の右上メニューから変更できます。'},
];

export default function GuideScreen(){
 const router=useRouter(),insets=useSafeAreaInsets(),[open,setOpen]=useState<string|null>(null);
 return <View style={{flex:1}}><SkyBackground/><ScrollView contentContainerStyle={[s.content,{paddingTop:insets.top+20,paddingBottom:insets.bottom+32}]}>
  <View style={s.header}><PressScale accessibilityLabel="おうちに戻る" onPress={()=>backToRoom(router)} style={s.back}><Icon name="chevron-left" color={colors.foreground}/></PressScale><Text accessibilityRole="header" style={s.title}>使い方ガイド</Text><View style={{width:44}}/></View>
  <View style={s.intro}><Text style={s.lead}>まずは、気分をひとつ。</Text><Text style={s.copy}>記録・日記・振り返り。3つの操作を紹介します。</Text><Button testID="guide-replay-tutorial" label="チュートリアルを見る" icon="play" onPress={()=>router.replace('/(tabs)?learn=1')}/></View>
  {HELP.map(item=><View key={item.title} style={s.card}><PressScale accessibilityLabel={item.title} accessibilityState={{expanded:open===item.title}} onPress={()=>setOpen(open===item.title?null:item.title)} style={s.question}><Icon name={item.icon} size={19} color="#775888"/><Text style={s.questionText}>{item.title}</Text><Icon name={open===item.title?'chevron-up':'chevron-down'} size={17} color="#8C7B91"/></PressScale>{open===item.title&&<Text style={[s.copy,s.answer]}>{item.copy}</Text>}</View>)}
  <View style={s.data}><Text style={s.questionText}>データの保存について</Text><Text style={s.copy}>{Platform.OS==='ios'?'記録はこの端末に保存されます。':'ログインなしの記録はこの端末に保存されます。ログインするとクラウドにも同期されます。'}アプリやブラウザのデータを削除すると、端末だけに保存した記録は復元できません。</Text></View>
 </ScrollView></View>;
}
const s=StyleSheet.create({content:{width:'100%',maxWidth:560,alignSelf:'center',paddingHorizontal:20,gap:12},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12},back:{width:44,height:44,alignItems:'center',justifyContent:'center',borderRadius:18,backgroundColor:colors.card},title:{fontSize:21,fontWeight:'700',color:colors.foreground},intro:{padding:20,borderRadius:22,backgroundColor:'#E9DEED',gap:14,marginBottom:8},lead:{fontSize:22,fontWeight:'700',color:'#533F60'},copy:{fontSize:13,lineHeight:23,color:'#706271'},card:{backgroundColor:'#FFFBF3',borderRadius:18,borderWidth:1,borderColor:'#E2D7C7'},question:{flexDirection:'row',alignItems:'center',gap:10,minHeight:62,padding:16},questionText:{flex:1,fontSize:14,fontWeight:'600',color:'#56465D'},answer:{paddingHorizontal:18,paddingBottom:18},data:{padding:18,gap:10}});
