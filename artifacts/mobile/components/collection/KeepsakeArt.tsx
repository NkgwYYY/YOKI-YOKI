import React,{useId} from 'react';
import Svg,{Defs,Ellipse,Path,Rect,Circle,LinearGradient,RadialGradient,Stop,G} from 'react-native-svg';
import type {KeepsakeId} from '@/utils/companionCollection';
/** Matte ceramic, stitched fabric and pale wood share the room's lighting. */
export function KeepsakeArt({id,size=100}:{id:KeepsakeId;size?:number}){
 const uid=useId().replace(/[^a-zA-Z0-9]/g,'');
 const paint=(name:string)=>`url(#${uid}${name})`;
 return <Svg width={size} height={size} viewBox="0 0 120 120" accessible={false}>
  <Defs>
   <LinearGradient id={uid+'fabric'} x1="0" y1="0" x2=".8" y2="1"><Stop offset="0" stopColor="#E7D6F2"/><Stop offset=".5" stopColor="#C8B0DF"/><Stop offset="1" stopColor="#967CAB"/></LinearGradient>
   <LinearGradient id={uid+'ceramic'} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFFDF5"/><Stop offset=".6" stopColor="#EEE4E8"/><Stop offset="1" stopColor="#C9B8CF"/></LinearGradient>
   <LinearGradient id={uid+'gold'} x1="0" y1="0" x2="1" y2=".7"><Stop offset="0" stopColor="#F5E4B6"/><Stop offset=".48" stopColor="#E2BD83"/><Stop offset="1" stopColor="#B88957"/></LinearGradient>
   <RadialGradient id={uid+'shadow'}><Stop offset="0" stopColor="#776384" stopOpacity=".23"/><Stop offset="1" stopColor="#776384" stopOpacity="0"/></RadialGradient>
   <RadialGradient id={uid+'light'}><Stop offset="0" stopColor="#FFF3CB" stopOpacity=".65"/><Stop offset="1" stopColor="#FFF3CB" stopOpacity="0"/></RadialGradient>
  </Defs>
  <Ellipse cx="60" cy="100" rx="45" ry="10" fill={paint('shadow')}/>
  {(id==='cushion'||id==='quilt')&&<>
   <Path d="M16 65 Q14 43 36 45 L88 42 Q106 43 103 64 L105 81 Q101 100 80 97 L34 99 Q13 98 16 80Z" fill={paint('fabric')} stroke="#AB90BE" strokeWidth="1"/>
   <Path d="M22 64 Q20 50 37 51 L87 49 Q99 51 97 65 L99 80 Q96 92 80 91 L35 93 Q21 91 22 79Z" fill="none" stroke="#F7ECFC" strokeWidth="1" strokeDasharray="2 3"/>
   <Path d="M29 56 Q56 44 88 54" stroke="#FFF6FF" strokeWidth="3" strokeLinecap="round" opacity=".45" fill="none"/>
   {id==='quilt'?<G opacity=".55"><Path d="M35 53L34 91 M57 51L57 92 M79 51L80 91 M23 69L97 67 M24 80L97 79" stroke="#FFF6EE" strokeWidth="2"/><Path d="M35 54L55 52L55 68L35 69Z" fill="#F4C8D5"/><Path d="M59 70L79 69L79 79L59 80Z" fill="#D3E5CF"/></G>:<><Circle cx="60" cy="72" r="3.4" fill="#AE91C2"/><Path d="M57 71 Q60 68 63 71" stroke="#F8EFFF" strokeWidth="1.4" fill="none"/></>}
  </>}
  {(id==='flower'||id==='planter')&&<>
   <Path d="M42 72 L47 98 Q60 104 73 98 L79 72Z" fill={paint('ceramic')} stroke="#D4C4DA"/>
   <Ellipse cx="60" cy="72" rx="19" ry="5" fill="#B1A0B5"/><Ellipse cx="60" cy="71" rx="15" ry="3" fill="#867A77"/>
   <Path d="M60 74 Q63 51 57 32 M61 63Q78 52 81 43 M60 57Q44 52 38 44" stroke="#829A73" strokeWidth="2.5" fill="none"/>
   <Path d="M61 63Q66 45 79 50Q77 62 61 63 M59 58Q39 62 38 45Q55 43 59 58" fill="#A8BDA0"/>
   {[[-1,0],[0,-1],[1,0],[0,1]].map(([x,y],i)=><Ellipse key={i} cx={57+x*8} cy={32+y*8} rx="7" ry="8" fill={id==='flower'?'#DCC0E8':'#F1D3DC'}/>)}
   <Circle cx="57" cy="32" r="5" fill="#F2DA9D"/><Path d="M49 82Q54 80 55 85" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
  </>}
  {id==='lamp'&&<>
   <Circle cx="60" cy="51" r="43" fill={paint('light')}/><Ellipse cx="61" cy="95" rx="23" ry="6" fill={paint('ceramic')}/>
   <Path d="M60 90V61" stroke="#B79CC8" strokeWidth="5"/><Path d="M60 20L69 39L90 42L75 57L78 78L60 68L41 78L45 56L30 42L51 39Z" fill={paint('gold')} stroke="#E7CCA0"/>
   <Path d="M60 28L65 42L48 46" stroke="#FFF3D1" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
  </>}
  {id==='trophy'&&<>
   <Path d="M39 39H25Q23 70 48 68 M81 39H95Q97 70 72 68" fill="none" stroke="#D6B47E" strokeWidth="6"/>
   <Path d="M37 31H83L79 61Q76 76 60 77Q44 76 41 61Z" fill={paint('gold')}/><Ellipse cx="60" cy="31" rx="23" ry="5" fill="#F7EAC7"/>
   <Path d="M60 75V91" stroke="#CFA774" strokeWidth="7"/><Rect x="39" y="89" width="43" height="12" rx="4" fill={paint('fabric')}/>
   <Path d="M60 43L63 50L71 51L65 56L67 64L60 60L53 64L55 56L49 51L57 50Z" fill="#FFEFBD"/>
  </>}
  {id==='bowl'&&<>
   <Ellipse cx="60" cy="96" rx="17" ry="4" fill="#B79AC5"/><Path d="M23 58Q27 95 60 97Q93 95 97 58Z" fill={paint('ceramic')} stroke="#CEBCD5"/>
   <Path d="M28 71Q60 86 92 71" stroke="#B49BC9" strokeWidth="4" fill="none"/>
   <Ellipse cx="60" cy="58" rx="37" ry="10" fill="#E8DCEB" stroke="#FEFAFF" strokeWidth="3"/><Ellipse cx="60" cy="59" rx="28" ry="5.5" fill="#CCB9D7"/>
   <Path d="M42 44L93 25 M43 49L96 32" stroke="#B99771" strokeWidth="3" strokeLinecap="round"/>
  </>}
  {id==='photo'&&<>
   <Path d="M30 33L94 28L99 94L35 100Z" fill={paint('gold')}/><Path d="M36 38L89 34L93 89L41 94Z" fill="#FFF9EE"/>
   <Path d="M41 43L84 40L88 80L45 83Z" fill="#E3DBED"/><Ellipse cx="56" cy="65" rx="9" ry="12" fill="#FFFBF0"/><Circle cx="74" cy="67" r="10" fill="#F7F1EA"/>
   {[53,59,71,77].map((x,i)=><Circle key={x} cx={x} cy={i<2?64:66} r="1.3" fill="#6E5A78"/>)}
   <Path d="M52 87L79 85" stroke="#C5B5CE" strokeWidth="2" strokeLinecap="round"/>
  </>}
  {id==='musicbox'&&<>
   <Path d="M26 61L60 48L96 61L95 88L60 103L26 89Z" fill={paint('fabric')} stroke="#AD92BF"/>
   <Path d="M26 61L60 76L96 61 M60 76V102" fill="none" stroke="#F5E8FC"/><Ellipse cx="60" cy="60" rx="24" ry="9" fill={paint('ceramic')}/>
   <Path d="M59 59V34L76 29V49" stroke="#BE9A66" strokeWidth="3" strokeLinecap="round" fill="none"/><Ellipse cx="54" cy="59" rx="6" ry="4" fill={paint('gold')}/><Ellipse cx="71" cy="49" rx="6" ry="4" fill={paint('gold')}/>
   <Circle cx="60" cy="86" r="3" fill="#F1DAAB"/>
  </>}
 </Svg>;
}
