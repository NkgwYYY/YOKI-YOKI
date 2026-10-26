import React from 'react';
import {Text} from 'react-native';
import {colors} from '@/constants/theme';
import {smokingStatus} from '@/utils/smokingState';
export function SmokingCare(_props:{status:ReturnType<typeof smokingStatus>}){
 return <Text testID="smoking-care" style={{fontSize:12,lineHeight:21,color:colors.mutedForeground}}>こかげで、ひと息。お店の人とのおしゃべりも楽しんでね。</Text>;
}
