import React,{useEffect,useRef,useState} from 'react';
import {Animated,Easing,Image,PanResponder,Platform,StyleSheet,View} from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import {LinearGradient} from 'expo-linear-gradient';
import Svg,{Defs,RadialGradient,Stop,Ellipse} from 'react-native-svg';
import * as Haptics from 'expo-haptics';

export type RestScene='campfire'|'rain'|'stars'|'cat';
export const REST_SCENES=[
 {key:'campfire',label:'焚き火を見る',title:'火のそばで、ほどける。',sub:'薪の音と、あたたかな灯り',eyebrow:'AMBER / FIRE',image:require('@/assets/images/rest/campfire.jpg'),tint:'#E4B387'},
 {key:'rain',label:'雨の音を聞く',title:'雨音だけの、ひととき。',sub:'窓をつたう雨を、ただ眺める',eyebrow:'BLUE / RAIN',image:require('@/assets/images/rest/rain.jpg'),tint:'#A8CDD6'},
 {key:'stars',label:'夜空を見る',title:'星が瞬く、静かな夜。',sub:'湖の向こうまで、空が続く',eyebrow:'VIOLET / NIGHT',image:require('@/assets/images/sky/night.png'),tint:'#D2C0EE'},
 {key:'cat',label:'猫を撫でる',title:'そっと、なでてみよう。',sub:'やわらかな毛並みと、寝息',eyebrow:'SOFT / CAT',image:require('@/assets/images/cat_purring.jpg'),tint:'#E4D2BC'},
] as const;

