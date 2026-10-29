import React,{memo,useEffect,useId} from 'react';
import {StyleSheet,View} from 'react-native';
import Animated,{cancelAnimation,useAnimatedStyle,useSharedValue,withRepeat,withTiming,type SharedValue} from 'react-native-reanimated';
import Svg,{Defs,Ellipse,Path,LinearGradient,RadialGradient,Stop} from 'react-native-svg';

function Steam({clock,index,size}:{clock:SharedValue<number>;index:number;size:number}){
 const drift=useAnimatedStyle(()=>{const t=(clock.value+index*.21)%1;return{opacity:Math.sin(t*Math.PI)*.32,transform:[{translateY:-t*size*.30},{translateX:Math.sin(t*Math.PI*2+index)*size*.025},{scale:1+t*.55}]};});
 return <Animated.View pointerEvents="none" style={[{position:'absolute',left:size*(.29+index*.10),top:size*.35,width:size*.12,height:size*.28},drift]}><Svg width="100%" height="100%" viewBox="0 0 40 100"><Path d="M20 95 C-2 75 37 66 19 44 C1 20 28 22 21 0" fill="none" stroke="#FFF5E2" strokeWidth={7-index} strokeLinecap="round"/></Svg></Animated.View>;
}
function Bubble({clock,index,size}:{clock:SharedValue<number>;index:number;size:number}){
 const pulse=useAnimatedStyle(()=>{const t=(clock.value*3+index*.17)%1;return{opacity:Math.sin(t*Math.PI)*.75,transform:[{scale:.4+t},{translateY:-t*4}]};});
 return <Animated.View style={[{position:'absolute',left:size*(.24+(index%3)*.21),top:size*(.53+Math.floor(index/3)*.09),width:size*.029,height:size*.016,borderRadius:20,borderWidth:1,borderColor:'#FFF4D9',backgroundColor:'#E3F9F430'},pulse]}/>;
}
/** Separate water, ladle and front rim let the egg rise out of the pot in depth.
 * Vector surfaces avoid downloading/decoding the old 1.2 MB basket illustration. */
