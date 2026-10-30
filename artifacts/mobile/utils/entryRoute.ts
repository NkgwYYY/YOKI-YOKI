export type EntryChoice='guest'|'account'|null;
export const ENTRY_CHOICE_KEY='@yoki/entry-choice/v1';
/** Existing local-only users keep their room; signed-out accounts return to the entry. */
export function needsNativeEntry(native:boolean,configured:boolean,signedIn:boolean,hasProfile:boolean,choice:EntryChoice){
 return native&&configured&&!signedIn&&(choice==='account'||(!hasProfile&&choice!=='guest'));
}
