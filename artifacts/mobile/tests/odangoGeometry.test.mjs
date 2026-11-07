import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createOdangoGeometry} from '../utils/odangoFur.ts';

// Baselines captured from the original production geometry before startup
// allocation optimisation. Exact vertex buffers keep every angle/strand intact.
for(const [fur,length,hash] of [
 [false,82944,'496b06d86cb669ab6284857f91af491ba7313acb90bc0099dfd8c53973c02421'],
 [true,3888000,'8fb1c8be43903d9acb25635f4d6b25a00c1f9d4b4c76ecfc571de5ebac4ceb1f'],
])test(`optimised ${fur?'fur':'body'} upload preserves the production model exactly`,()=>{
 const data=createOdangoGeometry(fur);
 assert.equal(data.length,length);
 assert.equal(createHash('sha256').update(Buffer.from(data.buffer)).digest('hex'),hash);
});
