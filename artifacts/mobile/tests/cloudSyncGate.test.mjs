import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';

const code = ts.transpileModule(fs.readFileSync(new URL('../app/(tabs)/_layout.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
function render({ signedIn = true, profile = { nickname: 'cached' }, ready = false, busy = false, storageError = null, deleted = false } = {}) {
  let retries = 0;
  const hooks = { ...React, useEffect: () => {}, useState: initial => [typeof initial === 'boolean' ? true : initial, () => {}] };
  const exports = {};
  new Function('require', 'exports', code)(name => {
    if (name === 'react') return hooks;
    if (name === 'react-native') return { ActivityIndicator: 'Spinner', Pressable: 'Button', Text: 'Text', View: 'View', Platform: { OS: 'web' }, StyleSheet: { create: value => value } };
    if (name === 'expo-router') return { Redirect: 'Redirect', Tabs: 'Tabs' };
    if (name.endsWith('/AccountDeletionGate')) return { AccountDeletionGate: 'DeletionGate' };
    if (name.endsWith('/theme')) return { homePalette: {} };
    if (name.endsWith('/AppContext')) return { useApp: () => ({ profile, cloudSynced: ready, cloudSyncState: { error: deleted ? 'deleted' : null }, isCloudSyncing: busy, isLoading: false, storageError, retryCloudSync: () => retries++ }) };
    if (name.endsWith('/AuthContext')) return { useAuth: () => ({ isSignedIn: signedIn, isLoading: false }) };
    return {};
  }, exports);
  const tree = exports.default();
  const nodes = [];
  const visit = node => { if (!React.isValidElement(node)) return; nodes.push(node); React.Children.forEach(node.props.children, visit); };
  visit(tree);
  return { tree, nodes, retries: () => retries };
}

test('cached signed-in profiles cannot bypass failed initial synchronization', () => {
  const f = render();
  assert.equal(f.tree.type, 'View'); assert.equal(f.nodes.some(n => n.type === 'Redirect'), false);
  const retry = f.nodes.find(n => n.type === 'Button'); assert.ok(retry); retry.props.onPress(); assert.equal(f.retries(), 1);
});
test('pending initial synchronization has a spinner instead of an active retry', () => {
  const f = render({ busy: true });
  assert.ok(f.nodes.some(n => n.type === 'Spinner')); assert.equal(f.nodes.some(n => n.type === 'Button'), false);
});
test('only confirmed empty cloud data authorizes signed-in onboarding', () => {
  assert.notEqual(render({ profile: null }).tree.type, 'Redirect');
  const f = render({ profile: null, ready: true });
  assert.equal(f.tree.type, 'Redirect'); assert.equal(f.tree.props.href, '/onboarding');
});
test('guest mode and ready accounts retain access to the existing tabs', () => {
  assert.equal(render({ signedIn: false }).tree.type, React.Fragment);
  assert.equal(render({ ready: true }).tree.type, React.Fragment);
});


test('deleted accounts get completion retry before onboarding or storage recovery', () => {
  assert.equal(render({ deleted: true, profile: null, storageError: 'disk unavailable' }).tree.type, 'DeletionGate');
});
