export type SpeechAnchor = {x:number;top:number;bottom:number;width:number};
type Rect = {left:number;top:number;width:number;height:number};
const clamp=(n:number,min:number,max:number)=>{'worklet';return Math.max(min,Math.min(max,n));};

/** Screen-space placement keeps type legible through camera zoom and carrying. */
export function placeResidentSpeech(anchor:SpeechAnchor,bubble:{width:number;height:number},safe:Rect){
  'worklet';
  const {width:w,height:h}=bubble,gap=12;
  const left=clamp(anchor.x-w*.55,safe.left,safe.left+safe.width-w);
  const above=anchor.top-h-gap,below=anchor.bottom+gap;
  if(above>=safe.top)return {left,top:Math.min(above,safe.top+safe.height-h),tailX:clamp(anchor.x-left,20,w-20),tailY:h-4,rotation:45};
  if(below+h<=safe.top+safe.height)return {left,top:Math.max(safe.top,below),tailX:clamp(anchor.x-left,20,w-20),tailY:-4,rotation:45};
  const onRight=anchor.x+anchor.width/2+gap+w<=safe.left+safe.width;
  const side=onRight?anchor.x+anchor.width/2+gap:anchor.x-anchor.width/2-gap-w;
  const top=clamp((anchor.top+anchor.bottom-h)/2,safe.top,safe.top+safe.height-h);
  return {left:clamp(side,safe.left,safe.left+safe.width-w),top,tailX:onRight?-4:w-4,tailY:clamp((anchor.top+anchor.bottom)/2-top,16,h-16),rotation:45};
}
