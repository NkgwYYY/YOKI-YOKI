import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {smokingStatus} from '@/utils/smokingState';
export function SmokingCare({status}:{status:ReturnType<typeof smokingStatus>}){
 const hours=Math.ceil(status.remainingMs/3600000),days=Math.floor(hours/24),rest=hours%24;
 return <View testID="smoking-care" style={s.card}>
  <Text style={s.title}>{status.dependent?'喫煙者 · 禁煙チャレンジ':status.recovered?'5日間の禁煙、達成！':`喫煙 ${Math.min(3,status.state.sessions)} / 3回`}</Text>
  {status.dependent?<>
   <Text style={s.copy}>{status.craving?'たばこが恋しくて、少しそわそわ。':'今は、気持ちが落ち着いているよ。'}</Text>
   <View accessibilityLabel={`禁煙${status.quitDays}日、5日で回復`} style={s.row}>{[0,1,2,3,4].map(i=><View key={i} style={[s.day,i<status.quitDays&&s.done]}/>)}</View>
   <Text style={s.copy}>禁煙 {status.quitDays} / 5日 · 回復まであと{days?`${days}日`:''}{rest?`${rest}時間`:''}</Text>
   <Text style={s.copy}>吸わずに過ごす間は、ごはん・交換日記・おふろで幸福度を補おう。吸うと5日間は最初から。</Text>
  </>:<Text style={s.copy}>{status.recovered?'たばこを求める状態から回復したよ。':'5秒以上の喫煙を3回すると喫煙者に。最後の喫煙から4時間ごとに幸福 −3、5日間吸わなければ回復するよ。'}</Text>}
 </View>;
}
const s=StyleSheet.create({card:{gap:8,padding:14,borderWidth:1,borderColor:'#B7A48266',borderRadius:7,backgroundColor:'#382D43'},title:{fontSize:13,fontWeight:'600',color:'#E8CFA8'},copy:{fontSize:12,lineHeight:20,color:'#D0BED6'},row:{flexDirection:'row',gap:6},day:{height:5,flex:1,borderRadius:3,backgroundColor:'#59475F'},done:{backgroundColor:'#B8D2BA'}});
