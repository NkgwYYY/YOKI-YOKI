/** Display names only. Profiles continue storing their original four-letter codes. */
export const MBTI_NAMES: Record<string,string> = {
 INTJ:'建築家',INTP:'論理学者',ENTJ:'指揮官',ENTP:'討論者',
 INFJ:'提唱者',INFP:'仲介者',ENFJ:'主人公',ENFP:'運動家',
 ISTJ:'管理者',ISFJ:'擁護者',ESTJ:'幹部',ESFJ:'領事',
 ISTP:'巨匠',ISFP:'冒険家',ESTP:'起業家',ESFP:'エンターテイナー',
};
export function formatMbti(value?:string){
 const code=value?.trim().toUpperCase().replace(/-[AT]$/,'')??'';
 return Object.prototype.hasOwnProperty.call(MBTI_NAMES,code)?`${code}（${MBTI_NAMES[code]}）`:'未設定';
}
