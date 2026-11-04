// Approved prototype content; ordinary self-care ideas, not diagnosis.
export const PATTERNS = [
  {
    "id": "loop",
    "label": "同じことをぐるぐる考える",
    "short": "考えがぐるぐる",
    "name": "グルグル雲",
    "color": "#B89BD9",
    "sprite": 0,
    "description": "同じ考えが、頭の中で何度もまわっている。",
    "actions": [
      "separate",
      "prepare",
      "worrytime"
    ]
  },
  {
    "id": "future",
    "label": "先のことが心配",
    "short": "先のことが心配",
    "name": "サキヨミ雲",
    "color": "#9EAFE2",
    "sprite": 1,
    "description": "まだ起きていないことが、次々と気になっている。",
    "actions": [
      "prepare",
      "support",
      "worrytime"
    ]
  },
  {
    "id": "busy",
    "label": "やることが多くて焦る",
    "short": "やることがいっぱい",
    "name": "カカエコミ",
    "color": "#86B7B3",
    "sprite": 2,
    "description": "やることが重なって、どこから始めるか迷っている。",
    "actions": [
      "one",
      "five",
      "postpone"
    ]
  },
  {
    "id": "people",
    "label": "人の言葉や反応が気になる",
    "short": "人の言葉が気になる",
    "name": "ヒソヒソ雲",
    "color": "#D4A3BD",
    "sprite": 3,
    "description": "あの言葉や表情が、心に引っかかっている。",
    "actions": [
      "separate",
      "draft",
      "support"
    ]
  },
  {
    "id": "self",
    "label": "自分を責めてしまう",
    "short": "自分に厳しくなる",
    "name": "チクチク雲",
    "color": "#AAA0BD",
    "sprite": 4,
    "description": "できなかったことばかり、目に入ってしまう。",
    "actions": [
      "friend",
      "did",
      "next"
    ]
  },
  {
    "id": "anger",
    "label": "イライラが残っている",
    "short": "イライラが残る",
    "name": "セカセカ",
    "color": "#D9A28F",
    "sprite": 5,
    "description": "気持ちがざわざわして、落ち着く間がほしくなる。",
    "actions": [
      "pause",
      "name",
      "draft"
    ]
  }
] as const;
export type PatternId = typeof PATTERNS[number]['id'];
export const ACTIONS: Record<string,{title:string;feedback:string}> = {
  "separate": {
    "title": "事実と予想を分ける",
    "feedback": "「わかっている事実」と「まだ確かめていない予想」を1つずつ分けてみよう。"
  },
  "prepare": {
    "title": "今できる準備を1つ決める",
    "feedback": "自分でできる準備を1つだけ。たとえば、最初に伝える一文を決める。"
  },
  "worrytime": {
    "title": "考える時間を決める",
    "feedback": "「夕食後に10分」など、見直す時間を決めて、いったん目の前のことへ。"
  },
  "support": {
    "title": "頼れそうな人を考える",
    "feedback": "安心して話せる人を1人思い浮かべて、何を相談したいか短くまとめよう。"
  },
  "one": {
    "title": "今日やる1つを選ぶ",
    "feedback": "期限と大切さを見て、最初に手をつける1つだけを選ぼう。"
  },
  "five": {
    "title": "最初の5分に分ける",
    "feedback": "「資料の見出しを3つ書く」など、5分で始められる大きさに分けよう。"
  },
  "postpone": {
    "title": "後回しにするものを決める",
    "feedback": "期限や相手への影響を確かめて、今日でなくてもよいものを1つ選ぼう。"
  },
  "draft": {
    "title": "伝えたいことを下書きする",
    "feedback": "すぐに送らず、「困ったこと」と「お願いしたいこと」を下書きしてみよう。"
  },
  "friend": {
    "title": "友達にならかける言葉を書く",
    "feedback": "同じことで悩む友達になら、どう声をかける？その言葉を自分にも。"
  },
  "did": {
    "title": "できていたことも1つ探す",
    "feedback": "結果だけでなく、「確認した」「着手した」など、できたことを1つ探そう。"
  },
  "next": {
    "title": "次に変えられることを1つ選ぶ",
    "feedback": "全部を変えようとせず、自分で変えられる工夫を1つ。周りに助けてもらってもいいよ。"
  },
  "pause": {
    "title": "返事をする前に少し離れる",
    "feedback": "返事の前に水を飲むなど、少し間を置こう。戻ってから伝える言葉を考えても大丈夫。"
  },
  "name": {
    "title": "嫌だったことを1行書く",
    "feedback": "「相談なく予定が変わったのが嫌だった」など、引っかかった部分を短く言葉にしよう。"
  }
};
export const BATTLES: Record<PatternId,{scenes:string[];bad:{id:string;title:string;feedback:string;good:boolean}[]}> = {
  "loop": {
    "scenes": [
      "「また失敗するかも」が、頭の中をぐるぐる。どう向きあう？",
      "考えを少し整理できた。残った心配には、どうする？"
    ],
    "bad": [
      {
        "id": "replay",
        "title": "同じ場面を何度も思い返す",
        "feedback": "考え直すだけでは、新しい情報が増えないことも。事実と予想を分けたり、考える時間を区切ってみよう。",
        "good": false
      },
      {
        "id": "certainty",
        "title": "絶対に大丈夫と思えるまで考える",
        "feedback": "先のことを完全に確かめるのは難しいもの。今できる準備を1つ決めると、次の行動を選びやすくなるよ。",
        "good": false
      }
    ]
  },
  "future": {
    "scenes": [
      "まだ起きていないことが、次々と心配になってきた。",
      "先のことは全部わからない。今の自分にできる一手は？"
    ],
    "bad": [
      {
        "id": "search",
        "title": "不安が消えるまで検索を続ける",
        "feedback": "検索が止まらなくなると、気になることが増える場合も。調べる時間を決めたり、相談先を考えてみよう。",
        "good": false
      },
      {
        "id": "every",
        "title": "起こりうる問題を全部想像する",
        "feedback": "すべての可能性への備えは大変。今できる小さな準備から選んでみよう。",
        "good": false
      }
    ]
  },
  "busy": {
    "scenes": [
      "やることが山積み。何から始めればいいかわからない。",
      "少し見通しがついた。残った荷物をどう扱おう？"
    ],
    "bad": [
      {
        "id": "all",
        "title": "全部を同時に進めようとする",
        "feedback": "同時に抱えると、切り替えだけでも疲れやすいよ。まず1つ、または最初の5分に分けてみよう。",
        "good": false
      },
      {
        "id": "perfect",
        "title": "最初から完璧に仕上げようとする",
        "feedback": "完成形だけを見ると、手が止まることも。最初の小さな作業を決めてみよう。",
        "good": false
      }
    ]
  },
  "people": {
    "scenes": [
      "返事が短かった。「嫌われたのかな」が気になっている。",
      "相手の本音はまだわからない。次はどうしてみる？"
    ],
    "bad": [
      {
        "id": "assume",
        "title": "嫌われたと決めつける",
        "feedback": "短い返事だけでは、相手の気持ちはわからないよ。見えた事実と自分の予想を分けてみよう。",
        "good": false
      },
      {
        "id": "reread",
        "title": "相手の文を何度も読み返す",
        "feedback": "繰り返し読むだけでは、意味がわからないことも。伝えたいことの下書きや、安心できる人への相談を考えてみよう。",
        "good": false
      }
    ]
  },
  "self": {
    "scenes": [
      "ひとつ失敗して、「自分は全部だめ」と感じている。",
      "うまくいかなかったことはある。自分にどう声をかける？"
    ],
    "bad": [
      {
        "id": "blame",
        "title": "自分をもっと厳しく責める",
        "feedback": "責め続けると、次の行動が見えにくくなることも。大切な友達にかける言葉を、自分にも向けてみよう。",
        "good": false
      },
      {
        "id": "ignore",
        "title": "できたことは数に入れない",
        "feedback": "できなかったことだけでは、一日の一部分しか見えないよ。小さくても、できたことを1つ探してみよう。",
        "good": false
      }
    ]
  },
  "anger": {
    "scenes": [
      "急な言い方にイライラ。すぐに返事をしたくなっている。",
      "気持ちはまだざわざわ。相手に伝える前にどうする？"
    ],
    "bad": [
      {
        "id": "reply",
        "title": "勢いのまま、すぐ返事を送る",
        "feedback": "強い気持ちのままだと、伝えたいことからそれる場合も。少し間を置いたり、送らず下書きしてみよう。",
        "good": false
      },
      {
        "id": "repeat",
        "title": "相手の嫌な言葉を何度も思い出す",
        "feedback": "繰り返すほど怒りが強くなることも。何が嫌だったのか、1行にして整理してみよう。",
        "good": false
      }
    ]
  }
};
export const getPattern=(id:unknown)=>PATTERNS.find(p=>p.id===id);
