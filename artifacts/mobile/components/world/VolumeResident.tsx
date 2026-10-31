import React from 'react';
import type {ComponentProps} from 'react';
import type {MascotStage} from '@/utils/mascotUtils';
import {VolumeEgg} from './VolumeEgg';
import {VolumeEvolved} from './VolumeEvolved';
import type {ResidentRendererState} from './VolumeEvolvedFallback';

export function hasResidentVolume(stage:MascotStage):boolean {return ['egg','odango','stage3','stage4'].includes(stage);}
export function VolumeResident({stage,displaySize,onRendererStateChange,...props}:ComponentProps<typeof VolumeEgg>&{stage:MascotStage;displaySize?:number;onRendererStateChange?:(state:ResidentRendererState)=>void}) {
  return stage==='egg'?<VolumeEgg {...props}/>:<VolumeEvolved stage={stage} displaySize={displaySize} onRendererStateChange={onRendererStateChange} {...props}/>;
}
