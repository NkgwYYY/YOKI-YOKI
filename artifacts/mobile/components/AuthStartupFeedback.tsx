import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {reloadAppAsync} from 'expo';
import {useAuth as useClerkAuth, useClerk} from '@clerk/expo';
import {PlushLoading} from './PlushLoading';
import {Button} from './ui/Button';

export function AuthStartupGate({children}:{children:React.ReactNode}) {
  const {isLoaded}=useClerkAuth();
  const clerk=useClerk();
  useEffect(()=>{
    // State flags only: no account identifiers, request bodies or tokens.
    console.info('[yoki-auth]', JSON.stringify({authReady:isLoaded,clientReady:clerk.loaded,status:clerk.status}));
  },[isLoaded,clerk.loaded,clerk.status]);
  // ClerkLoading and ClerkLoaded both render nothing when initialization fails.
  // Keep one exhaustive loading/ready branch, including network failures.
  return isLoaded&&clerk.loaded
    ? children
    : <AuthStartupFeedback failed={clerk.status==='error'}/>;
}

/** Authentication failure must remain visible and recoverable, without resetting data. */
export function AuthStartupFeedback({failed=false}:{failed?:boolean}) {
  const [slow,setSlow]=useState(false);
  const [retrying,setRetrying]=useState(false);
  const [retryError,setRetryError]=useState(false);
  useEffect(()=>{
    const timer=setTimeout(()=>setSlow(true),15000);
    return()=>clearTimeout(timer);
  },[]);
  const retry=async()=>{
    setRetrying(true);setRetryError(false);
    try { await reloadAppAsync('Retry account initialization'); }
    catch { setRetryError(true);setRetrying(false); }
  };
  return <View testID="auth-startup" style={s.root}>
    <PlushLoading message={failed?'接続を確認できませんでした':slow?'読み込みに時間がかかっています':'読み込み中…'}/>
    {(failed||slow)&&<View style={s.actions}>
      <Text accessibilityRole={failed?'alert':undefined} style={s.message}>通信環境を確認して、もう一度お試しください。</Text>
      <Button testID="auth-startup-retry" label="もう一度読み込む" onPress={retry} loading={retrying}/>
      {retryError&&<Text accessibilityRole="alert" style={s.message}>アプリを閉じて、もう一度開いてください。</Text>}
    </View>}
  </View>;
}
const s=StyleSheet.create({
  root:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'#211137'},
  actions:{width:'100%',maxWidth:380,paddingHorizontal:28,gap:18},
  message:{fontSize:13,lineHeight:22,textAlign:'center',color:'#D8C9E8'},
});
