import type {FeedState} from '../contexts/AppContext';
import {readBankState} from './villageBank';
/** Zero principal plus a persisted receipt makes retries idempotent. History stays intact. */
export function retireBank(feed:FeedState):FeedState {
  if(!feed.bank||feed.bankRetirement)return feed;
  const bank=readBankState(feed.bank)!;
  if(!Number.isSafeInteger(feed.points)||!Number.isSafeInteger(feed.points+bank.balance))throw Error('ポイントの記録を確認できません');
  return {...feed,points:feed.points+bank.balance,bank:{...bank,balance:0,carry:0,revision:bank.revision+1},
    bankRetirement:{version:1,returned:bank.balance}};
}
