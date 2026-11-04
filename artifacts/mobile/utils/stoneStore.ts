import {requireOptionalNativeModule} from 'expo';
import type {StoneReceipt} from './stoneDelivery';
export type StoneProduct={id:string;price:string};
export const stoneStore=requireOptionalNativeModule<{
 catalog():Promise<StoneProduct[]>;
 purchase(id:string,owner:string):Promise<{status:'cancelled'|'pending'|'purchased'}&Partial<StoneReceipt>>;
 unfinished(owner:string):Promise<StoneReceipt[]>;
 finish(id:string,owner:string):Promise<void>;
 addListener(event:'transactionsChanged',callback:()=>void):{remove():void};
}>('YokiStones');
