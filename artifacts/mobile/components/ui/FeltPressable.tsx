import React,{forwardRef} from 'react';
import {Pressable,StyleSheet,type PressableProps,type View} from 'react-native';
import {FeltDecoration} from './Felt';
/** Keeps native press semantics and hit targets; only decorates filled, rounded controls. */
export const FeltPressable=forwardRef<View,PressableProps>(function FeltPressable({children,style,...props},ref){
 return <Pressable {...props} ref={ref} style={style}>{state=>{
  const surface=StyleSheet.flatten(typeof style==='function'?style(state):style);
  const contents=typeof children==='function'?children(state):children;
  const decorated=React.Children.toArray(contents).some(c=>React.isValidElement(c)&&c.type===FeltDecoration);
  const fill=surface?.backgroundColor;
  const soft=fill&&fill!=='transparent'&&!!surface?.borderRadius&&!decorated;
  return <>{soft&&<FeltDecoration radius={typeof surface.borderRadius==='number'?surface.borderRadius:20}/ >}{contents}</>;
 }}</Pressable>;
});
