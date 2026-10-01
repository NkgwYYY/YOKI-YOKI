import AsyncStorage from '@react-native-async-storage/async-storage';
import { createRecoverableStorage } from './recoverableStorage';

// Intentionally not included in AppContext.KEYS or cloud synchronization.
export const BALANCE_JOURNAL_KEY = '@yoki/balance_journal_v1';
export const balanceStorage = createRecoverableStorage(AsyncStorage, BALANCE_JOURNAL_KEY, [
  '@mentore/light_energy_v1', '@mentore/power_plant_v1', '@mentore/feed_state_v1',
  '@mentore/shop_state_v2',
  '@mentore/mini_game_v1',
  '@mentore/records_v2', '@mentore/progress_v2', '@mentore/badges_v2', '@mentore/checked_state_v2',
  '@mentore/checklist_items_v3',
]);
