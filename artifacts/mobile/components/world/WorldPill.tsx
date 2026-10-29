import {FeltDecoration} from '@/components/ui/Felt';
import React from 'react';
import {StyleSheet,Text,View,type StyleProp,type ViewStyle} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Icon,type IconName} from '@/components/ui/Icon';
import {PressScale} from '@/components/ui/PressScale';
export const worldUI={cream:'#FFF8EA',ink:'#574234',violet:'#6C7D58',pale:'#E5ECD9',edge:'#D4C2A3'};
/** Milk glass, lavender piping, one shared press spring across the world. */
export function WorldPill({label,icon,onPress,onPressIn,disabled=false,primary=false,compact=false,testID,accessibilityLabel,style}:{label:string;icon?:IconName;onPress:()=>void;onPressIn?:()=>void;disabled?:boolean;primary?:boolean;compact?:boolean;testID?:string;accessibilityLabel?:string;style?:StyleProp<ViewStyle>}){
 return <PressScale testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel||label} accessibilityState={{disabled}} disabled={disabled} onPress={onPress} onPressIn={onPressIn} style={[s.command,primary&&s.primary,compact&&s.compact,style,disabled&&{opacity:.45}]}>
  <FeltDecoration radius={20} dark={primary}/>
  {icon&&<Icon name={icon} size={17} color={primary?'#FFF9EC':worldUI.violet}/>}
  {!compact&&<Text numberOfLines={1} style={[s.label,primary&&{color:'#FFF9EC'}]}>{label}</Text>}
 </PressScale>;
}
const s=StyleSheet.create({command:{minHeight:44,paddingHorizontal:16,borderRadius:20,borderWidth:1,borderColor:worldUI.edge,backgroundColor:worldUI.cream,overflow:'hidden',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,shadowColor:'#8F7356',shadowOpacity:.13,shadowRadius:5,shadowOffset:{width:0,height:4}},inset:{position:'absolute',left:2,right:2,top:2,bottom:2,borderRadius:16,borderTopWidth:1,borderColor:'#FFFFFFB0'},primary:{backgroundColor:'#627C57',borderColor:'#8EA27A'},compact:{width:44,paddingHorizontal:0},label:{fontSize:12,fontWeight:'600',letterSpacing:.3,color:worldUI.ink}});
