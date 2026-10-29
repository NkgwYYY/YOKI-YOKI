export const MOON_PHASES={
 'New Moon':'新月','Waxing Crescent':'満ちていく細い月','First Quarter':'上弦の月','Waxing Gibbous':'満月に向かう月',
 'Full Moon':'満月','Waning Gibbous':'欠け始めた月','Last Quarter':'下弦の月','Waning Crescent':'新月に向かう月',
} as const;
export type MoonPhase=keyof typeof MOON_PHASES;
export type DailySky={date:string;phase:MoonPhase;illumination:number;moonrise:string|null;moonset:string|null;source:'USNO';sourceUrl:string;fetchedAt:string;reference:'Tokyo/JST/noon'};
export const skySourceUrl=(date:string)=>`https://aa.usno.navy.mil/api/rstt/oneday?date=${date}&coords=35.6762,139.6503&tz=9`;
export function validSkyDate(date:unknown):date is string{return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date;}
const validTime=(v:unknown)=>v===null||typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export function validDailySky(value:unknown,date:string):value is DailySky{
 const v=value as DailySky|undefined;
 return !!v&&validSkyDate(date)&&v.date===date&&Object.hasOwn(MOON_PHASES,v.phase)&&Number.isFinite(v.illumination)&&v.illumination>=0&&v.illumination<=100&&validTime(v.moonrise)&&validTime(v.moonset)&&v.source==='USNO'&&v.reference==='Tokyo/JST/noon'&&v.sourceUrl===skySourceUrl(date)&&Number.isFinite(Date.parse(v.fetchedAt));
}
/** Accept only the requested date/reference. No guessed phase or illumination on failure. */
export function parseUsnoSky(raw:unknown,date:string,fetchedAt:string):DailySky{
 const body=raw as any,d=body?.properties?.data,coords=body?.geometry?.coordinates;
 if(!d||body.error||d.tz!==9||d.isdst!==false||!Array.isArray(coords)||Math.abs(coords[0]-139.6503)>.0001||Math.abs(coords[1]-35.6762)>.0001||`${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`!==date||typeof d.fracillum!=='string'||!/^\d+(?:\.\d+)?%$/.test(d.fracillum))throw Error('天体データを確認できません');
 const event=(name:string)=>{if(!Array.isArray(d.moondata))throw Error('月の時刻を確認できません');return d.moondata.find((x:any)=>x.phen===name)?.time??null;};
 const sky:DailySky={date,phase:d.curphase,illumination:Number(d.fracillum.slice(0,-1)),moonrise:event('Rise'),moonset:event('Set'),source:'USNO',sourceUrl:skySourceUrl(date),fetchedAt,reference:'Tokyo/JST/noon'};
 if(!validDailySky(sky,date))throw Error('天体データを確認できません');return sky;
}
