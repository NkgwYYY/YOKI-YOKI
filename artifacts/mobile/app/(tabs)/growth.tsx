import React,{useEffect,useState} from 'react';
import {Alert,Platform,ScrollView,StyleSheet,Text,View} from 'react-native';
import {reloadAppAsync} from 'expo';
import {useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors,control,radius,space,typography} from '@/constants/theme';
import {ACCOUNT_ENABLED} from '@/utils/runtimeConfig';
import {getTabBarHeight} from '@/utils/tabLayout';
import {getMascotStage,getCharacter,type CharacterKey} from '@/utils/mascotUtils';
import {charsMetThroughStage} from '@/utils/encounters';
import {Analytics} from '@/utils/analytics';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {useRoomActivity} from '@/components/room/useRoomActivity';
import {CompactGrowth} from '@/components/growth/CompactGrowth';
import {CharacterDexModal} from '@/components/dex/CharacterDexModal';
import {Button} from '@/components/ui/Button';
import {CenterDialog} from '@/components/ui/BottomSheet';
import {Icon} from '@/components/ui/Icon';
import {PressScale} from '@/components/ui/PressScale';
export default function GrowthScreen(){
 const insets=useSafeAreaInsets(),router=useRouter();
 const {progress,growth,markGrowthSeen,encounters,pushDataToCloud}=useApp();
 const {active}=useRoomActivity();
 const {user,isSignedIn,logout,deleteAccount}=useAuth();
 const [dexChar,setDexChar]=useState<CharacterKey|null>(null);
 const [showLogout,setShowLogout]=useState(false),[showDeleteConfirm,setShowDeleteConfirm]=useState(false),[deletingAccount,setDeletingAccount]=useState(false);
 const isIOSGuestOnly=!ACCOUNT_ENABLED;
 useEffect(()=>{if(!active)return;const timer=setTimeout(markGrowthSeen,3000);return()=>clearTimeout(timer);},[active,growth.growthSize,markGrowthSeen]);
 const currentChar=getCharacter(getMascotStage(progress)),met=new Set(charsMetThroughStage(getMascotStage(progress)));
 const dexList=encounters.list.filter(e=>met.has(e.charKey));
  const handleLogout = async () => {
    setShowLogout(false);
    try{await pushDataToCloud();await logout();router.replace(isIOSGuestOnly?'/(tabs)':Platform.OS==='web'?'/login':'/welcome');}
    catch{Alert.alert('ログアウトできませんでした','通信や保存状態を確認して、もう一度お試しください。');}
  };

  const confirmDeleteAccount = () => {
    setShowLogout(false);
    setShowDeleteConfirm(true);
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteAccount();
      setShowDeleteConfirm(false);
      await reloadAppAsync();
    } catch (error) {
      Alert.alert(
        '削除できませんでした',
        error instanceof Error ? error.message : '時間をおいてもう一度お試しください',
      );
    } finally {
      setDeletingAccount(false);
    }
  };

 return <View testID="album-screen" style={styles.flex}>
 <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content,{paddingTop:(Platform.OS==='web'?20:insets.top)+12,paddingBottom:getTabBarHeight(Platform.OS,insets.bottom)+20}]}>
  <View style={styles.titleRow}><View><Text style={styles.eyebrow}>MY RECORD</Text><Text style={styles.title}>わたしの歩み</Text></View><PressScale style={styles.accountBtn} onPress={()=>setShowLogout(true)} accessibilityLabel={isIOSGuestOnly?'プロフィールと使い方':'アカウント'}><Icon name="user" size={20} color="#493659"/></PressScale></View>
  <CompactGrowth onCharacter={setDexChar}/>
 </ScrollView>
        {/* アカウント */}
        <CenterDialog visible={showLogout} onClose={() => setShowLogout(false)}>
          <View style={styles.dialogHead}>
            <Icon name="user" size={32} color={colors.primary} />
            <Text style={styles.dialogTitle}>
              {isIOSGuestOnly ? '設定' : isSignedIn ? 'アカウント' : 'ゲストモードで利用中'}
            </Text>
            {!isIOSGuestOnly && user?.email ? <Text style={styles.dialogSub}>{user.email}</Text> : null}
          </View>

          {!isSignedIn && (
            isIOSGuestOnly ? (
              <Text style={styles.dialogBody}>
                記録、進捗、所持アイテムはこの端末に自動で保存されます。
              </Text>
            ) : (
              <>
                <Text style={styles.dialogBody}>
                  記録はこの端末に保存されています。ログインすると記録と進捗をアカウントに追加して、バックアップできます。
                </Text>
                <Text style={styles.dialogNote}>
                  すでにアカウントにあるプロフィールや設定は優先して保護されます。
                </Text>
                <Button
                  label="ログインしてデータを保存"
                  onPress={() => {
                    Analytics.guestBackupPromptOpened();
                    setShowLogout(false);
                    router.push('/login');
                  }}
                  icon="upload-cloud"
                />
              </>
            )
          )}
          <Button
            label="プロフィールを編集"
            variant="outline"
            onPress={() => {
              setShowLogout(false);
              router.push('/profile');
            }}
            icon="edit-3"
          />
          <Button
            label="使い方ガイド"
            variant="outline"
            onPress={() => {
              setShowLogout(false);
              router.push('/guide');
            }}
            icon="book-open"
          />
          {isSignedIn && !isIOSGuestOnly && (
            <>
              <PressScale onPress={handleLogout} style={styles.logoutBtn}>
                <Icon name="log-out" size={16} color={colors.danger} />
                <Text style={styles.logoutBtnText}>ログアウト</Text>
              </PressScale>
              <PressScale
                onPress={confirmDeleteAccount}
                disabled={deletingAccount}
                testID="delete-account-button"
                accessibilityLabel="アカウントを完全に削除"
                style={styles.deleteAccountBtn}
              >
                <Icon name="trash-2" size={16} color={colors.danger} />
                <Text style={styles.deleteAccountBtnText}>
                  {deletingAccount ? '削除しています…' : 'アカウントを削除'}
                </Text>
              </PressScale>
            </>
          )}
          <Button label="キャンセル" variant="ghost" onPress={() => setShowLogout(false)} />
        </CenterDialog>

        <CenterDialog
          visible={showDeleteConfirm}
          onClose={() => {
            if (!deletingAccount) setShowDeleteConfirm(false);
          }}
        >
          <View style={styles.dialogHead}>
            <Icon name="trash-2" size={32} color={colors.danger} />
            <Text style={styles.dialogTitle}>アカウントを削除</Text>
          </View>
          <Text style={styles.dialogBody}>
            記録、進捗、所持アイテム、ログイン情報を含むすべてのデータを完全に削除します。
          </Text>
          <Text style={styles.deleteConfirmWarning}>
            この操作は取り消せません。
          </Text>
          <Button
            label={deletingAccount ? '削除しています…' : '完全に削除する'}
            onPress={handleDeleteAccount}
            loading={deletingAccount}
            disabled={deletingAccount}
            icon="trash-2"
            testID="confirm-delete-account-button"
            style={styles.deleteConfirmButton}
          />
          <Button
            label="キャンセル"
            variant="ghost"
            disabled={deletingAccount}
            onPress={() => setShowDeleteConfirm(false)}
          />
        </CenterDialog>

 {dexChar&&<CharacterDexModal charKey={dexChar} metDate={dexList.find(e=>e.charKey===dexChar)?.metDate??''} isCurrent={dexChar===currentChar.key} onClose={()=>setDexChar(null)}/>}
 </View>;
}
const styles=StyleSheet.create({
 flex:{flex:1,backgroundColor:'#F4F1F6'},content:{width:'100%',maxWidth:640,alignSelf:'center',paddingHorizontal:20,gap:20},titleRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},eyebrow:{fontSize:9,letterSpacing:2.5,color:'#8B729C',marginBottom:7},title:{fontSize:26,fontWeight:'700',color:'#30233F',letterSpacing:-.5},accountBtn:{width:44,height:44,borderRadius:22,borderWidth:1,borderColor:'#DDD2E4',backgroundColor:'#FFF',alignItems:'center',justifyContent:'center'},
  /* アカウントダイアログ */
  dialogHead: { alignItems: 'center', gap: space.xs, marginBottom: space.sm },
  dialogTitle: { ...typography.heading, color: colors.foreground },
  dialogSub: { ...typography.caption, color: colors.mutedForeground },
  dialogBody: { ...typography.callout, color: colors.mutedForeground },
  dialogNote: { ...typography.caption, color: colors.subtleForeground },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: control.height,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  logoutBtnText: { ...typography.bodyStrong, color: colors.danger },
  deleteAccountBtn: {
    minHeight: control.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAccountBtnText: {
    ...typography.caption,
    color: colors.danger,
    textDecorationLine: 'underline',
  },
  deleteConfirmWarning: {
    ...typography.bodyStrong,
    color: colors.danger,
    textAlign: 'center',
  },
  deleteConfirmButton: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
});
