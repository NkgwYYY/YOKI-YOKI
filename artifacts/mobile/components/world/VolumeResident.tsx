import React from 'react';
import type {ComponentProps} from 'react';
import type {MascotStage} from '@/utils/mascotUtils';
import {VolumeEgg} from './VolumeEgg';
import {VolumeOdango} from './VolumeOdango';

// Adding a form requires its own matching geometry/art, not reusing egg proportions.
const RENDERERS = {egg:VolumeEgg,odango:VolumeOdango} as const;
export function hasResidentVolume(stage:MascotStage):stage is keyof typeof RENDERERS {
  return stage in RENDERERS;
}
export function VolumeResident({stage,...props}:ComponentProps<typeof VolumeEgg>&{stage:keyof typeof RENDERERS}) {
  const Renderer=RENDERERS[stage];
  return <Renderer {...props}/>;
}
