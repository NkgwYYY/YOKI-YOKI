import type { FeedState } from "../contexts/AppContext";
import type { StorageEntry } from "./recoverableStorage";

export const BOWLING_KEY = "@yoki/bowling_v1";
const FEED_KEY = "@mentore/feed_state_v1";
export const POINTS_PER_PIN = 5;
export const BOWLING_DURATION = 3200;
export type WorldBowlingInput = { x:number; y:number; vx:number; vy:number; aspect:number; radius:number; layout?:'garden'|'garden-long' };
export type BowlingMissionId = 'strike' | 'split' | 'spare';
export type BowlingInput = { aim: number; power: number; world?: WorldBowlingInput; rulesVersion?: 2 | 3 | 4; curve?: number; mission?: BowlingMissionId };
export type PinPose = { x: number; y: number; rotation: number; down: boolean; hidden?: boolean };
export type BowlingFrame = { x: number; y: number; pins: PinPose[] };
export type BowlingResult = {
  frames: BowlingFrame[];
  pins: number;
  earned: number;
  missionComplete?: boolean;
};
export type BowlingReceipt = BowlingInput & {
  id: string;
  date: string;
  pins: number;
  earned: number;
  missionComplete?: boolean;
};
export type BowlingState = { plays: Record<string, BowlingReceipt> };
export const EMPTY_BOWLING: BowlingState = { plays: {} };

export const BOWLING_MISSIONS = {
  strike: { name: 'ストライクの日', goal: '10本ぜんぶ倒そう', pins: 10, bonus: 20 },
  split: { name: 'スプリットの日', goal: '離れた2本をまとめて倒そう', pins: 2, bonus: 30 },
  spare: { name: 'スペアの日', goal: '残り3本をぜんぶ倒そう', pins: 3, bonus: 15 },
} as const;
/** Use the local calendar date, not reloads or random draws, to choose the rack. */
export function dailyBowlingMission(date: string): BowlingMissionId {
  const [year, month, day] = date.split('-').map(Number);
  const serial = Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  return (['strike', 'split', 'spare'] as const)[((serial % 3) + 3) % 3];
}
export function missionPinPositions(mission: BowlingMissionId, giant = false): PinPose[] {
  const rack = Array.from({length:4},(_,row)=>Array.from({length:row+1},(_,col)=>({
    x:(giant?.54:.557)+(col-row/2)*(giant?.106:.044), y:(giant?.55:.386)-row*(giant?.052:.022), rotation:0, down:false,
  }))).flat();
  if(mission==='strike')return rack;
  // A small split can be converted by driving one pin across into the other.
  const target = mission==='split'
    ? (giant?[{x:.465,y:.515},{x:.615,y:.515}]:[{x:.525,y:.382},{x:.588,y:.36}])
    : (giant?[{x:.54,y:.55},{x:.487,y:.485},{x:.593,y:.485}]:[{x:.537,y:.382},{x:.581,y:.382},{x:.559,y:.356}]);
  return rack.map((pin,i)=>({...pin,...target[i],hidden:i>=target.length}));
}
export function bowlingReward(pins:number, mission?:BowlingMissionId) {
  const missionComplete=!!mission&&pins===BOWLING_MISSIONS[mission].pins;
  return {earned:pins*POINTS_PER_PIN+(missionComplete?BOWLING_MISSIONS[mission!].bonus:0),missionComplete};
}

