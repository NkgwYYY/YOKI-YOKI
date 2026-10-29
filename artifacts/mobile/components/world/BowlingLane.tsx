import React from 'react';
import Svg,{Defs,Pattern,Polygon,Line,Path,Circle,Rect,G,Text as SvgText} from 'react-native-svg';
import {projectLane} from '@/utils/bowling';
const pt=(x:number,y:number)=>{const p=projectLane(x,y);return `${p.x*1000},${p.y*1000}`;};
const quad=(a:number,b:number,near=0,far=12)=>[pt(a,near),pt(b,near),pt(b,far),pt(a,far)].join(' ');
/** Sewn toy bowling lanes use the identical physics projection. */
export function BowlingLane({aim,curve,guide}:{aim:number;curve:number;guide:boolean}){
 const start=projectLane(0,.2),end=projectLane(aim*.55,5);
 return <Svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="none">
  <Defs><Pattern id="laneFelt" width="14" height="16" patternUnits="userSpaceOnUse"><Path d="M1 4l3-1m5 7l2 1M3 14l2-2" stroke="#8A7356" strokeOpacity=".14" strokeWidth=".8"/></Pattern></Defs>
  <Rect width="1000" height="1000" fill="#D8E2C7"/>
  <Path d="M0 32Q500 112 1000 32" stroke="#F4EBD6" strokeWidth="58" fill="none"/>
  <Path d="M0 32Q500 112 1000 32" stroke="#B8A285" strokeWidth="3" strokeDasharray="7 9" fill="none"/>
  {[-2.6,0,2.6].map((offset,i)=><G key={offset}>
   <Polygon points={quad(offset-1.3,offset+1.3)} fill="#D5C0CB"/>
   <Polygon points={quad(offset-1,offset+1)} fill={offset?'#E6DBC1':'#F1E3C6'}/>
   {[-1.2,1].map(edge=><Polygon key={edge} points={quad(offset+edge,offset+edge+.2)} fill="#A1B49B"/>)}
   {[-1.3,1.2].map(edge=><Polygon key={edge} points={quad(offset+edge,offset+edge+.1)} fill="#E5C5CC"/>)}
   {[-.94,.94].map(x=><Path key={x} d={`M${pt(offset+x,0)} L${pt(offset+x,12)}`} stroke="#B8A082" strokeWidth="2" strokeDasharray="6 8"/>)}
   {Array.from({length:9},(_,j)=>{const x=offset-1+j*2/9;return <Path key={j} d={`M${pt(x,0)}L${pt(x,12)}`} stroke="#D5C4A8" strokeWidth="1.4" opacity=".6"/>;})}
   <Rect x={343+offset*155} y="148" width="314" height="145" rx="24" fill="#B3C4A4"/>
   <Rect x={353+offset*155} y="158" width="294" height="125" rx="20" stroke="#E9EEDC" strokeWidth="2" strokeDasharray="6 6" fill="none"/>
   <SvgText x={500+offset*155} y="192" fill="#5F704E" fontSize="20" textAnchor="middle">{i+1}</SvgText>
  </G>)}
  <Rect width="1000" height="1000" fill="url(#laneFelt)"/>
  {[190,500,810].map(x=><G key={x}>{[0,1,2,3,4].map(i=><Circle key={i} cx={x+Math.sin(i*1.256)*20} cy={99+Math.cos(i*1.256)*19} r="13" fill="#FFF8E5" stroke="#E2D1AF" strokeWidth="2"/>)}<Circle cx={x} cy="99" r="10" fill="#D8B86F"/></G>)}
  <Polygon points={quad(-1,1,.72,.735)} fill="#B99D79"/>
  {[-.6,-.4,-.2,0,.2,.4,.6].map(x=>{const p=projectLane(x,2.3-Math.abs(x));return <Path key={x} d={`M${p.x*1000-5} ${p.y*1000+7} L${p.x*1000} ${p.y*1000-7} L${p.x*1000+5} ${p.y*1000+7}Z`} fill="#8B8061"/>;})}
  {guide&&<><Path d={`M${start.x*1000} ${start.y*1000} Q${start.x*1000+aim*190} ${start.y*1000-160} ${end.x*1000+curve*18} ${end.y*1000}`} stroke="#71815D" strokeWidth="4" strokeDasharray="10 13" fill="none"/><Circle cx={end.x*1000+curve*18} cy={end.y*1000} r="7" fill="#71815D"/></>}
 </Svg>;
}