export const CookingPot=memo(function CookingPot({size,boiling,active,reduceMotion,lift}:{size:number;boiling:boolean;active:boolean;reduceMotion:boolean;lift:SharedValue<number>}){
 const uid=useId().replace(/:/g,''),id=(name:string)=>`${uid}-${name}`,paint=(name:string)=>`url(#${id(name)})`;
 const clock=useSharedValue(0);
 useEffect(()=>{if(boiling&&active&&!reduceMotion)clock.value=withRepeat(withTiming(1,{duration:2400}),-1,false);return()=>cancelAnimation(clock);},[boiling,active,reduceMotion]);
 const ladle=useAnimatedStyle(()=>({transform:[{translateX:lift.value*size*.065},{translateY:-lift.value*size*.28},{rotate:`${-lift.value*7}deg`}]}));
 const drops=useAnimatedStyle(()=>({opacity:lift.value>0&&lift.value<.97?Math.sin(lift.value*Math.PI):0,transform:[{translateX:lift.value*size*.065},{translateY:lift.value*size*.05}]}));
 const ripples=useAnimatedStyle(()=>({opacity:boiling?.35+Math.sin(clock.value*Math.PI*4)*.18:.3}));
 return <View testID="egg-job-pot" pointerEvents="none" style={{width:size,height:size}}>
  <Svg width={size} height={size} viewBox="0 0 320 320" style={StyleSheet.absoluteFill}>
   <Defs>
    <LinearGradient id={id('copper')} x1="0" y1="0" x2="1" y2=".2"><Stop offset="0" stopColor="#98472B"/><Stop offset=".18" stopColor="#E6975F"/><Stop offset=".38" stopColor="#FFD3A0"/><Stop offset=".62" stopColor="#D8804A"/><Stop offset=".86" stopColor="#A65335"/><Stop offset="1" stopColor="#643022"/></LinearGradient>
    <LinearGradient id={id('rim')} x1="0" y1="0" x2=".7" y2="1"><Stop offset="0" stopColor="#FFF4BD"/><Stop offset=".32" stopColor="#E4AD55"/><Stop offset=".60" stopColor="#FFF0B0"/><Stop offset="1" stopColor="#986431"/></LinearGradient>
    <RadialGradient id={id('water')} cx=".36" cy=".28" r=".8"><Stop offset="0" stopColor="#C1F0E4"/><Stop offset=".50" stopColor="#76BBBC"/><Stop offset="1" stopColor="#355F6A"/></RadialGradient>
    <LinearGradient id={id('handle')} x1="0" y1="0" x2=".5" y2="1"><Stop offset="0" stopColor="#E4BFF1"/><Stop offset=".35" stopColor="#B787C6"/><Stop offset="1" stopColor="#603A76"/></LinearGradient>
   </Defs>
   <Ellipse cx="159" cy="300" rx="114" ry="12" fill="#130C204D"/>
   {boiling&&<><Ellipse cx="160" cy="290" rx="83" ry="13" fill="#FFB85866"/><Ellipse cx="160" cy="289" rx="59" ry="8" fill="#FFD693"/></>}
   <Path d="M46 192 C-5 170 1 236 46 228 M270 192 C321 170 322 237 270 228" fill="none" stroke="#663E75" strokeWidth="17"/>
   <Path d="M44 188 C0 171 4 223 44 222 M274 188 C314 171 316 223 274 222" fill="none" stroke={paint('handle')} strokeWidth="12"/>
   <Path d="M41 183 L49 260 C55 311 261 311 271 258 L279 183 Z" fill={paint('copper')}/>
   <Ellipse cx="160" cy="184" rx="120" ry="51" fill="#794329" stroke={paint('rim')} strokeWidth="8"/>
   <Ellipse cx="160" cy="191" rx="110" ry="42" fill={paint('water')}/>
   <Path d="M65 182 C82 159 126 151 166 153" fill="none" stroke="#EFFDEA66" strokeWidth="3" strokeLinecap="round"/>
   <Ellipse cx="96" cy="200" rx="21" ry="16" fill="#E4D0AD"/><Ellipse cx="95" cy="194" rx="18" ry="22" fill="#FFF0D1" transform="rotate(-22 95 194)"/>
   <Ellipse cx="225" cy="202" rx="21" ry="16" fill="#D3C6AD"/><Ellipse cx="224" cy="195" rx="18" ry="23" fill="#F5E8CB" transform="rotate(19 224 195)"/>
   <Path d="M76 206 Q95 214 114 205 M206 207 Q225 215 245 205" fill="none" stroke="#C8F1E2AA" strokeWidth="3"/>
  </Svg>
  <Animated.View style={[StyleSheet.absoluteFill,ripples]}><Svg width={size} height={size} viewBox="0 0 320 320"><Ellipse cx="158" cy="195" rx="88" ry="27" stroke="#E4FFF0" strokeWidth="1.2" fill="none"/><Path d="M69 186 Q82 178 94 181 M228 179 Q243 181 250 188" stroke="#E9FFF2" strokeWidth="2" fill="none" strokeLinecap="round"/></Svg></Animated.View>
  {boiling&&Array.from({length:6},(_,i)=><Bubble key={i} clock={clock} index={i} size={size}/>)}
  <Animated.View testID="egg-job-ladle" style={[StyleSheet.absoluteFill,ladle]}>
   <Svg width={size} height={size} viewBox="0 0 320 320">
    <Defs>
     <LinearGradient id={id('steel')} x1="0" y1="0" x2="1" y2=".4"><Stop offset="0" stopColor="#607783"/><Stop offset=".25" stopColor="#D0DFDA"/><Stop offset=".48" stopColor="#FAFFEF"/><Stop offset=".65" stopColor="#9BB4B8"/><Stop offset="1" stopColor="#4F6372"/></LinearGradient>
     <LinearGradient id={id('bowl')} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#E6F3E6"/><Stop offset=".25" stopColor="#A9C4C8"/><Stop offset=".73" stopColor="#687F8D"/><Stop offset="1" stopColor="#384B5B"/></LinearGradient>
     <LinearGradient id={id('wood')} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFCD91"/><Stop offset=".35" stopColor="#C38248"/><Stop offset="1" stopColor="#72472E"/></LinearGradient>
     <RadialGradient id={id('egg')} cx=".30" cy=".24" r=".8"><Stop offset="0" stopColor="#FFFFEF"/><Stop offset=".48" stopColor="#FFF3D6"/><Stop offset=".83" stopColor="#E9CDAD"/><Stop offset="1" stopColor="#B69983"/></RadialGradient>
    </Defs>
    <Path d="M179 212 Q180 185 201 159 L248 108" fill="none" stroke="#465864" strokeWidth="9" strokeLinecap="round"/>
    <Path d="M179 210 Q180 184 201 158 L248 107" fill="none" stroke={paint('steel')} strokeWidth="6" strokeLinecap="round"/>
    <Path d="M227 130 L259 95 Q266 88 272 94 Q278 100 271 107 L239 143 Z" fill={paint('wood')} stroke="#754B31" strokeWidth="1.5"/>
    <Path d="M233 131 L263 100" stroke="#FFE3B78C" strokeWidth="2.5" strokeLinecap="round"/>
    <Path d="M226 131 L236 141" stroke="#C5D8D4" strokeWidth="5"/>
    <Ellipse cx="154" cy="212" rx="34" ry="15" fill="#465B65" stroke="#E8F6E2" strokeWidth="3"/>
    <Ellipse cx="153" cy="211" rx="28" ry="10" fill="#8FAFB1"/>
    <Path d="M153 169 C137 169 127 193 129 207 C131 224 176 228 179 207 C181 192 169 169 153 169 Z" fill={paint('egg')}/>
    <Ellipse cx="143" cy="186" rx="5" ry="10" fill="#FFFFFF7A" transform="rotate(28 143 186)"/>
    <Path d="M120 211 C123 247 183 247 188 211 Q156 231 120 211 Z" fill={paint('bowl')}/>
    <Path d="M121 212 Q154 232 187 212" fill="none" stroke="#F1FFEF" strokeWidth="2.5" strokeLinecap="round"/>
    <Path d="M128 226 Q142 238 157 237" fill="none" stroke="#D8F1EC80" strokeWidth="2" strokeLinecap="round"/>
   </Svg>
  </Animated.View>
  <Animated.View style={[StyleSheet.absoluteFill,drops]}><Svg width={size} height={size} viewBox="0 0 320 320"><Path d="M149 157 Q143 167 150 169 Q157 167 149 157 M169 172 Q165 181 170 182 Q176 180 169 172 M157 188 Q153 195 158 196 Q163 194 157 188" fill="#C8F5E6CC"/></Svg></Animated.View>
  <Svg width={size} height={size} viewBox="0 0 320 320" style={StyleSheet.absoluteFill}>
   <Defs><LinearGradient id={id('front')} x1="0" y1="0" x2="1" y2=".15"><Stop offset="0" stopColor="#B1663E"/><Stop offset=".20" stopColor="#F5B980"/><Stop offset=".40" stopColor="#FFD2A0"/><Stop offset=".70" stopColor="#C87447"/><Stop offset="1" stopColor="#83462F"/></LinearGradient><LinearGradient id={id('lip')} x1="0" y1="0" x2=".7" y2="1"><Stop offset="0" stopColor="#FFF3C1"/><Stop offset=".50" stopColor="#F0C26E"/><Stop offset="1" stopColor="#BC8041"/></LinearGradient></Defs>
   <Path d="M40 186 C43 250 271 258 280 186 L271 259 C263 306 58 307 49 261 Z" fill={paint('front')}/>
   <Path d="M42 187 C51 256 269 256 278 187" fill="none" stroke="#915430" strokeWidth="9"/>
   <Path d="M41 184 C50 251 270 251 279 184" fill="none" stroke={paint('lip')} strokeWidth="6" strokeLinecap="round"/>
   <Path d="M71 244 Q75 279 91 283" fill="none" stroke="#FFE3AD70" strokeWidth="5" strokeLinecap="round"/>
   <Path d="M112 291 Q171 306 233 287" fill="none" stroke="#7C43283B" strokeWidth="3"/>
   <Ellipse cx="48" cy="235" rx="4" ry="6" fill="#F6C66E"/><Ellipse cx="272" cy="235" rx="4" ry="6" fill="#E9AF54"/>
  </Svg>
  {boiling&&Array.from({length:3},(_,i)=><Steam key={i} clock={clock} index={i} size={size}/>)}
 </View>;
});
