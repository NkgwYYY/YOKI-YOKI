import {requireOptionalNativeModule} from 'expo';
import type {CostumeSnapshot} from './costumePurchases';
export type CostumeProduct={id:string;price:string};
export const roomStore=requireOptionalNativeModule<{
 catalog():Promise<CostumeProduct[]>;
 purchase(id:string):Promise<{status:'purchased'|'cancelled'|'pending'}>;
 snapshot():Promise<CostumeSnapshot>;
 sync():Promise<void>;
 finish(id:string):Promise<void>;
 addListener(event:'transactionsChanged',callback:()=>void):{remove():void};
}>('YokiRoomProducts');
