/**
 * 出会い記録(キャラクター図鑑のデータ層)
 *
 * 図鑑は「あなたがこれまでに出会ったキャラクターの記録」。
 * 未登場キャラは一切保存も表示もしない(「？？？」シルエット方式は禁止)。
 */
import { CharacterKey, MascotStage, STAGE_LEVEL_MAP, getCharacter } from '@/utils/mascotUtils';

export interface EncounterRecord {
  /** キャラクターのキー */
  charKey: CharacterKey;
  /** はじめて出会った日 (YYYY-MM-DD) */
  metDate: string;
}

export interface EncountersState {
  list: EncounterRecord[];
}

export function createEncountersState(): EncountersState {
  return { list: [] };
}

const VALID_KEYS = new Set<CharacterKey>(['egg', 'odango', 'happa', 'colorful_happa']);

/** 保存データを安全に読み込む */
export function resolveEncountersState(raw: unknown): EncountersState {
  if (!raw || typeof raw !== 'object') return createEncountersState();
  const r = raw as Partial<EncountersState>;
  if (!Array.isArray(r.list)) return createEncountersState();
  const seen = new Set<string>();
  const list: EncounterRecord[] = [];
  for (const e of r.list) {
    if (!e || typeof e !== 'object') continue;
    const { charKey, metDate } = e as EncounterRecord;
    if (!VALID_KEYS.has(charKey) || typeof metDate !== 'string') continue;
    if (seen.has(charKey)) continue;
    seen.add(charKey);
    list.push({ charKey, metDate });
  }
  return { list };
}

/** レベルからこれまでに出会っているはずのキャラ一覧(進化順) */
export function charsMetByLevel(level: number): CharacterKey[] {
  return STAGE_LEVEL_MAP
    .filter((s) => level >= s.minLevel)
    .map((s) => getCharacter(s.stage).key);
}

/**
 * 現在のレベルに応じて出会い記録を最新化する。
 * 戻り値: { next, newlyMet } — newlyMet は今回新しく出会ったキャラ(演出用)。
 *
 * 演出ルール:
 * - 通常の進化・初登場は1体ずつ増える → missing が1体のときだけ演出する
 * - 複数体まとめて欠けている場合は既存ユーザーの遡り登録(マイグレーション)なので演出なし
 * - 記録が空で、かつアカウントに履歴がある(hasHistory)場合も遡り登録扱いで演出なし
 *   (まっさらな新規ユーザーのたまご初登場だけは演出する)
 */
export function syncEncounters(
  state: EncountersState,
  level: number,
  today: string,
  hasHistory: boolean,
): { next: EncountersState; newlyMet: CharacterKey[] } {
  const met = new Set(state.list.map((e) => e.charKey));
  const should = charsMetByLevel(level);
  const missing = should.filter((k) => !met.has(k));
  if (missing.length === 0) return { next: state, newlyMet: [] };

  const next: EncountersState = {
    list: [...state.list, ...missing.map((charKey) => ({ charKey, metDate: today }))],
  };
  const isBackfill = missing.length > 1 || (state.list.length === 0 && hasHistory);
  return { next, newlyMet: isBackfill ? [] : missing };
}

/** キャラのステージ(表示ラベル用) */
export function stageForChar(charKey: CharacterKey): MascotStage {
  const entry = STAGE_LEVEL_MAP.find((s) => getCharacter(s.stage).key === charKey);
  return entry?.stage ?? 'egg';
}