function useCycle(duration:number,reduceMotion:boolean,delay=0){
 const value=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  value.setValue(0);if(reduceMotion)return;
  const loop=Animated.loop(Animated.sequence([Animated.delay(delay),Animated.timing(value,{toValue:1,duration,easing:Easing.linear,useNativeDriver:true}),Animated.timing(value,{toValue:0,duration:0,useNativeDriver:true})]));
  loop.start();return()=>loop.stop();
 },[duration,reduceMotion,delay]);return value;
}
function Fire({reduceMotion,width,height}:{reduceMotion:boolean;width:number;height:number}){
 const a=useCycle(4100,reduceMotion),b=useCycle(2700,reduceMotion);
 const scale=Math.max(width/1024,height/1536),x=width/2,y=(height-1536*scale)/2+1000*scale;
 const size=Math.max(85,Math.min(220,220*scale));
 return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
  <Animated.View style={{position:'absolute',left:x-size,top:y-size,width:size*2,height:size*1.7,opacity:a.interpolate({inputRange:[0,.3,.65,1],outputRange:[.35,.58,.28,.35]})}}>
   <Svg width="100%" height="100%" viewBox="0 0 200 170"><Defs><RadialGradient id="emberlight"><Stop offset="0" stopColor="#FF992C" stopOpacity=".7"/><Stop offset="1" stopColor="#FF6C12" stopOpacity="0"/></RadialGradient></Defs><Ellipse cx="100" cy="85" rx="100" ry="85" fill="url(#emberlight)"/></Svg>
  </Animated.View>
  <Animated.Image source={require('@/assets/images/rest/flame.png')} resizeMode="contain" style={{position:'absolute',left:x-size*.5,top:y-size*.95,width:size,height:size,opacity:a.interpolate({inputRange:[0,.3,.65,1],outputRange:[.72,.88,.66,.72]}),transform:[{scaleY:b.interpolate({inputRange:[0,.35,.7,1],outputRange:[.96,1.04,.98,.96]})},{skewX:b.interpolate({inputRange:[0,.5,1],outputRange:['-2deg','2deg','-2deg']})}]}}/>
  {!reduceMotion&&[0,1,2,3,4,5].map(i=><Ember key={i} index={i} x={x} y={y} size={size}/>)}
 </View>;
}
function Ember({index,x,y,size}:{index:number;x:number;y:number;size:number}){
 const v=useCycle(3900+index*510,false,index*370);
 return <Animated.View style={{position:'absolute',left:x+(index-2.5)*size*.12,top:y-15,width:2,height:3,borderRadius:2,backgroundColor:'#FFD1A1',opacity:v.interpolate({inputRange:[0,.2,.7,1],outputRange:[0,.8,.35,0]}),transform:[{translateY:v.interpolate({inputRange:[0,1],outputRange:[0,-size*2]})},{translateX:v.interpolate({inputRange:[0,1],outputRange:[0,(index%2?1:-1)*20]})}]}}/>;
}
function RainDrop({index,width,height}:{index:number;width:number;height:number}){
 const v=useCycle(4500+index*270,false,index*83);
 return <Animated.View style={{position:'absolute',left:width*((index*37%91)+4)/100,top:-45,width:index%3?1:2,height:26+index%4*8,borderRadius:2,backgroundColor:'#D6EBFF',opacity:v.interpolate({inputRange:[0,.15,.8,1],outputRange:[0,.25,.15,0]}),transform:[{translateY:v.interpolate({inputRange:[0,1],outputRange:[0,height*.9]})}]}}/>;
}
function Stars({reduceMotion,width,height}:{reduceMotion:boolean;width:number;height:number}){
 const v=useCycle(6200,reduceMotion),shoot=useCycle(21000,reduceMotion);
 return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
  {[0,1,2].map(group=><Animated.View key={group} style={[StyleSheet.absoluteFill,{opacity:v.interpolate({inputRange:[0,.3,.65,1],outputRange:group===1?[.8,.3,.7,.8]:[.3,.8,.4,.3]})}]}>
   {Array.from({length:12},(_,i)=><View key={i} style={{position:'absolute',left:width*((i*31+group*13)%97)/100,top:height*((i*17+group*19)%62)/100,width:i%4?1.5:2.5,height:i%4?1.5:2.5,borderRadius:2,backgroundColor:'#FFF2DD'}}/>)}
  </Animated.View>)}
  {!reduceMotion&&<Animated.View style={{position:'absolute',left:width*.18,top:height*.25,opacity:shoot.interpolate({inputRange:[0,.72,.73,.77,.79,1],outputRange:[0,0,.8,.6,0,0]}),transform:[{translateX:shoot.interpolate({inputRange:[0,.72,.79,1],outputRange:[0,0,width*.6,width*.6]})},{translateY:shoot.interpolate({inputRange:[0,.72,.79,1],outputRange:[0,0,height*.18,height*.18]})},{rotate:'22deg'}]}}><LinearGradient colors={['#FFFFFF00','#F6F1EE']} start={{x:0,y:0}} end={{x:1,y:0}} style={{width:64,height:1.5,borderRadius:2}}/></Animated.View>}
 </View>;
}
function CatTouch({reduceMotion,onPet}:{reduceMotion:boolean;onPet:()=>void}){
 const [point,setPoint]=useState({x:0,y:0});
 const fade=useRef(new Animated.Value(0)).current,last=useRef(0);
 const handle=(x:number,y:number)=>{
  const now=Date.now();if(now-last.current<300)return;last.current=now;onPet();
  if(!reduceMotion){setPoint({x,y});fade.stopAnimation();fade.setValue(1);Animated.timing(fade,{toValue:0,duration:1500,useNativeDriver:true}).start();}
  if(Platform.OS!=='web')void Haptics.selectionAsync().catch(()=>{});
 };
 const latest=useRef(handle);latest.current=handle;
 const pan=useRef(PanResponder.create({onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,onPanResponderGrant:e=>latest.current(e.nativeEvent.locationX,e.nativeEvent.locationY),onPanResponderMove:(e,g)=>{if(Math.abs(g.dx)+Math.abs(g.dy)>10)latest.current(e.nativeEvent.locationX,e.nativeEvent.locationY);}})).current;
 useEffect(()=>()=>fade.stopAnimation(),[]);
 return <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
  <Pressable testID="rest-pet-cat" accessibilityRole="button" accessibilityLabel="猫をそっとなでる" onPress={()=>handle(150,150)} style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>
  <Animated.View pointerEvents="none" style={{position:'absolute',left:point.x-25,top:point.y-25,width:50,height:50,borderRadius:25,borderWidth:1,borderColor:'#FFF9ED',backgroundColor:'#FFF9ED16',opacity:fade,transform:[{scale:fade.interpolate({inputRange:[0,1],outputRange:[1.7,.8]})}]}}/>
 </View>;
}
export function RestSceneView({scene,reduceMotion,onPet}:{scene:RestScene;reduceMotion:boolean;onPet:()=>void}){
 const [size,setSize]=useState({width:390,height:844});
 const cfg=REST_SCENES.find(s=>s.key===scene)!;
 return <View testID={`rest-scene-${scene}`} style={s.scene} onLayout={e=>setSize(e.nativeEvent.layout)}>
  <Image source={cfg.image} resizeMode="cover" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>
  {scene==='campfire'&&<Fire reduceMotion={reduceMotion} {...size}/>}
  {scene==='rain'&&!reduceMotion&&<View pointerEvents="none" style={StyleSheet.absoluteFill}>{Array.from({length:18},(_,i)=><RainDrop key={i} index={i} {...size}/>)}</View>}
  {scene==='stars'&&<Stars reduceMotion={reduceMotion} {...size}/>}
  <LinearGradient pointerEvents="none" colors={['#0E0A19B8','#0E0A1900','#0E0A1910','#0E0A19EB']} locations={[0,.28,.6,1]} style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>
  {scene==='cat'&&<CatTouch reduceMotion={reduceMotion} onPet={onPet}/>}
 </View>;
}
const s=StyleSheet.create({scene:{flex:1,overflow:'hidden',backgroundColor:'#171224'}});
