import React from 'react';
import Svg,{Defs,Ellipse,LinearGradient,Path,Rect,Stop} from 'react-native-svg';
import type {CleaningTool} from '@/utils/housekeeping';
export function CleaningToolArt({tool,size=70}:{tool:CleaningTool;size?:number}){
  return <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs><LinearGradient id={`tool-${tool}`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#FFF9EB"/><Stop offset="1" stopColor="#B4A2C0"/></LinearGradient></Defs>
    {tool==='robot'?<><Ellipse cx="50" cy="76" rx="44" ry="12" fill="#55445722"/><Path d="M 8 50 V 65 C 9 89 91 89 92 65 V 50 Z" fill="#A293AC"/><Ellipse cx="50" cy="51" rx="42" ry="25" fill={`url(#tool-${tool})`} stroke="#B6A8BC" strokeWidth="2"/><Ellipse cx="50" cy="49" rx="32" ry="18" fill="#F5EFE8" stroke="#DCD1E0"/><Ellipse cx="50" cy="45" rx="10" ry="6" fill="#C4B2CE"/><Rect x="46" y="58" width="8" height="3" rx="1.5" fill="#87AF98"/><Path d="M 8 73 L 0 77 M 91 73 L 99 77" stroke="#B6A8BC" strokeWidth="2"/></>:tool==='broom'?<><Path d="M 68 9 L 43 64" stroke="#A2754E" strokeWidth="8" strokeLinecap="round"/><Path d="M 32 53 L 51 62 L 47 90 Q 27 91 12 75 Z" fill="#D6B974" stroke="#B79154" strokeWidth="2"/><Path d="M 24 78 L 37 59 M 34 85 L 43 63 M 42 86 L 47 66" stroke="#B79658" strokeWidth="2"/><Path d="M 31 55 L 51 64" stroke="#AA849F" strokeWidth="6"/></>:<><Path d="M 14 33 L 69 22 L 91 66 L 33 80 L 10 68 Z" fill="#D5C6DF" stroke="#AA96BA" strokeWidth="2"/><Path d="M 16 34 L 72 27 L 84 60 L 29 71 Z" fill="#EFE4F3"/><Path d="M 26 46 L 69 38 M 31 57 L 74 49" stroke="#C8B7D2" strokeWidth="2" strokeDasharray="2 4"/></>}
  </Svg>;
}
