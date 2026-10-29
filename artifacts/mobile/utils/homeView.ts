export const HOME_VIEWS = [
  {id:'overview',label:'お部屋',icon:'layers',description:'少し上から、部屋全体を見る'},
  {id:'close',label:'アップ',icon:'zoom-in',description:'キャラに近づいて見る'},
  {id:'eye',label:'目線',icon:'eye',description:'キャラと同じ高さから見る'},
] as const;
export type HomeView = typeof HOME_VIEWS[number]['id'];
export function readHomeView(value:unknown):HomeView {
  return value==='close'||value==='eye'?value:'overview';
}
export const homeViewKey=(owner:string)=>`@mentore/home-view/v1/${encodeURIComponent(owner)}`;
export type HomeFrame={width:number;height:number;left:number;top:number};
export const HOME_CLOSE_ZOOM=1.85;

/** Fill the viewport with the room; the foreground continues beyond the screen. */
export function fitHomeOverview(width:number,height:number):HomeFrame {
  if(width<=0||height<=0)return {width:0,height:0,left:0,top:0};
  const aspect=width>height?7/4:4/7;
  const w=Math.max(width,height*aspect),h=w/aspect;
  return {width:w,height:h,left:(width-w)/2,top:(height-h)*.40};
}
/** A close view follows the resident while keeping every background edge covered. */
export function closeHomeCamera(frame:HomeFrame,viewport:{width:number;height:number},foot:{x:number;y:number}) {
  'worklet';
  if(frame.width<=0||frame.height<=0)return {zoom:HOME_CLOSE_ZOOM,panX:0,panY:0};
  const z=Math.max(HOME_CLOSE_ZOOM,viewport.width/frame.width,viewport.height/frame.height),wide=viewport.width>viewport.height;
  const focusX=viewport.width*(wide?.30:.5),focusY=viewport.height*(wide?.70:.56);
  const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
  return {zoom:z,
    panX:clamp(focusX-frame.left-frame.width/2-(foot.x-.5)*frame.width*z,
      viewport.width-frame.left-frame.width/2-frame.width*z/2,frame.width*z/2-frame.left-frame.width/2),
    panY:clamp(focusY-frame.top-frame.height/2-(foot.y-.5)*frame.height*z,
      viewport.height-frame.top-frame.height/2-frame.height*z/2,frame.height*z/2-frame.top-frame.height/2)};
}
export function homeResidentSize(frame:HomeFrame,viewportHeight:number,growth:number){
  return Math.min(frame.width*.23,viewportHeight*.18)*Math.max(.9,Math.min(1.12,growth));
}

/** A single writer for the scene transform; changing views must clear old pan/zoom. */
export function homeCamera(mode:HomeView,frame:HomeFrame,viewport:{width:number;height:number},foot:{x:number;y:number},free:{zoom:number;panX:number;panY:number}){
  'worklet';
  if(mode==='eye')return {zoom:1,panX:0,panY:0};
  if(mode==='close')return closeHomeCamera(frame,viewport,foot);
  if(free.zoom>1.02)return free;
  // Short wide screens need clearance immediately, before the follow animation's first frame.
  // Use the held/frozen camera foot so picking up never shifts the room under the finger.
  if(viewport.width>viewport.height)return {...free,panY:Math.max(viewport.height-frame.height-frame.top,
    Math.min(-frame.top,Math.min(0,viewport.height-112-frame.top-foot.y*frame.height)))};
  if(frame.width<=viewport.width)return free;
  const x=frame.left+foot.x*frame.width,margin=Math.min(72,viewport.width*.20);
  const follow=x<margin?margin-x:x>viewport.width-margin?viewport.width-margin-x:0;
  return {...free,panX:free.panX+Math.max(viewport.width-frame.left-frame.width,Math.min(-frame.left,follow))};
}
/** Blank blue wall between the arched window and the bookcase in the room art. */
export function homeWallObjects(width:number,height:number,wide:boolean){
  const w=Math.min(wide?64:80,Math.max(52,Math.min(width*(wide?.075:.11),height*(wide?.115:.14))));
  return {calendar:{left:width*(wide?.33:.23),top:height*(wide?.35:.29),width:w,height:w*1.27}};
}
