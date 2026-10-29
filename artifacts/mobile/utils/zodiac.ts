// Links are the publisher's public pages, not a licensed content feed.
export const ZODIAC_SIGNS = [
 {id:'ohitsuji',name:'おひつじ座',dates:'3/21–4/19'},
 {id:'oushi',name:'おうし座',dates:'4/20–5/20'},
 {id:'hutago',name:'ふたご座',dates:'5/21–6/21'},
 {id:'kani',name:'かに座',dates:'6/22–7/22'},
 {id:'shishi',name:'しし座',dates:'7/23–8/22'},
 {id:'otome',name:'おとめ座',dates:'8/23–9/22'},
 {id:'tenbin',name:'てんびん座',dates:'9/23–10/23'},
 {id:'sasori',name:'さそり座',dates:'10/24–11/21'},
 {id:'ite',name:'いて座',dates:'11/22–12/21'},
 {id:'yagi',name:'やぎ座',dates:'12/22–1/19'},
 {id:'mizugame',name:'みずがめ座',dates:'1/20–2/18'},
 {id:'uo',name:'うお座',dates:'2/19–3/20'},
] as const;
export const zodiacSign = (value:unknown) => ZODIAC_SIGNS.find(sign=>sign.id===value);
export const zodiacUrl = (value:unknown) => {
 const sign=zodiacSign(value);
 return sign?`https://uranai.nifty.com/f12seiza/${sign.id}/`:null;
};
