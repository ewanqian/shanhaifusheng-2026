import test from 'node:test';
import assert from 'node:assert/strict';
import {stoneOpacity,mountainDepth} from '../src/visual-state.js';
test('every stone continuously disappears with the field rather than reversing its birth',()=>{
  for(let i=0;i<12;i++){
    assert.equal(stoneOpacity(1,1,i),1);
    assert.equal(stoneOpacity(1,0,i),0);
    assert.ok(Math.abs(stoneOpacity(1,.5001,i)-stoneOpacity(1,.5,i))<.001);
    assert.equal(stoneOpacity(0,1,i),0);
  }
});
test('mountain moves continuously within its safe depth range at under 0.11m/s',()=>{
  for(let layer=0;layer<3;layer++)for(let t=0;t<120;t+=.1){
    const base=layer===0?-10:-70;
    assert.ok(Math.abs(mountainDepth(t,layer)-base)<=.8+1e-10);
    assert.ok(Math.abs(mountainDepth(t+.001,layer)-mountainDepth(t,layer))/.001<.11);
  }
});
