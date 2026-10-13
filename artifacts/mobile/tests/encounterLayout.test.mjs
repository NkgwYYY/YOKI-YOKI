import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const module=async path=>import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(fs.readFileSync(new URL(path,import.meta.url),'utf8'))).toString('base64'));
const {layoutStoryResidents,storyApproach,nearbyConversation,conversationHintLayout,STORY_RESIDENT_SIZE,PLAZA_RESIDENT_SIZE,PLAZA_VISITOR_POINT,PLAZA_APPROACH_POINT}=await module('../utils/encounterLayout.ts');
const {mapStart,mapGroundPoint}=await module('../utils/worldMaps.ts');
const resident=id=>({id,key:id,place:'market',point:{x:.38,y:.66},hint:'あら、ころがっちゃった'});
const residents=layoutStoryResidents([resident('newcomer'),resident('grandma')]);
const targets=[...residents.map(e=>({...e,size:STORY_RESIDENT_SIZE})),{key:'plaza',point:PLAZA_VISITOR_POINT,size:PLAZA_RESIDENT_SIZE,hint:'どこかしら…'}];
const rect=(p,size,w,h)=>({left:p.x*w-size*w/2,top:p.y*h-size*w,width:size*w,height:size*w});
const overlaps=(a,b)=>a.left<b.left+b.width&&a.left+a.width>b.left&&a.top<b.top+b.height&&a.top+a.height>b.top;

test('story neighbours, random encounter and arrival character have separate space',()=>{
 for(const width of [390,533,680]){
  const height=width*1.5,boxes=targets.map(t=>rect(t.point,t.size,width,height));
  boxes.push(rect(mapStart('market'),.16,width,height));
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.equal(overlaps(boxes[i],boxes[j]),false,`${i}/${j} at ${width}`);
 }
});
test('a crowded story queue keeps every story available without stacking actors',()=>{
 const queue=[resident('bowling'),resident('cat'),resident('grandma')];
 assert.deepEqual(layoutStoryResidents(queue).map(e=>e.id),['bowling','cat']);
 assert.deepEqual(layoutStoryResidents(queue.slice(1)).map(e=>e.id),['cat','grandma']);
 assert.equal(queue[0].point.x,.38,'does not mutate saved/available encounters');
 assert.equal(layoutStoryResidents([{...resident('supply'),merchant:'ramen'},resident('grandma')]).length,1);
});
test('walking to a conversation stops beside the speaker and stays on the ground',()=>{
 for(const [target,point] of [...residents.map(e=>[e,storyApproach(e)]),[targets[2],PLAZA_APPROACH_POINT]]){
  assert.deepEqual(mapGroundPoint('market',point),point);
  for(const person of targets)assert.equal(overlaps(rect(person.point,person.size,533,800),rect(point,.16,533,800)),false,`${target.key} approach overlaps ${person.key}`);
 }
});
test('only one nearby voice wins, with stable selection at the boundary',()=>{
 assert.equal(nearbyConversation(targets,{x:.24,y:.46}),null);
 for(const t of targets)assert.equal(nearbyConversation(targets,t.point),t.key);
 const pair=[{...targets[0],key:'left',point:{x:.4,y:.65}},{...targets[0],key:'right',point:{x:.6,y:.65}}];
 assert.equal(nearbyConversation(pair,{x:.505,y:.65},'left'),'left');
 assert.equal(nearbyConversation(pair,{x:.54,y:.65},'left'),'right');
});
test('hint fits phone widths and never covers a character when approaching or passing behind',()=>{
 let checked=0;
 for(const viewport of [320,390,430]){
  const width=Math.max(viewport,800*2/3),height=width*1.5,left=(width-viewport)/2;
  for(const player of [mapStart('market'),...residents.map(storyApproach),PLAZA_APPROACH_POINT,{x:.72,y:.57},{x:.59,y:.52}]){
   const key=nearbyConversation(targets,player),target=targets.find(t=>t.key===key);
   if(!target)continue;
   const hint=conversationHintLayout(target,targets,player,width,height,left,viewport,186);
   if(!hint)continue; // No free space: stay quiet instead of covering someone.
   checked++;
   assert.ok(hint.left>=left+12&&hint.left+hint.width<=left+viewport-12);
   assert.ok(hint.top>=194);
   for(const t of targets)assert.equal(overlaps(hint,rect(t.point,t.size,width,height)),false);
   assert.equal(overlaps(hint,rect(player,.18,width,height)),false);
  }
 }
 assert.ok(checked>=12,'normal approaches have room for a hint');
});

// Gate hit areas remain accessible without covering any of the story neighbours.
test('spread residents leave every plaza portal touch target clear',async()=>{
 const maps=fs.readFileSync(new URL('../utils/worldMaps.ts',import.meta.url),'utf8');
 const mapUrl='data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(maps)).toString('base64');
 const life=stripTypeScriptTypes(fs.readFileSync(new URL('../utils/villageLife.ts',import.meta.url),'utf8')).replace('"./worldMaps"',JSON.stringify(mapUrl));
 const {mapPortals}=await import('data:text/javascript;base64,'+Buffer.from(life).toString('base64'));
 for(const width of [390,533,680])for(const target of targets)for(const gate of mapPortals('market',true)){
  assert.equal(overlaps(rect(target.point,target.size,width,width*1.5),{left:gate.point.x*width-22,top:gate.point.y*width*1.5-22,width:44,height:44}),false,`${target.key}/${gate.to} at ${width}`);
 }
});
