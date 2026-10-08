import React from 'react';
import {Pressable,StyleSheet,Text,View,type StyleProp,type ViewStyle} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Icon,type IconName} from '@/components/ui/Icon';
export const worldUI={cream:'#231D31EE',ink:'#EEE4F5',violet:'#D3BDDF',pale:'#41324F',edge:'#B7A48288'};
/** Shared command frame: quiet glass, a fine metal edge and inset highlight. */
export function WorldPill({label,icon,onPress,disabled=false,primary=false,compact=false,testID,accessibilityLabel,style}:{label:string;icon?:IconName;onPress:()=>void;disabled?:boolean;primary?:boolean;compact?:boolean;testID?:string;accessibilityLabel?:string;style?:StyleProp<ViewStyle>}){
 return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel||label} accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.command,primary&&s.primary,compact&&s.compact,style,disabled&&{opacity:.43},pressed&&{opacity:.86,transform:[{scale:.985}]}]}>
  <LinearGradient pointerEvents="none" colors={primary?['#A891B938','#33274100']:['#BDABD018','#231D3100']} style={StyleSheet.absoluteFill}/>
  <View pointerEvents="none" style={s.inset}/>
  {icon&&<Icon name={icon} size={17} color={primary?'#F0DAB2':'#D6C4E4'}/>}
  {!compact&&<Text numberOfLines={1} style={[s.label,primary&&{color:'#F8EBDA'}]}>{label}</Text>}
 </Pressable>;
}
const s=StyleSheet.create({command:{minHeight:44,paddingHorizontal:15,borderRadius:6,borderWidth:1,borderColor:worldUI.edge,backgroundColor:worldUI.cream,overflow:'hidden',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,shadowColor:'#090511',shadowOpacity:.25,shadowRadius:9,shadowOffset:{width:0,height:3}},inset:{position:'absolute',left:3,right:3,top:3,bottom:3,borderRadius:3,borderTopWidth:1,borderColor:'#EADCF014'},primary:{backgroundColor:'#5C466FEC',borderColor:'#D3B989'},compact:{width:44,paddingHorizontal:0},label:{fontSize:12,fontWeight:'600',letterSpacing:.7,color:worldUI.ink}});
