import AsyncStorage from '@react-native-async-storage/async-storage';
import { createRecoverableStorage } from './recoverableStorage';
import { APP_STORAGE_KEYS } from './appStorageKeys';
import { LOCAL_DATA_OWNER_KEY } from './accountOwnership';

// Intentionally not included in AppContext.KEYS or cloud synchronization.
export const BALANCE_JOURNAL_KEY = '@yoki/balance_journal_v1';
// Cloud hydration uses the same queue/journal as balance updates. A failed
// multi-key write is recovered as one snapshot before subsequent reads or edits.
export const balanceStorage = createRecoverableStorage(
  AsyncStorage, BALANCE_JOURNAL_KEY, [...Object.values(APP_STORAGE_KEYS), LOCAL_DATA_OWNER_KEY],
);
