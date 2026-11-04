import React from 'react';
import {useSharedValue} from 'react-native-reanimated';
import {useApp} from '@/contexts/AppContext';
import {getMascotStage} from '@/utils/mascotUtils';
import {readWardrobe} from '@/utils/wardrobe';
import {VolumeResident} from '@/components/world/VolumeResident';
export function BattleCompanion({size,active,reduceMotion,happy}:{size:number;active:boolean;reduceMotion:boolean;happy:boolean}){
 const {progress,feedState}=useApp();
 const rx=useSharedValue(0),ry=useSharedValue(.12),rz=useSharedValue(0),blink=useSharedValue(0);
 return <VolumeResident stage={getMascotStage(progress)} costume={readWardrobe(feedState.wardrobe).equipped} size={size} rx={rx} ry={ry} rz={rz} blink={blink} mood={happy?'happy':'normal'} active={active} reduceMotion={reduceMotion}/>;
}
