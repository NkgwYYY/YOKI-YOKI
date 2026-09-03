/**
 * キャラクター図鑑のプロフィールデータ(ユーザー向けの読み物)
 * キャラ本体(見た目・リグ)には一切手を加えず、紹介文だけを持つ。
 */
import { CharacterKey } from '@/utils/mascotUtils';
import type { IconName } from '@/components/ui/Icon';

export interface DexProfile {
  charKey: CharacterKey;
  name: string;
  /** 成長段階のラベル */
  stageLabel: string;
  personality: string;
  likes: string;
  traits: string;
  quote: string;
  story: string;
}

export const DEX_PROFILES: Record<CharacterKey, DexProfile> = {
  egg: {
    charKey: 'egg',
    name: 'タマゴ',
    stageLabel: 'だい1段階',
    personality: 'ねぼすけ。でも君の声はちゃんと聞いてる',
    likes: 'あたたかい場所、ころころ転がること',
    traits: '頭の紫のイナズマは「光の力」が宿っているしるし',
    quote: 'ここから…はじまるよ…',
    story: '星のかけらから生まれたたまご。君が自分を大切にするたび、中で小さな光が育っていく。',
  },
  odango: {
    charKey: 'odango',
    name: 'モフモフ',
    stageLabel: 'だい2段階',
    personality: '甘えんぼうで好奇心いっぱい',
    likes: 'なでなでされること、おだんご、ひなたぼっこ',
    traits: 'ふわふわの毛は光をたっぷり蓄えられる',
    quote: 'きみが元気だと、ぼくもうれしい!',
    story: 'たまごから生まれたばかりのモフモフ。君の毎日の記録が、この子のごはんであり光になる。',
  },
  happa: {
    charKey: 'happa',
    name: 'ハッパ',
    stageLabel: 'だい3段階',
    personality: 'おだやかで、いつもマイペース',
    likes: 'そよ風、水やり、朝の光',
    traits: '頭の葉っぱで光をキャッチして発電するのが得意',
    quote: 'きょうの光、きもちいいね〜',
    story: '光をたくさん浴びて芽が出た成長期。頭の葉っぱは君の積み重ねのぶんだけ、よく光をキャッチする。',
  },
  colorful_happa: {
    charKey: 'colorful_happa',
    name: 'カラフルハッパ',
    stageLabel: 'だい4段階',
    personality: '明るくてちょっぴりおしゃれさん',
    likes: '虹、にぎやかな街、みんなの笑顔',
    traits: '七色の葉っぱは、街をまるごと照らすほどの光を生む',
    quote: 'きみの光で、世界をカラフルにしよう!',
    story: '君とすごした時間が花ひらいた姿。生まれた光は太陽へのぼり、発電所へ、そして街のあかりになる。',
  },
};

/** 「この子たちについて」— 世界観をカードで自然に読める短い説明 */
export const WORLD_CARDS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'heart',    title: '自分を整えると', text: 'お風呂・ごはん・すいみん。君が自分を大切にすると、この子は元気になるよ。' },
  { icon: 'feather',  title: '元気は光になる', text: '元気になったこの子は、からだから小さな光を生み出すんだ。' },
  { icon: 'sun',      title: '光は太陽へ', text: '生まれた光は空にのぼって、太陽をすこしだけ明るくする。' },
  { icon: 'zap',      title: '太陽は街を照らす', text: '太陽の光は発電所に蓄えられて、街のあかりや緑になる。君の毎日が、世界を明るくしてる。' },
];
