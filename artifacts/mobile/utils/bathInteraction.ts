export type BathPoint={x:number;y:number};
// Coordinates measured against home-bath-v2.jpg (1024 × 1536).
export const BATH_WATER={x:.51,y:.331,rx:.37,ry:.068};
export const BATH_REST={x:.53,y:.635};
export function isBathDrop(point:BathPoint){
 'worklet';
 return Number.isFinite(point.x)&&Number.isFinite(point.y)&&Math.pow((point.x-BATH_WATER.x)/BATH_WATER.rx,2)+Math.pow((point.y-BATH_WATER.y)/BATH_WATER.ry,2)<=1;
}
export function bathDrop(point:BathPoint){
 'worklet';
 return isBathDrop(point)?{bathing:true,point:{x:Math.max(.29,Math.min(.72,point.x)),y:BATH_WATER.y}}:{bathing:false,point:{...BATH_REST,x:Number.isFinite(point.x)?Math.max(.28,Math.min(.72,point.x)):BATH_REST.x}};
}
