import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeStoredMessage } from '../utils/chatHistory.ts';

const base = { id: 'u_1790985600000', role: 'user', content: '昔の記録' };
test('legacy numeric and offset timestamps become sortable ISO strings', () => {
  const numeric = normalizeStoredMessage({ ...base, timestamp: 1790985600000 });
  const offset = normalizeStoredMessage({ ...base, timestamp: '2026-10-03T09:00:00+09:00' });
  assert.equal(typeof numeric.timestamp, 'string');
  assert.equal(offset.timestamp, '2026-10-03T00:00:00.000Z');
  assert.doesNotThrow(() => [numeric, offset].sort((a,b) => a.timestamp.localeCompare(b.timestamp)));
});
test('invalid timestamp falls back to the legacy message ID date', () => {
  for (const timestamp of [{}, [], 'bad date', null]) {
    assert.equal(normalizeStoredMessage({ ...base, timestamp }).timestamp, new Date(1790985600000).toISOString());
  }
});
test('valid local date stays unchanged; invalid calendar dates are repaired', () => {
  assert.equal(normalizeStoredMessage({ ...base, dateKey: '2026-10-02' }).dateKey, '2026-10-02');
  for (const dateKey of ['2026-02-30', 'bad', {}, '2026-99-99']) {
    const result = normalizeStoredMessage({ ...base, dateKey });
    assert.match(result.dateKey, /^\d{4}-\d{2}-\d{2}$/);
    assert.notEqual(result.dateKey, dateKey);
  }
});
test('invalid messages and citation fields cannot reach rendering', () => {
  assert.equal(normalizeStoredMessage({ ...base, content: {} }), null);
  assert.equal(normalizeStoredMessage(null), null);
  assert.deepEqual(normalizeStoredMessage({ ...base, citations: [null, { title: {}, url: 'https://www.mhlw.go.jp/' }, { title: 'unsafe', url: 'javascript:alert(1)' }] }).citations, []);
});
