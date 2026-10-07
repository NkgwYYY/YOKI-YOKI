/** Local-time presentation only. Never used to calculate rewards or persisted dates. */
export type WorldPeriod = 'morning' | 'day' | 'dusk' | 'night';
export function getWorldTime(now: Date) {
  const hour = now.getHours();
  const period: WorldPeriod = hour >= 5 && hour < 11 ? 'morning' : hour < 17 && hour >= 11 ? 'day' : hour >= 17 && hour < 20 ? 'dusk' : 'night';
  const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const seed = [...dayKey].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0);
  const moments: Record<WorldPeriod, string[]> = {
    morning: ['朝の空気、いいにおい。', '窓のそばに、ひなたを見つけたよ。', '今日は、どんな一日になるかな。'],
    day: ['ここで、少しのんびりしよう。', '風が、葉っぱとお話ししてる。', 'きみといると、ほっとする。'],
    dusk: ['空が、やわらかい色になったね。', '灯りをつけて、待っていたよ。', '今日も会えて、うれしいな。'],
    night: ['小さな灯りを、つけておいたよ。', '星がきれい。一緒に見よう。', 'ここでは、ゆっくりしていってね。'],
  };
  return {
    period, seed, dayKey,
    label: {morning: '朝のひだまり', day: '昼のひと休み', dusk: '夕暮れの灯り', night: '星あかりの夜'}[period],
    moment: moments[period][seed % moments[period].length],
    dateLabel: `${now.getMonth() + 1}月${now.getDate()}日`,
  };
}

