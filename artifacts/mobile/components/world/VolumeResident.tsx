import React from 'react';
import type {ComponentProps} from 'react';
import type {MascotStage} from '@/utils/mascotUtils';
import {VolumeEgg} from './VolumeEgg';
import {VolumeEvolved} from './VolumeEvolved';

export function hasResidentVolume(stage:MascotStage):boolean {return ['egg','odango','stage3','stage4'].includes(stage);}
export function VolumeResident({stage,...props}:ComponentProps<typeof VolumeEgg>&{stage:MascotStage}) {
  return stage==='egg'?<VolumeEgg {...props}/>:<VolumeEvolved stage={stage} {...props}/>;
}
