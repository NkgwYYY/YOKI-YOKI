import React from 'react';
import {View} from 'react-native';
import {useRouter} from 'expo-router';
import {VillageStoryPanel} from '@/components/world/VillageStories';

export default function StoriesScreen(){
 const router=useRouter();
 return <View style={{flex:1,backgroundColor:'#211B2B'}}><VillageStoryPanel onClose={()=>router.back()} onGo={place=>router.replace({pathname:'/(tabs)',params:{place,journey:String(Date.now())}})}/></View>;
}
