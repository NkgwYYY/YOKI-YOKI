import React from 'react';
import {View} from 'react-native';
import {useRouter} from 'expo-router';
import {VillageStoryArchive} from '@/components/world/VillageStories';

export default function StoriesScreen(){
 const router=useRouter();
 return <View style={{flex:1,backgroundColor:'#211B2B'}}><VillageStoryArchive onClose={()=>router.back()}/></View>;
}
