import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../components/ui/PressScale.tsx', import.meta.url), 'utf8');

// Component-contract tests only: these do not simulate UIKit hit testing.
function renderPressScale(platform, props) {
  let springs = 0;
  const pressable = 'Pressable';
  const animatedPressable = 'AnimatedPressable';
  const react = {
    createElement: (type, attributes, ...children) => ({ type, props: { ...attributes, children } }),
    useRef: (current) => ({ current }),
    useCallback: (callback) => callback,
    useEffect: () => {},
  };
  const imports = {
    react: { ...react, default: react },
    'react-native': {
      Platform: { OS: platform },
      Pressable: pressable,
      Animated: {
        Value: class { constructor(value) { this.value = value; } },
        createAnimatedComponent: () => animatedPressable,
        spring: () => { springs++; return { start() {} }; },
      },
    },
    '@/constants/theme': { control: { pressScale: 0.97 } },
    '@/utils/useReducedMotion': { useReducedMotion: () => false },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (name) => {
      assert.ok(imports[name], `Unexpected import: ${name}`);
      return imports[name];
    },
  });
  return { element: module.exports.PressScale(props), springCount: () => springs };
}

test('iOS uses a stable standard press target and dispatches its action', () => {
  let presses = 0;
  const style = { width: 96, height: 96 };
  const { element, springCount } = renderPressScale('ios', {
    onPress: () => presses++,
    style,
    testID: 'home-record',
    accessibilityLabel: '記録',
  });
  assert.equal(element.type, 'Pressable');
  assert.equal(element.props.style, style);
  assert.equal(element.props.onPressIn, undefined);
  assert.equal(element.props.onPressOut, undefined);
  assert.equal(element.props.testID, 'home-record');
  assert.equal(element.props.accessibilityLabel, '記録');
  element.props.onPress();
  assert.equal(presses, 1);
  assert.equal(springCount(), 0);
});

test('iOS retains disabled, long press, and accessibility contracts', () => {
  const onLongPress = () => {};
  const { element } = renderPressScale('ios', {
    disabled: true, onLongPress, delayLongPress: 600, hitSlop: 12,
  });
  assert.equal(element.props.disabled, true);
  assert.equal(element.props.accessibilityState.disabled, true);
  assert.equal(element.props.onLongPress, onLongPress);
  assert.equal(element.props.delayLongPress, 600);
  assert.equal(element.props.hitSlop, 12);
});

for (const platform of ['ios', 'android', 'web']) {
  test(`${platform} preserves disabled semantics alongside other accessibility state`, () => {
    const state = { busy: true, expanded: false, disabled: false };
    const { element } = renderPressScale(platform, { disabled: true, accessibilityState: state });
    assert.equal(element.props.accessibilityState.disabled, true);
    assert.equal(element.props.accessibilityState.busy, true);
    assert.equal(element.props.accessibilityState.expanded, false);
    assert.equal(state.disabled, false, 'caller state is not mutated');
    const enabled = renderPressScale(platform, { disabled: false, accessibilityState: { disabled: true } });
    assert.equal(enabled.element.props.accessibilityState.disabled, true);
  });
}

for (const platform of ['web', 'android']) {
  test(`${platform} retains its animated press behavior`, () => {
    const { element, springCount } = renderPressScale(platform, {});
    assert.equal(element.type, 'AnimatedPressable');
    element.props.onPressIn();
    element.props.onPressOut();
    assert.equal(springCount(), 2);
  });
}
