export type StoneReceipt={transactionId:string;productId:string};
/** A cancelled account session or failed durable write must never finish StoreKit. */
export async function deliverStone(receipt:StoneReceipt,current:()=>boolean,credit:(r:StoneReceipt)=>Promise<void>,finish:(id:string)=>Promise<void>){
 if(!current())throw Error('利用者が変わりました。');
 await credit(receipt);
 if(!current())throw Error('購入は保存されました。元の利用者に戻って受け取りを完了してください。');
 await finish(receipt.transactionId);
}
