import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOCAL_DATA_OWNER_KEY } from './accountOwnership';
import { createPrivateCacheStore } from './privateCache';

// AppProvider recovers the managed owner journal before opening a private scope.
// Deletion deliberately uses raw storage: a corrupt balance journal must not
// prevent the user from deleting the account and discarding that journal.
export const privateCacheStorage = createPrivateCacheStore(AsyncStorage, LOCAL_DATA_OWNER_KEY);
