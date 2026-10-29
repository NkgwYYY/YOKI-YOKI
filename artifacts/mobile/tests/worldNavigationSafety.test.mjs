import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../components/world/WorldHome.tsx',import.meta.url),'utf8');
test('retired travel routes leave HOME intact and the direct menu replaces map navigation',()=>{
 assert.match(source,/if\(target!=='home'\)return;/);
 assert.match(source,/<HomeMenu[^\n]+onShop=[^\n]+onFortune=[^\n]+onBowling=[^\n]+onEgg=/);
 assert.doesNotMatch(source,/<VillageMap\b/);
 assert.doesNotMatch(source,/<WorldGate\b/);
});
test('empty plaza error strings never become raw text children of View',()=>{
 assert.match(source,/map==='market'&&!!plaza\.error&&!plaza\.open/);
});
