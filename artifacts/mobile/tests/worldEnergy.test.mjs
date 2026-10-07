import test from 'node:test';
import assert from 'node:assert/strict';
import {energyTankLevel} from '../utils/worldEnergy.ts';
test('tank is empty at zero, proportional before full, and never truncates the stored amount',()=>{
  assert.deepEqual(energyTankLevel(0),{amount:0,fraction:0});
  assert.deepEqual(energyTankLevel(50),{amount:50,fraction:.5});
  assert.deepEqual(energyTankLevel(100),{amount:100,fraction:1});
  assert.deepEqual(energyTankLevel(250),{amount:250,fraction:1});
  assert.equal(energyTankLevel(-2).fraction,0);
  assert.equal(energyTankLevel(NaN).fraction,0);
});