export function validateBowlingInput(input: BowlingInput) {
  if(input?.rulesVersion!==undefined&&(![2,3,4].includes(input.rulesVersion)||!input.mission||!Object.prototype.hasOwnProperty.call(BOWLING_MISSIONS,input.mission)||(input.rulesVersion!==4&&input.world?.layout!=='garden-long')))throw new Error('今日のミッションを確認できません');
  if(input?.mission!==undefined&&input.rulesVersion!==2&&input.rulesVersion!==3&&input.rulesVersion!==4)throw new Error('今日のミッションを確認できません');
  if (
    !input ||
    !Number.isFinite(input.aim) ||
    input.aim < -1 ||
    input.aim > 1 ||
    !Number.isFinite(input.power) ||
    input.power < 0.15 ||
    input.power > 1
  )
    throw new Error("投げ方を確認できません");
  if(input.rulesVersion===4&&(input.world!==undefined||!Number.isFinite(input.curve??0)||Math.abs(input.curve??0)>1))throw new Error('投げ方を確認できません');
  if(input.world){
    const p=input.world;
    if(![p.x,p.y,p.vx,p.vy,p.aspect,p.radius].every(Number.isFinite)||p.x<.22||p.x>.78||p.y<.305||p.y>.8||Math.abs(p.vx)>1.25||Math.abs(p.vy)>1.25||p.aspect<1||p.aspect>2||p.radius<.025||p.radius>.09||(p.layout!==undefined&&p.layout!=='garden'&&p.layout!=='garden-long'))throw new Error("投げ方を確認できません");
    if(p.layout==='garden-long'&&!canStartWorldBowling(p))throw new Error("スタートラインの後ろから投げてね");
  }
}
/** Walking or carrying the character to the pins must not shorten the daily throw. */
export function canStartWorldBowling(p:Pick<WorldBowlingInput,'x'|'y'>){
  return p.x>=.34&&p.x<=.64&&p.y>=.685&&p.y<=.75;
}
/** The same ground motion drives home flicks and the bowling character. */
export function groundRollStep(state:{x:number;y:number;vx:number;vy:number},dt:number,aspect:number,b:{minX:number;maxX:number;minY:number;maxY:number}) {
  'worklet';
  const delta=Math.min(1/30,Math.max(0,dt)),drag=Math.exp(-1.35*delta);
  let vx=state.vx*drag,vy=state.vy*drag,x=state.x+vx*delta,y=state.y+vy*delta/aspect,hit=false;
  const margin=.018;
  if(y<b.minY+margin){y=b.minY+margin;vy=Math.abs(vy)*.58;hit=true;}
  else if(y>b.maxY-margin){y=b.maxY-margin;vy=-Math.abs(vy)*.58;hit=true;}
  if(x<b.minX+margin){x=b.minX+margin;vx=Math.abs(vx)*.58;hit=true;}
  else if(x>b.maxX-margin){x=b.maxX-margin;vx=-Math.abs(vx)*.58;hit=true;}
  return {x,y,vx,vy,hit};
}
export function worldPinPositions(layout:'garden'|'classic'='garden'):PinPose[]{
  if(layout==='garden')return Array.from({length:4},(_,row)=>Array.from({length:row+1},(_,col)=>({x:.552+row*.007+(col-row/2)*.026,y:.358-row*.012,rotation:0,down:false}))).flat();
  return Array.from({length:4},(_,row)=>Array.from({length:row+1},(_,col)=>({x:.5+(col-row/2)*.045,y:.535-row*.026,rotation:0,down:false}))).flat();
}
/** Normal scene coordinates. Pin contact, scatter and reward share one trajectory. */
function simulateWorldBowling(input:WorldBowlingInput,mission?:BowlingMissionId,giant=false):BowlingResult {
  const longLane=input.layout==='garden-long';
  const garden=input.layout==='garden'||longLane;
  const pinRadius=giant?.049:mission?.020:garden?.013:.021;
  const pins=(mission?missionPinPositions(mission,giant):worldPinPositions(garden?'garden':'classic')).map(p=>({...p,vx:0,vy:0}));
  let ball={...input,hit:false};
  if(mission&&input.vy<-.35){
    // Keep deliberate direction errors, but help a modest forward swipe reach the rack.
    const vy=Math.min(-1.08,input.vy), vx=input.vx*vy/input.vy;
    const target=giant?(mission==='split'?{x:.54,y:.515}:{x:.54,y:.55}):mission==='split'?{x:.525,y:.382}:{x:.557,y:.386};
    const ideal=(target.x-input.x)/((input.y-target.y)*input.aspect)*-vy;
    ball={...ball,vy,vx:Math.abs(vx-ideal)<(giant?.48:.25)?vx*(giant?.25:.4)+ideal*(giant?.75:.6):vx};
  }
  let gutter=false;
  const frames:BowlingFrame[]=[];
  const collide=(a:{x:number;y:number;vx:number;vy:number},b:typeof pins[number],radius:number,mass:number)=>{
    const dx=b.x-a.x,dy=(b.y-a.y)*input.aspect,d=Math.hypot(dx,dy),contact=radius+pinRadius;
    if(b.hidden||d>=contact||d<.00001)return;
    const nx=dx/d,ny=dy/d,speed=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
    if(speed<=0)return;
    const impulse=1.55*speed/(1/mass+1);
    a.vx-=impulse*nx/mass;a.vy-=impulse*ny/mass;b.vx+=impulse*nx;b.vy+=impulse*ny;
    b.x+=nx*(contact-d)*.55;b.y+=ny*(contact-d)*.55/input.aspect;
    if(Math.hypot(b.vx,b.vy)>.07)b.down=true;
  };
  for(let i=0;i<=300;i++){
    frames.push({x:ball.x,y:ball.y,pins:pins.map(({x,y,rotation,down,hidden})=>({x,y,rotation,down,...(hidden!==undefined?{hidden}:{})}))});
    ball={...ball,...groundRollStep(ball,1/60,input.aspect,longLane?{minX:.28,maxX:.74,minY:.305,maxY:.77}:garden?{minX:.42,maxX:.66,minY:.305,maxY:.79}:{minX:.22,maxX:.78,minY:.43,maxY:.8})};
    if(longLane&&ball.y<.665){
      const depth=.66-ball.y;
      const grace=mission?.025:0;
      if(ball.y>(giant?.59:mission?.405:0)&&(ball.x<.325+depth*.64+.008-grace||ball.x>.594+depth*.17-.008+grace))gutter=true;
    }else if(garden&&!longLane&&ball.y<.445){
      const depth=.447-ball.y;
      if(ball.x<.423+depth*.64+.008||ball.x>.622+depth*.18-.008)gutter=true;
    }
    if(!gutter)for(const pin of pins)collide(ball,pin,input.radius,4.6);
    for(let a=0;a<10;a++)for(let b=a+1;b<10;b++){if(pins[a].hidden||pins[b].hidden)continue;collide(pins[a],pins[b],pinRadius,1);if(Math.hypot(pins[a].vx,pins[a].vy)>.07)pins[a].down=true;}
    for(const pin of pins){
      pin.x=Math.max(.24,Math.min(.76,pin.x+pin.vx/60));pin.y=Math.max(garden?.31:.438,Math.min(.79,pin.y+pin.vy/60/input.aspect));
      pin.vx*=.95;pin.vy*=.95;if(pin.down)pin.rotation=Math.min(84,pin.rotation+6);
    }
  }
  const count=pins.filter(p=>!p.hidden&&p.down).length;
  return {frames,pins:count,...bowlingReward(count,mission)};
}
export function pinPositions() {
  return Array.from({ length: 4 }, (_, row) =>
    Array.from({ length: row + 1 }, (_, col) => ({
      x: (col - row / 2) * 0.32,
      y: 8 + row * 0.29,
    })),
  ).flat();
}
/** Fixed-step collisions determine both the visible pin fall and the saved reward. */
export function simulateBowling(input: BowlingInput): BowlingResult {
  validateBowlingInput(input);
  if(input.rulesVersion===4)return simulateLaneBowling(input);
  if(input.world)return simulateWorldBowling(input.world,input.rulesVersion?input.mission:undefined,input.rulesVersion===3);
  const ball = {
    x: 0,
    y: 0.1,
    vx: input.aim * 1.15,
    vy: 4.4 + input.power * 3.3,
    radius: 0.195,
    mass: 4.6,
  };
  const pins = pinPositions().map((p) => ({
    ...p,
    vx: 0,
    vy: 0,
    radius: 0.115,
    mass: 1,
    down: false,
    rotation: 0,
  }));
  const frames: BowlingFrame[] = [];
  let gutter = false;
  const step = 1 / 60;
  const collide = (a: typeof ball, b: typeof ball) => {
    const dx = b.x - a.x,
      dy = b.y - a.y,
      distance = Math.hypot(dx, dy),
      contact = a.radius + b.radius;
    if (distance >= contact || distance < 0.0001) return;
    const nx = dx / distance,
      ny = dy / distance;
    const speed = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (speed <= 0) return;
    const impulse = (1.7 * speed) / (1 / a.mass + 1 / b.mass);
    a.vx -= (impulse * nx) / a.mass;
    a.vy -= (impulse * ny) / a.mass;
    b.vx += (impulse * nx) / b.mass;
    b.vy += (impulse * ny) / b.mass;
    b.x += nx * (contact - distance) * 0.52;
    b.y += ny * (contact - distance) * 0.52;
  };
  for (let frame = 0; frame <= 192; frame++) {
    frames.push({
      x: ball.x,
      y: ball.y,
      pins: pins.map((p) => ({
        x: p.x,
        y: p.y,
        rotation: p.rotation,
        down: p.down,
      })),
    });
    ball.x += ball.vx * step;
    ball.y += ball.vy * step;
    if (Math.abs(ball.x) > 1.02) {
      gutter = true;
      ball.x = Math.sign(ball.x) * 1.07;
      ball.vx = 0;
    }
    if (!gutter) for (const pin of pins) collide(ball, pin);
    for (let i = 0; i < pins.length; i++)
      for (let j = i + 1; j < pins.length; j++) collide(pins[i], pins[j]);
    for (const pin of pins) {
      if (Math.hypot(pin.vx, pin.vy) > 0.38) pin.down = true;
      pin.x += pin.vx * step;
      pin.y += pin.vy * step;
      pin.vx *= 0.966;
      pin.vy *= 0.966;
      if (pin.down) pin.rotation = Math.min(86, pin.rotation + 7);
    }
  }
  const count = pins.filter((p) => p.down).length;
  return { frames, pins: count, earned: count * POINTS_PER_PIN };
}
export function readBowlingState(raw: unknown): BowlingState {
  if (raw == null) return { plays: {} };
  if (
    typeof raw !== "object" ||
    Array.isArray(raw) ||
    !("plays" in raw) ||
    !raw.plays ||
    typeof raw.plays !== "object" ||
    Array.isArray(raw.plays)
  )
    throw new Error("ボウリングの記録を確認できません");
  const plays = raw.plays as Record<string, BowlingReceipt>;
  for (const [date, receipt] of Object.entries(plays)) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !receipt ||
      receipt.date !== date ||
      typeof receipt.id !== "string" ||
      !receipt.id ||
      !Number.isInteger(receipt.pins) ||
      receipt.pins < 0 ||
      receipt.pins > 10 ||
      receipt.earned !== bowlingReward(receipt.pins,receipt.rulesVersion?receipt.mission:undefined).earned ||
      (receipt.rulesVersion && (receipt.mission!==dailyBowlingMission(date)||receipt.pins>BOWLING_MISSIONS[receipt.mission!]?.pins||receipt.missionComplete!==bowlingReward(receipt.pins,receipt.mission).missionComplete))
    )
      throw new Error("ボウリングの記録を確認できません");
    validateBowlingInput(receipt);
  }
  return { plays };
}
export function bowlingPlayedToday(state: BowlingState, today: string) {
  return Object.keys(state.plays).some((date) => date >= today);
}
/** Consume the daily throw and credit its result in one journalled, retryable write. */
export function prepareBowlingPlay(
  values: Record<string, string | null>,
  id: string,
  input: BowlingInput,
  today: string,
  defaultFeed: FeedState,
) {
  validateBowlingInput(input);
  if (!id || id.length > 120 || !/^\d{4}-\d{2}-\d{2}$/.test(today))
    throw new Error("今日の挑戦を確認できません");
  const state = readBowlingState(
    values[BOWLING_KEY] ? JSON.parse(values[BOWLING_KEY]!) : null,
  );
  const feed: FeedState = values[FEED_KEY]
    ? JSON.parse(values[FEED_KEY]!)
    : defaultFeed;
  if (!feed || !Number.isFinite(feed.points) || feed.points < 0)
    throw new Error("ポイントを確認できません");
  const duplicate = Object.values(state.plays).find((play) => play.id === id);
  const previous = Object.entries(state.plays)
    .sort(([a], [b]) => b.localeCompare(a))
    .find(([date]) => date >= today)?.[1];
  if (duplicate || previous)
    return {
      entries: [] as StorageEntry[],
      result: {
        state,
        feed,
        receipt: duplicate || previous!,
        newlyGranted: false,
        accepted: !!duplicate,
      },
    };
  // The saved date chooses the mission; callers cannot select a more rewarding rack.
  const acceptedInput:BowlingInput=input.rulesVersion===4?{...input,mission:dailyBowlingMission(today)}:input.world?.layout==='garden-long'
    ? {...input,rulesVersion:input.rulesVersion===3?3:2,mission:dailyBowlingMission(today)} : input;
  const result = simulateBowling(acceptedInput);
  const receipt: BowlingReceipt = {
    ...acceptedInput,
    id,
    date: today,
    pins: result.pins,
    earned: result.earned,
    ...(acceptedInput.rulesVersion?{missionComplete:result.missionComplete}:{}),
  };
  const next = {
    plays: Object.fromEntries(
      [...Object.entries(state.plays), [today, receipt]]
        .sort(([a], [b]) => String(a).localeCompare(String(b)))
        .slice(-32),
    ),
  };
  const nextFeed = { ...feed, points: feed.points + result.earned };
  return {
    entries: [
      [BOWLING_KEY, JSON.stringify(next)],
      [FEED_KEY, JSON.stringify(nextFeed)],
    ] as StorageEntry[],
    result: {
      state: next,
      feed: nextFeed,
      receipt,
      newlyGranted: true,
      accepted: true,
    },
  };
}


