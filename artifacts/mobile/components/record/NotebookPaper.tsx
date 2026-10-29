import React,{useState} from 'react';
import {Platform,StyleSheet,View,type ViewProps} from 'react-native';
export const notebookFont=Platform.select({ios:'Hiragino Mincho ProN',android:'serif',web:'"Hiragino Mincho ProN", "Yu Mincho", Georgia, serif'});
/** The text and its rules share a 32px rhythm, including editable pages. */
export function RuledWriting({children,minHeight=192}:{children:React.ReactNode;minHeight?:number}){
 const [height,setHeight]=useState(minHeight);
 return <View style={{minHeight}} onLayout={event=>setHeight(event.nativeEvent.layout.height)}>
  <View pointerEvents="none" style={StyleSheet.absoluteFill} accessible={false}>{Array.from({length:Math.ceil(height/32)},(_,i)=><View key={i} style={{position:'absolute',left:-4,right:-4,top:31+i*32,height:1,backgroundColor:'#BFC4C04D'}}/>)}</View>
  {children}
 </View>;
}
export function NotebookPaper({children,style,...rest}:ViewProps){return <View {...rest} style={[s.paper,style]}>
 <View pointerEvents="none" style={s.spine}/><View pointerEvents="none" style={s.margin}/>{children}
</View>;}
const s=StyleSheet.create({paper:{backgroundColor:'#FFFBEF',borderRadius:4,borderWidth:1,borderColor:'#DED2B9',paddingLeft:34,paddingRight:22,paddingVertical:25,gap:17,minHeight:420,shadowColor:'#11091E',shadowOpacity:.23,shadowRadius:10,shadowOffset:{width:0,height:7},borderBottomWidth:4,borderBottomColor:'#D9CFB9'},spine:{position:'absolute',left:0,top:0,bottom:0,width:13,backgroundColor:'#DAD0BD55',borderRightWidth:1,borderRightColor:'#E8DEC9'},margin:{position:'absolute',left:24,top:0,bottom:0,width:1,backgroundColor:'#CE9A944D'}});
