import React from 'react';
import Svg,{Defs,LinearGradient,RadialGradient,Stop,Polygon,Line,Path,Circle,Rect,G,Text as SvgText} from 'react-native-svg';
import {projectLane} from '@/utils/bowling';
const pt=(x:number,y:number)=>{const p=projectLane(x,y);return `${p.x*1000},${p.y*1000}`;};
const quad=(a:number,b:number,near=0,far=12)=>[pt(a,near),pt(b,near),pt(b,far),pt(a,far)].join(' ');
/** Perspective architecture, recessed gutters, maple boards and reflected overhead light. */
export function BowlingLane({aim,curve,guide}:{aim:number;curve:number;guide:boolean}){
 const start=projectLane(0,.2),end=projectLane(aim*.55,5);
 return <Svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="none">
  <Defs>
   <LinearGradient id="hall" x2="0" y2="1"><Stop stopColor="#12131E"/><Stop offset=".33" stopColor="#282334"/><Stop offset="1" stopColor="#11141B"/></LinearGradient>
   <LinearGradient id="maple" x2=".2" y2="1"><Stop stopColor="#9D6533"/><Stop offset=".27" stopColor="#CFAC74"/><Stop offset=".62" stopColor="#E8C898"/><Stop offset="1" stopColor="#B78751"/></LinearGradient>
   <LinearGradient id="well"><Stop stopColor="#9B9190"/><Stop offset=".18" stopColor="#403C44"/><Stop offset=".42" stopColor="#111522"/><Stop offset=".73" stopColor="#45404A"/><Stop offset="1" stopColor="#AA9690"/></LinearGradient>
   <LinearGradient id="rail"><Stop stopColor="#40303A"/><Stop offset=".25" stopColor="#B99174"/><Stop offset=".5" stopColor="#5D4948"/><Stop offset="1" stopColor="#251D29"/></LinearGradient>
   <LinearGradient id="gloss" x2="0" y2="1"><Stop stopColor="#FFF2C6" stopOpacity=".02"/><Stop offset=".3" stopColor="#FFF9E8" stopOpacity=".34"/><Stop offset=".48" stopColor="#FFF9E8" stopOpacity=".02"/><Stop offset=".72" stopColor="#FFF9E8" stopOpacity=".24"/><Stop offset="1" stopColor="#FFF9E8" stopOpacity="0"/></LinearGradient>
   <RadialGradient id="wallGlow"><Stop stopColor="#B29077" stopOpacity=".4"/><Stop offset="1" stopColor="#181722" stopOpacity="0"/></RadialGradient>
  </Defs>
  <Rect width="1000" height="1000" fill="url(#hall)"/>
  <Polygon points="0,0 1000,0 740,150 260,150" fill="#20212A"/>
  {[80,150,250,410,730].map((y,i)=><Path key={y} d={`M0 ${y*.16} L${290-i*46} ${115-i*16} L${710+i*46} ${115-i*16} L1000 ${y*.16}`} fill="none" stroke={i%2?'#B5A99D':'#494652'} strokeWidth={i%2?5:2} opacity={i%2?.65:.8}/>)}
  {[-2.6,0,2.6].map((offset,i)=><G key={offset}>
   <Polygon points={quad(offset-1.3,offset+1.3)} fill="#191820"/>
   <Polygon points={quad(offset-1,offset+1)} fill="url(#maple)" opacity={offset?.43:1}/>
   {[-1.2,1].map(edge=><Polygon key={edge} points={quad(offset+edge,offset+edge+.2)} fill="url(#well)"/>)}
   {[-1.3,1.2].map(edge=><Polygon key={edge} points={quad(offset+edge,offset+edge+.1)} fill="url(#rail)"/>)}
   {Array.from({length:27},(_,j)=>{
    const x=offset-1+j*2/27,shade=['#9C673A','#EFD0A0','#A57948','#F9DDB0'][j%4];
    return <G key={j}><Polygon points={quad(x,x+2/27)} fill={shade} opacity={offset?.12:.22}/>
     {Array.from({length:7},(_,k)=>{const y=(k*1.81+j*.71)%12,a=projectLane(x,y),b=projectLane(x+2/27,y);return <Line key={k} x1={a.x*1000} x2={b.x*1000} y1={a.y*1000} y2={b.y*1000} stroke="#705130" strokeWidth=".8" opacity=".26"/>;})}
     {!offset&&<Path d={`M${pt(x+.018,.1)} Q${pt(x+.034,4)} ${pt(x+.023,7)} T${pt(x+.028,12)}`} fill="none" stroke="#755332" strokeWidth=".7" opacity=".23"/>}
    </G>;
   })}
   <Polygon points={quad(offset-.76,offset-.4,.1,11)} fill="url(#gloss)"/><Polygon points={quad(offset+.15,offset+.4,0,12)} fill="url(#gloss)"/>
   <Rect x={343+offset*155} y="148" width="314" height="145" rx="2" fill="#0E1018"/>
   <Rect x={343+offset*155} y="150" width="314" height="5" fill="#D8B7E7" opacity=".75"/>
   <Rect x={338+offset*155} y="279" width="324" height="20" fill="#4A3834"/>
   <Rect x={342+offset*155} y="281" width="316" height="4" fill="#B08A69"/>
   <SvgText x={500+offset*155} y="183" fill="#E8DCD2" fontSize="18" textAnchor="middle" letterSpacing="4">{String(i+1).padStart(2,'0')}</SvgText>
  </G>)}
  <Rect x="0" y="111" width="1000" height="30" fill="#372A36"/>
  <Rect x="0" y="130" width="1000" height="3" fill="#EAB6AC" opacity=".65"/>
  <Rect x="0" y="138" width="1000" height="5" fill="#0F1018"/>
  <Rect x="180" y="70" width="640" height="88" fill="url(#wallGlow)"/>
  {[195,500,805].map((x,i)=><G key={x}>
   <Line x1={x} y1="0" x2={x} y2="54" stroke="#090C13" strokeWidth="8"/>
   <Rect x={x-101} y="40" width="202" height="72" rx="5" fill="#080C16" stroke="#645C68" strokeWidth="3"/>
   <Rect x={x-94} y="47" width="188" height="58" rx="2" fill="#1F2C39"/>
   <SvgText x={x-82} y="67" fill="#DBC0D7" fontSize="11" letterSpacing="2">LANE {String(i+1).padStart(2,'0')}</SvgText>
   {[0,1,2,3,4,5,6,7].map(n=><Rect key={n} x={x-81+n*21} y="78" width="19" height="17" fill={n%3===0?'#BBA899':'#4F6066'} opacity=".6"/>)}
  </G>)}
  <Polygon points={quad(-1,1,.65,.72)} fill="#4F3934"/>
  <Polygon points={quad(-1,1,.72,.735)} fill="#ECD0A1"/>
  {[-.6,-.4,-.2,0,.2,.4,.6].map(x=>{const p=projectLane(x,2.3-Math.abs(x));return <Path key={x} d={`M${p.x*1000-5} ${p.y*1000+7} L${p.x*1000} ${p.y*1000-7} L${p.x*1000+5} ${p.y*1000+7}Z`} fill="#66492F" opacity=".8"/>;})}
  {[-.6,-.3,0,.3,.6].map(x=>{const p=projectLane(x,.9);return <Circle key={x} cx={p.x*1000} cy={p.y*1000} r="2.5" fill="#62472E"/>;})}
  <Polygon points="0,961 1000,961 1000,1000 0,1000" fill="#714A31"/><Line x1="0" y1="964" x2="1000" y2="964" stroke="#D5AB7A" strokeWidth="4"/>
  {guide&&<><Path d={`M${start.x*1000} ${start.y*1000} Q${start.x*1000+aim*190} ${start.y*1000-160} ${end.x*1000+curve*18} ${end.y*1000}`} stroke="#FFF5C4" strokeWidth="3" strokeDasharray="10 13" fill="none" opacity=".8"/><Circle cx={end.x*1000+curve*18} cy={end.y*1000} r="7" fill="#FFF1BB"/></>}
 </Svg>;
}
