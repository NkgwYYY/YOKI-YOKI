import type {PatternId} from './moyamoyaContent.ts';

/** Reviewed 2026-11-07. Prompts are short learning adaptations, never clinical assessment items. */
export const MENTAL_HEALTH_SOURCES = {
  'nhs-worry': {publisher:'NHS',title:'Tackling your worries',url:'https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/tackling-your-worries/',principle:'心配を記録する・考える時間を区切る・今できることと仮定の心配を分ける。'},
  'nhs-problem': {publisher:'NHS',title:'Problem solving',url:'https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/problem-solving/',principle:'一度に一つの問題を選び、実行できる手順・時期・必要な助けを考える。'},
  'nhs-tasks': {publisher:'NHS',title:'Tackling your to-do list',url:'https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/tackling-your-to-do-list/',principle:'小さく着手する・取り組みやすい時間と場所を選ぶ・必要な活動と楽しみのバランスを取る。'},
  'nhs-thoughts': {publisher:'NHS',title:'Reframing unhelpful thoughts',url:'https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/reframing-unhelpful-thoughts/',principle:'考えを事実と決めつけず、根拠や別の見方を確かめる。無理に前向きな考えに変える必要はない。'},
  'nhs-anger': {publisher:'NHS',title:'Anger',url:'https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/anger/',principle:'怒りの早いサインに気づき、反応の前に時間を置く・落ち着く呼吸・相談を試す。'},
  'nhs-repair': {publisher:'NHS・FYI Norfolk',title:'Anger — Take breaks / Reflect & learn',url:'https://www.fyinorfolk.nhs.uk/emotional-mental-health/anger/',principle:'気持ちを認めながら、行動の影響を振り返る。傷つけた場合は謝り、次に気づけるサインを考える。'},
  'ncnp-assertion': {publisher:'国立精神・神経医療研究センター',title:'気持ちを上手に伝えるワークシート',url:'https://cbtmap.ncnp.go.jp/material/worksheet/気持ちを上手に伝えるワークシート/',principle:'相手の状況への配慮、自分の状況の説明、双方を思いやる提案を練習する。'},
  'mhlw-i-message': {publisher:'厚生労働省',title:'話を聞くときのポイント — Iメッセージ',url:'https://www.mhlw.go.jp/kokoro/parent/mental/ftf/ftf_02.html',principle:'「私」を主語にして気持ちを伝え、相手の感じ方も聞く。原資料は家族・教職員向け。'},
  'mhlw-writing': {publisher:'厚生労働省',title:'今の気持ちを書いてみる',url:'https://www.mhlw.go.jp/kokoro/youth/stress/self/self_02.html',principle:'自分の言葉や絵で書き、読み返して考えと距離を取る。人に見せなくてよい。'},
  'mhlw-breathing': {publisher:'厚生労働省',title:'腹式呼吸をくりかえす',url:'https://www.mhlw.go.jp/kokoro/youth/stress/self/self_03.html',principle:'ゆっくり息を吐き、呼吸に注意を戻す。考えが浮かんでも、また数え直す。'},
  'who-grounding': {publisher:'WHO',title:'My Health Booklet Companion — Mental Health and Psychosocial Support（p.20）',url:'https://www.who.int/docs/librariesprovider2/default-document-library/my-health-booklet_en_rom_2025.08.15---digital.pdf?download=true&sfvrsn=eb668a8a_5',principle:'足と地面の感覚、呼吸、周りの物に注意を向ける。考えや感情を、押し消さずに気づく。'},
  'mhf-assertion': {publisher:'Mental Health Foundation',title:'Anger and how to deal with it — Being assertive',url:'https://www.mentalhealth.org.uk/explore-mental-health/publications/cool-down',principle:'ゆっくり明確に話す・自分の気持ちとして伝える・要求や脅しではなく依頼する。'},
} as const;
export type SourceId = keyof typeof MENTAL_HEALTH_SOURCES;
export type BattleChoice = {id:string;title:string;feedback:string;good:boolean};
export type BattleScenario = {
  id:string; pattern:PatternId; title:string; scenes:[string,string];
  sourceIds:SourceId[]; choices:BattleChoice[];
};
export const BATTLE_CONTENT_NOTE = '専門機関の公開資料をもとに、場面と選択肢を学習用に短く編集しています。原文の質問・専門家の監修・診断ではありません。';
export const BATTLE_SCORING_NOTE = 'HPは、この場面で紹介する対処法に沿う選び方のゲーム表現です。気持ちや人柄を採点するものではありません。';
