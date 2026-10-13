import type {StoryEncounter} from './storyEncounters';

type Point={x:number;y:number};
export type ConversationTarget={key:string;point:Point;hint:string;size:number};
export const STORY_RESIDENT_SIZE=.145;
export const PLAZA_RESIDENT_SIZE=.135;
export const PLAZA_VISITOR_POINT={x:.59,y:.598};
export const PLAZA_APPROACH_POINT={x:.55,y:.73};
const PLAZA_STORY_SPOTS=[{x:.39,y:.665},{x:.72,y:.71}];

/** Two story neighbours share the square; the next waiting story appears after one finishes. */
export function layoutStoryResidents(encounters:StoryEncounter[]):StoryEncounter[]{
 const residents=encounters.filter(e=>!e.merchant);
 if(residents[0]?.place!=='market')return residents;
 const visible=residents.slice(0,2);
 const grandma=visible.find(e=>e.id==='grandma');
 return visible.map((e,i)=>({...e,point:PLAZA_STORY_SPOTS[grandma?(e===grandma?1:0):i]}));
}
export function storyApproach(encounter:StoryEncounter):Point{
 return {x:encounter.point.x+(encounter.point.x>.5?-.16:.16),y:encounter.point.y+(encounter.place==='market'&&encounter.point.x<.5?.07:.025)};
}

/** One nearby voice, with a little hysteresis so a boundary doesn't flicker. */
export function nearbyConversation(targets:ConversationTarget[],player:Point,previous:string|null=null):string|null{
 'worklet';
 let key:string|null=null,distance=.25;
 for(const target of targets){
  const d=Math.hypot(player.x-target.point.x,(player.y-target.point.y)*1.5);
  const weighted=d-(target.key===previous ? .025 : 0);
  if(d<.25&&weighted<distance){distance=weighted;key=target.key;}
 }
 return key;
}

/** Place the single hint in empty space, never over the player or another resident. */
export function conversationHintLayout(target:ConversationTarget,targets:ConversationTarget[],player:Point,width:number,height:number,viewportLeft:number,viewportWidth:number,clearTop:number){
 'worklet';
 const w=Math.min(144,viewportWidth-24),h=46;
 const x=target.point.x*width,y=target.point.y*height,size=target.size*width;
 const outward=target.point.x<.5?-1:1;
 const candidates=[
  {x:x-w/2,y:y-size-h-10},
  {x:x-w/2+outward*w*.65,y:y-size-h-10},
  {x:x-w/2,y:y-size-h-68},
  {x:x-w/2,y:y-size-h-116},
  {x:x+size/2+12,y:y-size*.6-h/2},
  {x:x-size/2-w-12,y:y-size*.6-h/2},
 ];
 const obstacles=targets.map(t=>({x:t.point.x*width-t.size*width/2-8,y:t.point.y*height-t.size*width-8,w:t.size*width+16,h:t.size*width+16}));
 obstacles.push({x:player.x*width-width*.09,y:player.y*height-width*.19,w:width*.18,h:width*.19+12});
 for(const candidate of candidates){
  const left=Math.max(viewportLeft+12,Math.min(viewportLeft+viewportWidth-w-12,candidate.x));
  const top=Math.max(clearTop+8,candidate.y);
  if(top+h>height*.81)continue;
  if(obstacles.every(r=>left+w<=r.x||left>=r.x+r.w||top+h<=r.y||top>=r.y+r.h))return {left,top,width:w,height:h};
 }
 return null;
}
