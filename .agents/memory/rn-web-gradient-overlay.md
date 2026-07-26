---
name: RN-web gradient hides TextInput
description: Absolute-fill LinearGradient inside a card paints over TextInput on Expo web; inputs need zIndex.
---
On Expo web (react-native-web), an absolute-fill `LinearGradient` used as a card background paints ABOVE `TextInput` siblings (Text/View/Touchable stay visible, inputs disappear). Fix: give inputs `zIndex: 1` (or avoid absoluteFill gradients behind inputs).

**Why:** Positioned (absolute) elements paint over non-positioned siblings regardless of DOM order; RN-web TextInput doesn't get the same stacking as Views.

**How to apply:** Any card with an absoluteFill gradient + text inputs. Also: when a tester verifies visibility, demand pixel/screenshot verification — computed styles can look correct while the element is covered.
