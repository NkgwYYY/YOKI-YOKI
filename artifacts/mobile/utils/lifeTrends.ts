/** Each calendar day's latest self-reported answers. Missing is never zero. */
export type LifeRecord = {
 sleep?:number;sleepRecorded?:boolean;dayType?:string;behaviors?:readonly string[];behaviorsRecorded?:boolean;
 exercise?:number;meal?:number;social?:number;moyamoya?:{has:boolean;pattern?:string;memo?:string};
 notes?:string;win?:string;
};
export const DAY_TYPES=[{id:'work',label:'仕事・学校'},{id:'rest',label:'お休み'},{id:'other',label:'その他'}] as const;
export const CORE_BEHAVIORS=['外に出た','運動した','人と話した','ひとりで休んだ','趣味を楽しんだ','ゆっくり休んだ'] as const;
export const LIFE_METRICS={
 sleep:{title:'昨夜の睡眠',max:12,min:0,ink:'#487A70',tint:'#EDF5EF',labels:[] as string[]},
 moyamoya:{title:'モヤモヤ',max:1,min:0,ink:'#9B637E',tint:'#FBEEF4',labels:['ない','ある']},
 exercise:{title:'運動の量',max:3,min:1,ink:'#598475',tint:'#EFF6F0',labels:['','なし','軽め','しっかり']},
 meal:{title:'食事',max:3,min:1,ink:'#9B7145',tint:'#FCF3E7',labels:['','乱れた','ふつう','整ってた']},
 social:{title:'人間関係',max:3,min:1,ink:'#8970A1',tint:'#F3EEF8',labels:['','しんどい','ふつう','温かい']},
} as const;
export type LifeMetric=keyof typeof LIFE_METRICS;
export function lifeValue(record:LifeRecord|undefined,key:LifeMetric):number|null {
 if(!record)return null;
 if(key==='moyamoya')return typeof record.moyamoya?.has==='boolean'?(record.moyamoya.has?1:0):null;
 if(key==='sleep')return record.sleepRecorded!==false&&typeof record.sleep==='number'&&Number.isFinite(record.sleep)&&record.sleep>=0&&record.sleep<=12?record.sleep:null;
 const value=record[key];return typeof value==='number'&&Number.isInteger(value)&&value>=1&&value<=3?value:null;
}
export function lifeLabel(record:LifeRecord|undefined,key:LifeMetric):string {
 const value=lifeValue(record,key);return value===null?'未記録':key==='sleep'?value+'時間':LIFE_METRICS[key].labels[value];
}
export function activityValue(record:LifeRecord|undefined,label:string):boolean|null {
 if(!record||record.behaviorsRecorded===false||!Array.isArray(record.behaviors))return null;
 if(record.behaviorsRecorded!==true&&!record.behaviors.some(v=>typeof v==='string'&&v.trim()))return null;
 return record.behaviors.includes(label);
}
export function dayTypeValue(record:LifeRecord|undefined,id:string):boolean|null {
 return DAY_TYPES.some(d=>d.id===record?.dayType)?record!.dayType===id:null;
}
export function lifeSummary(record:LifeRecord|undefined):string[] {
 if(!record)return [];
 const values=(Object.keys(LIFE_METRICS) as LifeMetric[]).map(key=>LIFE_METRICS[key].title+'：'+lifeLabel(record,key));
 values.push('生活：'+(DAY_TYPES.find(d=>d.id===record.dayType)?.label??'未記録'));
 values.push('過ごし方：'+(record.behaviorsRecorded===false?'未記録':record.behaviors?.length?record.behaviors.join('・'):record.behaviorsRecorded===true?'当てはまるものはない':'未記録'));
 return values;
}
