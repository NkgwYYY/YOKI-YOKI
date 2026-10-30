import {balanceStorage} from './balanceStorage';
import {createAccountCache} from './accountCache';
import {APP_STORAGE_KEYS} from './appStorageKeys';
export const accountDataStore=createAccountCache(balanceStorage,Object.values(APP_STORAGE_KEYS));
