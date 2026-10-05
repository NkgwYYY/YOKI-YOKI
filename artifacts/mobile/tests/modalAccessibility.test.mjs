import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';

// Render the actual shared components with host adapters; no native runtime claim.
const code=ts.transpileModule(fs.readFileSync(new URL('../components/ui/BottomSheet.tsx',import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true},
}).outputText;
function fixture(reduced){
  const exports={};
  new Function('require','exports',code)(name=>{
    if(name==='react')return React;
    if(name==='react-native')return {Modal:'Modal',KeyboardAvoidingView:'KeyboardAvoidingView',Pressable:'Pressable',ScrollView:'ScrollView',Text:'Text',View:'View',Platform:{OS:'ios'},StyleSheet:{create:v=>v,absoluteFillObject:{}}};
    if(name==='react-native-safe-area-context')return {useSafeAreaInsets:()=>({top:0,bottom:20})};
    if(name.endsWith('/useReducedMotion'))return {useReducedMotion:()=>reduced};
    if(name.endsWith('/PressScale'))return {PressScale:'PressScale'};
    if(name.endsWith('/Icon'))return {Icon:'Icon',iconSize:{md:20}};
    if(name.endsWith('/theme'))return {border:{},colors:{},elevation:{},radius:{},space:{lg:20,xl:24,md:16,sm:8,xs:4},typography:{}};
    throw Error(name);
  },exports);return exports;
}
function nodes(element){return React.isValidElement(element)?[element,...React.Children.toArray(element.props.children).flatMap(nodes)]:[];}
for(const reduced of [false,true])for(const kind of ['BottomSheet','CenterDialog']){
 test(`${kind} respects reduced motion=${reduced} and keeps a single accessible close control even without a title`,()=>{
  let closed=0;const onClose=()=>closed++;
  const tree=fixture(reduced)[kind]({visible:true,onClose,children:'content'}),all=nodes(tree);
  assert.equal(tree.props.animationType,reduced?'none':kind==='BottomSheet'?'slide':'fade');
  const close=all.filter(n=>n.props.accessibilityLabel==='閉じる');assert.equal(close.length,1);
  const scrim=all.find(n=>n.type==='Pressable');assert.equal(scrim.props.accessible,false);assert.equal(scrim.props.tabIndex,-1);
  const modal=all.find(n=>n.props.accessibilityViewIsModal);assert.ok(modal);
  close[0].props.onPress();scrim.props.onPress();tree.props.onRequestClose();modal.props.onAccessibilityEscape();assert.equal(closed,4);
 });
}
