function smooth(value:number) {
 'worklet';
 const t=Math.max(0,Math.min(1,value));
 return t*t*(3-2*t);
}

/** Uses the existing meal clock: the hand and food meet the mouth on each bite. */
export function mealHandSample(progress:number) {
 'worklet';
 const p=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));
 const cycle=Math.max(0,Math.min(2,Math.floor((p-.1)/.21)));
 const local=Math.max(0,Math.min(1,(p-.1-cycle*.21)/.21));
 const biting=p>=.1&&p<.73;
 const approach=biting?(local<.45?smooth((local-.15)/.3):1-smooth((local-.53)/.47)):0;
 const presence=smooth(p/.095)*(1-smooth((p-.76)/.18));
 return {x:.92-.3*approach,y:.83-.15*approach-Math.sin(approach*Math.PI)*.035,presence,approach};
}
