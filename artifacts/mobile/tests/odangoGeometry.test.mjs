import test from 'node:test';
import assert from 'node:assert/strict';
import {createOdangoGeometry} from '../utils/odangoFur.ts';
import {productionGeometry} from './fixtures/productionGeometry48.ts';

// A frozen production implementation preserves a meaningful byte-exact baseline
// without assuming identical transcendental rounding across ARM/macOS and Linux.
for(const [fur,length] of [
 [false,82944],
 [true,3888000],
])test(`optimised ${fur?'fur':'body'} upload preserves the production model exactly`,()=>{
 const data=createOdangoGeometry(fur);
 assert.equal(data.length,length);
 const original=productionGeometry(fur);
 assert.ok(Buffer.from(data.buffer).equals(Buffer.from(original.buffer)),
   'Every upload byte must match the original production geometry on this runtime');
});
