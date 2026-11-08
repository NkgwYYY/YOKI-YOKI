/** Shared optional choices for recording, graphs and personal observations. */
export const QUICK_ACTIVITIES = [
  'ご飯をたくさん食べた','友人と会った','恋人と会った',
  '外に出た','趣味を楽しんだ','ゆっくり休んだ',
] as const;
export const ACTIVITY_GROUPS = [
  {id:'food',label:'食事',choices:['ご飯をたくさん食べた','食事を軽めにした','外食した','料理をした','好きなものを食べた','食事を抜いた']},
  {id:'people',label:'人との時間',choices:['恋人と会った','友人と会った','家族と過ごした','人と話した','ひとりで休んだ']},
  {id:'outside',label:'外出・運動',choices:['外に出た','散歩した','運動した','自然を感じた','お風呂で温まった']},
  {id:'rest',label:'休息',choices:['ゆっくり休んだ','昼寝した','早めに寝た','夜更かしした','瞑想した']},
  {id:'enjoy',label:'楽しみ',choices:['趣味を楽しんだ','読書した','好きな音楽を聴いた','ゲームをした','日記を書いた','新しいことに挑戦','人に感謝された','人に親切にした']},
  {id:'daily',label:'仕事・暮らし',choices:['仕事・勉強が忙しかった','予定が多かった','家事をした','片づけをした','買い物に行った']},
] as const;
export const ACTIVITY_LABELS:readonly string[] = [...new Set(ACTIVITY_GROUPS.flatMap<string>(group=>[...group.choices]))];