/** Version 4 uses a physical lane, independent of device shape and world walking.
 * No target attraction: direction, release speed, hook and collisions own the result.
 * Earlier rule versions stay unchanged so saved receipts replay identically. */
export function lanePinPositions(mission:BowlingMissionId):PinPose[]{
  const rack=Array.from({length:4},(_,row)=>Array.from({length:row+1},(_,col)=>({
    x:(col-row/2)*.43,y:9.6+row*.38,rotation:0,down:false,
  }))).flat();
  const targets=mission==='split'?[{x:-.32,y:10},{x:.32,y:10.35}]:[{x:0,y:9.6},{x:-.43,y:10.36},{x:.43,y:10.36}];
  return mission==='strike'?rack:rack.map((p,i)=>({...p,...targets[i],hidden:i>=targets.length}));
}
/** Project a long, wide lane into the available scene. All art shares this transform. */
export function projectLane(x:number,y:number){
  'worklet';
  const depth=Math.max(0,Math.min(1,y/12));
  const scale=1/(1+depth*1.55);
  return {x:.5+x*.385*scale,y:.95-(1-scale)/(.608)*.63,scale};
}
function simulateLaneBowling(input:BowlingInput):BowlingResult{
  const pins=lanePinPositions(input.mission!).map(p=>({...p,vx:0,vy:0}));
  const ball={x:0,y:0,vx:input.aim*1.13,vy:1.6+input.power*8.2};
  const frames:BowlingFrame[]=[];
  const dt=1/120,ballRadius=.18,pinRadius=.115;
  let gutter=false;
  const collide=(a:typeof ball,b:typeof pins[number],radius:number,mass:number)=>{
    if(b.hidden)return;
    const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),contact=radius+pinRadius;
    if(d>=contact||d<.000001)return;
    const nx=dx/d,ny=dy/d,speed=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
    if(speed<=0)return;
    const impulse=1.72*speed/(1/mass+1);
    a.vx-=impulse*nx/mass;a.vy-=impulse*ny/mass;b.vx+=impulse*nx;b.vy+=impulse*ny;
    b.x+=nx*(contact-d)*.65;b.y+=ny*(contact-d)*.65;
    if(Math.hypot(b.vx,b.vy)>.48)b.down=true;
  };
  for(let tick=0;tick<=600;tick++){
    if(tick%2===0)frames.push({x:ball.x,y:ball.y,pins:pins.map(({vx,vy,...pin})=>({...pin}))});
    if(!gutter&&ball.y>4&&ball.y<10)ball.vx+=(input.curve??0)*.65*dt;
    const drag=Math.exp(-.22*dt);ball.vx*=drag;ball.vy=Math.max(0,ball.vy-.72*dt);
    ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
    if(Math.abs(ball.x)>1){gutter=true;ball.x=Math.sign(ball.x)*1.095;ball.vx=0;}
    if(!gutter)for(const pin of pins)collide(ball,pin,ballRadius,3);
    for(let i=0;i<pins.length;i++)for(let j=i+1;j<pins.length;j++)if(!pins[i].hidden)collide(pins[i],pins[j],pinRadius,1);
    for(const p of pins){
      if(Math.hypot(p.vx,p.vy)>.48)p.down=true;
      p.x=Math.max(-1.45,Math.min(1.45,p.x+p.vx*dt));p.y=Math.max(8.4,Math.min(12.4,p.y+p.vy*dt));
      p.vx*=Math.exp(-2.3*dt);p.vy*=Math.exp(-2.3*dt);
      if(p.down)p.rotation=Math.min(86,p.rotation+230*dt);
    }
  }
  const count=pins.filter(p=>!p.hidden&&p.down).length;
  return {frames,pins:count,...bowlingReward(count,input.mission)};
}
